# W2 — REVIEW (audit read-only) · BGP-ETL-LEGACY-ID (fatia 1/3 do ETL-BUDGET-PLANS)

> Round 1. Skill: `code-reviewer`. Audit **read-only** — nada em `src/` foi editado, nenhum
> teste alterado, nenhum commit. Diff revisado: `git show ae2e7941` (W1 impl) + `git show dca13d6e`
> (W0 testes + ajuste do guarda).

## Veredito: **APPROVED**

Diff pequeno, mecânico e fiel ao molde de `auth`/`partners`/`financial`. Todos os 8 itens do
checklist verdes. Duas observações não-bloqueantes registradas ao final (não impedem o W3).

---

## Checklist

### 1. Aderência ao ticket — ✓
- **6 tabelas cobertas** — `mysql.ts` recebe `legacyId: int('legacy_id')` em `budgetPlans`
  (schemas/mysql.ts, bloco `bgp_budget_plans`), `budgets`, `costCenters`, `categories`,
  `subcategories` e `budgetResults`. Confere com a tabela do `000-request.md:24-31`.
- **Nullable** — `int('legacy_id')` **sem** `.notNull()` nas 6 (diff ae2e7941). Correto: CA2
  (`000-request.md:44`) exige múltiplos NULL sob UNIQUE, só possível com coluna nullable.
- **UNIQUE de coluna única (não composto)** — os 6 `uniqueIndex('..._legacy_id_uq').on(t.legacyId)`
  têm um único argumento em `.on(...)`. Nenhum embute `legacy_id` num índice composto. ✓

### 2. ADR-0020 (MySQL único, migration por db:generate) — ✓
- Migration `0009_futuristic_eternity.sql` **gerada**, não escrita à mão: `meta/_journal.json`
  ganhou `idx: 9`, `tag: "0009_futuristic_eternity"`, `version: "5"`, `breakpoints: true`, e há
  `meta/0009_snapshot.json` (653 linhas). Os marcadores `--> statement-breakpoint` são assinatura
  do Drizzle Kit — não de edição manual.
- **Coerente com o schema**: 6 `ADD legacy_id int;` (nullable, sem `NOT NULL`) + 6
  `ADD CONSTRAINT bgp_<t>_legacy_id_uq UNIQUE(legacy_id)`. Bate 1:1 com o schema. `int` e UNIQUE
  são features permitidas pela lista normativa do ADR-0020 (sem JSON, ENUM ou AUTO_INCREMENT). ✓

### 3. ADR-0014 / isolamento de módulo — ✓
- Todo o diff de produção vive em `src/modules/budget-plans/adapters/persistence/`. Nenhum import
  cruza fronteira de módulo; nenhuma tabela fora do prefixo `bgp_*` é tocada. Aditivo puro. ✓

### 4. Molde (auth/partners/financial) — ✓
- `legacyId: int('legacy_id')` idêntico a `auth` (`mysql.ts:126`), `financial` (`mysql.ts:166`) e às
  5 ocorrências em `partners`.
- Comentário de coluna e de índice reproduz literalmente o padrão ("Idempotencia da ETL: UNIQUE em
  legacy_id (multiplos NULL permitidos no InnoDB)") — cf. `financial/mysql.ts:219`,
  `auth/mysql.ts:151-152`.
- Sufixo `_uq` alinhado a `financial` (`fin_documents_legacy_id_uq`). Ver observação B sobre `auth`.

### 5. Idempotência (o UNIQUE habilita o `alreadyExists`) — ✓
- Coluna nullable + `uniqueIndex` single-column dá exatamente a semântica pedida: no InnoDB, N linhas
  nativas com `legacy_id = NULL` convivem (CA2), e duas linhas com o **mesmo** `legacy_id` violam o
  UNIQUE → `ER_DUP_ENTRY` (CA3). É o que o `alreadyExists` do `reconcile.ts` consulta
  (`000-request.md:15-18`). Prova de runtime é W3 (19 testes `MYSQL_INTEGRATION=1`); no nível de
  contrato/schema, correto. ✓

### 6. Regressão — ajuste do guarda `no-docker.test.ts` preserva o invariante real — ✓
- A asserção trocada (`compose.etl.yaml foi removido` → `nenhum script do ETL depende do
  compose.etl.yaml`) **substitui um proxy por invariante real**, não afrouxa. O invariante que
  importa é "o CÓDIGO do ETL não depende de Docker/compose", e o novo teste o checa lendo o source
  dos entrypoints + `connect.ts` (`no-docker.test.ts:40-47`).
- **Verificado independentemente**: `grep -rn "compose.etl" scripts/etl/` → **zero** ocorrências. O
  invariante é genuinamente verdadeiro, e o `compose.etl.yaml` recriado (banco de referência) convive
  sem contradizer a decisão de 02/07.
- **As 4 asserções originais seguem intactas**: `restore.ts foi removido` (:36-38), `withLegacyMysql`
  + `--dump` (:49-55), `connect.ts` não importa restore + lê `ETL_LEGACY_CONNECTION_STRING` (:57-64),
  `check-duplicates.ts` usa a URL do legado (:66-72). ✓

### 7. Naming / idioma — ✓
- Código EN (`legacyId`, `legacy_id`), comentários PT-BR ASCII puro (sem acento no diff novo:
  "Idempotencia", "multiplos", "nao"). Test file declara "ASCII puro. Codigo EN, comentarios PT-BR".
- **Nomes de constraint ≤ 64 chars**: maior é `bgp_budget_results_legacy_id_uq` = 31 chars. Todos
  folgados. ✓

### 8. YAGNI — ✓
- Nada além de 6 colunas + 6 uniques + migration. Sem FK física (`legacy_id` não referencia o
  legado — correto, é dado de correlação), sem índice extra, sem mudança em repo/mapper (isso é
  fatia 2/3, cf. `003-impl/REPORT.md:52` e `000-request.md:38`). ✓

---

## Observações não-bloqueantes (não exigem reabertura de W1)

- **A — Escopo do novo assert é mais estreito que o texto do commit.** O teste checa `compose.etl`
  apenas nos 3 ENTRYPOINTS + `connect.ts`, enquanto a mensagem de commit afirma "nenhum script em
  `scripts/etl/`". Um script futuro fora do read-path que referenciasse o compose não seria pego.
  Aceitável (os entrypoints + connect são o caminho de leitura), e o grep confirma que hoje o
  invariante vale para todo `scripts/etl/`. Se quiser fechar a folga no futuro, um glob sobre
  `scripts/etl/**/*.ts` seria mais robusto — mas fora do escopo desta fatia.
- **B — Sufixo de índice divergente entre módulos.** `bgp_*` e `financial` usam `_legacy_id_uq`;
  `auth` usa `_legacy_id_idx`. O teste estrutural é name-agnostic (checa só que é UNIQUE de coluna
  única), então não quebra. `_uq` é o molde mais recente e mais correto (é UNIQUE, não índice comum).
  Sem ação.

## Próximo passo

W3 (QUALITY) com `ts-quality-checker`: `typecheck` + `format:check` + `lint` + `pnpm test` verdes, e
os 19 testes de integração provados via `pnpm run test:integration:budget-plans` (sobe MySQL) — os
3 CAs de constraint (CA1/CA2/CA3) + a sentinela CA4.
