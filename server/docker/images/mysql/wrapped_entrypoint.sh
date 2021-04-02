#! /bin/bash

set -eu

if [ "${MYSQL_GROUP_ID+foo}" ] && [ -n "${MYSQL_GROUP_ID}" ] ; then
  groupmod -g "${MYSQL_GROUP_ID}" mysql
  usermod  -g "${MYSQL_GROUP_ID}" mysql
fi

if [ "${MYSQL_USER_ID+foo}" ] && [ -n "${MYSQL_USER_ID}" ] ; then
  usermod -u "${MYSQL_USER_ID}" mysql
fi

docker-entrypoint.sh "$@"
