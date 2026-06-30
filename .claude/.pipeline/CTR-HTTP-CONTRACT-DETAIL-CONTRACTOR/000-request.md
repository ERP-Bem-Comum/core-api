# CTR-HTTP-CONTRACT-DETAIL-CONTRACTOR — compor o contratado no `GET /contracts/:id`

> **Size:** M · **Origem:** [ADR-0032](../../../handbook/architecture/adr/0032-transient-http-composition-read-until-bff.md) (rota gorda de composição transitória) + [po-feedback/0001](../../../handbook/po-feedback/0001-gap-api-v2-contracts.md).
> **Depende de (ambos ENTREGUES):** PARTNERS-CONTRACTOR-READ-PORT (PR #15, `9ffd07d`) **e** CTR-CONTRACT-CONTRACTOR-REF (closed-green — vínculo `contract.contractorRef` no agregado).

## Contexto

O `GET /contracts/:id` já devolve a visão rica do detalhe (`getContractDetail` → `contractFullDetailSchema`): o agregado `Contract` + `amendments[]` + `documents[]` aninhados, composto na borda HTTP (CTR-HTTP-CONTRACT-DETAIL-CHILDREN-FILES, ADR-0032). Falta a última peça da paridade v1 pedida pela P.O.: o **contratado** (supplier/financier/collaborator) com seus dados bancários/PIX read-only.

A leitura cross-módulo do contratado já existe: `buildPartnersReadPort` na public-api de Parceiros expõe `getSupplierView`/`getFinancierView`/`getCollaboratorView` → `Result<*View | null, E>`, projeção plana com bancário/PIX + `updatedAt`. Este ticket **consome** esse port na borda de Contratos.

ADR-0032 fixa a regra de ouro (citação literal, `adr/0032-...md:42`):

> **Campos do próprio contrato ≠ composição.** [...] **dado de outro módulo → composição na borda; atributo do próprio contrato → evolui o agregado.**

## Pré-requisito ENTREGUE: o vínculo no agregado

O ticket de domínio **[CTR-CONTRACT-CONTRACTOR-REF](../CTR-CONTRACT-CONTRACTOR-REF/000-request.md)** (closed-green) adicionou ao agregado:

```ts
// contract.contractorRef (presente em TODAS as variantes, incl. Pending):
type ContractorRef =
  | Readonly<{ kind: 'Supplier';      id: SupplierRef }>
  | Readonly<{ kind: 'Financier';     id: FinancierRef }>
  | Readonly<{ kind: 'Collaborator';  id: CollaboratorRef }>;
```

Logo, a rota já sabe **qual** contratado compor: lê `contract.contractorRef.kind` para escolher o `get*View` e `contract.contractorRef.id` como a chave. Este ticket faz só a **composição do dado** na borda.

## Escopo (composição HTTP — núcleo limpo, ADR-0032 #1)

> **Fronteira de arquitetura:** a composição cross-módulo vive **no adapter HTTP** (`adapters/http/`), **nunca** em `application/use-cases/` nem no `domain/`. `getContractDetail` (application) permanece intocado — compõe só Contract+Amendment+Document do próprio módulo. Adicionar Parceiros a ele violaria ADR-0032 #1 (núcleo não conhece Parceiros).

1. **Wiring (`adapters/http/composition.ts`).** `buildContractsHttpDeps` passa a montar um `PartnersReadPort` (via `buildPartnersReadPort`) no driver `mysql` e um fake/in-memory no driver `memory`. `connectionString` (reader) vem da config/env já usada — nunca do cliente. Encadear o `close()` do port no `shutdown` existente. Expor a leitura em `ContractsHttpDeps` (ex.: `getContractorView({ kind, id })`).
2. **Composição na borda.** No handler de `GET /contracts/:id` (ou helper em `adapters/http/`): após `deps.getContractDetail(...)` (inalterado), ler `contract.contractorRef`, despachar por `.kind` para `get*View(id)` e aninhar a `*View` no DTO. Sem regra de negócio, sem mutação, sem evento.
3. **DTO + schema (`adapters/http/`).** Estender `contractFullDetailSchema`/`ContractDetailDto` com `contractor` (discriminated por `kind`, alinhado a `contractorRef` + às `*View`). Mapper `contractorViewToDto`.
4. **Transitoriedade (ADR-0032 #3).** A rota já é a "rota gorda" provisória; a composição do contratado herda a marcação `@transient`/`Deprecation`/`Sunset` existente (não regredir).

## Critérios de Aceite

- [ ] **CA1** — `GET /contracts/:id` devolve, além de `amendments[]`/`documents[]`, um campo `contractor` com a `*View` read-only correspondente ao `contractorRef.kind` (nome, doc; para supplier: bancário/PIX + `updatedAt`).
- [ ] **CA2** — contratado inexistente em Parceiros (`get*View` → `ok(null)`): a rota **não quebra** — responde o detalhe com `contractor: null` (degradação graciosa), não 500.
- [ ] **CA3** — **isolamento (ADR-0006/0014):** Contratos lê o contratado **só** via `partners/public-api`. Zero `SELECT` em `par_*`, zero import de `partners/domain|application`.
- [ ] **CA4** — **núcleo intocado (ADR-0032 #1):** `contracts/domain` e `contracts/application/use-cases` não ganham campo de Parceiros nem lógica de apresentação. A composição é 100% em `adapters/http/`.
- [ ] **CA5** — erro de infra na leitura de Parceiros → `Result` err tipado, traduzido a um HTTP coerente na borda (não vaza throw; não 200 silencioso com dado faltante por engano — distinguir `null` "não existe" de erro de infra).
- [ ] **CA6** — driver `memory` funciona com um `PartnersReadPort` in-memory/fake (E2E offline da P.O. sem MySQL).
- [ ] **CA7** — integração gated (`MYSQL_INTEGRATION=1`) provando o round-trip real Contratos→`partners/public-api`→`*View` no JSON da rota.

## Fora de escopo

- `program`/`budgetPlan` (BC de Planejamento Orçamentário inexistente — Inquiry-0014, ADR-0032 §Contexto).
- Migração da composição para o BFF v2 (fim-de-vida planejado do ADR-0032).
- Qualquer escrita / mutação de Parceiros. Validar existência do contratado na criação (FK lógica) — refs são rehydrate-only (ADR-0031 §7).

## Pipeline

W0 testes RED (composição + degradação graciosa CA2 + isolamento) → W1 wiring do port + composição na borda + DTO/schema → W2 review (foco em CA3 isolamento e CA4 núcleo limpo) → W3 gate (`typecheck` + `format:check` + `lint` + `test`, integração gated não-órfã). Skills: `ports-and-adapters` (wiring) + `tdd-strategist` (W0).
