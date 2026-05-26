# CTR-INFRA-READONLY-BI-GRANT — `readonly_bi` recebe `Access denied` no login

## Origem

Descoberto em 2026-05-26 ao fechar `CTR-PERIOD-PLAIN-DATE-SCHEMA`, quando o daemon
Docker passou a responder e a suíte de infra (antes `skipped`) rodou. **Não é regressão
desse ticket** — é pré-existente, apenas estava mascarada pelo skip-guard de Docker.

## Sintoma

`tests/infra/mysql-compose.test.ts:205` — `CA-5: readonly_bi consegue SELECT` falha:

```
ERROR 1045 (28000): Access denied for user 'readonly_bi'@'localhost' (using password: YES)
```

A falha ocorre no **login**, antes de qualquer query. `CA-6` (readonly_bi NÃO consegue
CREATE TABLE) passa apenas por acidente: o login negado também faz o CREATE falhar com
`Access denied`, satisfazendo o `assert.match(/denied|access/)`.

`CA-4` (core_app conecta) passa — o problema é específico do usuário `readonly_bi`.

## Hipóteses a investigar

1. O init script (`initdb.d`) do `compose.yaml` não cria `readonly_bi`, ou cria com
   senha que não corresponde ao secret `mysql_readonly_password` / `DUMMY_RO_PWD`.
2. `caching_sha2_password` vs plugin de auth do usuário readonly.
3. Host do GRANT (`'readonly_bi'@'%'` vs `@'localhost'`) — o teste conecta via cliente
   dentro do container (`localhost`).

## Critérios de aceitação

- CA1: `pnpm test` com Docker vivo → `CA-5: readonly_bi consegue SELECT` verde.
- CA2: `readonly_bi` autentica e faz `SELECT 1` retornando `1`.
- CA3: `CA-6` segue verde **pela razão certa** (GRANT sem DDL), não por login negado.

## Fora de escopo

- Mudança de engine de auth global (ADR-0013/0020 fixam `caching_sha2_password`).
