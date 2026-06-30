# W3 — Gate de qualidade · AUTH-ETL-USER-FIELDS

**Outcome**: GREEN ✅ · **Agente**: ts-quality-checker · **Issue**: #277

## Gates canônicos — todos verdes

| Gate | Resultado |
|---|---|
| `pnpm run typecheck` | ✅ |
| `pnpm run format:check` | ✅ "All matched files use Prettier code style!" |
| `pnpm run lint` | ✅ `eslint .` sem erros |
| `pnpm test` | ✅ 3248 tests · **3230 pass · 0 fail** · 18 skipped |

Os 6 RED do W0 → GREEN; retrocompat (CA4) preservada; sem regressão.

## W2 — achados não-bloqueantes (registrados)

3 Minor (0 Blocker/Major): M1 `process.stderr.write` na application (espelha read-mapper login-500; follow-up de `Logger` port), M2 `unbound-method: off` em `tests/**` (aceito), M3 `String()` redundante (nit). Nenhum bloqueia.

## Validação E2E na VM (CA5)

A seguir (pós-commit/push): atualizar a VM para `fix/277`, limpar `auth_user`/`par_user_profiles`, re-rodar o ETL → usuários migram com `name/cpf/telephone/collaborator_id`; `GET /users` mostra os nomes reais (não "—"). `test:integration:{auth,etl}` (Docker) roda no CI.
