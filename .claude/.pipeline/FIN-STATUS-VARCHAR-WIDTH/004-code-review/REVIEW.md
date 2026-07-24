# Code Review — Ticket FIN-STATUS-VARCHAR-WIDTH (#519) — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer (W2, read-only)
**Data:** 2026-07-23
**Escopo revisado:**

- `src/modules/financial/adapters/persistence/schemas/mysql.ts` (widen `:116` e `:249`)
- `src/modules/financial/adapters/persistence/migrations/mysql/0039_huge_firelord.sql` (novo)
- `src/modules/financial/adapters/persistence/migrations/mysql/meta/0039_snapshot.json` (novo)
- `src/modules/financial/adapters/persistence/migrations/mysql/meta/_journal.json` (idx 39)
- `tests/modules/financial/adapters/persistence/payable-status-width.drizzle-mysql.test.ts` (novo, W0)
- `scripts/ci/test-integration.ts` (registro na suíte `financial`)
- Cruzado contra: `000-request.md`, `002-tests/REPORT.md`, `003-impl/REPORT.md`, `SOL-519.md`,
  ADR-0014 (isolamento por módulo), ADR-0020/0018 (varchar+CHECK, larguras)

---

## Verificação dos focos do review (evidência coletada)

### (a) Escopo restrito ao módulo `financial` — ✅ CONFIRMADO

- `git status --short` lista **apenas** arquivos sob `src/modules/financial/…`, `tests/modules/financial/…`,
  `scripts/ci/test-integration.ts` e os artefatos de pipeline/planning. **Nenhum arquivo de `contracts/`.**
- `contracts.ctr_documents.status` **permanece `varchar(16)`** (`contracts/…/schemas/mysql.ts:430`, além de
  `:77` e `:227`) — **não tocado**. É a mesma classe de anti-padrão (margem 0 com `'LogicallyDeleted'`=16),
  corretamente deixada como follow-up separado (ADR-0014, um módulo por sessão).
- Diff `0038_snapshot.json` → `0039_snapshot.json`: **exatamente 2 mudanças de tipo** (`varchar(16)`→`varchar(24)`)
  + rotação esperada de `id`/`prevId`. Nada mais.
- Varredura do snapshot por tabela: só `fin_documents.status` e `fin_payables.status` viraram `varchar(24)`.
  Os demais `status` (`fin_cedente_accounts`=8, `fin_expected_counterpart`=12, `fin_payable_view`=12,
  `fin_reconciliation_periods`=8, `fin_reconciliations`=8) e os `varchar(16)` remanescentes
  (`*.type`, `payee_kind`, `entry_type`) ficaram intocados — corretos, seus literais cabem (SOL-519 §4).

### (b) Migration segura, mínima e SEM hint de ALGORITHM — ✅ CONFIRMADO

`0039_huge_firelord.sql`, íntegro:

```sql
ALTER TABLE `fin_documents` MODIFY COLUMN `status` varchar(24) NOT NULL;--> statement-breakpoint
ALTER TABLE `fin_payables` MODIFY COLUMN `status` varchar(24) NOT NULL;
```

- **Exatamente 2 `MODIFY COLUMN`** (documents + payables). Nenhum terceiro statement.
- **SEM `ALGORITHM=INPLACE/INSTANT`** — unhinted. Correto: forçar hint estoura ERROR 1845 nesta família
  8.4 (memória `mysql84-alter-varchar-no-algorithm-hint`; refinada no W1 §5 — 8.4.10 cai em INPLACE,
  ≤8.4.9 em COPY; o unhinted adapta-se à versão). Passaria o gate unit e só quebraria no apply real.
- **CHECK não re-emitido:** zero statement de CONSTRAINT no diff. O CHECK `fin_*_status_chk` segue no
  schema (`:186`/`:274`) listando `'PartiallyReconciled'` → permanece ativo. Não caiu no bug só-DROP.
- **Formato drizzle-kit padrão** (statement + `--> statement-breakpoint`), coerente com o snapshot e com o
  `_journal.json` (idx 39, tag `0039_huge_firelord`, version "5", breakpoints true). Sem sinais de edição
  manual — é geração, não descoberta.
- `MODIFY` sem cláusula `COLLATE` → herda `utf8mb4_unicode_ci` da tabela; sem drift de collation.

### (c) Regressão coberta — ✅ SUFICIENTE (com um caveat operacional já documentado)

- **Dado (não-destrutivo):** `CHECKSUM TABLE` idêntico antes/depois do `ALTER` (`1561723521` = `1561723521`)
  numa réplica fiel de `fin_payables` em MySQL **8.4.10 nativo** (VM Incus). CHECK segue ativo (INSERT
  inválido → ERROR 3819). Widening de VARCHAR é value-preserving por definição do refman. Prova sólida.
- **Comportamento:** suíte de integração `financial` completa **119/119 pass** contra a VM com a `0039`
  aplicada — inclui o caso antes RED (conciliação parcial) e o teste de largura do W0 (2 casos GREEN).
- **RED→GREEN** também provado em container 8.4.10 isolado (x99): `varchar(16)` = 2 fail (errno 1406);
  `varchar(24)` = 2 pass, read-back íntegro; `ALTER` aplicou sem 1845.

---

## Issues encontradas

### 🔴 Crítica (bloqueia approval)

Nenhuma.

### 🟡 Importante (não-bloqueia, registrar)

Nenhuma.

### 🔵 Sugestão (estilo / clareza — não bloqueiam)

#### S1 — Título do teste petrifica um estado transitório: "RED por 1406 hoje"

`tests/modules/financial/adapters/persistence/payable-status-width.drizzle-mysql.test.ts:105,142`

Os dois `it(...)` se chamam `"CA2: … comporta 'PartiallyReconciled' (19) — RED por 1406 hoje"`. Após o W1
o teste é **GREEN**; o sufixo "RED … hoje" descreve um estado que já não vale e envelhece mal na suíte de
regressão. Sugestão: nomear pelo invariante permanente — ex.: `"CA1/CA2: fin_payables.status comporta
'PartiallyReconciled' (19)"`. O contexto histórico do RED já vive no comentário de cabeçalho e no W0 REPORT.
(Não altera comportamento; puramente legibilidade.)

#### S2 — Ramo RED não fixa `errno === 1406` no código do teste (embora o W0 REPORT o prove)

Mesmo arquivo, `:120-127` e `:155-162`. O teste chama `assert.fail(...)` para **qualquer** `thrown !== null`,
interpolando o `errno` só na mensagem — não faz `assert.equal(mysqlErrnoOf(thrown), 1406)`. Na prática o RED
é honesto: o seed usa status curtos válidos (`'Open'`/`'Paid'`), o CHECK aceita `'PartiallyReconciled'`, então
a única falha possível no passo de UPDATE é a largura (1406) — e o W0 REPORT registra empiricamente
`errno=1406`. Como o teste vive no mundo GREEN como guarda de regressão (e ali a asserção de read-back é
precisa, sem falso-verde possível), pinar `1406` no ramo RED seria código morto pós-GREEN. **Design defensável**;
registro apenas como observação de rigor, não como defeito.

#### S3 — Prova de checksum demonstrada em `fin_payables`; generaliza para `fin_documents`

W1 §4b(A) rodou `CHECKSUM TABLE` numa réplica de `fin_payables` (não explicitamente de `fin_documents`). A
generalização é sã — o `ALTER` é idêntico em espécie para as duas colunas e o mundo InnoDB trata o widening
igual — e a suíte 119/119 exercita `fin_documents`. Completude, não risco.

---

## Observações operacionais (fora do escopo de código — corretamente deferidas)

- **Janela de manutenção em PROD depende da versão de patch do MySQL de produção (RDS):** ≥8.4.10 → widen é
  metadata-only (INPLACE, lock negligível); ≤8.4.9 → COPY sob `LOCK=SHARED` (escritas em
  `fin_documents`/`fin_payables` pausam ∝ nº de linhas). Documentado em W1 §5 e `000-request.md` §"Restrição
  crítica". **Ação de ops antes do deploy**, não muda o código. A FK `fin_payables_document_id_fk`
  ON DELETE CASCADE só é revalidada no caminho COPY.

---

## Conformidade com regras invariantes (checklist aplicável a este diff)

- **ADR-0014 (isolamento por módulo):** ✅ só `financial`; `contracts` intocado.
- **ADR-0020/0018 (varchar+CHECK, ENUM nativo proibido, larguras derivadas do domínio):** ✅ `varchar(24)`
  cobre o maior literal do CHECK (`'PartiallyReconciled'`=19) com folga sã e alinha à família `fin_` de enums
  largos (`payment_method`=24, `manual_entries.type`=24). `varchar(19)` (encaixe exato) foi corretamente
  rejeitado — era o anti-padrão que originou o bug. Escolha defensável.
- **Idioma:** ✅ identificadores EN (`PARTIALLY_RECONCILED`, `seedPaidPayable`, `mysqlErrnoOf`), comentários e
  nomes de teste em PT.
- **Zero `any`:** ✅ o walker de `.cause` usa `unknown` com narrowing (`as { errno?: unknown }` sobre `unknown`,
  não `any`); em `tests/**` as regras de naming/return-type são relaxadas (`.claude/rules/testing.md`).
- **Gate de integração:** ✅ `if (!process.env['MYSQL_INTEGRATION'])` → skip limpo no `pnpm test` puro
  (mensagem, sem conexão). Registrado na suíte `financial` (que injeta `MYSQL_INTEGRATION: '1'`) e coberto por
  `test:integration:financial` — registro correto, sem risco de falso-verde por teste órfão.
- **UUID válidos no teste:** ✅ `newUuid()`, não `'fake-id'`.
- **`.ts` nos imports + `import type`:** ✅ (`import type { FinancialMysqlHandle }`, todos os caminhos `.ts`).

---

## O que está bom

- **Mudança cirúrgica:** 2 literais no schema, migration de 2 linhas, snapshot com 2 deltas. Diff mínimo,
  exatamente o que a fatia S exige.
- **Teste no nível certo:** bug de LARGURA de coluna só é capturável contra MySQL real; o teste faz UPDATE
  direto no adapter (não via repo, que engoliria o 1406 num Result genérico) e assere read-back íntegro — pina
  o defeito exato e evita falso-verde. Isolamento via ids únicos + `finally` com CASCADE.
- **Rigor de regressão acima do exigido:** além do container x99, o W1 validou numa VM Incus com MySQL 8.4.10
  nativo — checksum byte-a-byte idêntico + 119/119 financial — e ainda mediu o modo de ALTER por versão,
  refinando a memória `mysql84-alter-varchar-no-algorithm-hint` (INPLACE passou a funcionar em 8.4.10).
- **Restrição do hint respeitada:** a migration ficou unhinted, exatamente como a memória/refman exigem.

---

## Próximo passo

- **APPROVED** → pipeline-maestro avança para **W3** (`typecheck` + `format:check` + `lint` + `test` +
  `test:integration:financial` verdes). As 3 sugestões (S1–S3) são opcionais e não bloqueiam o gate.
- Fora do código: confirmar a versão de patch do MySQL de produção antes do apply (janela se ≤8.4.9) e abrir
  o follow-up de `contracts.ctr_documents.status` (ADR-0014, ticket próprio).
