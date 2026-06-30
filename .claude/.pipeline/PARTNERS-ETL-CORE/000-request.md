# PARTNERS-ETL-CORE — Núcleo puro do ETL (quarentena + reconciliação + mappers)

> **Size:** M · **Slice 1/5** de [`PARTNERS-ETL-BOOTSTRAP`](../PARTNERS-ETL-BOOTSTRAP/000-request.md). · Skills: `ts-domain-modeler` (mappers), `tdd-strategist`.

## Contexto

Primeiro slice do ETL: a camada **pura** (zero infra — sem Docker, sem dump, sem DB), testável com fixtures sintéticos. Estabelece a fundação que os slices READER/WRITER consomem. Decisões consolidadas no request do BOOTSTRAP (D9–D13 + convergências dos 9 especialistas).

## Escopo (`scripts/etl/`)

1. **Scaffold** `scripts/etl/` (ESM, Node 24 strip-types, `#src/*` resolve de lá).
2. **`QuarantineReason`** — tagged union (PascalCase) com evidência, exhaustive sem throw:
   `CpfInvalid` · `CnpjInvalid` · `EmailInvalid` · `EnumUnknown` · `RequiredFieldMissing` · `Overflow` · `DateInvalid` (campo + valor tentado). `describe()` PT-BR para o humano.
3. **Reconciliação** — tipos + acumulador puro: por entidade `{ read, migrated, quarantined, alreadyExists }`; invariante `read = migrated + quarantined + alreadyExists`.
4. **4 mappers puros** `mapLegacy<X>Row(row) → Result<{ aggregate, legacyId }, readonly QuarantineReason[]>`:
   - Estratégia: **parsear campos legados → VOs** (`Cnpj.parse`/`Cpf.parse`/`ServiceCategory.parse`/...) acumulando erros via **`combine`** → **`rehydrate`** com `status`/`deactivatedAt` derivados de `active` (D10).
   - **supplier**: renomeia `bancaryInfo*`→`bankAccount`, `pixInfoKey*`→`pixKey`; `serviceCategory` literal (quarentena se fora do Set); descarta `serviceEvaluation`/`commentEvaluation`.
   - **financier**: simples (tabela vazia em prod, mas mapper completo).
   - **collaborator**: enums literais; D10 (inativo → `disableBy='legacy-migration'`, `deactivatedAt=updatedAt`); D13 (`biography>2000`/`telephone>30` → `Overflow`); `role` NULL legado → `RequiredFieldMissing` (alvo NOT NULL).
   - **user-profile** (de `users`): `imageUrl`→`avatarUrl`; `collaboratorRef` **deferido** (o WRITER resolve `legacyCollaboratorId int → UUID`) — o mapper devolve `legacyCollaboratorId` junto; `password` **nunca lido** (skip no decode).
5. **Decode da row legada** — `unknown`/`RowDataPacket` → tipo legado via type predicates por campo (sem `any`/`as` cego); `decimal` como string; zero-date `0000-00-00` → `DateInvalid`.

## Fora de escopo (slices seguintes)

- Restore Docker + reader `mysql2` (READER). Writer idempotente + orquestrador + map `legacyId→UUID` (WRITER). Geração de token de reset (RESET-TOKENS). CLI de disparo (RESET-DISPATCH). Criação de `auth.User` (identidade — slice WRITER/identidade).

## Critérios de aceite

- [ ] `mapLegacy<X>Row` válido → `ok({ aggregate, legacyId })`; agregado construído via `rehydrate`.
- [ ] Campo inválido → `err([QuarantineReason...])` **acumulando todos** (não para no primeiro).
- [ ] Inativo (`active=0`) → agregado `Inactive` com `deactivatedAt` (D10).
- [ ] Overflow `biography`/`telephone` → `Overflow` (D13), nunca trunca.
- [ ] `users.password` nunca é lido pelo decode.
- [ ] `QuarantineReason` exhaustive sem `throw` (`const _: never`).
- [ ] Reconciliação: `read = migrated + quarantined + alreadyExists`.
- [ ] W3 verde (typecheck + lint + format + `node:test` dos mappers com fixtures sintéticos).

## Notas de disciplina

- **Fixtures 100% sintéticos** — nunca PII do dump real (CNPJ/CPF gerados, válidos ou inválidos por construção).
- Zero regra nova de negócio: reusa smart constructors do domínio. Zero-dep.
- `combine` exige `E` homogêneo → `mapErr(VO.parse(...), toQuarantine('campo'))` **antes** do `combine`.
