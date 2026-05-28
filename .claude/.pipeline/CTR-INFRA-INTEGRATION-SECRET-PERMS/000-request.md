# CTR-INFRA-INTEGRATION-SECRET-PERMS — Request

**Size:** S
**Origem:** achado de uma avaliação E2E com infra real (smoke manual da CLI contra MySQL 8.4),
2026-05-26. Dívida residual deixada pelo commit `948b76c` (`fix(infra): secret 0644 destrava
readonly_bi no seed do MySQL`, fecha `CTR-INFRA-READONLY-BI-AUTH`).

## Problema

O seed `docker/mysql/initdb.d/01-databases-and-users.sh` roda como o user `mysql` (uid 999),
após o step-down `gosu` do entrypoint oficial, e lê os secrets via `cat /run/secrets/*` sob
`set -eu` (`01-databases-and-users.sh:18,20-22`). Com o secret em **`0600`** owned pelo uid do
host (bind-mount do `compose` preserva uid/gid/mode), o `cat` falha com *Permission denied*, o
script aborta e `readonly_bi` nunca é criado.

O commit `948b76c` corrigiu **dois** dos três pontos que materializam o secret em `0600`:

- `scripts/setup-secrets.ts` → `writeAtomic(file, password, 0o644)` (`:218`, comentário `:210-217`).
- `tests/infra/mysql-compose.test.ts` → `writeSecrets()` usa `0o644`.

Mas deixou intacto o **terceiro**: o script inline `package.json#scripts.test:integration`, que
ainda cria os secrets com:

```
chmod 600 secrets/mysql_*.txt
```

Consequência observada na avaliação E2E (2026-05-26):

1. Subindo o stack à mão com `chmod 600` (replicando o que `test:integration` faz), o seed
   aborta com `cat: /run/secrets/mysql_app_password: Permission denied`, o container entra em
   restart loop e `docker compose up -d mysql --wait` **falha com RC=1**. Com `chmod 644` o
   container sobe `healthy` de primeira. Reprodução direta do bug que `948b76c` dizia ter
   fechado — só que pelo caminho do `test:integration`.

2. O `pnpm run test:integration` ainda assim **passa (82/82)** hoje porque seus testes usam o
   user `core_app` (criado pelo entrypoint **como root**, antes do step-down — escapa do `0600`)
   e **nenhum** deles exercita `readonly_bi`. O `--wait`, com `start_period: 30s` + `retries: 10`,
   tolera o restart e eventualmente vê `healthy` — mas com `readonly_bi` **ausente**. Ou seja: o
   script mascara a falha do seed; o bug fica latente e a postura "single-DB com readonly_bi
   provisionado" (ADR-0014 §"Estrutura") não é de fato validada pela suíte de integração.

## Objetivo

Eliminar a divergência de permissão de secret entre `test:integration` e o par já corrigido
(`setup-secrets.ts` + `mysql-compose.test.ts`), de forma que o seed `readonly_bi` rode com
sucesso no caminho de integração e a falha deixe de ser mascarada.

## Proposta (a refinar no W0/W1)

- Alterar `package.json#scripts.test:integration`: `chmod 600 secrets/mysql_*.txt` →
  `chmod 644 secrets/mysql_*.txt`.
- Avaliar no W0 se vale extrair a criação de secrets para `pnpm run secrets:setup` (que já grava
  `0o644`) em vez de duplicar `printf`/`chmod` inline — removendo a fonte de divergência na raiz.
  Decidir pelo design mais simples que não acople o teste a um prompt interativo.

## Critérios de aceite

- **CA-1:** `package.json#scripts.test:integration` cria os secrets com `0644` (ou delega a
  `secrets:setup`), sem nenhum `chmod 600` remanescente no script.
- **CA-2:** Teste de regressão que comprova que, com a permissão usada pelo `test:integration`,
  o seed `01-databases-and-users.sh` completa e `readonly_bi` é criado (`SELECT` em
  `mysql.user WHERE User='readonly_bi'` retorna a row) — fechando o gap que a suíte atual não
  cobre. Reaproveitar/estender `tests/infra/mysql-compose.test.ts` se couber.
- **CA-3:** `docker compose up -d mysql --wait` sobe `healthy` na **primeira** tentativa com a
  permissão do `test:integration` (sem restart loop). Documentar a evidência no W0.
- **CA-4:** `grep -rn 'chmod 600' package.json` (e demais scripts/docs versionados) não retorna
  ocorrência para secrets de MySQL.
- **CA-5:** `pnpm run test:integration` segue verde após a mudança (82/82 ou superior).
- **CA-6:** Postura de segurança preservada — `0644` = `rw-r--r--`, sem write para group/world
  (mesma garantia das CA-16/CA-17 de `CTR-INFRA-READONLY-BI-AUTH`); nenhum secret commitado.

## Notas

- Bug fix de 1 linha no `chmod` é tecnicamente trivial, mas CA-2/CA-3 (regressão que prova o
  seed e o boot healthy) justificam o W0 RED — sem ele o bug volta na próxima edição do script,
  exatamente como voltou aqui após `948b76c`.
- Não tocar `src/`. Mudança restrita a `package.json` (+ teste de infra). Não cruza módulos
  (`ctr_*`/`fin_*`), não ofende ADR-0014.
