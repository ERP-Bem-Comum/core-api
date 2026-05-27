# W1 — Implementação mínima

**Agente:** pnpm-workspace-expert
**Resultado:** **GREEN — 3 testes, 3 pass, 0 fail** ✅

## Mudança (mínima, YAGNI)

`package.json:30` — script `test:integration`:

```diff
- ... && chmod 600 secrets/mysql_*.txt && docker compose up -d mysql --wait && ...
+ ... && chmod 644 secrets/mysql_*.txt && docker compose up -d mysql --wait && ...
```

Uma única troca de `600` → `644`. Não extraí a criação de secrets para `secrets:setup`
(alternativa levantada no request): seria acoplamento desnecessário (o `secrets:setup` tem
caminho interativo) e foge do mínimo. O número correto resolve a regressão e alinha o script a
`scripts/setup-secrets.ts:218` (`0o644`) e ao `writeSecrets()` de `mysql-compose.test.ts`.

## Por que 0644 e não 0600

O seed `docker/mysql/initdb.d/01-databases-and-users.sh:18-22` roda como o user `mysql`
(uid 999, após step-down `gosu` do entrypoint) e lê `/run/secrets/*` via `cat` sob `set -eu`.
O bind-mount do compose preserva uid/gid/mode do host; com `0600` owned pelo uid do host, o uid
`mysql` não tem read-bit → *Permission denied* → seed aborta → `readonly_bi` não criado. `0644`
dá read a `others` (sem write) — postura preservada (CA-6).

## Verificação

```
ℹ tests 3
ℹ pass 3
ℹ fail 0
```

Validação funcional do boot healthy + `test:integration` verde fica no W3.
