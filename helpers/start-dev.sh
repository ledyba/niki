#!/bin/bash

ROOT_DIR="$(cd "$(readlink -f "$(dirname "$0")")" && cd .. && pwd)"
cd "${ROOT_DIR}" || exit 1

trap kill_all SIGINT

function kill_all() {
  echo
  echo killing...
  kill 0 > /dev/null 2>&1
}

(cd client && npm run watch &)
(cd server && npm run watch &)
wait
