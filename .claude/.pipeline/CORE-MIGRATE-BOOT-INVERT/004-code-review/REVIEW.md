# Code Review — CORE-MIGRATE-BOOT-INVERT (Slice B) — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer (skill)
**Escopo revisado:** 5 compositions HTTP; 4 scripts `e2e-*.sh`; `compose.yaml` (depends_on +
profiles + comentários); `tests/infra/migrate-boot-inversion.test.ts` (novo);
`tests/infra/migrate-compose.test.ts` (guard CA9 removido).

---

## Avaliação

### Invariante do boot (núcleo do Slice B)

- As **5** compositions HTTP usam `applyMigrations: false` (CA-B1 verde) com comentário explicando
  o porquê (deploy-safe, M5). Nenhuma esquecida. ✅
- `http.depends_on.migrate.condition == service_completed_successfully`; `migrate` nos profiles
  `app`/`workers`/`jobs`; default segue só-infra (CA-B2/B2b/B4). ✅
- 4 scripts E2E rodam `src/jobs/migrate/run.ts` **antes** do boot do server (CA-B3), com a connection
  string do próprio script (root@…/core — root tem privilégio de DDL para as migrations). ✅

### Qualidade

- `eslint` verde nos `.ts` do Slice B (compositions + testes). ✅
- Comentários desatualizados ("http aplica migrations no boot") corrigidos no `x-worker-base` e no
  bloco `http`. Nenhuma menção obsoleta restante. ✅
- Guard CA9 do Slice A removido corretamente (invariante invertido); cabeçalho do
  `migrate-compose.test.ts` aponta o Slice B. ✅
- Zero `throw` novo, zero regressão de tipo.

## Observações (🔵 não-bloqueia)

- Os e2e agora migram os **6** módulos (o job é global) mesmo quando o teste exercita só um (ex.:
  `e2e-auth`). Inócuo (cria tabelas não usadas); acopla o e2e ao sucesso de todas as migrations —
  aceitável, pois uma migration que falha é bug real a ser pego.
- `e2e-collaborators.sh` está DEPRECATED (ADR-0034) mas foi ajustado para não quebrar enquanto existe.

## Próximo passo

APPROVED → W3 (gate completo + **validação Docker real**: migrate cria o schema; http sobe com
`applyMigrations:false` e responde `/health`).
