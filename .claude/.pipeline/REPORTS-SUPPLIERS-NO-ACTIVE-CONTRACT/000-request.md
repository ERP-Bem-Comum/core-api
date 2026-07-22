# REPORTS-SUPPLIERS-NO-ACTIVE-CONTRACT — escopo (#437 · correção semântica do REP-2)

> Corrige a **semântica** do relatório "Fornecedores sem Contrato" entregue no REP-2 (#240, PR #435).
> Size **M**. Branch `feat/437-suppliers-without-contract`. Épico Relatórios **#114**.
> Não fecha #114 (continua com 6 slices); fecha **#437**.

## Problema (validado em tela pela P.O.)

Fornecedor **com contrato ativo** aparece no relatório. A projeção
(`financial/public-api/suppliers-without-contract-projection.ts:59`) filtra
`WHERE contract_ref IS NULL AND supplier_ref IS NOT NULL` e agrupa por `supplier_ref` — isso responde
"fornecedor com **algum** título sem contrato", não "fornecedor sem **nenhum** contrato ativo".

O teste de integração vigente **codifica o bug**: em
`tests/modules/financial/public-api/suppliers-without-contract.drizzle-mysql.test.ts:95-101` insere para S1 um
título COM `contract_ref` e em `:130-135` afirma que S1 **deve aparecer**. Esse teste MUDA neste ticket —
é mudança de contrato semântico deliberada, não regressão.

## Decisões de produto (Gabriel, 2026-07-14)

1. **Semântica = per-fornecedor, vigência rigorosa.** Fornecedor aparece ⟺ **não possui nenhum contrato
   com `status = 'Active'`**. `Pending` (rascunho sem assinatura/vigência — CHECK
   `ctr_contracts_pending_consistency_chk`, `contracts/adapters/persistence/schemas/mysql.ts:122-125`)
   **NÃO** conta como contrato. `Expired`/`Terminated`/`Cancelled` também não.
2. **Filhos de retenção fora da soma.** Filtrar `kind = 'Parent'`. `payableCount` passa a contar
   documentos (1 NFS-e = 1) e `totalCents` = **valor líquido** ao fornecedor.

## Fundamento arquitetural (lido literalmente, não de memória)

- **ADR-0006 `:150`** — *"Sem cross-import entre BCs | ESLint rule + estrutura de pastas"*; **`:154`** — o
  prefixo de tabela por BC existe para evitar *"Joins acidentais cross-BC"*.
- **ADR-0014 `:130`** — *"Joins cross-database em queries de aplicação | Acopla serviços invisivelmente"*.

→ **Proibido** JOIN SQL entre `fin_payable_view` (`fin_*`) e `ctr_contracts` (`ctr_*`), mesmo coabitando o
database `core`. O anti-join é feito **em memória** no módulo `reports`, que orquestra dois read-ports de
public-api. Precedente MERGED: REP-1 consome `partners/public-api`; REP-2/REP-4 consomem
`financial/public-api`. `reports` é agregador **read-only** cross-módulo — é exatamente o mecanismo que o
ADR-0006 `:80` autoriza (*"Ports/adapters explícitos | Cada BC expõe interface de leitura/comando para outros"*).

## Estado atual (levantado via Explore)

- **NÃO EXISTE** `fin_contract_view` nem qualquer projeção de contrato no `financial`. `contract_ref` é ref
  solta, sem FK, sem status (`financial/adapters/persistence/schemas/mysql.ts:559`).
- **NÃO EXISTE** port em `contracts/public-api` que exponha `ContractStatus` ou vigência.
- O port existente `ContractCountReadPort.listActiveContractCountsByContractor()`
  (`contracts/application/ports/contract-count-read.ts:20-24`) **não serve**: `LIVE_STATUSES = ['Pending','Active']`
  (`contract-count-read.drizzle.ts:18`) — inclui rascunho, contra a decisão 1. Seu comentário `:8-11` trava
  essa regra por paridade backfill×worker → **não alterar** esse port; criar outro.
- Índice **já existente** que suporta a query nova: `ctr_contracts_contractor_idx (contractor_id, status)`
  (`contracts/adapters/persistence/schemas/mysql.ts:154`).
- Filho de retenção carrega o `supplier_ref` **do fornecedor** (não do órgão): as refs são aplicadas
  top-level a todo título em `financial/application/use-cases/apply-payable-event.ts:78-79`. Por isso hoje
  ele infla a agregação.

## Escopo (in)

1. **`contracts/public-api`** — port novo de leitura, boot-scoped `{ list, close }`:
   `buildContractsActiveContractorReadPort({ connectionString })` →
   `listContractorsWithActiveContract() → Result<readonly string[], E>`, lendo `ctr_contracts`
   `WHERE status = 'Active' AND contractor_type = 'supplier'`, `SELECT DISTINCT contractor_id`.
   **Pool boot-scoped** — nunca abrir por requisição (lição F1 do W2 #238 / incidente RDS 0001).
2. **`financial/public-api/suppliers-without-contract-projection.ts`** — adicionar `kind = 'Parent'` ao WHERE
   (decisão 2). Mantém `contract_ref IS NULL` como filtro de **candidatos** (barato, reduz o conjunto).
3. **`reports`** — novo port `ActiveContractorReadPort` + adapter ACL (`contracts`) + in-memory; a rota
   `GET /api/v2/reports/suppliers-without-contract` passa a **subtrair** do resultado do financial os
   fornecedores presentes no conjunto de contratantes ativos (anti-join em memória via `Set`); composition
   abre o reader novo no boot e fecha no shutdown.

## Fora de escopo (registrar, não consertar — anti-padrão #15)

- **`payee_kind` não projetado em `fin_payable_view`** → o relatório rotula como "fornecedor" qualquer
  favorecido (financiador/ACT/colaborador). `fin_documents.payee_kind` existe
  (`financial/adapters/persistence/schemas/mysql.ts:84`) mas não é projetado nem carregado no evento
  `DocumentSaved` (`financial/domain/document/document.ts:141-152`). **Mesma raiz da #436** → tratar lá.
- Vigência de calendário (`current_period_end < hoje` com `status` ainda `Active`, se o sweeper atrasar).
  Decisão 1 fixou `status='Active'` como a regra. Registrar se aparecer divergência no x99.
- Regra ESLint `no-cross-context-import` do ADR-0006 `:150` — ausente no projeto (follow-up herdado do REP-2).

## Critérios de aceite

- **CA1** Fornecedor com ≥1 contrato `status='Active'` (`contractor_type='supplier'`) **NÃO** aparece, mesmo
  tendo títulos com `contract_ref IS NULL`.
- **CA2** Fornecedor cujo único contrato é `Pending` **aparece** (rascunho não é contrato). Idem `Expired`,
  `Terminated`, `Cancelled`, e fornecedor sem contrato algum.
- **CA3** Filhos de retenção fora: documento sem contrato com ISS+IRRF → `payableCount = 1` e
  `totalCents` = líquido do pai (não a soma dos 3 títulos).
- **CA4** RBAC preservado: sem `fiscal-document:read` → 403; com → 200. Contrato HTTP
  (`{ suppliers: [{ supplierRef, name, totalCents, payableCount }] }`) **inalterado** — front não muda.
- **CA5** Validado no **MySQL real (x99)**: anti-join correto, `Cancelled` do payable ainda somado (regra do
  REP-2 mantida — todos os status de *título*), `kind='Parent'`, nomes via LEFT JOIN, pool boot-scoped
  (1 pool por reader, fechado no shutdown).

## Pipeline

| Wave | Skill/agente | Atividade |
| :-- | :-- | :-- |
| W0 | `tdd-strategist` | RED — anti-join (CA1/CA2), retenção (CA3), rota+RBAC (CA4) |
| W1 | `ports-and-adapters` (+ `drizzle-orm-expert` no reader novo) | port contracts + filtro kind + ACL/anti-join no reports |
| W2 | `code-reviewer` + `security-backend-expert` | audit read-only (pool boot-scoped, ADR-0006/0014) |
| W3 | `ts-quality-checker` | typecheck + format + lint + test + integração x99 |

## DoD

Gate W3 verde + CA1–CA5 + #437 fechada + contrato HTTP inalterado. Sem tocar `ContractCountReadPort`
existente (paridade backfill×worker).
