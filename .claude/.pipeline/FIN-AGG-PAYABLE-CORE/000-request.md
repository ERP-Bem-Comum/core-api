# FIN-AGG-PAYABLE-CORE — Agregado `Payable` (estados Open + Approved + transição approve)

> **Size:** M · **Status:** open · **Criado por:** main-session (Opus 4.7)
> **Predecessores:** FIN-MODULE-SCAFFOLD, FIN-CLI-WIRE, FIN-VO-FITID, FIN-IDS-PAYABLE, FIN-VO-TAX-ID, FIN-VO-BENEFICIARY-BANK-DATA (todos closed-green)
> **Sucessores previstos:**
>   - `FIN-AGG-PAYABLE-TRANSMISSION` (M) — estados Transmitted/Rejected/Overdue + transições associadas
>   - `FIN-AGG-PAYABLE-PAYMENT` (M) — estados Paid/Settled + transições finais
>
> **Primeiro M e primeiro agregado do módulo financial.** Salto qualitativo: VOs → entidade com identidade + ciclo de vida.

---

## 1. Contexto

`Payable` é a tradução EN canônica de **TituloFinanceiro** (handbook) — o agregado raiz do BC **Títulos e Liquidação**. Representa uma **obrigação a pagar** gerada por um documento fiscal (`FiscalDocument`, BC futuro).

**Citações literais do handbook:**

- `handbook/domain/04-titulos-liquidacao-context.md:15-36` — definição estrutural com 8 campos: `id`, `origem (DocumentoID)`, `tipo (TipoTitulo)`, `status (StatusTitulo)`, `metodoPagamento`, `beneficiario (DadosBancarios)`, `dadosPagamento.{valor, vencimento, saidaBancariaReal, fitid}`, `rastreabilidade`.
- `handbook/domain/04-titulos-liquidacao-context.md:54` — **R1 (Soberania da Aprovação):** "Somente títulos com perfil `Aprovado` podem ser incluídos em arquivos de remessa ou marcados como `Pago`."
- `handbook/domain/04-titulos-liquidacao-context.md:55` — **R2 (Imutabilidade de Valor):** "O valor de um `TituloFinanceiro` **nunca** pode ser editado neste contexto."
- `handbook/domain/04-titulos-liquidacao-context.md:63-67` — fluxo `Aberto → Aprovado → Transmitido/Pago → Liquidado`.

**Máquina de estados completa (7 estados):** `Open → Approved → Transmitted/Paid → Rejected/Overdue → Paid → Settled`. Este ticket cobre **apenas** os 2 primeiros estados + 1 transição.

### 1.1. Subset deste ticket

| Estado | Transição de entrada | Transição de saída coberta neste ticket |
| :--- | :--- | :--- |
| `Open` | smart constructor `open()` | `Open → Approved` via `approve()` |
| `Approved` | `approve()` | — (futuros tickets: `Approved → Transmitted` via `transmit()`, `Approved → Paid` via `registerManualPayment()`) |

Estados **fora do escopo** (M+ futuro): `Transmitted`, `Rejected`, `Overdue`, `Paid`, `Settled`.

---

## 2. Decisões de modelagem

### 2.1. Tipos refinados por estado (DO D§20)

Espelha pattern de `src/modules/contracts/domain/contract/types.ts`:

```ts
// Campos comuns a todos os estados
type PayableCore = Readonly<{
  id: PayableId;
  sourceDocumentId: SourceDocumentRef; // FK opaca para BC Documentos
  kind: 'Principal' | 'Tax';
  paymentMethod: 'BankRemittance' | 'ManualExternal';
  beneficiary: BeneficiaryBankData;
  value: Money;
  dueDate: Date;
  openedAt: Date;
}>;

// Tipos refinados — campos específicos do estado materializam invariantes
export type OpenPayable = PayableCore & Readonly<{ status: 'Open' }>;
export type ApprovedPayable = PayableCore & Readonly<{
  status: 'Approved';
  approvedAt: Date;
  approvedBy: UserRef;
}>;

// Union pública (subset deste ticket — expande nos próximos)
export type Payable = OpenPayable | ApprovedPayable;
export type PayableStatus = Payable['status'];
```

### 2.2. Decisões deliberadas

| # | Decisão | Justificativa |
| :--- | :--- | :--- |
| **D1** | `SourceDocumentRef = Brand<string, 'SourceDocumentRef'>` — branded opaco para FK do BC Documentos (futuro). | BC Gestão de Documentos Fiscais ainda não existe (Fatia 6+). Branded opaco preserva isolamento sem acoplar agora. Quando `FiscalDocumentId` existir, refactor swap (1 tipo). Cria em `src/modules/financial/domain/shared/source-document-ref.ts`. |
| **D2** | `kind: 'Principal' \| 'Tax'` como campo do Core (não estado). | Handbook §3 trata como atributo fixo da obrigação (não muda ao longo da vida). Não é discriminator de estado. |
| **D3** | `paymentMethod: 'BankRemittance' \| 'ManualExternal'` (não `'Remessa_Bancaria'`). | Padronização EN code (CLAUDE.md §Idioma). Strings PT só em CLI formatters. |
| **D4** | `openedAt: Date` em PayableCore. | Auditoria — análogo a `Contract.signedAt`. Define o "nascimento" do Payable. |
| **D5** | `approvedAt: Date` e `approvedBy: UserRef` em `ApprovedPayable` (não em Core). | DO C§29 — campos optional-as-state viram obrigatórios no tipo refinado. `OpenPayable` literalmente não tem esses campos. |
| **D6** | Smart constructor `open(input)` recebe `openedAt: Date` injetado (não `new Date()`). | Regra de domínio puro — sem I/O. Adapter/use case injeta data. |
| **D7** | Transição `approve(payable, by, at)` recebe `at: Date` injetado. | Mesma razão. |
| **D8** | Smart constructor retorna `Result<{ payable: OpenPayable; event: PayableEvent }, PayableError>` — emite evento `PayableOpened`. | Pattern do `Contract.create` (linha 90 do contract.ts) — agregado + evento juntos como atomic unit. |
| **D9** | `Payable` (union pública) — não há `Open \| Approved \| Transmitted...` ainda. Apenas `Open \| Approved`. | Subset deste ticket. Próximos tickets EXPANDEM a union adicionando variantes. Quem consome `Payable` precisará atualizar switch exhaustivo — TS força a refatoração. |
| **D10** | Tagged errors (`{ tag: 'PayableNotOpen', currentStatus }`) em vez de string literal union. | Consistência com `contracts/domain/contract/errors.ts`. Erros de invariante carregam evidência (DO D§23). Agregados merecem essa expressividade. |
| **D11** | `parseOpen(payable)` e `parseApproved(payable)` — refinement constructors. | DO D§21 "parse, don't validate". Use cases pegam `Payable` de repo, fazem narrow via parse, operam sobre tipo refinado. |
| **D12** | Sem helper `format()` para Payable. | Output formatting é responsabilidade de formatters CLI/adapters. Domínio só guarda dado canônico. |
| **D13** | `homologatedAmendmentIds: readonly AmendmentId[]` — N/A. | Aditivos são padrão do `contracts/Contract`, não de `Payable`. Pagamentos não têm aditivos (correção exige reabrir Document fiscal — handbook R3). |

---

## 3. Escopo (o que entra)

### 3.1. Arquivos de produção (~7 arquivos)

```
src/modules/financial/domain/
├── shared/
│   └── source-document-ref.ts          ← NOVO (D1, ~15 linhas)
└── payable/
    ├── types.ts                         ← NOVO (~100 linhas)
    ├── events.ts                        ← NOVO (~25 linhas)
    ├── errors.ts                        ← NOVO (~80 linhas — tagged errors)
    └── payable.ts                       ← NOVO (~150 linhas — operações)
```

Estrutura espelha `src/modules/contracts/domain/contract/`.

### 3.2. Conteúdos esperados

**`source-document-ref.ts`** (~15 linhas):
- Branded UUID `SourceDocumentRef = Brand<string, 'SourceDocumentRef'>`.
- `generate()`, `rehydrate(raw)`.
- Idêntico ao pattern de `payable-id.ts` em estrutura.

**`payable/types.ts`** (~100 linhas):
- `PayableCore`, `OpenPayable`, `ApprovedPayable`, `Payable`, `PayableStatus`.
- `OpenPayableInput` (input do smart constructor).

**`payable/events.ts`** (~25 linhas):
- Discriminated union `PayableEvent`:
  - `{ type: 'PayableOpened'; payableId; occurredAt }`
  - `{ type: 'PayableApproved'; payableId; occurredAt; approvedBy }`

**`payable/errors.ts`** (~80 linhas, padrão tagged errors):
- `PayableSourceDocumentRequired`
- `PayableValueZero`
- `PayableInvalidDueDate`
- `PayableInvalidOpenedAt`
- `PayableInvalidApprovalDate` (approvalDate < openedAt)
- `PayableNotOpen` (com payload `currentStatus: PayableStatus`)
- Constructor functions (`payableSourceDocumentRequired()`, etc.).
- Union pública `PayableError = ...`.

**`payable/payable.ts`** (~150 linhas):
- `open(input)`: `Result<{ payable: OpenPayable; event: PayableEvent }, PayableError>`.
- `approve(payable, by, at)`: `Result<{ payable: ApprovedPayable; event: PayableEvent }, PayableError>`.
- `parseOpen(payable)`: refinement constructor.
- `parseApproved(payable)`: refinement constructor.

---

## 4. Critérios de aceitação

### 4.1. Tipos (CA-1..CA-6)

| # | Critério |
| :--- | :--- |
| CA-1 | `OpenPayable` tem 8 campos do Core + `status: 'Open'`, sem `approvedAt` ou `approvedBy` |
| CA-2 | `ApprovedPayable` tem 8 campos do Core + `status: 'Approved'`, `approvedAt: Date`, `approvedBy: UserRef` |
| CA-3 | `Payable = OpenPayable \| ApprovedPayable` |
| CA-4 | `PayableStatus = 'Open' \| 'Approved'` derivado da union |
| CA-5 | `SourceDocumentRef = Brand<string, 'SourceDocumentRef'>` exportado de `source-document-ref.ts` |
| CA-6 | `PayableEvent` é union com `{type:'PayableOpened'}` e `{type:'PayableApproved'}` |

### 4.2. `open()` smart constructor (CA-7..CA-13)

| # | Critério |
| :--- | :--- |
| CA-7 | Input válido → ok com `{ payable: OpenPayable; event: PayableEvent }` |
| CA-8 | `payable.status === 'Open'`, `event.type === 'PayableOpened'`, `event.occurredAt === input.openedAt` |
| CA-9 | `value.cents === 0` → err `PayableValueZero` |
| CA-10 | `dueDate` inválida → err `PayableInvalidDueDate` |
| CA-11 | `openedAt` inválida (isValidDate falha) → err `PayableInvalidOpenedAt` |
| CA-12 | Objeto retornado é congelado (Object.isFrozen === true) |
| CA-13 | Sem `approvedAt`/`approvedBy` no objeto retornado (verificado via `'approvedAt' in payable === false`) |

### 4.3. `approve()` transição (CA-14..CA-19)

| # | Critério |
| :--- | :--- |
| CA-14 | `approve(openPayable, userRef, at)` → ok com `{ payable: ApprovedPayable; event: PayableEvent }` |
| CA-15 | `payable.status === 'Approved'`, `payable.approvedAt === at`, `payable.approvedBy === userRef` |
| CA-16 | `event.type === 'PayableApproved'`, `event.occurredAt === at`, `event.approvedBy === userRef` |
| CA-17 | `approve` em `ApprovedPayable` (já aprovado) → err `PayableNotOpen` com payload `currentStatus: 'Approved'` |
| CA-18 | `approve` com `at < payable.openedAt` → err `PayableInvalidApprovalDate` |
| CA-19 | Demais campos do Core preservados (id, value, dueDate, beneficiary, etc.) |

### 4.4. Refinement constructors (CA-20..CA-22)

| # | Critério |
| :--- | :--- |
| CA-20 | `parseOpen(openPayable)` → ok (type narrowed) |
| CA-21 | `parseOpen(approvedPayable)` → err `PayableNotOpen` com `currentStatus: 'Approved'` |
| CA-22 | `parseApproved(openPayable)` → err (com tag adequada) |

### 4.5. Operacionais (CA-23..CA-26)

| # | Critério |
| :--- | :--- |
| CA-23 | `pnpm run typecheck` verde |
| CA-24 | `pnpm run format:check` verde |
| CA-25 | `pnpm test` verde |
| CA-26 | `pnpm run lint` verde — sem indexed access, sem shadowing |

### 4.6. Code-review semânticos (CA-27..CA-29)

| # | Critério |
| :--- | :--- |
| CA-27 | Header doc dos arquivos cita handbook 04-titulos-liquidacao-context.md (R1, R2, fluxo) |
| CA-28 | `as <Type>` só dentro de smart constructors após validação |
| CA-29 | Eventos têm `occurredAt: Date` injetado (não `new Date()`) — DO B§14 |

---

## 5. Estratégia de teste (W0)

Cobertura proporcional ao M. **~35 testes em 8 `describe`s** distribuídos em 3 arquivos de teste:

```
tests/modules/financial/domain/
├── shared/
│   └── source-document-ref.test.ts      ← ~10 testes (espelho payable-id.test.ts)
└── payable/
    ├── types.test.ts                     ← ~3 testes (type-level smoke)
    ├── events.test.ts                    ← ~2 testes (exhaustive switch)
    ├── errors.test.ts                    ← ~6 testes (constructor functions retornam tag correta)
    └── payable.test.ts                   ← ~25 testes (open + approve + parse*)
```

### Fixtures

```ts
const VALID_OPEN_INPUT: OpenPayableInput = {
  id: PayableId.generate(),
  sourceDocumentId: SourceDocumentRef.generate(),
  kind: 'Principal',
  paymentMethod: 'BankRemittance',
  beneficiary: VALID_BENEFICIARY,           // construído via BeneficiaryBankData.fromRaw
  value: VALID_MONEY,                        // Money.fromCents(15050)
  dueDate: new Date('2026-06-15T00:00:00Z'),
  openedAt: new Date('2026-05-20T00:00:00Z'),
};

const APPROVER_USER_REF = UserRef.create(...);
const APPROVAL_DATE = new Date('2026-05-25T00:00:00Z');
```

---

## 6. Padronizações invariantes (lembrete)

### 6.1. Lições propagadas

| Lição | Origem | Aplicação |
| :--- | :--- | :--- |
| Sem indexed access em arrays | FIN-VO-TAX-ID W3 | usar `.reduce/.map/.forEach`; iterar `for...of` em `.entries()` |
| Sem shadowing de built-ins | FIN-VO-FITID W3 | helpers em tests: `classify`, `labelOf` (não `describe`/`it`) |
| Sem async sem await | FIN-CLI-WIRE W3 | operações de domínio são síncronas |
| `as <Brand>` só no return final | FIN-VO-FITID W2 | um único cast por smart constructor |

### 6.2. Regras de domínio (DO/DON'T)

- ❌ `throw`, `class`, `this`, `new Error`, `any`, `extends Error`.
- ❌ `let` reatribuído em entidades (sum local em helper privado é OK).
- ❌ `.push`/`.splice`/`.sort` em arrays do domínio — usar spread.
- ✅ `Readonly<>` em todos os campos.
- ✅ `as const` no discriminator (`status: 'Open' as const`).
- ✅ `immutable()` no objeto antes do `as <Brand>` final.
- ✅ Return type explícito em todas as funções exportadas.
- ✅ Eventos têm `occurredAt: Date` injetado, não `new Date()` (DO B§14).

### 6.3. Tagged errors (DO D§22-D§24)

```ts
// errors.ts
export type PayableNotOpen = Readonly<{
  tag: 'PayableNotOpen';
  currentStatus: PayableStatus;
}>;

export const payableNotOpen = (currentStatus: PayableStatus): PayableNotOpen =>
  ({ tag: 'PayableNotOpen', currentStatus });

export type PayableError = PayableSourceDocumentRequired | ... | PayableNotOpen;
```

---

## 7. Pipeline previsto

| Wave | Skill | Outcome esperado |
| :--- | :--- | :--- |
| **W0** | `tdd-strategist` | RED — ~35 testes em 5 arquivos falham por `ERR_MODULE_NOT_FOUND` |
| **W1** | `main-session` (poderia escalar para `ts-domain-modeler` skill se complexidade exigir; XS/S anteriores não exigiram) | GREEN — cria 5 arquivos de produção (~370 linhas total) |
| **W2** | `code-reviewer` | APPROVED — tagged errors corretos, tipos refinados sem null/undefined, `as` restrito, eventos com `occurredAt` injetado |
| **W3** | `ts-quality-checker` | ALL-GREEN round 1 (lições aplicadas preventivamente) |

---

## 8. Riscos e mitigações

| Risco | Mitigação |
| :--- | :--- |
| Acoplamento prematuro com `FiscalDocumentId` (BC ainda não existe) | D1 — branded opaco `SourceDocumentRef`. Refactor swap quando `FiscalDocument` chegar. |
| `Payable` union perde variantes nos próximos tickets quebrar consumers | TS força switch exhaustivo — quebra de compile = sinal forte para atualizar consumers. Boa propriedade. |
| Tagged errors verbosos demais para um único agregado | Padrão consistente com `Contract` (já validado em 23 tickets). Não-negociável. |
| `parseOpen`/`parseApproved` duplicam lógica | DRY via helper privado `parseByStatus<T>(payable, status, factory)` se necessário. Avaliar em W1. |
| Modelagem de aprovador (`UserRef`) — qual estrutura? | `src/shared/kernel/user-ref.ts` já existe (usado em Contract). Reuso direto. |
| `openedAt < dueDate` é invariante? | Sim — implícito (não faz sentido título já vencido). Adicionar como validação no `open()`. |
| `approvedAt < openedAt` rejeição clara | CA-18 explícita; erro `PayableInvalidApprovalDate`. |

---

## 9. Próximos tickets da fatia

```
FIN-AGG-PAYABLE-CORE         (M) ← este — Open + Approved + approve
  ├─ FIN-AGG-PAYABLE-TRANSMISSION (M) — Transmitted/Rejected/Overdue + transitions
  └─ FIN-AGG-PAYABLE-PAYMENT (M) — Paid/Settled + transitions terminais
      └─ FIN-PORT-PAYABLE-REPO (S) — port de persistência
          └─ FIN-USECASE-APPROVE-PAYABLE (S) — primeiro use case
              └─ FIN-CLI-APROVAR-TITULO (S) — primeiro comando real na CLI
```

Com este ticket fechado, o módulo financial terá **primeiro agregado funcional** — embora limitado a 2 estados, é o suficiente para começar wiring com ports/use cases/CLI nos próximos tickets.
