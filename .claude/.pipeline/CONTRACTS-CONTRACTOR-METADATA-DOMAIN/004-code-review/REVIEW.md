# Code Review — Ticket CONTRACTS-CONTRACTOR-METADATA-DOMAIN — Round 2

**Veredito:** APPROVED

**Reviewer:** code-reviewer
**Data:** 2026-06-06T22:50Z
**Escopo do round 2:** apenas os itens reabertos do round 1 (migration + glob + fix do teste de integração).

## Resolução das issues do round 1

- **🔴 Issue 1 (migration ausente) — RESOLVIDA.** `pnpm run db:generate` gerou `migrations/mysql/0007_bizarre_clint_barton.sql` (5 `ADD COLUMN` + CHECK `ctr_contracts_contractor_type_chk`), registrada no `meta/_journal.json`. SQL revisado:
  - `contractor_type`/`contractor_id` `NOT NULL` **sem DEFAULT** (correto p/ tabela vazia — decisão registrada).
  - `contractor_id` recebeu `COLLATE utf8mb4_bin` (edição manual, padrão CTR-DB-SCHEMA-HARDENING — todas as colunas UUID `varchar(36)` do schema usam esse collate; conferido em `0000`). `contractor_type` (enum varchar(16)) segue o collate default da tabela, como `status`.
  - CHECK com os 4 valores lowercase.
  - **Prova de verde**: `pnpm run test:integration` → **88 testes, 0 falhas** (MySQL real, migration aplicada, T006 faz round-trip do contractor + metadados com CHECK + NOT NULL).
- **🟡 Issue 2 (glob de integração) — RESOLVIDA.** `contract-contractor-schema.mysql.test.ts` adicionado ao `package.json#scripts.test:integration`. O teste CA-2 de `contracts.cli.mysql.test.ts` (valida o glob) segue verde.
- **🔵 Issue 3 (immutable no `make`)** — não aplicada (opcional, sem precedente forte). Sem impacto.

## Achado adicional do round 2 (corrigido na mesma rodada)

- O teste `contract-contractor-schema.mysql.test.ts` (W0) tinha bug de fixture: `PlainDate.from(...) as never` passado direto a `Period.create` sem desempacotar o `Result`. Só apareceu quando o teste finalmente rodou em MySQL real (antes guarded + infra indisponível). Corrigido (desempacota `start`/`end`); integração ficou verde.

## Veredito final

Todos os gates verdes: `typecheck` ✓ · `format:check` ✓ · `lint` ✓ · `test` (default 2232/0) ✓ · `test:integration` (88/0) ✓. Diff aprovado em qualidade (ver round 1 abaixo) com a migration agora presente, correta e provada. **APPROVED — segue para W3.**

---

<details>
<summary>Round 1 (REJECTED) — histórico</summary>

# Code Review — Ticket CONTRACTS-CONTRACTOR-METADATA-DOMAIN — Round 1

**Veredito:** REJECTED

**Reviewer:** code-reviewer
**Data:** 2026-06-06T22:40Z
**Escopo revisado:**

- `src/modules/contracts/domain/shared/contractor.ts` (NOVO)
- `src/modules/contracts/domain/contract/{types,contract}.ts`
- `src/modules/contracts/adapters/persistence/schemas/mysql.ts`
- `src/modules/contracts/adapters/persistence/mappers/contract.mapper.ts`
- `src/modules/contracts/application/use-cases/{create-contract,create-pending-contract,import-contracts}.ts`
- `src/modules/contracts/adapters/http/{schemas,plugin}.ts`
- `src/modules/contracts/cli/{commands/criar-contrato,commands/importar-contratos,import-parser}.ts`
- `src/modules/contracts/adapters/persistence/migrations/mysql/` (verificação de existência)

---

## Issues encontradas

### 🔴 Crítica (bloqueia approval)

#### Issue 1 — `src/modules/contracts/adapters/persistence/migrations/mysql/` (migration ausente)

**Categoria:** F / regra de processo (Princ. VI — "após alterar `schema.ts`, gerar migration com `pnpm run db:generate`; nunca SQL à mão") + task **T012** do `tasks.md`.

**Problema:** O schema Drizzle (`schemas/mysql.ts`) ganhou 5 colunas (`contractor_type`, `contractor_id`, `observations`, `email`, `telephone`) + o CHECK `ctr_contracts_contractor_type_chk`, mas **nenhuma migration foi gerada/versionada**. A última migration é `0006_typical_alex_wilder.sql`; `grep` por `contractor_type`/`contractor_id` em `migrations/` retorna vazio; `git status` de `migrations/` está limpo.

**Impacto:**
- O schema TS e o banco real **divergem** — `drizzle-kit` acusaria drift.
- O teste de integração `contract-contractor-schema.mysql.test.ts` (T006) **não tem como passar** (colunas inexistentes no DB).
- A feature não funciona em nenhum ambiente persistente (dev/CI/prod) — `INSERT` falharia (coluna desconhecida).
- A própria geração precisa de revisão: a migration de coluna `NOT NULL` **sem `DEFAULT`** sobre tabela com dados quebraria; o W1 assumiu tabela vazia (decisão registrada), mas a migration gerada deve refletir isso e incluir `COLLATE utf8mb4_bin` em `contractor_id` (cabeçalho do `mysql.ts` exige COLLATE manual).

**Esperado:** rodar `pnpm run db:generate`, versionar a migration gerada, e revisá-la (NOT NULL direto p/ tabela vazia + COLLATE). T012 é escopo deste W1.

**Fix sugerido:**
```bash
pnpm run db:generate   # gera a migration das 5 colunas + CHECK
# revisar o .sql gerado: contractor_id com COLLATE utf8mb4_bin; NOT NULL sem DEFAULT (tabela vazia)
git add src/modules/contracts/adapters/persistence/migrations/mysql/
```

---

### 🟡 Importante (não-bloqueia, mas registrar)

#### Issue 2 — glob de integração não inclui o novo teste

`package.json#scripts.test:integration` não lista `contract-contractor-schema.mysql.test.ts`. Mesmo após a migration, o teste T006 não roda no comando de integração. Incluir no glob (junto do fix da Issue 1) para a rede de integração cobrir as colunas/CHECK.

---

### 🔵 Sugestão (estilo / clareza)

#### Issue 3 — `contractor.ts`: `make` retorna objeto sem `immutable()`

`make` retorna `ok({ type, id })`. O tipo é `Readonly<{...}>` (imutável em compile-time), o que satisfaz a regra. Por consistência com a construção do agregado (que usa a facade `immutable()` para `Object.freeze` shallow — DON'T B§5), considerar `immutable({ type, id })` para congelamento em runtime. Opcional — VOs folha como `UserRef` retornam primitivo cru, então não há precedente forte de freeze para refs.

---

## O que está bom

- **VO `contractor.ts`** — exemplar: `ContractorType` é string-literal union **sem brand** (o conjunto fechado já é a prova), `ContractorId` é Primitivo-brand com smart constructor `Result`, erros em **kebab string-literal** (convenção de VO folha, distinta dos Tagged Errors do agregado). `make` compõe propagando o primeiro erro. Module-as-namespace correto. `as ContractorId` aparece **só** dentro do smart constructor.
- **Isolamento (FR-012/ADR-0032 inv.1)** — `contracts/domain` e `contracts/application` **não** importam `partners/*`. `ContractorType` reusa os 4 literais por coincidência de domínio, sem dependência de tipo cruzando a fronteira. ✓
- **`ContractImmutableField`** — `title`/`objective` removidos (agora editáveis, FR-007); `contractor` adicionado (imutável pós-criação). `ContractUpdate` passa a admitir os metadados; `originalValue`/`originalPeriod`/`sequentialNumber`/`id`/`signedAt` seguem imutáveis. Coerente com a spec.
- **Mapper `contractFromRow`** — reidrata o contratado via `ContractorRef.make` e devolve `err(contractMapperInvalidContractor(...))` se o banco tiver estado inválido (regra de adapters: row→domínio retorna `Result`, rejeita estado corrompido). Novo erro Tagged segue o Padrão D do arquivo. `as unknown as string` na escrita é consistente com os casts de id já existentes.
- **Schema** — `varchar(16)`+CHECK `IN ('supplier','financier','collaborator','act')` (sem ENUM nativo — ADR-0020); `contractor_id` `varchar(36)` NOT NULL **sem FK física** (cross-db ADR-0014); metadados nullable com larguras sensatas. Casing lowercase bate 1:1 com a public-api de Parceiros.
- **Import (D3)** — `contractor` ausente → `''` → `ContractorRef.make` falha → linha vira falha de dado (modelo row-level), sem abortar o lote nem embutir decisão de produto sobre legado. Coerente.
- **Borda/CLI** — Zod com `enum` + `uuid` na borda HTTP; flags `--contratado-tipo`/`--contratado-id` na CLI; parser CSV/JSON com colunas `contratado_*`. Mapeamento body→command limpo.

---

## Próximo passo

- **REJECTED:** dev volta a W1 e resolve a Issue 1 (gerar + versionar + revisar a migration) e idealmente a Issue 2 (glob de integração). Round vira 2. As demais (🔵) são opcionais.
- O restante do diff está **aprovado em qualidade** — o round 2 deve focar **apenas** na migration gerada (SQL correto: NOT NULL p/ tabela vazia, COLLATE, CHECK) e no glob.
</details>
