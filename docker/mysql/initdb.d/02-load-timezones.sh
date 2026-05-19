#!/bin/sh
# ─────────────────────────────────────────────────────────────────────────────
# Init script — carrega `mysql.time_zone*` tables do zoneinfo do SO.
#
# Sem isso, `CONVERT_TZ('2026-01-01', 'America/Sao_Paulo', 'UTC')` retorna
# NULL silenciosamente. MySQL Refman 8.4 §"MySQL Server Time Zone Support" /
# "Populating the Time Zone Tables".
#
# A imagem oficial `mysql:8.4` é Debian-based e tem `/usr/share/zoneinfo`
# completo + `mysql_tzinfo_to_sql`.
# ─────────────────────────────────────────────────────────────────────────────

set -eu

ROOT_PASSWORD="$(cat /run/secrets/mysql_root_password)"

mysql_tzinfo_to_sql /usr/share/zoneinfo \
  | mysql --user=root --password="$ROOT_PASSWORD" mysql

echo "[init] time zone tables carregadas de /usr/share/zoneinfo."
