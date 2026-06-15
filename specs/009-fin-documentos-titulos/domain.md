# Modelo de Domínio: Financeiro — Fatia 1: Gestão de Documentos + Geração de Títulos

**Feature**: `specs/009-fin-documentos-titulos/` · **Consultor**: `/acdg-skills:ddd-architect`

> Fase 2 da pipeline `core-api-sdd` (máximo rigor). Modelagem conduzida pela skill
> [`ts-domain-modeler`](../../.claude/skills/ts-domain-modeler/SKILL.md) (DDD tático funcional em TS puro)
> com [`modular-monolith`](../../.claude/skills/modular-monolith/SKILL.md) para a fronteira `fin_*` e refs cross-BC.
> Fonte de domínio: `handbook/domain_questions/financeiro/`. Spec clarificada: [`spec.md`](./spec.md).

> ⚠️ **Citações canônicas Evans/Vernon pendentes.** O princípio IX da pipeline exige trecho literal ≥4 linhas
> via a tool MCP `skills_citar` (`acdg-skills`), que **não está disponível nesta sessão interativa** (só no fluxo
> headless do engine — ver memória `pipeline-sdd-acdg-skills-mcp`). Os pontos marcados **[CITAÇÃO PENDENTE]**
> devem ser preenchidos com o trecho literal antes do gate; as justificativas abaixo estão ancoradas nas fontes
> que temos e citamos literalmente (handbook do projeto + ADRs aceitos).

---

## Bounded Contexts afetados

- [ ] Contratos (`ctr_*`) · [x] **Financeiro (`fin_*`)** · [ ] Auth (`auth_*`) · [ ] Parceiros (`partners_*`)

A Fatia 1 toca **um único BC** (Financeiro). Os BCs de Documentos e Títulos do handbook (`README.md:7-9`) são tratados
nesta fatia como **um agregado** (ver §"Boundary do agregado"), não como módulos físicos separados.

**Justificativa das fronteiras:**

> **[CITAÇÃO PENDENTE — Evans/Vernon via `skills_citar`]** (boundary de Bounded Context e isolamento de modelo).

Âncora disponível (citada literalmente do handbook/ADR):

> "O Core Financeiro nunca deve saber a estrutura interna dos módulos de Contratos ou Orçamento. A comunicação
> ocorre exclusivamente via eventos de domínio (`TituloConciliado`)..." — `handbook/domain_questions/financeiro/07-external-context.md:41`

O isolamento físico (`fin_*`) é imposto pelo ADR-0014 (isolamento por prefixo) e o consumo cross-módulo só via
`public-api` pelo ADR-0006. Fornecedor, contrato, programa e plano/categoria entram como **referências leves**
(ver §"Refs cross-BC"), nunca por import de domínio alheio.

---

## Linguagem ubíqua

| Termo (PT)               | Significado (negócio)                                                            | Tipo no código (EN)                      |
| ------------------------ | -------------------------------------------------------------------------------- | ---------------------------------------- |
| Fato Gerador / Documento | Documento fiscal/não-fiscal que origina a obrigação                              | agregado `Document` (raiz)               |
| Título                   | Obrigação a pagar derivada do documento (Pai = líquido; Filho = imposto retido)  | entidade `Payable`                       |
| Título Pai               | Título do valor líquido ao fornecedor                                            | `Payable` com `kind: 'Parent'`           |
| Título Filho             | Título de um imposto retido (NFS-e/RPA)                                          | `Payable` com `kind: 'Child'`            |
| Valor Líquido            | `Bruto − Descontos na Fonte − Retenções − Descontos + Multa + Juros` (calculado) | `Money` (derivado, não digitado)         |
| Retenção                 | Imposto que gera filho e abate do líquido                                        | VO `Retention`                           |
| Imposto Registrado       | Imposto apenas lido (não gera filho, não abate)                                  | VO `RegisteredTax`                       |
| Forma de Pagamento       | TED/Transferência/PIX/... (define remessa em fatias futuras)                     | `PaymentMethod` (union)                  |
| Aprovação                | Ato que torna campos vitais imutáveis e move `Aberto`→`Aprovado` (pai+filhos)    | função `approve`                         |
| Desfazer Aprovação       | Rollback `Aprovado`→`Aberto`                                                     | função `undoApproval`                    |
| Trilha / Time Travel     | Histórico por-campo (autor, instante, antes→depois)                              | read-model `DocumentTimeline`            |
| Fornecedor               | Parceiro favorecido do título pai                                                | `SupplierRef` (de `partners/public-api`) |

---

## Agregados e Value Objects

### Boundary do agregado — `Document` como raiz, `Payable` como entidade interna

**Decisão (ADR-candidata B):** nesta fatia, **`Document` é a raiz do agregado** e os títulos (`Payable` pai + filhos)
são **entidades internas** ao agregado, não agregados próprios.

- **Por quê:** todas as operações da Fatia 1 — gerar (pai+filhos), aprovar (herança), ajustar (recalcular filhos),
  cancelar (hard delete pai+filhos), desfazer aprovação (recriar filhos) — são **transacionais sobre o conjunto**.
  O documento e o título pai **compartilham o mesmo status** (`gestao-documentos.md:22-24`). Fronteira de consistência = documento + seus títulos.
- **Tensão a registrar no ADR:** o handbook prevê que cada título tem **ciclo de vida financeiro independente**
  (pagamento/baixa/conciliação individuais — `titulos-liquidacao.md:68` R7.1). Isso só se materializa nas fatias de
  Liquidação/Conciliação. **Reavaliar o split** (promover `Payable` a agregado próprio referenciado por `DocumentId`)
  quando aquelas fatias entrarem.

> **[CITAÇÃO PENDENTE — Vernon, *Effective Aggregate Design* (agregados pequenos × consistência transacional)]**

---

### VOs do shared kernel (reúso — não recriar)

- **`Money`** — `src/shared/kernel/money.ts` (bigint/centavos). Toda grandeza monetária.
- **`Result<T,E>`** — `src/shared/primitives/result.ts`. Toda operação de domínio.
- **`Brand<T,K>`** — para os IDs/VOs branded novos.

### Refs cross-BC (VOs novos — primitivo-brand, validação só formato UUID v4)

Espelham o padrão `SupplierRef` (`partners/public-api/refs.ts`) — rehydrate-only, sem importar domínio alheio (ADR-0031/0006).

```ts
// src/modules/financial/domain/shared/refs.ts (a criar)
export type ContractRef = Brand<string, 'ContractRef'>;
export type BudgetPlanRef = Brand<string, 'BudgetPlanRef'>; // Plano Orçamentário (sem dono — refs leves)
export type CategoryRef = Brand<string, 'CategoryRef'>; // Categoria orçamentária (sem dono)
export type ProgramRef = Brand<string, 'ProgramRef'>;
export type FinancialRefError = 'financial-ref-invalid';
// rehydrate(raw): isUuidV4(raw) ? ok(raw) : err('financial-ref-invalid')
```

- **`SupplierRef`** é **reusado de `partners/public-api`** (não recriar) — fornecedor obrigatório.
- `ContractRef`/`BudgetPlanRef`/`CategoryRef`/`ProgramRef` são **opcionais** (decisão clarify Q1). `BudgetPlanRef`/`CategoryRef`
  não têm módulo dono — refs leves, como `contracts.budgetPlanId` (`contracts/domain/contract/types.ts:33-37`). **ADR-candidato A.**

### IDs do agregado (primitivo-brand)

```ts
export type DocumentId = Brand<string, 'DocumentId'>;
export type PayableId = Brand<string, 'PayableId'>;
```

### VO `Retention` (gera filho, abate do líquido)

```ts
export type RetentionType = 'ISS' | 'IRRF' | 'INSS' | 'CSRF';
export type Retention = Readonly<{ type: RetentionType; base: Money; rate: number; value: Money }>;
// smart constructor valida: value coerente com base*rate (tolerância) — soberania do documento (R2) permite divergência sinalizada
```

### VO `RegisteredTax` (apenas leitura — nunca gera filho, nunca abate)

```ts
export type RegisteredTaxType =
  | 'ICMS'
  | 'IPI'
  | 'PIS'
  | 'COFINS'
  | 'CBS'
  | 'IBS_Municipal'
  | 'IBS_Estadual';
export type RegisteredTax = Readonly<{
  type: RegisteredTaxType;
  base: Money;
  rate: number;
  value: Money;
}>;
```

### VO `DocumentType` e regra de origem

```ts
export type DocumentType = 'NFS-e' | 'DANFE' | 'RPA' | 'Fatura' | 'Boleto' | 'Recibo' | 'Imposto';
```

Regra de geração de filhos (invariante, `titulos-liquidacao.md:69` R8 + `especificacao-mestre.md:60-68`):

| `DocumentType`            | Classe     | Retenções permitidas (geram filhos)    | Gera filhos? |
| ------------------------- | ---------- | -------------------------------------- | ------------ |
| NFS-e                     | Fiscal     | ISS, IRRF, INSS, CSRF                  | ✅           |
| RPA                       | Fiscal     | IRRF, INSS, CSRF                       | ✅           |
| DANFE                     | Fiscal     | — (ICMS/IPI/PIS/COFINS só registrados) | ❌           |
| Fatura                    | Fiscal     | —                                      | ❌           |
| Boleto / Recibo / Imposto | Não-fiscal | —                                      | ❌           |

### VO `PaymentMethod`

```ts
export type PaymentMethod =
  | 'TED'
  | 'TransferenciaBancaria'
  | 'PIX'
  | 'Boleto'
  | 'CartaoCorporativo'
  | 'Cambio'
  | 'GuiaRecolhimento'
  | 'Outro';
// Nesta fatia: apenas armazenada; sem efeito de remessa (TED/Transferência → CNAB em fatia futura).
```

### `FinancialData` e cálculo do líquido (invariante R1)

```ts
export type FinancialData = Readonly<{
  grossValue: Money; // valorBruto
  sourceDiscounts: Money; // descontosNaFonte (abate)
  retentions: readonly Retention[]; // abatem + geram filhos
  registeredTaxes: readonly RegisteredTax[]; // NÃO abatem, NÃO geram filhos
  discounts: Money; // descontos comerciais (abate)
  penalty: Money; // multa (soma)
  interest: Money; // juros (soma)
  netValue: Money; // CALCULADO — nunca digitado
}>;
```

> `netValue = gross − sourceDiscounts − Σretentions − discounts + penalty + interest`. Impostos registrados **não entram**
> (`gestao-documentos.md:78-81` R1). Smart constructor recusa **líquido não-positivo** (edge case da spec). Função pura
> `computeNetValue(data): Result<Money, 'net-value-not-positive' | ...>`.

### Agregado `Document` — state machine (tipos refinados por estado)

Document e o título pai compartilham status. Tipos refinados ativos nesta fatia + placeholders reservados:

```ts
export type DocumentStatus =
  | 'Draft'
  | 'Open'
  | 'Approved' // ativos nesta fatia
  | 'Transmitted'
  | 'Refused'
  | 'Paid'
  | 'Reconciled'; // placeholders — sem transição (FR-016)

type DraftDocument = DocumentCore & Readonly<{ status: 'Draft' }>; // CRUD parcial, sem validação plena
type OpenDocument = DocumentCore & Readonly<{ status: 'Open'; payables: Payables }>;
type ApprovedDocument = DocumentCore &
  Readonly<{ status: 'Approved'; payables: Payables; approvedAt: Date; approvedBy: UserRef }>;
export type Document = DraftDocument | OpenDocument | ApprovedDocument; // (placeholders reservados; sem tipo refinado nesta fatia)
```

`DocumentCore`: `id`, número/série fiscal (input), `type`, `supplier: SupplierRef`, refs opcionais, `paymentMethod`,
`financialData`, metadados de origem (manual; flag de divergência), `description`, `dueDate`.

**Transições (funções totais sobre o tipo refinado, `Result<{document, events}, E>`):**

| Função                      | Entrada → Saída                         | Regra                                                        |
| --------------------------- | --------------------------------------- | ------------------------------------------------------------ |
| `saveDraft` / `updateDraft` | → `DraftDocument`                       | autosave do cliente; sem validação plena (FR; R10)           |
| `submit`                    | `DraftDocument` → `OpenDocument`        | valida obrigatórios; **gera pai + filhos** (`Open`)          |
| `save`                      | (novo) → `OpenDocument`                 | criação direta em `Open` + geração de títulos                |
| `adjust`                    | `OpenDocument` → `OpenDocument`         | recalcula líquido + regenera filhos (R; FR-011)              |
| `approve`                   | `OpenDocument` → `ApprovedDocument`     | **herança**: aprova pai+filhos; trava campos vitais (R4/R7)  |
| `editApproved`              | `ApprovedDocument` → `ApprovedDocument` | só `description` + `dueDate` (R5/FR-008)                     |
| `undoApproval`              | `ApprovedDocument` → `OpenDocument`     | se valores mudaram → **hard delete** filhos + recriar (R8.1) |
| `cancel`                    | `OpenDocument` → ⊥                      | hard delete pai+filhos; **só em `Open`** (R6/R7)             |

Exhaustive switch sem `throw` (Padrão B da skill, `.claude/rules/domain.md`).

### Entidade `Payable` (interna ao agregado)

```ts
export type PayableKind = 'Parent' | 'Child';
export type Payable = Readonly<{
  id: PayableId;
  origin: DocumentId;
  kind: PayableKind;
  retentionType: RetentionType | null; // preenchido só em filhos
  status: DocumentStatus; // espelha o documento nesta fatia
  value: Money; // Pai = netValue; Filho = retention.value
  dueDate: Date;
  paymentMethod: PaymentMethod;
}>;
export type Payables = Readonly<{ parent: Payable; children: readonly Payable[] }>;
```

> **Independência futura (R7.1):** nesta fatia pai+filhos transitam juntos; o ciclo independente (pagamento/baixa/conciliação)
> entra nas fatias seguintes — quando `Payable` pode virar agregado próprio (ADR-candidato B).

### Read-model `DocumentTimeline` (Time Travel por-campo — decisão Q3)

Espelha o padrão de `contracts/domain/timeline/` (read-model derivado do stream de eventos — ADR-0022), **estendido** para
capturar diff por-campo:

```ts
export type FieldChange = Readonly<{ field: string; before: string | null; after: string | null }>;
export type FinancialTimelineEntry = Readonly<{
  eventId: string;
  target: { kind: 'Document'; id: DocumentId } | { kind: 'Payable'; id: PayableId };
  kind: FinancialEvent['type']; // discriminador EN; rótulo PT no formatter
  occurredAt: Date;
  actor: UserRef | null; // best-effort (RBAC)
  changes: readonly FieldChange[]; // diff por-campo (vazio p/ marcos sem edição)
}>;
```

> **ADR-candidato C:** "timeline por-campo derivada de eventos que carregam o diff" (estende ADR-0022) **vs** tabela de
> auditoria append-only dedicada. A decisão Q3 amplia o escopo da fatia — exige que os eventos de edição transportem `changes`.

---

## Eventos de domínio (outbox)

EN-passado (ADR-0006/0015). Nesta fatia **nenhum evento cross-BC é publicado** (`TituloConciliado` é fatia de Conciliação);
o outbox transporta eventos internos que alimentam a timeline e a integração futura.

| Evento (EN-passado)  | Quando ocorre                            | Payload (resumo)                              | Consumidor cross-BC     |
| -------------------- | ---------------------------------------- | --------------------------------------------- | ----------------------- |
| `DocumentDraftSaved` | autosave/atualização de rascunho         | `documentId`, `changes[]`                     | N/A                     |
| `DocumentSaved`      | salvar/submeter → gera pai+filhos `Open` | `documentId`, `payableIds`, snapshot          | N/A (futuro: Orçamento) |
| `PayableApproved`    | aprovação (pai e cada filho)             | `documentId`, `payableId`, `approvedBy`, `at` | N/A                     |
| `ApprovalUndone`     | desfazer aprovação                       | `documentId`, `valuesChanged: boolean`, `at`  | N/A                     |
| `DocumentCancelled`  | cancelamento em `Open` (hard delete)     | `documentId`, `payableIds`, `at`              | N/A                     |

> Cada evento mora em `src/modules/financial/public-api/events.ts` (ownership do BC — `ts-domain-modeler` §3.H.5). A timeline
> (`changes[]`) é populada a partir destes eventos.

---

## Mapa de contexto

```
[ partners (Supplier) ] ──SupplierRef (ADR-0031)──►┐
[ contracts ]           ──ContractRef (UUID leve)──►│
[ programs ]            ──ProgramRef (read port)───►│  [ Financeiro (fin_*) ]  ──(futuro)──► outbox ─► [ Contratos ], [ Orçamento ]
[ Orçamento: SEM DONO ] ─BudgetPlanRef/CategoryRef─►┘        (TituloConciliado — fatia de Conciliação)
```

- **Upstream consumido (refs leves):** `partners` (Supplier — único cross-check possível, mas decisão Q2 = só formato),
  `contracts`, `programs`. Plano/categoria **sem dono** (refs órfãs intencionais — ADR-candidato A).
- **Downstream (futuro):** Contratos e Orçamento consomem `TituloConciliado` via outbox — **fora desta fatia**.
- **Regra invariante:** nada de import de `domain/`/`application/` alheio; só `public-api` + outbox (ADR-0006/0015).

### ADRs candidatos (Fase 3)

| ID  | Decisão                                                                                                | Âncora                                       |
| --- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------- |
| A   | Refs leves cross-BC sem módulo dono (plano/categoria)                                                  | espelha `contracts.budgetPlanId`; clarify Q1 |
| B   | `Document` agregado raiz com `Payable` interno (fatia 1); reavaliar split na Liquidação                | R7.1 vs consistência transacional            |
| C   | Timeline por-campo (Time Travel) estendendo ADR-0022 (eventos carregam `changes`)                      | clarify Q3                                   |
| D   | Permissões RBAC do Financeiro no catálogo deploy-time (`fiscal-document:*`, `payable:*`)               | `auth/.../permission-catalog.ts`             |
| E   | Máquina de estados com placeholders reservados (`Transmitted`...`Reconciled`) sem transição na fatia 1 | FR-016                                       |

---

## Próxima fase

Fase 3 — **ADRs** (`adr/NNNN-*.md`) para as decisões A–E acima. Roteamento: decisão de arquitetura apoiada por
`modular-monolith` (A/B), `drizzle-orm-expert`/`mysql-database-expert` (C — persistência da timeline), `typescript-language-expert`
(type system). **[CITAÇÃO PENDENTE]** a resolver via `skills_citar` no fluxo headless.
