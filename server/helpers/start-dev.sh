#!/bin/bash

SRV_DIR="$(cd "$(readlink -f "$(dirname "$0")")" && cd .. && pwd)"

trap kill_all SIGINT

function kill_all() {
  echo
  echo killing...
  kill 0 > /dev/null 2>&1
}

(cd ../client && npm run watch &)
npm run server &
wait
