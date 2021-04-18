#!/bin/bash

set -eu
set -o pipefail

echo -n "[Waiting Postgres] "
export PGPASSWORD=niki
while ! psql '--username=niki' '--host=db' -c 'SELECT NOW();' > /dev/null  2>&1; do
  echo -n '.'
  sleep 1
done
echo 'OK'
