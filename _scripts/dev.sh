#!/bin/bash
ROOT_DIR="$(cd "$(readlink -f "$(dirname "$0")")" && cd .. && pwd)"
cd "${ROOT_DIR}" || exit 1

set -eu
set -o pipefail

# client は共有の型定義を 'server/protocol' として import する。これは server の
# package.json の exports 経由で server/dist/protocol.d.ts に解決されるので、
# 監視を始める前に一度 server をビルドして型定義を用意しておく。無いと client 側が
# TS2307 (Cannot find module 'server/protocol') で落ちる。
echo "building shared types..."
(cd server && npm run build)

# 以降 dist/ を作り直し続ける係。かつて独立した protocol パッケージが tsc --watch で
# やっていた役で、下の server の watch は ts-node-dev が src から直接動かすため dist を
# 吐かない。これで (a) protocol.ts を編集しても dist/protocol.d.ts が正しいままになり、
# (b) ts-node-dev が読み込んだファイルだけでなくプロジェクト全体が型検査され続ける。
#
# ただし client 側の型検査は走らない: 下の client の watch は vite build --watch で、
# vite (esbuild) は型を落とすだけで検査しない。client の型が知りたいときは
# `cd client && npm run typecheck` (vue-tsc) を別途叩くこと。
(cd server && npm run watch:types) &
TYP="$!"
(cd client && npm run watch) &
CLI="$!"
(cd server && npm run watch) &
SRV="$!"

trap kill_all EXIT

function kill_all() {
  echo
  echo killing...
  kill 0 > /dev/null 2>&1
}
wait "${TYP}"
wait "${CLI}"
wait "${SRV}"
