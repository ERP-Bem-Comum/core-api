#!/bin/sh
# ─────────────────────────────────────────────────────────────────────────────
# Init script — cria database `core` (idempotente), `core_app` (escritor único)
# e `readonly_bi` (SELECT). Roda APENAS na primeira inicialização do volume,
# convenção da imagem oficial `mysql:8.4`.
#
# Sustentação:
#   - ADR-0014 §"Decisão" — single-DB `core`, GRANT estrito por user
#   - ADR-0014 §"Regra de ouro" — cada database tem UM único escritor
#   - ADR-0020 §"Database (decisão #1)" — apenas `core` neste ticket
#   - Audit security M-3 (resolvido) — senhas via Docker secrets, NUNCA env vars
#
# Imagem oficial mysql NÃO interpola env vars dentro de arquivos `.sql`. Por
# isso este wrapper bash lê `/run/secrets/*` e gera SQL dinamicamente via
# heredoc. Docs Docker Compose §"Manage secrets securely" + Docker Hub `_mysql_`.
# ─────────────────────────────────────────────────────────────────────────────

set -eu

APP_PASSWORD="$(cat /run/secrets/mysql_app_password)"
READONLY_PASSWORD="$(cat /run/secrets/mysql_readonly_password)"
ROOT_PASSWORD="$(cat /run/secrets/mysql_root_password)"

mysql --user=root --password="$ROOT_PASSWORD" <<SQL
-- O CREATE DATABASE também é feito pelo MYSQL_DATABASE env, mas explicitamos
-- para forçar charset/collation. Defesa em profundidade — server.cnf cobre o
-- default global, esta linha cobre o database específico.
CREATE DATABASE IF NOT EXISTS \`core\`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- core_app — escrita total em core.*, ZERO acesso em qualquer outro database.
-- ADR-0014 §"Regra de ouro": cada database tem UM único escritor.
CREATE USER IF NOT EXISTS 'core_app'@'%'
  IDENTIFIED WITH caching_sha2_password
  BY '${APP_PASSWORD}';
GRANT ALL PRIVILEGES ON \`core\`.* TO 'core_app'@'%';

-- readonly_bi — SELECT em core para BI/relatórios futuros.
-- ADR-0014 §"Estrutura": "readonly_bi: SELECT em ambos" (aqui só core até
-- legacy ser provisionado em ticket futuro).
CREATE USER IF NOT EXISTS 'readonly_bi'@'%'
  IDENTIFIED WITH caching_sha2_password
  BY '${READONLY_PASSWORD}';
GRANT SELECT ON \`core\`.* TO 'readonly_bi'@'%';

FLUSH PRIVILEGES;

-- Verificação visível no log do container (útil em troubleshooting):
SELECT 'users provisionados' AS info, User, Host
  FROM mysql.user
  WHERE User IN ('core_app', 'readonly_bi')
  ORDER BY User;
SQL

echo "[init] core_app + readonly_bi provisionados com GRANT estrito (ADR-0014)."
