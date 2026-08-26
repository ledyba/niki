---
name: run-niki
description: Build, run, and drive niki (the diary app). Use when asked to start niki, run or build the server/client, take a screenshot of its UI, exercise the save indicator, or interact with the running app.
---

niki は日付キーの日記アプリで、Fastify の JSON API が Vue 3 の SPA を配信する。
エージェントは **使い捨ての postgres + ローカル起動したサーバ** に対して
`.claude/skills/run-niki/driver.mjs` を Playwright 公式コンテナから走らせて駆動する。

All paths below are relative to `src/niki/`（このリポジトリのルート）。

> **本番DBに絶対に向けない。** ホストでは本番の `niki_postgres` / `niki_web` が
> 動いていることがある。POST は日付をキーに upsert するので、本番DBに向けて
> 駆動すると**その日の日記が実際に上書きされる**。必ず下記の使い捨てコンテナを使う。

## Prerequisites

ホストに追加の apt パッケージは要らない。必要なのは `docker` と `node`（npm 同梱）だけ。

ブラウザ自動化はコンテナ側で完結する。ホストの Chromium は
`libatk-1.0.so.0` 等が無くて起動できず、`sudo` もパスワード無しでは通らないため、
**Playwright 公式イメージを使う**（初回だけ pull する）。

```bash
docker pull mcr.microsoft.com/playwright:v1.62.1-noble
```

## Setup

```bash
cd server && npm ci && cd ..
cd client && npm ci && cd ..
```

ドライバが使う `playwright` パッケージを、gitignore 済みの `var/` に一度だけ入れる。
ブラウザ本体はコンテナ側にあるのでダウンロードは飛ばす。

```bash
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm i --no-save --prefix var/driver playwright@1.62.1
```

## Build

```bash
cd server && npm run build && cd ..
cd client && npm run build && cd ..
```

## Run (agent path)

### 1. 使い捨ての postgres を立てる

```bash
docker rm -f niki_dev_pg 2>/dev/null
docker run -d --name niki_dev_pg \
  -e POSTGRES_DB=niki -e POSTGRES_USER=niki -e POSTGRES_PASSWORD=niki \
  -e TZ=Asia/Tokyo -e PGTZ=Asia/Tokyo \
  -p 127.0.0.1:5432:5432 postgres:13-alpine
until docker exec niki_dev_pg pg_isready -U niki; do sleep 1; done
docker exec -i niki_dev_pg psql -U niki -d niki < db/flyway_data/sql/V0__pre.sql
```

Flyway は使わない。テーブルは1つで、マイグレーションも `V0__pre.sql` 1枚だけなので
直接流し込むほうが速い。

### 2. サーバを起動する

```bash
(cd server && DATABASE_HOST=127.0.0.1 nohup node dist/main.js > /tmp/niki-server.log 2>&1 & echo $! > /tmp/niki-server.pid)
sleep 5
curl -s -o /dev/null -w "GET / -> %{http_code}\n" http://127.0.0.1:3000/
```

サブシェルで包んでいるのは、`cd server && ... &` と書くと `cd` ごと背景に回って
呼び出し側のカレントディレクトリがずれるため（次の `docker run` の `$PWD` が壊れる）。

`GET / -> 200` が出れば起動している。サーバは `client/dist` をそのまま配信するので、
**クライアントを直す度に `cd client && npm run build` をやり直す**こと。

### 3. ドライバで駆動する

```bash
docker run --rm --network host -v "$PWD":/work -w /work \
  --user "$(id -u):$(id -g)" \
  -e NODE_PATH=/work/var/driver/node_modules \
  mcr.microsoft.com/playwright:v1.62.1-noble \
  node .claude/skills/run-niki/driver.mjs all
```

末尾に `===== 20/20 PASS =====` が出れば全部通っている。失敗すると exit 1。

`--user` を省くとスクリーンショットが root 所有でホストに残り、あとで消せなくなる
（下記 Gotchas 参照）。

| 引数 | 何を確かめるか |
|---|---|
| `save` | 打鍵 → `保存中` → `☑ 保存しました`、リロードしても本文が残る（既定） |
| `queue` | 保存中の追加編集：スピナー継続・同時POSTは最大1本・キュー1個で再送 |
| `error` | POST 失敗で `✖ エラー：...`、自動リトライしない、次の編集で復帰、in-flight 失敗中に入った追記も取りこぼさず再送される |
| `month` | 保存中に月を往復しても保存機構が固まらない |
| `toggle` | 今日以外の日を編集トグルで開ける／開けるエディタは常に高々1つ／保存済みはその日の欄にだけ出る／完了を押すと本文が HTML で表示される |
| `all` | 上記すべて |

`toggle` は今日が月初(1日)だと対象日が取れず FAIL する（未来の日は一覧に出ないため、
同じ月に「今日より前の日」が無い）。日を跨いで再実行するか、当月にもう1件データを
追加してから再実行すること。

スクリーンショット → `var/shots/*.png`。サーバログ → `/tmp/niki-server.log`。

`month` シナリオには**今月以外の月**が必要。左のリストは「最古の日記の月から今月まで」
なので、日記が1つも無い（または今月しか無い）と今月しか並ばない。無ければ入れてから実行する。

```bash
docker exec -i niki_dev_pg psql -U niki -d niki \
  -c "INSERT INTO diaries(date,text) VALUES ('2026-07-15','<p>先月の日記</p>') ON CONFLICT (date) DO NOTHING;"
```

DB を初期状態に戻したいとき：

```bash
docker exec -i niki_dev_pg psql -U niki -d niki -c "TRUNCATE diaries;"
```

### 4. 後片付け

```bash
kill "$(cat /tmp/niki-server.pid)" && rm -f /tmp/niki-server.pid
docker rm -f niki_dev_pg
```

`pkill -f 'node dist/main.js'` は使わないこと。**自分のコマンド行自身にマッチして
セッションのシェルごと落ちる**し、ホストで動いている他人の node プロセスにも
当たって `Operation not permitted` になる。

## Run (human path)

ブラウザで見たいだけなら、上の 1〜2 を実行して `http://127.0.0.1:3000/` を開く。
停止は起動したシェルで Ctrl-C。

コードをいじりながら見るなら `make dev`（= `_scripts/dev.sh`）のほうが早い。server を一度
ビルドしてから watcher を3本（`tsc --watch` / `vite build --watch` /
`ts-node-dev`）立ち上げる。ただし **postgres は面倒を見ない**ので、先に上の 1 の
使い捨てコンテナを立ててから実行すること。DB が無いと API リクエストは
エラーにならず**ハングする**。

```bash
make dev        # Ctrl-C で全部止まる
```

エージェントが `make dev` を使うときは `setsid` で包むこと（下記 Gotchas 参照）。

## Test

`client` のユニットテストは vitest で通る。ただし `server/protocol` を型で参照する
テストコード（`calendar.ts` 経由）があるので、**先に server をビルドしておく**こと
（Build の順序と同じ理由）。

```bash
cd server && npm run build && cd ..   # 先に。無いと client の型解決が壊れる
cd client && npm run test:unit        # vitest run
```

純粋関数(`calendar.ts` の月・日組み立て)に加えて、jsdom 上のコンポーネント
テストもここでカバーする(`DiaryList.spec.ts` は本物の Quill ごと
`DiaryEntry`/`DiaryEditor` をマウントして、`emits` 未宣言によるネイティブ
`change` のフォールスルーを固定している。`IndexPage.spec.ts` は fetch を
差し替えて月フェッチの解決順を入れ替え、古い月の応答が新しい月のページに
紛れ込まないことを固定している)。**上記のドライバ**が受け持つのは
実ブラウザでしか出ない領域 — 保存キューの実挙動・実際の API 往復・
月の移動やトグルの操作系で、そちらは 20/20 通る。両方揃って初めて
アプリ全体をカバーしている。

## Gotchas

- **本番コンテナが同居している。** `docker ps` に `niki_postgres` / `niki_web` が
  いる。使い捨て側は名前を `niki_dev_pg` にして衝突を避けている。本番の postgres は
  ホストにポートを公開していないので、`-p 127.0.0.1:5432:5432` で立てた使い捨て側が
  `DATABASE_HOST=127.0.0.1` で拾われる。**本番を停止したり向け先を変えたりしないこと。**
- **ポートは 3000。** `main.ts` が `new Server(3000)` とハードコードしている。
- **どの日も編集できる／編集モードは日ごとのトグル。** `DiaryEntry.vue` は
  `isToday` では分岐しない。各日の見出し右の `.diary__edit-toggle` を押した日だけ
  Quill が描画され(`DiaryEditor` のルート = `.quill-editor`)、それ以外は
  読み取り専用の HTML。一度に開ける
  エディタは高々1つ(`IndexPage` の `editingDate`)で、今日は初期状態で開いている。
  `save`/`queue`/`error`/`month` はいずれも今日だけを触るので、
  `openEditor()`(既定引数が今日)は `aria-pressed` が既に `"true"` のまま
  エディタを待つだけで、トグルの `page.click()` 自体は通らない。
  今日以外の日を実際にクリックでトグルする経路は `toggle` シナリオが受け持つ。
- **`.ql-editor` はエディタの目印にならない。** 読み取り専用の本文
  (`.diary__body`)も `.ql-snow > .ql-editor` の入れ子で描かれる。Quill は
  箇条書きの階層を `<li>` の `data-list` と `ql-indent-N` で表し、字下げも
  行頭マーカーも `.ql-editor` 配下の CSS でしか描かないので、表示側も同じ
  クラスを着せている。ドライバでエディタを指すときは `.quill-editor`
  (`DiaryEditor` のルート)で絞ること。`.ql-editor` だけで待つと、
  閉じたはずのエディタが「まだある」ように見える。
- **`.save-status` は日ごとに出るので同時に複数存在しうる。** `IndexPage` は
  `statuses`(日付キーの `Map`)を持ち、`DiaryEntry` は自分の日のエントリがあれば
  それを、無ければ編集中のときだけ `idle` を出す(`DiaryList` の `statuses` prop
  経由)。つまり「保存待ち/保存中/保存失敗/保存済みの日」+「編集中の日」の分だけ
  `.save-status` が同時に並びうる。ドライバの `document.querySelector('.save-status')`
  は DOM 順で最初の1つ(日付降順の先頭)を拾っているだけで、今日しか編集しない
  既存シナリオではそれで足りている。特定の日を狙うときは
  `.diary[data-date="YYYY/MM/DD"] .save-status` のように絞ること。
- **Playwright 公式イメージにブラウザはあるが `playwright` パッケージは無い。**
  `/ms-playwright` に chromium 等は入っているのに `npm root -g` には playwright が
  無いので、`NODE_PATH=/work/var/driver/node_modules` で host 側に入れたものを渡している。
- **`docker run` に `--user` を付けないとゴミが消せなくなる。** コンテナは既定で root
  なので、`-v "$PWD":/work` 越しに書かれる `var/shots/*.png` がホスト側に **root 所有**で
  残る。sudo が使えないと `rm -rf` も `git worktree remove` も
  `Permission denied` で失敗する（実際に踏んだ: https://code.ledyba.org/ledyba/niki/pulls/7）。
  `--user "$(id -u):$(id -g)"` で回避する。
  Playwright 公式イメージは非 root でも問題なく動く（`HOME` の指定も不要）。
  もう作ってしまった場合はコンテナ経由で消す:
  `docker run --rm -v "$PWD/var":/v alpine rm -rf /v/shots`
- **ESM の bare import は `NODE_PATH` を見ない。** そのため `driver.mjs` は
  `import ... from 'playwright'` ではなく `createRequire(import.meta.url)('playwright')`
  で読んでいる。ここを普通の import に「直す」と `ERR_MODULE_NOT_FOUND` で落ちる。
- **client のビルドには先に server のビルドが要る。** client は共有型を
  `import * as protocol from 'server/protocol'` で参照し、これは server の
  `package.json` の `exports` 経由で `server/dist/protocol.d.ts` に解決される。
  `server/dist` が無いと client は `TS2307: Cannot find module 'server/protocol'` で落ちる。
  上の Build の順序（server → client）はこのため。Dockerfile も dev.sh も同じ順序。
- **`make dev` は client の型を検査しない。** client 側の watcher は `vite build --watch`
  で、esbuild は型を落とすだけで検査しない。共有型の `server/dist/protocol.d.ts` は
  server の `watch:types`(`tsc --watch`)が更新し続けるので、`server/src/protocol.ts` を
  触れば最新にはなるが、それを client が正しく使えているかは誰も見ていない。client の
  型を確かめたいときは `cd client && npm run typecheck`(vue-tsc)を別途叩く。
- **`make dev` を非対話で起動するなら `setsid` で包む。** 終了時の trap が `kill 0` で
  プロセスグループ全体を落とすが、非対話シェルから起動すると呼び出し元と同じ
  プロセスグループになるため、**呼び出し元のシェルごと道連れになる**。
  対話シェルからならジョブ制御で独自のグループになるので問題ない。
  停止は `kill -TERM -<pgid>`。
- **クライアントの変更はビルドしないと反映されない。** サーバは `client/dist` を
  配信しているだけなので、`npm run build` を忘れると古い画面を見ることになる。

## Troubleshooting

- **`npm error code ENOSPC` / `no space left on device`**: `npm ci` は client だけで
  1500 パッケージ以上入れる。`df -h /opt` で空きを確認する。ディスクが埋まっていると
  途中まで展開された `node_modules` が残るので、`rm -rf client/node_modules` してから
  やり直す。
- **`var/shots` が消せない / `git worktree remove` が `Permission denied`**: `--user` 無しで
  ドライバを回して root 所有のファイルが残っている。`find . ! -user "$(id -un)"` で確認し、
  `docker run --rm -v "$PWD/var":/v alpine rm -rf /v/shots` で消す。
- **`Cannot find package 'playwright'` / `Cannot find module 'playwright'`**:
  Setup の `npm i --no-save --prefix var/driver` を飛ばしたか、`docker run` に
  `-e NODE_PATH=/work/var/driver/node_modules` を渡し忘れている。
- **`error while loading shared libraries: libatk-1.0.so.0`**: ホストで直接
  Playwright の Chromium を起動しようとしている。ホストには依存ライブラリが無く
  パスワード無し `sudo` も通らない。必ずコンテナ経由で走らせる。
- **ドライバが `.quill-editor` の待機でタイムアウトする**: サーバが上がっていないか、
  `client/dist` が未ビルド。`curl http://127.0.0.1:3000/` と `/tmp/niki-server.log` を見る。
- **`month` シナリオだけ落ちる**: 今月以外の月のデータが無い。上記の `INSERT` を流す。
