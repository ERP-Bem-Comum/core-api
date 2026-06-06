# W3 (GREEN) — Gate final de qualidade — CONTRACTS-CONTRACTOR-METADATA-DOMAIN

**Wave**: W3 (quality gate) · **Agente**: ts-quality-checker · **Size**: L
**Feature**: `specs/002-contracts-http-gaps/` · **Data**: 2026-06-06

## Comandos do gate (saída integral)

### 1/4 — `pnpm run typecheck` (`tsc --noEmit`)
```
$ tsc --noEmit
```
**Resultado: VERDE** (zero erros, sem output).

### 2/4 — `pnpm run format:check` (`prettier --check .`)
```
Checking formatting...
All matched files use Prettier code style!
```
**Resultado: VERDE.**

### 3/4 — `pnpm run lint` (`eslint .`)
```
$ eslint .
```
**Resultado: VERDE** (zero erros/avisos, sem output).

### 4/4 — `pnpm test` (`node --test 'tests/**/*.test.ts'`)
```
ℹ tests 2232
ℹ suites 706
ℹ pass 2215
ℹ fail 0
ℹ cancelled 0
ℹ skipped 17
ℹ todo 0
```
**Resultado: VERDE** (0 falhas; 17 skipped = testes de integração guarded por `MYSQL_INTEGRATION`).

## Integração (prova adicional, executada no W2 round 2)

```
$ pnpm run test:integration
ℹ tests 88
ℹ pass 88
ℹ fail 0
```
MySQL real via Docker: migration `0007_bizarre_clint_barton.sql` aplicada; T006 faz round-trip do
`contractor` + metadados com CHECK `ctr_contracts_contractor_type_chk` + NOT NULL. A migration foi
**provada** (não apenas guarded).

## Veredito

**GATE VERDE** — typecheck + format:check + lint + test (default) + test:integration todos verdes.
Política de regressão zero honrada: nenhuma falha não-endereçada; a migration foi gerada, hardened
(`COLLATE utf8mb4_bin` em `contractor_id`) e comprovada em MySQL real.

## Resumo do entregue (ticket foundational)

- VO `ContractorRef` (`domain/shared/contractor.ts`) — referência leve por identidade (ADR-0032 / Vernon p.460).
- Agregado `Contract` + `contractor` (obrigatório) + metadados `observations`/`email`/`telephone`; `title`/`objective` agora editáveis.
- Persistência: 5 colunas em `ctr_contracts` + CHECK + migration 0007; mapper com reidratação validada.
- Create-path end-to-end: use-cases (create/create-pending/import), HTTP POST (Zod), CLI (`criar-contrato`/`importar-contratos`).

## Notas para os próximos tickets da feature 002

- **#2 `CONTRACTS-CREATE-CONTRACTOR-HTTP`**: a parte de POST/create já foi absorvida aqui (decisão de escopo com o humano) — #2 reduz-se à composição do `GET` ou pode fundir com #4.
- **#4 `CONTRACTS-DETAIL-COMPOSITION-HTTP`**: compor `snapshot` via `ContractorReadPort` (+ `ActView` do #3).
- **Import legado**: mapeamento do contratado a partir dos dados v1 continua fora de escopo (hoje o import exige colunas `contratado_tipo`/`contratado_id`).
