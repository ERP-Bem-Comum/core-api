# W3 — Gate de qualidade

> Outcome: **ALL-GREEN (escopo)** com ressalva documentada de 3 falhas pré-existentes
> e alheias, todas fora do escopo da migração `datetime → date`.

## Gate default

| Comando | Resultado |
| --- | --- |
| `pnpm run typecheck` (`tsc --noEmit`) | ✅ 0 erros |
| `pnpm run format:check` | ✅ "All matched files use Prettier code style!" |
| `pnpm run lint` (`eslint .`) | ✅ 0 erros |
| `pnpm test` | 1197 tests · 1180 pass · **1 fail** · 16 skipped |

## `test:integration` (CA3)

`docker compose up -d mysql --wait` → migration `0005` aplica → suíte de integração:
**82 tests · 80 pass · 2 fail**.

Os round-trips que exercitam as colunas migradas **passam**:

- `round-trip TermChange preserva newEndDate (sem impactValue)` ✅ → `new_end_date date`.
- `save + findById preserva todos os campos (round-trip Fixed period)` ✅ → `*_period_start/end date`.
- `save + findById preserva Indefinite period (period_end nullable)` ✅.

→ **A migração aplica limpa e preserva a data-calendário. CA3 cumprido para o escopo.**

## As 3 falhas são pré-existentes e alheias (provado)

Todas só aparecem agora porque o daemon Docker passou a responder (usuário entrou no
grupo `docker`); antes a infra Docker era `skipped`, não `failed` — daí o STATE anterior
registrar "1163 pass / 0 fail".

| Falha | Local | Natureza | Prova de isenção |
| --- | --- | --- | --- |
| `CA-5: readonly_bi consegue SELECT` | `tests/infra/mysql-compose.test.ts:205` | `ERROR 1045 Access denied for user 'readonly_bi'` — falha de **autenticação/GRANT** do init do compose | Falha no login, antes de qualquer query tocar tabela → causalmente impossível ser efeito de `datetime → date` |
| `CA-6: fluxo Addition completo` | `tests/cli/contracts.cli.mysql.test.ts:233` | `anexar-documento` → `signed-document-not-found` (storage doc; teste smoke defasado) | Falha **idêntica** com a mudança em stash (ver verificação abaixo) |
| `CA-I2: 2 workers paralelos` | `tests/modules/contracts/worker/outbox-worker.integration.test.ts:136` | outbox `FOR UPDATE SKIP LOCKED` entregou 12 (= 2×6) | Falha **idêntica** com a mudança em stash |

### Verificação por stash (delta zero)

`git stash` do schema+migration → `pnpm run test:integration` no estado base reproduziu
**exatamente** CA-6 e CA-I2 (mesmas mensagens, 82/80/2). Logo, a migração introduz
**zero falhas novas** na suíte de integração.

## Encaminhamento

As 3 falhas foram registradas como tickets-bug próprios:

- `CTR-INFRA-READONLY-BI-GRANT` (CA-5)
- `CTR-CLI-SMOKE-ANEXAR-DOC-STALE` (CA-6)
- `CTR-OUTBOX-SKIPLOCKED-DUP` (CA-I2)

## Critérios de aceitação

- CA1 — 5 colunas `DATE` no schema TS + migration `0005`: ✅
- CA2 — mappers inalterados; `tsc`/lint/format verdes; suíte unitária pura verde: ✅
  (a única falha do default é infra Docker pré-existente, não código de domínio)
- CA3 — `test:integration`: migration aplica + round-trips de período/`newEndDate` verdes: ✅
  (2 falhas remanescentes provadas pré-existentes e fora de escopo)
- CA4 — colunas de instante seguem `datetime(3)`: ✅
