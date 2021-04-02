#!/bin/bash

echo -n "[Waiting mysqld]"
while ! mysql '--protocol=tcp' '--user=root' '--password=root' '--host=db' -e 'SELECT NOW();' > /dev/null 2>&1; do
  echo -n '.'
  sleep 1
done
echo 'OK'
