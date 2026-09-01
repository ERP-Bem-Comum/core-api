#!/usr/bin/env bash
# scripts/e2e/server-env.sh — as envs mínimas para o servidor real SUBIR (ADR-0068).
#
# Por que este arquivo existe: sob o ADR-0068 toda variável de ambiente lida é obrigatória, em todo
# ambiente. O `src/server.ts` compõe os SETE módulos no boot, então um smoke que exercita um só
# ainda precisa declarar a configuração de todos — antes, os módulos não citados degradavam para
# memória em silêncio, e o smoke passava sobre um servidor meio configurado.
#
# Os quatro scripts de E2E declaravam entre 1 e 4 drivers. Centralizar aqui é o que impede o quinto
# script de nascer com o mesmo buraco, e o que faz "acrescentei um módulo" ser uma edição só.
#
# Uso, ANTES de invocar `src/server.ts`:
#
#   DB="mysql://…/core" source scripts/e2e/server-env.sh
#
# Variáveis de entrada:
#   DB       (obrigatória) connection string do MySQL de teste — vale para os 6 módulos com writer
#   RO       (opcional)    réplica de leitura; ausente, os readers reusam o writer (ADR-0026)
#   S3_HOST  (opcional)    host:porta do MinIO; default é uma porta dummy local, como o
#                          `contracts.sh` já fazia — o logo não é exercitado nos smokes
#
# ⚠️ Todos os endereços apontam para o MESMO database `core`: o isolamento é por PREFIXO de tabela
# (ADR-0014), não por schema. Não é atalho de teste — é como produção roda.

: "${DB:?server-env.sh: defina DB com a connection string do MySQL de teste}"
S3_HOST="${S3_HOST:-127.0.0.1:9555}"

# Os 6 módulos com writer próprio.
export AUTH_DRIVER=mysql AUTH_DATABASE_URL="$DB"
export CONTRACTS_DRIVER=mysql CONTRACTS_DATABASE_URL="$DB"
export PARTNERS_DRIVER=mysql PARTNERS_DATABASE_URL="$DB"
export PROGRAMS_DRIVER=mysql PROGRAMS_DATABASE_URL="$DB"
export FINANCIAL_DRIVER=mysql FINANCIAL_DATABASE_URL="$DB"
export BUDGET_PLANS_DRIVER=mysql BUDGET_PLANS_DATABASE_URL="$DB"

# `reports` não tem endereço próprio: resolve os quatro por cascata a partir dos acima (FR-012).
export REPORTS_DRIVER=mysql

# Réplica de leitura é OPCIONAL (ADR-0026, fora da guarda por FR-008): ausente, reusa o writer.
if [ -n "${RO:-}" ]; then
  export CONTRACTS_READER_URL="$RO"
  export PARTNERS_READER_URL="$RO"
fi

# Storage do logo do programs (#516 + ADR-0068): obrigatório para o boot em qualquer ambiente.
# Credenciais DE PROPÓSITO ausentes onde não há MinIO — ausência das duas é caminho legítimo
# (provider chain), e é o XOR que seria erro.
export PROGRAMS_LOGO_S3_ENDPOINT="http://${S3_HOST}"
export PROGRAMS_LOGO_S3_BUCKET=programs-logo
