# Code Review — Ticket CTR-CONTRACT-CONTRACTOR-REF — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer
**Data:** 2026-06-02
**Escopo revisado:**
- `src/modules/contracts/domain/shared/contractor-ref.ts` (novo)
- `src/modules/contracts/domain/contract/types.ts`, `contract.ts`
- `src/modules/contracts/adapters/persistence/schemas/mysql.ts`
- `src/modules/contracts/adapters/persistence/mappers/contract.mapper.ts`
- `src/modules/contracts/adapters/persistence/migrations/mysql/0007_violet_sandman.sql`
- `src/modules/contracts/application/use-cases/create-contract.ts`, `create-pending-contract.ts`, `import-contracts.ts`
- `src/modules/contracts/adapters/http/schemas.ts`, `plugin.ts`
- `src/modules/contracts/cli/commands/criar-contrato.ts`, `cli/import-parser.ts`

---

## Issues encontradas

### 🔴 Crítica (bloqueia approval)

Nenhuma.

### 🟡 Importante (não-bloqueia, registrar)

#### Issue 1 — `domain/shared/contractor-ref.ts:20-22` — discriminador `type` vs convenção `kind`

**Categoria:** C (discriminated unions) / G (naming).
**Problema:** A convenção viva do domínio usa `kind` para discriminar VOs/variantes não-evento (`Period` → `kind: 'Fixed'|'Indefinite'`, `ContractAdjustment` → `kind: 'ValueIncrease'…`, `Amendment` → `kind`). `ContractorRef` usa `type`.
**Avaliação:** **Aceito como está.** `type` está deliberadamente alinhado ponta-a-ponta com a coluna `contractor_type` (mapper/schema), o campo HTTP `contractorType` e a flag CLI `--contratado-tipo`, além do vocabulário do ADR-0032 ("tipo do contratado"). Trocar para `kind` no VO criaria atrito com toda a borda. Registrado para ciência da banca; não bloqueia.

#### Issue 2 — `migrations/mysql/0007_violet_sandman.sql:1-2` — `ADD COLUMN NOT NULL` sem default

**Categoria:** persistência / operação.
**Problema:** `ALTER TABLE … ADD … NOT NULL` sem `DEFAULT` falha em MySQL se a tabela já tiver linhas.
**Avaliação:** **Coerente com a decisão registrada** (Opção A — NOT NULL; base nova nesta fase, sem dado de produção de contratos). O `000-request.md` §Decisão e o W1 REPORT já documentam o backfill como responsabilidade de quem migrar uma base populada. Mantido. Registrado como nota operacional.

### 🔵 Sugestão (estilo / clareza)

#### Issue 3 — `domain/shared/contractor-ref.ts:17` — `export type ContractorType` não utilizado

**Problema:** `ContractorType` é exportado mas não há consumidor (os call sites usam literais inline). Dead export.
**Sugestão:** Remover, **ou** usá-lo como tipo do parâmetro de `rehydrate`/dos helpers para reaproveitar a fonte única dos três literais. Não bloqueia.

#### Issue 4 — CA1: refinamento de erro (1 literal → 2 variantes)

**Avaliação:** **Melhoria aprovada.** `'contractor-ref-invalid-type'` (type fora do conjunto) + `'partner-ref-invalid'` (id malformado, propagado do ref de Parceiros) é mais preciso que o `'contractor-ref-invalid'` único esboçado no request — melhor narrowing e UX de erro. **Recomendação:** atualizar o texto da CA1 no `000-request.md` para refletir as duas variantes (rastreabilidade).

---

## O que está bom

- **Isolamento (CA4) impecável:** `grep` confirma que `contracts/` importa Parceiros **só** via `#src/modules/partners/public-api/refs.ts`. Zero acesso a `partners/domain|application` ou `par_*`. ADR-0006/0014 respeitados.
- **VO canônico:** smart constructor `rehydrate` retornando `Result`, erros como string-literal union, `immutable()` no valor, return type explícito, Padrão D (module-as-namespace). Zero `throw`/`class`/`any`/`this` no domínio.
- **`default` legítimo:** o `default` do switch em `rehydrate` retorna `err(...)` (não `throw`) porque `input.type` é `string` não-confiável — é o padrão correto para input externo, não uma violação da regra de exhaustividade-`never`.
- **ADR-0020 respeitado:** `contractor_type` via `varchar + CHECK IN (...)`, sem `ENUM` nativo.
- **Mapper Padrão D:** nova variante `ContractMapperInvalidContractorType` com payload de evidência (`attemptedType`, `attemptedId`) e case constructor free-function — espelha o padrão dos erros existentes.
- **Migration hardening:** `COLLATE utf8mb4_bin` aplicado manualmente no `contractor_id` (UUID), conforme a nota normativa do schema.
- **Invariante CA2 garantida pelo compilador:** campo obrigatório em `ContractRegistration` + inputs; todo o blast radius (use cases, HTTP, CLI, import, ~16 testes) foi threadado — omitir o contratado é erro de compilação, não runtime.

---

## Próximo passo

- **APPROVED** → pipeline-maestro avança para **W3** (gate `typecheck` + `format:check` + `lint` + `test`).

---

## Resolução pós-W2 (a pedido do dono — todos os itens 🟡/🔵 endereçados)

- **Issue 1 (discriminador):** ✅ **Corrigido.** O VO `ContractorRef` passa a usar `kind` (`{ kind: 'Supplier'|'Financier'|'Collaborator'; id }`), alinhado à convenção do domínio (`Period`, `ContractAdjustment`, `Amendment`). A **entrada** de `rehydrate` permanece `{ type, id }` por espelhar o DTO de borda (`contractor_type`/`contractorType`/`--contratado-tipo`) — `rehydrate` é a tradução borda→domínio. Sites de leitura atualizados: `contract.mapper.ts` (`contractToInsert`, 2×) e os 2 testes (`contractor-ref.test.ts`, `contract-contractor.mapper.test.ts`).
- **Issue 3 (dead export):** ✅ **Corrigido.** `export type ContractorType` removido (YAGNI estrito; reintroduzir quando o ticket downstream de composição HTTP precisar).
- **Issue 4 (CA1):** ✅ **Feito.** `000-request.md` CA1 atualizada para as duas variantes de erro.
- **Issue 2 (migration NOT NULL):** ⏸️ **Mantido NOT NULL por decisão de design — não é hand-wave.** Weakening para nullable betraria o invariante central deste ticket ("todo contrato tem contratado"); um `DEFAULT` transitório (ex.: `'Supplier'` + UUID-zero) injetaria **dado falso** em linhas existentes — pior que falhar alto. A tabela `ctr_contracts` é greenfield (feature sem deploy de produção), então `0007` aplica sobre tabela vazia por construção. Backfill de uma base populada é responsabilidade explícita de quem a migrar (documentado no request §Decisão + W1 REPORT). Se o dono preferir trocar para Opção B (nullable transitório), é um ajuste de 1 linha no schema + migration.

**Gate revalidado após as correções:** `typecheck` 0 erros · `format:check` OK · `lint` OK · `test` 1991 pass / 0 fail / 17 skipped.
