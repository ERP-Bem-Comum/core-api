# FIN-RECON-ENTRYTYPE-UNION — escopo

**GitHub:** #159 (sub-issue do épico #171, gaps pós-#60) · **Branch:** `feat/fin-conciliacao-gaps` · **Size:** M
**Decisão de produto (2026-06-19):** **caminho A** — fechar o union EN + CHECK (não caminho B).

> Reconcilia a implementação com a **spec 017** já cravada: `entryType` virou `string` aberto no domínio
> #118, divergindo da spec (`data-model.md:37` e `:122`) e do que o **CA5 do #120** + o HANDOFF do W2 do
> #119 pediam ("`entryType` bruto normalizado p/ union EN (ou `Other`)" + "CHECK do `entry_type`"). Este
> ticket **completa** o que o #120 já pretendia, fechando o conjunto no domínio + CHECK no schema.

## Fonte canônica do conjunto (spec 017 — citações literais)

- `specs/017-fin-conciliacao-bancaria/data-model.md:37` →
  `entryType: 'PIX'|'TED'|'DOC'|'Fee'|'Boleto'|'DARF'|'Investment'|'Redemption'|'Transfer'|'Other'`.
- `specs/017-fin-conciliacao-bancaria/data-model.md:122` →
  `entry_type varchar(16) CHECK ∈ {10 tipos: PIX,TED,DOC,Fee,Boleto,DARF,Investment,Redemption,Transfer,Other}`.
- `specs/017-fin-conciliacao-bancaria/data-model.md:96` → nomes próprios BR (`PIX`/`TED`/`DOC`/`DARF`/`Boleto`)
  **permanecem como estão** (não traduzir, não normalizar a caixa — são os valores canônicos).
- `specs/017-fin-conciliacao-bancaria/contracts/ports.md:14` → `entryType: string; // normalizado p/ o enum de domínio`.

**Conjunto (10 valores, EN/siglas BR):** `'PIX' | 'TED' | 'DOC' | 'Fee' | 'Boleto' | 'DARF' | 'Investment' | 'Redemption' | 'Transfer' | 'Other'`.

## Estado atual (verificado)

- `src/modules/financial/domain/statement/types.ts:19` e `:42` → `entryType: string` (aberto, 2 ocorrências).
- `adapters/statement-parsers/ofx-parser.ts:40,48` → repassa `TRNTYPE` cru `.toUpperCase()`, fallback `'Other'`.
- `adapters/statement-parsers/csv-parser.ts:33,41` → repassa `tipo` cru `.toUpperCase()`, fallback `'Other'`.
- `adapters/statement-parsers/fake-parser.ts:19` → `entryType: 'TED'` (já canônico).
- `adapters/persistence/schemas/mysql.ts:551` → `entry_type varchar(32)` **sem CHECK** (comentário `:540` admite "livre").

## Em escopo (fatia vertical)

1. **Domínio** `domain/statement/types.ts` — substituir `entryType: string` (linhas 19 e 42) pelo union
   `EntryType` (10 valores acima). Smart constructor/normalizador **puro** `normalizeEntryType(raw: string): EntryType`
   — mapeia o valor bruto do banco para o canônico (sinônimos OFX/CSV → enum) com fallback `'Other'`.
   Erros string-literal EN kebab-case (constituição V).
2. **Parsers** (`ofx`, `csv`, `fake`) — produzir `EntryType` válido via `normalizeEntryType`, nunca string crua.
   Mapeamento mínimo conhecido: `PIX→'PIX'`, `TED→'TED'`, `DOC→'DOC'`, `FEE`/`SRVCHG`/`TARIFA`→`'Fee'`,
   `XFER`/`TRANSFER`/`TRANSFERENCIA`→`'Transfer'`, `DARF`→`'DARF'`, `BOLETO`→`'Boleto'`, `INVEST*`→`'Investment'`,
   `RESGATE`/`REDEMPTION`→`'Redemption'`; desconhecido/vazio → `'Other'`. (Conjunto fechado, fallback seguro — R do #159.)
3. **Mapper** `adapters/persistence/mappers/statement.mapper.ts` — `toDomain` valida `entry_type ∈ EntryType`;
   valor fora do union (corrupção no banco) → `err('invalid-statement-entry-type')` (regra de adapters:
   domínio rejeita estado inválido vindo do banco). `toRow` é passthrough (já canônico).
4. **Schema** `adapters/persistence/schemas/mysql.ts` — adicionar CHECK
   `fin_statement_transactions_entry_type_chk` (`entry_type IN (…10 valores…)`) e alinhar `varchar(16)` à spec
   (redução de 32→16 segura: maior valor = `Investment`/`Redemption` = 10 chars; sem dados em prod). Atualizar o
   comentário `:540` (`entry_type` deixa de ser "livre"). Padrão idêntico a `movement`/`reconciliation_status`.
5. **Migration** via `pnpm run db:generate:financial` — **faixa pré-alocada `0013`** (épico #171). ⚠️ ver
   "Coordenação de migration" abaixo.

## Fora de escopo

- Categorização Programa/Categoria/Centro de custo (#142 — decisão cross-módulo separada).
- Qualquer mudança em match/score, manual/lote, conciliar/undo, export.
- Tamanho de outras colunas `fin_*`.

## Critérios de aceite (testáveis — Dado/Quando/Então)

- **CA1 (parser — desconhecido→Other)**: Dado um `TRNTYPE`/`tipo` fora do conjunto (ex.: `'XPTO'`) ou vazio,
  Quando o parser processa a transação, Então `entryType === 'Other'` (nunca string fora do union; nunca 5xx).
- **CA2 (parser — mapeia conhecido)**: Dado `TRNTYPE='PIX'`, `'FEE'`, `'XFER'` (e `tipo` equivalentes no CSV),
  Quando o parser processa, Então `entryType ∈ {'PIX','Fee','Transfer'}` com a caixa canônica exata.
- **CA3 (mapper — round-trip estável)**: Dado uma transação com `entryType` canônico, Quando `toRow`→`toDomain`,
  Então o valor sobrevive idêntico (round-trip estável). [≈ CA1 da issue #159]
- **CA4 (mapper — defensivo)**: Dado um `entry_type` corrompido no banco fora do union, Quando `toDomain` mapeia
  a row, Então retorna `err('invalid-statement-entry-type')` (e não valor silenciosamente inválido). [CA2 da issue #159]
- **CA5 (CHECK no banco — integração Docker)**: Dado o schema migrado, Quando um `INSERT` tenta `entry_type`
  fora do conjunto, Então o MySQL rejeita pelo CHECK `fin_statement_transactions_entry_type_chk`. (W1)
- **CA6 (sem regressão)**: a suíte de parsers/mapper/domínio de extrato permanece verde; contagem de testes ≥ baseline.

## Coordenação de migration (⚠️ pré-alocação do épico #171)

`financial` está em `0008`. O `drizzle-kit generate` produzirá `0009` localmente, mas a **faixa `0009–0012`
está reservada ao ramo Lançar Documento (WT-1, outro worktree)** e **`0013` a este ramo** (Conciliação). Como
WT-1 ainda não materializou `0009–0012`, **renumerar/serializar no rebase para `dev`** revisando o
`meta/_journal.json` do `financial` antes do merge (mapa: `.claude/.planning/WORKTREE-MAP-BACKLOG.md:46-48`).
Não mergear este PR à frente de WT-1 sem reconciliar a numeração.

## Definition of Done

- W0 RED (normalizador + parsers + mapper, no gate) → W1 GREEN (domínio union + parsers + mapper + schema CHECK +
  migration) → W2 (read-only, max 3 rounds) → W3 (`typecheck` + `format:check` + `lint` + `test` verdes) +
  `test:integration:financial` (Docker) para o CA5 antes do merge.
- Decisão registrada como comentário na issue #159 (caminho A escolhido) ao fechar.
- Migration por `db:generate:financial` (nunca SQL à mão). Idioma EN no código (C1). Sem ADR novo
  (não viola ADR aceito; alinha com ADR-0020 CHECK + ADR-0014 prefixo `fin_*`).
