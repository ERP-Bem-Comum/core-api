# W0 — Testes RED · AUTH-ETL-USER-FIELDS

**Outcome**: RED ✅ · **Agente**: tdd-strategist · **Issue**: #277

## Arquivos de teste (3, só `tests/`)

- `tests/modules/auth/application/use-cases/provision-legacy-user.test.ts` — `describe('provisionLegacyUser — perfil legado (#277)')` com CA1–CA4.
- `tests/etl/orchestrate.fakes.ts` — `FakeAuthPort` captura inputs (`lastProvisionInput()`).
- `tests/etl/orchestrate.test.ts` — repasse de perfil ao auth-port (2 casos).

## Casos

- **CA1 (RED)** — input com name/cpf/telephone/collaboratorRef válidos → `User` salvo tem os 4 campos (hoje null → `AssertionError: actual: null`).
- **CA2a (RED)** — telephone inválido (`'123'`) → `outcome: 'created'` (degrada, **não** quarentena), `telephone === null`, cpf válido populado, warning no `process.stderr` com legacyId.
- **CA2b (RED)** — cpf inválido por defesa → `cpf === null`, telephone válido populado.
- **CA3 (RED)** — `collaboratorRef: null` → `collaboratorId === null`, sem erro.
- **CA4 (guard, já verde)** — só núcleo → name/cpf/telephone/collaboratorId null (retrocompat de `User.register`).
- **orchestrate (2× RED)** — `migrateUserRow` repassa `validated.name/cpf/telephone` + collaboratorRef resolvido; hoje só passa `{legacyId,email,massApprove}` → chegam `undefined`.

## Evidência

`node --test` (validado pelo orquestrador, binário absoluto): **28 tests · 22 pass · 6 fail**. RED por **asserção** (preferido). Sinal secundário: `tsc --noEmit` RED por API ausente (`ProvisionLegacyUserInput` sem os campos). `git status` → só os 3 testes + pasta do ticket; **`src/`/`scripts/` intocados**.

## Assinatura-alvo para o W1

`ProvisionLegacyUserInput` estendido com `name?/cpf?/telephone?/collaboratorRef?` (`string | null` raw — degradação acontece DENTRO do use case); warning de degradação via `process.stderr.write` com legacyId (mesmo canal do read-mapper).
