# W3 — Gate de Qualidade · FIN-CATEGORIZATION-REF (US1 Categoria)

**Wave**: W3 · **Agente**: ts-quality-checker · **Data**: 2026-06-20

## Gate canônico (CLAUDE.md §W3) — **VERDE**

| Comando | Resultado |
| --- | --- |
| `pnpm run typecheck` | ✅ `tsc --noEmit` — 0 erros |
| `pnpm run format:check` | ✅ `All matched files use Prettier code style!` (após `prettier --write` nos JSONs gerados pelo drizzle-kit `_journal.json`/`0012_snapshot.json` — mesmo passo dos snapshots 0005-0011) |
| `pnpm run lint` | ✅ `eslint .` — 0 problemas |
| `pnpm test` | ✅ **3024 pass / 0 fail** (3042 tests, 894 suites; 18 skipped — integração opt-in) |

## Integração (T022 — `test:integration:financial`, MySQL real via Docker) — **VERDE**

Final: **36 pass / 0 fail** (14 suites). Valida que a migration **0012** aplica no MySQL real: `applyMigrations` no boot roda sem erro (`CREATE TABLE fin_categories` + CHECK + índices + seed `INSERT ... AS new ON DUPLICATE KEY UPDATE`, coluna reservada `group` com backticks — MySQL 8.4 OK).

### Bug consertado durante o W3 (política de regressão zero)

A primeira execução da integração teve **1 falha**: `document-repository.suite.ts:333` `findPaged: Drafts (dueDate NULL) aparecem antes...`. Diagnóstico → **conserto** (não escalação):

- **Causa-raiz**: copy-paste na contract-suite — `SUP_DRAFT_NULL` e `SUP_ISSUE_WINDOW` tinham o **mesmo** UUID (`...006`). Os supplierRefs dos testes `findPaged` precisam ser únicos (a suite roda contra um MySQL **compartilhado** entre `it`s, sem cleanup — isolamento é por supplierRef). O teste de janela de emissão (`...006`) insere 2 docs; o "Drafts NULL" (mesmo `...006`) então conta 4 → `total === 2` falha.
- **Prova**: rodar **só** o "Drafts NULL" (sem o teste de emissão antes) → ✔ passa. Suite completa → ✖ falha. Confirma colisão de estado, não ordenação NULL.
- **Fix** (1 linha, `document-repository.suite.ts:121`): `SUP_DRAFT_NULL` `...006` → `...007` (UUID único). Bug fix trivial → direto.
- **Resultado**: integração financial **36/36** em banco limpo.

> Por que não pegava antes: `test:integration:financial` é opt-in (Docker), fora do `pnpm test` do CI; a colisão entrou junto com o teste #163 (issue-window) e ficou latente.

## Follow-up do próprio ticket (🟡)

- Teste de **integração Drizzle do `category-read.drizzle.ts`** não incluído nesta fatia (coberto por `typecheck` + paridade com os demais read stores; a DDL/seed da 0012 já é exercitada pelo `applyMigrations`). Adicionar `category-read.drizzle-mysql.test.ts` + entrada no script como follow-up.

## Veredito

Gate W3 **VERDE em todos os comandos** — incluindo a integração (36/36) após o conserto do bug de colisão de supplierRef. Feature US1 (Categoria) completa e entregável. Zero vermelho não-endereçado.
