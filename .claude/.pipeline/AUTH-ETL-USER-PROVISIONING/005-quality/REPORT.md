# W3 — QUALITY GATE · AUTH-ETL-USER-PROVISIONING

**Skill:** ts-quality-checker · **Outcome:** GREEN ✅ · **Data:** 2026-06-02

## Gates

| Gate | Comando | Resultado |
| --- | --- | --- |
| Typecheck | `pnpm run typecheck` (`tsc --noEmit`) | ✅ zero erros |
| Format | `pnpm run format:check` (`prettier --check .`) | ✅ (1 fix aplicado — ver nota) |
| Lint | `pnpm run lint` (`eslint .`) | ✅ zero erros |
| Testes (unit + skip dos gated) | `pnpm test` | ✅ **1891 pass · 0 fail · 16 skipped** (1907 tests / 613 suites) |
| Integração auth (home real) | `MYSQL_PORT=3307 pnpm run test:integration:auth` | ✅ **32 pass · 0 fail** |

### Nota — format (regressão zero)

`format:check` inicial acusou `tests/modules/auth/public-api/auth-etl-port.integration.test.ts` (um Edit não passou pelo hook prettier). Corrigido com `prettier --write` (só reformatação, lógica intacta) → re-check limpo: "All matched files use Prettier code style!".

### Nota — gate de integração (não falso-verde)

`pnpm test` puro **skipa** o gate auth (16 skipped incluem os 3 deste ticket — sem `MYSQL_INTEGRATION=1`). Conforme o alerta do W2 e `[[project-test-integration-auth-gap]]`, rodei o gate dedicado `test:integration:auth` no home real (MySQL 8.4 via Docker em **:3307**, porque 3306 é o ambiente `bemcomum-*` do usuário — não tocado). Resultado: **32/32 pass** (todos os testes auth de integração existentes + os 3 novos `buildAuthEtlPort`). Container e volume derrubados (`down -v`).

## Cobertura dos critérios de aceite (000-request.md)

- [x] `auth_user.legacy_id` (nullable, UNIQUE) + migration `0003` aplicável (`db:generate:auth` limpo).
- [x] `provisionLegacyUser` cria user com hash argon2 real de segredo random; segredo nunca em log/retorno/teste (verificado no W2).
- [x] Idempotência: 2ª chamada com mesmo `legacyId` → `already-exists`, **sem** reescrever (provado unit + integração).
- [x] `massApprove=true` → Role compartilhado `etl:mass-approver` (1 permission), reusado (1 linha `auth_role`).
- [x] `massApprove=false` → sem role; `authorize(contract:mass-approve)` = `forbidden`.
- [x] Login com qualquer senha falha (hash `$argon2` de segredo desconhecido) — fail-closed.
- [x] Port montável de connection-string sem Fastify; exportado pela public-api.
- [x] Teste de integração gated cobre idempotência + role compartilhado + fail-closed (provado no home).
- [x] W3 verde: typecheck + format + lint + test.

## Conclusão

**GREEN.** Todos os gates verdes; 9 CAs cumpridos. Ticket pronto para fechar.
