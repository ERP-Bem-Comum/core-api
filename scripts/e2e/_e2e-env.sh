#!/usr/bin/env bash
# scripts/e2e/_e2e-env.sh — ambiente efêmero dos smokes E2E, sem destruir o dev local (#517).
#
# Os quatro scripts de e2e repetiam, cada um por sua conta, o padrão que a #500 já tinha corrigido
# no runner de integração: `docker compose down -v` SEM `-p` (projeto default `core-api-dev` → apaga
# o volume do dev) e `rm -f secrets/mysql_*.txt` SEM backup (apaga os secrets do dev). Rodar
# `pnpm run test:e2e:*` custava o ambiente local de quem rodou.
#
# A lógica vive AQUI, num lugar só, e não copiada quatro vezes — foi a cópia que deixou os quatro
# para trás quando a #500 consertou o runner.
#
# Equivalente shell de `scripts/ci/compose-project.ts` e `scripts/ci/secrets-vault.ts`. A paridade
# é intencional e está coberta por `tests/scripts/e2e-scripts-non-destructive.test.ts`.
#
# Uso, a partir da raiz do repositório:
#   source scripts/e2e/_e2e-env.sh
#   e2e_setup                      # backup dos secrets do dev + escrita dos de teste
#   e2e_compose up -d mysql --wait # sempre no projeto isolado
#   trap e2e_teardown EXIT         # derruba o projeto de teste e RESTAURA os secrets do dev

# Projeto Docker isolado. O mesmo nome que o runner de integração usa
# (`TEST_COMPOSE_PROJECT` em scripts/ci/compose-project.ts): `down -v` aqui remove o volume
# `core-api-test_*` e nunca o `mysql-data` do dev.
E2E_COMPOSE_PROJECT="${E2E_COMPOSE_PROJECT:-core-api-test}"

# Os três secrets que os smokes sobrescrevem.
E2E_SECRET_FILES=(
  mysql_root_password.txt
  mysql_app_password.txt
  mysql_readonly_password.txt
)

E2E_SECRETS_BACKUP=""

# `-p <projeto>` vem ANTES do subcomando — depois dele o docker compose o ignora em silêncio,
# que é justamente como o `down -v` acabava no projeto do dev.
e2e_compose() {
  docker compose -p "$E2E_COMPOSE_PROJECT" "$@"
}

e2e_setup() {
  E2E_SECRETS_BACKUP="$(mktemp -d)"
  mkdir -p secrets

  # Guarda o que já existia. `cp -p` preserva modo e timestamps, para o dev recuperar idêntico.
  for f in "${E2E_SECRET_FILES[@]}"; do
    if [ -f "secrets/$f" ]; then
      cp -p "secrets/$f" "$E2E_SECRETS_BACKUP/$f"
    fi
  done

  printf 'rootpw-migration-test-only' > secrets/mysql_root_password.txt
  printf 'apppw-migration-test-only' > secrets/mysql_app_password.txt
  printf 'ropw-migration-test-only' > secrets/mysql_readonly_password.txt
  # 0644 e não algo mais restrito: o seed do `readonly_bi` roda como uid `mysql` e lê os arquivos
  # via `cat` — modo mais fechado, owned pelo host, faz o seed abortar por Permission denied
  # (mesma invariante registrada em scripts/ci/secrets-vault.ts).
  chmod 644 secrets/mysql_*.txt
}

# Restaura o que existia; REMOVE o que não existia. Quem não tinha secrets continua sem, e quem
# tinha recupera os seus — os dois casos que o `rm -f` cego tratava igual.
e2e_restore_secrets() {
  [ -n "$E2E_SECRETS_BACKUP" ] || return 0
  for f in "${E2E_SECRET_FILES[@]}"; do
    if [ -f "$E2E_SECRETS_BACKUP/$f" ]; then
      cp -p "$E2E_SECRETS_BACKUP/$f" "secrets/$f"
    else
      rm -f "secrets/$f"
    fi
  done
  rm -rf "$E2E_SECRETS_BACKUP"
  E2E_SECRETS_BACKUP=""
}

e2e_teardown() {
  e2e_compose down -v >/dev/null 2>&1 || true
  e2e_restore_secrets
}
