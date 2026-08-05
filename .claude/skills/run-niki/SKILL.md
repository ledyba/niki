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
  -e NODE_PATH=/work/var/driver/node_modules \
  mcr.microsoft.com/playwright:v1.62.1-noble \
  node .claude/skills/run-niki/driver.mjs all
```

末尾に `===== 15/15 PASS =====` が出れば全部通っている。失敗すると exit 1。

| 引数 | 何を確かめるか |
|---|---|
| `save` | 打鍵 → `保存中` → `☑ 保存しました`、リロードしても本文が残る（既定） |
| `queue` | 保存中の追加編集：スピナー継続・同時POSTは最大1本・キュー1個で再送 |
| `error` | POST 失敗で `✖ エラー：...`、自動リトライしない、次の編集で復帰 |
| `month` | 保存中に月を往復しても保存機構が固まらない |
| `all` | 上記すべて |

スクリーンショット → `var/shots/*.png`。サーバログ → `/tmp/niki-server.log`。

`month` シナリオには**今月以外の月**が必要。無ければ入れてから実行する。

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
ビルドしてから watcher を3本（`tsc --watch` / `vue-cli-service build --watch` /
`ts-node-dev`）立ち上げる。ただし **postgres は面倒を見ない**ので、先に上の 1 の
使い捨てコンテナを立ててから実行すること。DB が無いと API リクエストは
エラーにならず**ハングする**。

```bash
make dev        # Ctrl-C で全部止まる
```

エージェントが `make dev` を使うときは `setsid` で包むこと（下記 Gotchas 参照）。

## Test

ユニットテストは**壊れているので当てにしない**。

```bash
cd client && npm run test:unit    # → exit 1: Module not found: '@/components/HelloWorld.vue'
```

scaffold 時の雛形テストが、既に削除された `HelloWorld.vue` を参照したまま残っている。
**このアプリの実質的なテストは上記のドライバ**で、そちらは 15/15 通る。

## Gotchas

- **本番コンテナが同居している。** `docker ps` に `niki_postgres` / `niki_web` が
  いる。使い捨て側は名前を `niki_dev_pg` にして衝突を避けている。本番の postgres は
  ホストにポートを公開していないので、`-p 127.0.0.1:5432:5432` で立てた使い捨て側が
  `DATABASE_HOST=127.0.0.1` で拾われる。**本番を停止したり向け先を変えたりしないこと。**
- **ポートは 3000。** `main.ts` が `new Server(3000)` とハードコードしている。
  Dockerfile の `EXPOSE 8888`、`compose.yml` の `expose: 8888`、README の `:8888` は
  すべて古い記述で実体と合っていない。
- **保存インジケーターは「今日」の欄にしか出ない。** `DiaryEntry.vue` が `isToday` の
  ときだけ Quill と `.save-status` を描画し、それ以外の日は読み取り専用の HTML。
  ドライバが `.ql-editor` を待つのはそのため。
- **Playwright 公式イメージにブラウザはあるが `playwright` パッケージは無い。**
  `/ms-playwright` に chromium 等は入っているのに `npm root -g` には playwright が
  無いので、`NODE_PATH=/work/var/driver/node_modules` で host 側に入れたものを渡している。
- **ESM の bare import は `NODE_PATH` を見ない。** そのため `driver.mjs` は
  `import ... from 'playwright'` ではなく `createRequire(import.meta.url)('playwright')`
  で読んでいる。ここを普通の import に「直す」と `ERR_MODULE_NOT_FOUND` で落ちる。
- **`npm run lint` は通らない。** `eslint@9.33` に対して `@vue/cli-plugin-eslint@5.0.8`
  が ESLint 8 で削除済みの API（`extensions`, `useEslintrc` 等）を渡すため、対象ファイルに
  到達する前に `new ESLint()` で落ちる。無改変の magistra でも同じなので、自分の変更を
  疑わなくてよい。`vue.config.js` の `lintOnSave: false` も同じ理由。
- **client のビルドには先に server のビルドが要る。** client は共有型を
  `import * as protocol from 'server/protocol'` で参照し、これは server の
  `package.json` の `exports` 経由で `server/dist/protocol.d.ts` に解決される。
  `server/dist` が無いと client は `TS2307: Cannot find module 'server/protocol'` で落ちる。
  上の Build の順序（server → client）はこのため。Dockerfile も dev.sh も同じ順序。
- **`protocol.ts` の変更は client の型検査に即時反映されない。** fork-ts-checker が
  `node_modules` 配下を監視しないので、`make dev` 中に `server/src/protocol.ts` を
  編集しても client 側は古い `.d.ts` を見たまま（`TS2694: Namespace ... has no exported
  member` になる）。client の watcher ごと再起動する。
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
- **`Cannot find package 'playwright'` / `Cannot find module 'playwright'`**:
  Setup の `npm i --no-save --prefix var/driver` を飛ばしたか、`docker run` に
  `-e NODE_PATH=/work/var/driver/node_modules` を渡し忘れている。
- **`error while loading shared libraries: libatk-1.0.so.0`**: ホストで直接
  Playwright の Chromium を起動しようとしている。ホストには依存ライブラリが無く
  パスワード無し `sudo` も通らない。必ずコンテナ経由で走らせる。
- **ドライバが `.ql-editor` の待機でタイムアウトする**: サーバが上がっていないか、
  `client/dist` が未ビルド。`curl http://127.0.0.1:3000/` と `/tmp/niki-server.log` を見る。
- **`month` シナリオだけ落ちる**: 今月以外の月のデータが無い。上記の `INSERT` を流す。
