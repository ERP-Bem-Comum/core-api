# W1 — Implementação GREEN · AUTH-ETL-USER-FIELDS

**Outcome**: GREEN ✅ · **Agente**: typescript-language-expert · **Issue**: #277

## Diff (4 arquivos)

1. **`src/modules/auth/domain/identity/user/user.ts`** — `RegisterInput` + 5 campos opcionais (`name?/cpf?/telephone?/photo?/collaboratorRef?`); `register` troca os `null` hardcoded por `input.X ?? null` (retrocompat/CA4; `exactOptionalPropertyTypes`-safe). `collaboratorRef` → `collaboratorId` do agregado. Comentário cita Evans p.82 (reconstituição).
2. **`src/modules/auth/application/use-cases/provision-legacy-user.ts`** — input estendido (cpf/telephone raw); helpers `degradeCpf`/`degradeTelephone` parseiam pelo VO do auth e em falha **degradam para null + `process.stderr.write` com legacyId** (não quarentena — Evans reconstituição; espelha read-mapper). `name`/`collaboratorRef` passam direto.
3. **`scripts/etl/orchestrate.ts`** — `migrateUserRow` passa `name/cpf/telephone` (`validated.*`) + `collaboratorRef` resolvido (brand→string) ao port.
4. **`eslint.config.js`** — override `tests/**`: `@typescript-eslint/unbound-method: 'off'` (falso-positivo do idioma spy+restore de `process.stderr.write` do teste W0; saída-2 da política de regressão-zero — corrige o gate sem tocar o teste; alinhado aos demais relaxamentos de `tests/**`).

## Persistência: NÃO mudou

`userToInsert` já gravava as 5 colunas; `collaborator_id varchar(64)` já existe (ref lógica, sem FK — ADR-0006). Foto/`image_url` fora de escopo.

## Gates (validados pelo orquestrador)

| Gate | Resultado |
|---|---|
| `typecheck` | ✅ |
| `lint` | ✅ |
| `format:check` | ✅ |
| `test` | ✅ **3248 · pass 3230 · fail 0 · skipped 18** |

Os 6 RED do W0 → GREEN; CA4 (retrocompat) segue verde.

## Tipo público alterado (retrocompat)

`ProvisionLegacyUserInput` (re-exportado por `public-api/etl.ts`) e `RegisterInput` ganharam campos **opcionais** (default null) — adição retrocompatível, nenhum caller quebra.

## Pendente (pós-W1)

Validação E2E na VM (CA5): re-rodar o ETL com o código fix/277 num auth_user limpo → usuários migram com nome/cpf/telefone/vínculo. `test:integration:{auth,etl}` no CI.
