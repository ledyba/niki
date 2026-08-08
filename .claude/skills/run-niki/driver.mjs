// niki を実ブラウザで駆動するドライバ。
//
// 前提: アプリが BASE_URL で動いていること（SKILL.md の手順で起動する）。
// ホストには headless Chromium の共有ライブラリが無いので、Playwright 公式
// コンテナの中から動かす。実行方法は SKILL.md を参照。
//
//   node driver.mjs [scenario...]
//     save    打鍵 → 保存 → 「☑ 保存しました」（既定）
//     queue   保存中の追加編集が直列化され、キュー1個で送られる
//     error   POST 失敗時に「✖ エラー：...」が出る／自動リトライしない
//     month   保存中に月を移動しても保存機構が固まらない
//     toggle  今日以外の日を編集トグルで開ける／開けるエディタは高々1つ／
//             保存済みはその日の欄にだけ出る
//     all     上記すべて
//
// 環境変数:
//   BASE_URL  既定 http://127.0.0.1:3000/
//   OUT       スクリーンショット出力先。既定 ./var/shots
//   HEADED    1 でヘッドフル（コンテナ内では通常不要）

import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';

// Playwright 公式コンテナでは playwright がグローバルに入っていて NODE_PATH
// 経由で解決される。ESM の bare import は NODE_PATH を見ないので require で取る。
const { chromium } = createRequire(import.meta.url)('playwright');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3000/';
const OUT = process.env.OUT || './var/shots';

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  :: ' + detail : ''}`);
}

// POST /diaries/... を傍受して、遅延・失敗を注入しつつ同時実行数を数える。
async function newPage(browser, { delay = 0, fail = false, failOnce = false } = {}) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const st = { posts: 0, inflight: 0, maxInflight: 0, bodies: [] };
  await page.route('**/diaries/**', async (route) => {
    const req = route.request();
    if (req.method() !== 'POST') return route.continue();
    st.posts++;
    st.inflight++;
    st.maxInflight = Math.max(st.maxInflight, st.inflight);
    try { st.bodies.push(JSON.parse(req.postData() || '{}').text); } catch { st.bodies.push(null); }
    if (delay) await new Promise((r) => setTimeout(r, delay));
    if (fail || (failOnce && st.posts === 1)) {
      st.inflight--;
      return route.fulfill({ status: 500, contentType: 'text/plain; charset=utf-8', body: 'DB接続エラー' });
    }
    const resp = await route.fetch();
    const body = await resp.text();
    st.inflight--;
    return route.fulfill({ response: resp, body });
  });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  // どの日も表示モードで始まるので、今日の欄の編集ボタンを押して Quill を出す。
  await openEditor(page);
  // インジケーターの状態遷移を漏れなく記録する（クラス名で判別）。
  await page.evaluate(() => {
    window.__states = [];
    const push = () => {
      const el = document.querySelector('.save-status');
      if (!el) return;
      const kind = (el.className.match(/save-status--(\w+)/) || [])[1] || 'idle';
      const text = (el.textContent || '').trim();
      const last = window.__states[window.__states.length - 1];
      if (!last || last.kind !== kind || last.text !== text) window.__states.push({ kind, text });
    };
    push();
    new MutationObserver(push).observe(document.body,
      { subtree: true, childList: true, attributes: true, characterData: true });
  });
  return { ctx, page, st };
}

const seq = (s) => s.map((x) => x.kind).join(' → ');
const labels = (s) => s.filter((x) => x.text).map((x) => x.text);
const states = (page) => page.evaluate(() => window.__states);
const kindNow = (page) => page.evaluate(() => {
  const el = document.querySelector('.save-status');
  return el ? ((el.className.match(/save-status--(\w+)/) || [])[1] || 'idle') : null;
});
const waitKind = (page, kind, timeout = 20000) =>
  page.waitForFunction(
    (k) => {
      const el = document.querySelector('.save-status');
      return !!el && el.className.includes('save-status--' + k);
    }, kind, { timeout });

const pad = (n) => String(n).padStart(2, '0');
const today = () => {
  const now = new Date();
  return `${now.getFullYear()}/${pad(now.getMonth() + 1)}/${pad(now.getDate())}`;
};

// 指定した日(既定は今日)の編集モードを開く。編集は日ごとのトグルなので、
// 初回読み込み・リロード後・月の移動後はいずれも開き直す必要がある。
async function openEditor(page, date = today()) {
  const toggle = `.diary[data-date="${date}"] .diary__edit-toggle`;
  await page.waitForSelector(toggle, { timeout: 20000 });
  if ((await page.getAttribute(toggle, 'aria-pressed')) !== 'true') {
    await page.click(toggle);
  }
  await page.waitForSelector('.ql-editor', { timeout: 20000 });
}

async function type(page, text) {
  await page.click('.ql-editor');
  await page.keyboard.type(text, { delay: 15 });
}

// ホスト側(Node)の値が条件を満たすまでポーリングする。ページ内 DOM の状態
// ではなく `st.posts` のような、ルートハンドラが直接書き換えている値を
// 待つときに使う。
async function waitFor(fn, timeout = 20000, interval = 100) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await fn()) return true;
    await new Promise((r) => setTimeout(r, interval));
  }
  return false;
}
const shot = (page, name) => page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });

const scenarios = {
  // 打鍵 → 保存 → ☑。まずこれが通らないなら他を見ても意味がない。
  async save(browser) {
    const { ctx, page, st } = await newPage(browser);
    await type(page, 'ドライバからの書き込み');
    await waitKind(page, 'saving');
    await shot(page, 'save-1-saving');
    await waitKind(page, 'saved');
    await shot(page, 'save-2-saved');
    const s = await states(page);
    console.log('  states:', seq(s), '| labels:', JSON.stringify(labels(s)));
    check('save: idle→saving→saved と遷移する', seq(s).includes('idle → saving → saved'), seq(s));
    check('save: 「☑ 保存しました」で終わる', labels(s).at(-1) === '☑ 保存しました', labels(s).at(-1));
    check('save: POST は 1 本', st.posts === 1, `posts=${st.posts}`);
    // 本当に保存されたか、リロードして本文が残っているかで確かめる。
    await page.reload({ waitUntil: 'networkidle' });
    await openEditor(page);
    const text = await page.textContent('.ql-editor');
    check('save: リロード後も本文が残る', text.includes('ドライバからの書き込み'), JSON.stringify(text.slice(0, 40)));
    await ctx.close();
  },

  // 保存中の追加編集: スピナーを維持し、キュー1個で直列に送る。
  async queue(browser) {
    const { ctx, page, st } = await newPage(browser, { delay: 1500 });
    await type(page, 'AAA');
    await waitKind(page, 'saving');
    await type(page, 'BBB');              // in-flight 中の編集
    await page.waitForTimeout(600);
    const during = await kindNow(page);
    await shot(page, 'queue-1-during');
    await waitKind(page, 'saved', 30000);
    const s = await states(page);
    console.log('  states:', seq(s), '| posts:', st.posts, '| maxInflight:', st.maxInflight);
    console.log('  bodies:', JSON.stringify(st.bodies));
    check('queue: 同時 POST は最大 1 本（直列化）', st.maxInflight === 1, `maxInflight=${st.maxInflight}`);
    check('queue: 保存中の編集でスピナー継続', during === 'saving', `during=${during}`);
    check('queue: キューが消化され 2 本目が飛ぶ', st.posts === 2, `posts=${st.posts}`);
    check('queue: 最終 POST に後続編集が入る', (st.bodies.at(-1) || '').includes('BBB'), st.bodies.at(-1));
    check('queue: 最終的に ☑ 保存しました', labels(s).at(-1) === '☑ 保存しました', labels(s).at(-1));
    await ctx.close();
  },

  // 保存失敗の表示と、自動リトライしないこと、次の編集で復帰すること。
  async error(browser) {
    const { ctx, page, st } = await newPage(browser, { fail: true });
    await type(page, 'エラー確認');
    await waitKind(page, 'error');
    await shot(page, 'error-1-error');
    const s = await states(page);
    const last = labels(s).at(-1);
    console.log('  states:', seq(s), '| last:', JSON.stringify(last));
    check('error: saving→error と遷移する', seq(s).includes('saving → error'), seq(s));
    check('error: サーバのメッセージを表示する', last.includes('✖ エラー：') && last.includes('DB接続エラー'), last);
    await page.waitForTimeout(2000);
    check('error: 自動リトライしない（POST は 1 本のまま）', st.posts === 1, `posts=${st.posts}`);
    await ctx.close();

    // 失敗 → 次の編集で再送されるか。
    const r = await newPage(browser, { failOnce: true });
    await type(r.page, '失敗する');
    await waitKind(r.page, 'error');
    await type(r.page, 'が復帰する');
    await waitKind(r.page, 'saved', 20000);
    await shot(r.page, 'error-2-recovered');
    const rs = await states(r.page);
    console.log('  recovery states:', seq(rs));
    // 打鍵でエラー表示が消えるので error→idle→saving→saved になる（仕様どおり）。
    check('error: 次の編集で再送され ☑ に戻る', /error → idle → saving → saved/.test(seq(rs)), seq(rs));
    check('error: 再送に失敗分の本文が残る', (r.st.bodies.at(-1) || '').includes('失敗する'), r.st.bodies.at(-1));
    await r.ctx.close();

    // in-flight 失敗中に同じ日への追記が入った場合、その追記が一度も送信
    // されないまま止まらないこと(failedDates への無条件追加の回帰チェック)。
    // POST は 1 本目が解決するまで delay で in-flight を維持させる。
    const f = await newPage(browser, { fail: true, delay: 1200 });
    await type(f.page, 'A失敗中');
    await waitKind(f.page, 'saving');
    await f.page.waitForTimeout(300);   // 1 本目がまだ in-flight のうちに…
    await type(f.page, 'B追記');        // 同じ日へ追記する
    const sentSecond = await waitFor(() => f.st.posts >= 2, 15000);
    console.log('  in-flight追記: posts:', f.st.posts, '| bodies:', JSON.stringify(f.st.bodies));
    check(
      'error: in-flight 失敗中の追記も取りこぼさず再送される',
      sentSecond && (f.st.bodies.at(-1) || '').includes('B追記'),
      `posts=${f.st.posts} bodies=${JSON.stringify(f.st.bodies)}`,
    );
    await f.ctx.close();
  },

  // 保存中に月を移動して戻っても、保存機構が固まらないこと。
  async month(browser) {
    const { ctx, page, st } = await newPage(browser, { delay: 3000 });
    page.on('dialog', (d) => d.accept());     // 未保存の離脱ガードを承諾
    const months = await page.$$eval('.month a', (els) => els.map((e) => e.getAttribute('href')));
    const now = new Date();
    const cur = `/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`;
    const other = months.find((h) => h && h !== cur);
    if (!other) {
      check('month: 別の月が必要（過去月のデータを入れてから再実行）', false, JSON.stringify(months));
      await ctx.close();
      return;
    }
    await type(page, '月切替テスト');
    await waitKind(page, 'saving');
    await page.click(`.month a[href="${other}"]`);   // 保存中に離脱
    await page.waitForTimeout(4500);                 // in-flight が解決するのを待つ
    await page.click(`.month a[href="${cur}"]`);
    await openEditor(page);
    await type(page, '復帰後の編集');
    let ok = true;
    try { await waitKind(page, 'saved', 15000); } catch { ok = false; }
    await shot(page, 'month-1-after');
    console.log('  posts:', st.posts, '| maxInflight:', st.maxInflight, '| kind:', await kindNow(page));
    check('month: 月を往復しても保存が動き続ける（デッドロックなし）', ok, `kind=${await kindNow(page)}`);
    await ctx.close();
  },

  // 日ごとのトグル本体を踏む: 今日以外の日を開ける・開けるエディタは高々1つ・
  // 保存インジケーターはその日の欄にだけ出る・閉じれば HTML 表示に戻る。
  async toggle(browser) {
    const { ctx, page } = await newPage(browser);
    const t = today();
    const now = new Date();
    if (now.getDate() === 1) {
      // 今日が月初だと「今日より前で同じ月の日」が存在しない(未来の日は
      // 一覧に出ないため)。日を跨いで再実行するか、当月にもう1件日記を
      // 入れてから再実行してほしい、という既知の限界として FAIL で報告する。
      check('toggle: 今日以外の対象日が必要（今日が月初のため無い。日を跨いで再実行するか当月にデータを追加）', false, `today=${t}`);
      await ctx.close();
      return;
    }
    // today > 1 日なら、当月の1日は必ず存在し today とも重ならない。
    const target = `${now.getFullYear()}/${pad(now.getMonth() + 1)}/01`;

    // 1. 今日以外の ✎ 編集 を押すとその日のエディタが開く。
    await page.click(`.diary[data-date="${target}"] .diary__edit-toggle`);
    await page.waitForSelector(`.diary[data-date="${target}"] .ql-editor`, { timeout: 20000 });
    check('toggle: 別の日の編集ボタンを押すとその日にエディタが開く', true, `target=${target}`);

    // 2. 開くエディタは常に高々1つ → 今日のエディタは閉じている。
    const todayEditorGone = (await page.$(`.diary[data-date="${t}"] .ql-editor`)) === null;
    check('toggle: 別の日を開くと今日のエディタは閉じる（エディタは高々1つ）', todayEditorGone);

    // 3. target に打鍵すると保存され、target の欄にだけ ☑ が出る
    //    (document.querySelector('.save-status') だと日付降順の先頭 = 今日を
    //    拾ってしまうので、data-date で対象日に絞って見る)。
    await page.click(`.diary[data-date="${target}"] .ql-editor`);
    await page.keyboard.type('別の日のトグルテスト', { delay: 15 });
    await page.waitForFunction((d) => {
      const el = document.querySelector(`.diary[data-date="${d}"] .save-status`);
      return !!el && el.className.includes('save-status--saved');
    }, target, { timeout: 20000 });
    check('toggle: 対象の日の欄に保存済みが出る', true, `target=${target}`);
    await shot(page, 'toggle-1-saved');

    // 4. もう一度 ☑ 完了 を押すとエディタが消え、保存した本文が HTML で表示される。
    await page.click(`.diary[data-date="${target}"] .diary__edit-toggle`);
    await page.waitForSelector(`.diary[data-date="${target}"] .ql-editor`, { state: 'detached', timeout: 20000 });
    const html = await page.$eval(`.diary[data-date="${target}"]`, (el) => el.textContent || '');
    check('toggle: 完了を押すとエディタが閉じ保存した本文が表示される', html.includes('別の日のトグルテスト'), html.slice(0, 60));
    await shot(page, 'toggle-2-closed');

    await ctx.close();
  },
};

const argv = process.argv.slice(2);
const want = argv.length === 0 ? ['save']
  : argv.includes('all') ? Object.keys(scenarios)
    : argv;

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
try {
  for (const name of want) {
    if (!scenarios[name]) {
      console.error(`unknown scenario: ${name} (available: ${Object.keys(scenarios).join(', ')}, all)`);
      process.exit(2);
    }
    console.log(`\n=== ${name} ===`);
    await scenarios[name](browser);
  }
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n===== ${results.length - failed.length}/${results.length} PASS =====`);
console.log(`screenshots: ${OUT}`);
if (failed.length) {
  console.log('FAILED: ' + failed.map((f) => f.name).join(', '));
  process.exit(1);
}
