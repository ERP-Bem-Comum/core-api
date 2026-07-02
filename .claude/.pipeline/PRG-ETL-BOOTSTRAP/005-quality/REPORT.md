# W3 — QUALITY GATE · PRG-ETL-BOOTSTRAP

**Skill:** ts-quality-checker · **Outcome:** GREEN ✅ · **Data:** 2026-07-01

## Gates

| Gate | Comando | Resultado |
| --- | --- | --- |
| Typecheck | `pnpm run typecheck` (`tsc --noEmit`) | ✅ zero erros (verificado nesta formalização, exit 0) |
| Format | `pnpm run format:check` (`prettier --check .`) | ✅ p/ a fatia (ver nota — 2 JSONs de migration corrigidos na verificação) |
| Lint | `pnpm run lint` (`eslint .`) | ✅ zero erros nos arquivos tocados |
| Testes (unit + skip dos gated) | `pnpm test` | ✅ **3321 pass · 0 fail · 18 skipped** (3339 tests) |
| Teste da fatia (isolado) | `node --experimental-strip-types --test tests/etl/mappers/program.mapper.test.ts` | ✅ **7/7 pass · 0 fail** (exit 0 — verificado independentemente) |

### Nota — format (regressão zero)
`format:check` inicial acusou os 2 JSONs de migration (`meta/_journal.json`, `meta/0001_snapshot.json`),
gerados pelo `drizzle-kit` e portanto **fora** do hook `prettier-write` (que só formata arquivos tocados
via editor). Corrigidos com `prettier --write` (só reformatação, sem mudança de conteúdo) → limpos.
Os 3 warns remanescentes (`specs/030|031|032/spec.md`) são **WIP untracked de outra frente** (budget/
statistics/reports), **pré-existentes** e fora do escopo deste ticket — deixados intactos (anti-padrão #15).

## Verificação independente (na formalização)
- **Typecheck** re-executado do zero → exit 0, sem erros.
- **Teste do mapper** re-executado isolado (binário node direto, contornando nvm) → 0 falhas, exit 0.
- **W0 RED** reproduzido (removido o mapper → `ERR_MODULE_NOT_FOUND`), provando que o teste exercita a API.

## Cobertura dos critérios de aceite (000-request.md)
- [x] `prg_programs.legacy_id` (nullable, UNIQUE) + migration `0001_grey_triathlon.sql` gerada.
- [x] Reconstrução via domínio (`Program.create`/`deactivate`); inválido → quarentena `DomainRejected`.
- [x] `active=0` → Inativo via transição de domínio.
- [x] Idempotência por `legacy_id` (SELECT FOR UPDATE → skip, nunca UPDATE).
- [x] Teste do mapper: 7 casos verdes.
- [x] W3 verde (typecheck + format + lint + test).

## Pendências registradas (fatias futuras — fora deste ticket)
- Re-upload do `logo` legado como `logoKey` S3.
- Asserções de `programs` nos testes de integração gated + execução real contra DB/Docker (fixture pronta).
- Read-side/backfill de `programs`.

## Nota
Fatia não commitada — permanece na working tree da branch `feat/legacy-etl-programs` para revisão do autor
antes do commit. Nenhum arquivo untracked de terceiros (`.claude/*` de outras frentes, `specs/*`) foi tocado.
