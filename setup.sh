#!/bin/bash
ROOT_DIR="$(cd "$(readlink -f "$(dirname "$0")")" && pwd)"
cd "${ROOT_DIR}" || exit 1

set -eu
set -o pipefail

docker-compose run \
  --rm \
  -e 'FLYWAY_CONFIG_FILES=/flyway/conf/flyway.conf' \
  flyway migrate

