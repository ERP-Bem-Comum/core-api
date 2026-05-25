# FIN-IDS-PAYABLE — Branded UUIDs `PayableId`, `RemittanceId`, `BankTransactionId`

> **Size:** XS · **Status:** open · **Criado por:** main-session (Opus 4.7)
> **Predecessores:** `FIN-MODULE-SCAFFOLD`, `FIN-CLI-WIRE`, `FIN-VO-FITID` (todos closed-green ALL-GREEN)
> **Sucessor previsto:** `FIN-VO-BENEFICIARY-BANK-DATA` (S) — VO composto com bank/agency/account

---

## 1. Contexto

Continuação do scaffolding do domínio financeiro: cria os 3 **branded UUIDs v4** que serão usados pelos agregados e entidades dos 2 Bounded Contexts (Títulos & Liquidação e Integração Bancária).

**Citações literais do handbook:**

- `handbook/domain/04-titulos-liquidacao-context.md:17` — `TituloFinanceiro { id: TituloID; … }` → mapeia para `Payable { id: PayableId; … }`.
- `handbook/domain/04-titulos-liquidacao-context.md:32` — `rastreabilidade: { remessaID: string; … }` → mapeia para `RemittanceId`.
- `handbook/domain/05-integracao-bancaria-context.md:20-26` — `LoteComunicacao { id: LoteID; … }` e `TransacaoBancaria` (sem ID explícito no doc — derivamos `BankTransactionId` para identificar registros persistidos).

**Decisão de naming:** o handbook usa "Lote de Comunicação" (`LoteComunicacao`), mas a tradução EN canônica do projeto seria `CommunicationBatch` — entretanto, para anti-duplicidade no nível de **transação individual** (R1/R4 do handbook), precisamos de ID por transação. Cunhamos `BankTransactionId` como ID da entidade `BankTransaction` (futuro agregado/entidade). O `LoteId`/`BatchId` virá em outro ticket quando o agregado `CommunicationBatch` for criado.

### Por que 3 IDs num ticket XS

Os 3 IDs são **clones estruturais** — cada um tem 14 linhas idênticas a `contract-id.ts` (já validado em produção pelos 23 tickets `CTR-*` fechados). Esta é a **repetição mecânica do padrão**, não 3 decisões de design distintas. Manter agrupados reduz overhead de pipeline (4 waves × 3 tickets = 12 invocações de skill vs 4 num único XS).

**ADR ancoradora:** [ADR-0006](../../../handbook/architecture/adr/0006-modular-monolith-core-api.md) — branded IDs ficam no `domain/shared/` do módulo, nunca em `src/shared/kernel/` (que é cross-module).

---

## 2. Escopo (o que entra)

### 2.1. Arquivos de produção (4)

Espelham fielmente a estrutura `src/modules/contracts/domain/shared/{contract,amendment,document}-id.ts` + barrel `ids.ts`:

```
src/modules/financial/domain/shared/
├── payable-id.ts            ← novo (~14 linhas)
├── remittance-id.ts         ← novo (~14 linhas)
├── bank-transaction-id.ts   ← novo (~14 linhas)
└── ids.ts                   ← novo barrel (~25 linhas)
```

**Conteúdo esperado de `payable-id.ts`** (estrutura, não literal):

```ts
import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import { newUuid, isUuidV4 } from '#src/shared/utils/id.ts';
import type { Brand } from '#src/shared/primitives/brand.ts';

// Padrão D (entrevista 0001 §B DO§8): module-as-namespace.
// Consumir com `import * as PayableId from './payable-id.ts'`.

export type PayableId = Brand<string, 'PayableId'>;
export type PayableIdError = 'payable-id-invalid';

export const generate = (): PayableId => newUuid() as PayableId;

export const rehydrate = (raw: string): Result<PayableId, PayableIdError> =>
  isUuidV4(raw) ? ok(raw as PayableId) : err('payable-id-invalid');
```

`remittance-id.ts` e `bank-transaction-id.ts` são variações textuais (PayableId → RemittanceId / BankTransactionId; `payable-id-invalid` → `remittance-id-invalid` / `bank-transaction-id-invalid`).

**Conteúdo esperado de `ids.ts` (barrel):**

```ts
// Barrel — agrupa os 3 branded UUIDs do módulo financial.
// Padrão consistente com contracts/domain/shared/ids.ts:
//   - reexporta tipos com nome original
//   - reexporta funções com prefixo do VO (impede colisão de namespaces num único barrel)
//
// Para consumir no estilo namespace, importe direto:
//   import * as PayableId from './payable-id.ts';
//   PayableId.generate(); PayableId.rehydrate(raw);

export type { PayableId, PayableIdError } from './payable-id.ts';
export type { RemittanceId, RemittanceIdError } from './remittance-id.ts';
export type { BankTransactionId, BankTransactionIdError } from './bank-transaction-id.ts';

export { generate as payableIdGenerate, rehydrate as payableIdRehydrate } from './payable-id.ts';
export {
  generate as remittanceIdGenerate,
  rehydrate as remittanceIdRehydrate,
} from './remittance-id.ts';
export {
  generate as bankTransactionIdGenerate,
  rehydrate as bankTransactionIdRehydrate,
} from './bank-transaction-id.ts';
```

### 2.2. Arquivos de teste (4)

```
tests/modules/financial/domain/shared/
├── payable-id.test.ts           ← novo (~94 linhas, espelho de contract-id.test.ts)
├── remittance-id.test.ts        ← novo (~94 linhas)
├── bank-transaction-id.test.ts  ← novo (~94 linhas)
└── ids.test.ts                  ← novo barrel test (~51 linhas)
```

Cada teste cobre 4 áreas (espelho de `contract-id.test.ts`):
1. **Module-as-namespace** (2 testes): import `* as TID` funciona, sem namespace aninhado.
2. **`generate`** (2 testes): retorna UUID v4 (regex match), valores distintos em chamadas consecutivas.
3. **`rehydrate`** (5-6 testes): aceita v4 minúsculo, aceita v4 maiúsculo, rejeita v1, rejeita string vazia, rejeita strings inválidas, rejeita UUID com versão fora `[1-5]`.
4. **Type-level smoke** (1 teste): `BrandOf<TID>` resolve para o literal correto.

Total: ~10-11 testes × 3 arquivos = ~30 testes + ~5 testes no barrel = **35 testes**.

---

## 3. Fora de escopo

- **`CommunicationBatchId`/`LoteId`** — virá quando o agregado `CommunicationBatch` for criado.
- **`FiscalDocumentId`** — pertence ao BC Gestão de Documentos Fiscais (Fatia 6+).
- **Tabela Drizzle `fin_payables`/`fin_remittances`/`fin_bank_transactions`** — `FIN-SCHEMA-DRIZZLE-*` futuros.
- **Mappers row ↔ domínio** — chegam com adapters de persistência.
- **`as const` para IDs estáticos de seed/test** — N/A: IDs reais nascem do `generate()`.
- **Validação de "v4-específica" rigorosa** — o `isUuidV4()` utility já cobre (versão = 4, variant = 8/9/a/b).

---

## 4. Critérios de aceitação

| # | Critério | Como verificar |
| :--- | :--- | :--- |
| **CA-1** | 3 arquivos de produção criados | filesystem |
| **CA-2** | Barrel `ids.ts` criado e reexporta tipos + funções com prefixo | filesystem + import dos 3 tipos |
| **CA-3** | Cada ID é `Brand<string, '<Tag>'>` (PayableId / RemittanceId / BankTransactionId) | BrandOf<X> === 'X' nos type-level tests |
| **CA-4** | Cada Error é `'<id-kebab>-invalid'` (único elemento da union) | exhaustive switch em cada test |
| **CA-5** | `generate()` retorna UUID v4 válido (`/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i`) | regex match em cada test |
| **CA-6** | `generate()` retorna valores distintos em chamadas consecutivas | `assert.notEqual(a, b)` |
| **CA-7** | `rehydrate(valid-v4-lowercase)` → ok | teste |
| **CA-8** | `rehydrate(valid-v4-uppercase)` → ok | teste (case-insensitive UUID) |
| **CA-9** | `rehydrate('')` → err `'<id>-invalid'` | teste |
| **CA-10** | `rehydrate(v1-uuid)` → err `'<id>-invalid'` (rejeita versão ≠ 4) | teste |
| **CA-11** | `rehydrate('not-a-uuid')` → err | teste |
| **CA-12** | Barrel `ids.ts` permite `import type { PayableId, RemittanceId, BankTransactionId }` num único statement | teste |
| **CA-13** | Funções no barrel têm prefixo (`payableIdGenerate`, `remittanceIdGenerate`, etc.) para evitar colisão. | teste |
| **CA-14** | `pnpm run typecheck` verde | comando |
| **CA-15** | `pnpm run format:check` verde | comando |
| **CA-16** | `pnpm test` verde | comando |
| **CA-17** | `pnpm run lint` verde — **sem shadowing** (lição do FIN-VO-FITID W3) | comando |
| **CA-18** | `as <ID>` aparece **apenas** dentro de `generate` e `rehydrate` de cada arquivo, após validação | code-reviewer em W2 |

---

## 5. Padronizações invariantes (lembrete)

### 5.1. Lições propagadas dos tickets anteriores

| Lição | Origem | Aplicação aqui |
| :--- | :--- | :--- |
| Não sombreiar built-ins importados | FIN-VO-FITID W3 | Tests não devem ter `const describe = ...` ou `const it = ...` ou similar. Para funções helper, usar nomes como `classify`, `labelOf`, etc. |
| Lint pega `restrict-template-expressions` em `${x}` quando `x: T \| undefined` | FIN-CLI-WIRE W3 | Evitar destructuring de array indexado em templates. N/A aqui — não há templates. |
| `async` sem `await` interno dispara `require-await` | FIN-CLI-WIRE W3 | N/A — `generate`/`rehydrate` são síncronos. |
| `as <Brand>` dentro do smart constructor é OK sem comentário | FIN-VO-FITID W2 | Manter padrão de `money.ts:31` e `contract-id.ts:11,14`. |

### 5.2. Imports

- Subpath `#src/shared/primitives/{result,brand}.ts` e `#src/shared/utils/id.ts`.
- Extensão `.ts` literal em **todos** os relativos.
- `import type` para `Brand` (puro tipo); `import { type Result, ok, err }` (inline).

### 5.3. Naming

- `<Name>Id` em PascalCase para tipos; `<name>-id.ts` para arquivos.
- Erros kebab-case EN: `payable-id-invalid`, `remittance-id-invalid`, `bank-transaction-id-invalid`.
- Funções no barrel com prefixo: `payableIdGenerate`/`payableIdRehydrate`, etc.

---

## 6. Pipeline previsto

| Wave | Skill / agent | Outcome esperado | REPORT |
| :--- | :--- | :--- | :--- |
| **W0** | `tdd-strategist` | RED — ~35 testes em 4 arquivos falham por `ERR_MODULE_NOT_FOUND`. | `002-tests/REPORT.md` |
| **W1** | `main-session` | GREEN — cria 4 arquivos de produção espelhando padrão `contracts/domain/shared/`. | `003-impl/REPORT.md` |
| **W2** | `code-reviewer` | APPROVED — checklist H.5 atualizada do FIN-VO-FITID atenta a shadowing; `as <ID>` só nos smart constructors. | `004-code-review/REVIEW.md` |
| **W3** | `ts-quality-checker` | ALL-GREEN — typecheck + format + lint + test. Expectativa: round 1 sem fixes (lições absorvidas). | `005-quality/REPORT.md` |

---

## 7. Estratégia de teste (W0)

Padrão consistente com `tests/modules/contracts/domain/shared/contract-id.test.ts`:

- **Fixtures literais** no topo do arquivo: `VALID_V4`, `VALID_V4_UPPER`, `V1_UUID`, `UUID_V4_REGEX`.
- **Module-as-namespace** smoke (2 testes).
- **`generate`** (2 testes): regex match + uniqueness.
- **`rehydrate`** (5-6 testes): aceitação de v4 case-insensitive, rejeição de inválidos.
- **Type-level smoke** (1 teste): `BrandOf<X> === 'X'`.

**Barrel test** (`ids.test.ts`): valida que o barrel reexporta tudo correto (1-2 testes por ID + 1 type-level smoke do union dos 3).

---

## 8. Riscos e mitigações

| Risco | Mitigação |
| :--- | :--- |
| 3 IDs num único XS pode ser "muito" para reviewer. | Repetição mecânica do padrão `contract-id`/`amendment-id`/`document-id` — reviewer pode comparar arquivo-a-arquivo. Cada arquivo tem 14 linhas. |
| Esquecimento de prefixar funções no barrel → colisão. | Barrel test (CA-13) valida que `payableIdGenerate` ≠ `remittanceIdGenerate` ≠ `bankTransactionIdGenerate` no namespace exportado. |
| Test shadowing de `describe`/`it` (lição FIN-VO-FITID W3). | CA-17 lembra explicitamente; reviewer no W2 deve auditar locais com `const X =` no escopo de cada `describe`. |
| `newUuid()` vs `crypto.randomUUID()` — qual a fonte? | `#src/shared/utils/id.ts` já encapsula. Usar `newUuid()` para todos os 3 (não chamar `crypto.randomUUID()` direto). |
| `isUuidV4()` aceita case-insensitive — tests precisam cobrir ambos. | CA-7 (lowercase) + CA-8 (uppercase) explícitas. Padrão herdado de `contract-id.test.ts:8-9` (`VALID_V4_UPPER`). |

---

## 9. Próximos tickets da fatia

```
FIN-MODULE-SCAFFOLD     (XS) ✅ closed-green
FIN-CLI-WIRE            (XS) ✅ closed-green
FIN-VO-FITID            (XS) ✅ closed-green
FIN-IDS-PAYABLE         (XS) ← este
  └─ FIN-VO-BENEFICIARY-BANK-DATA (S) — bank/agency/account (VOs compostos)
      └─ FIN-AGG-PAYABLE-CORE (M) — agregado Payable: Open + Approved + Approve
          └─ ... resto da máquina de estados (3 tickets M)
              └─ FIN-PORT-PAYABLE-REPO (S)
                  └─ FIN-USECASE-APPROVE-PAYABLE (S)
                      └─ FIN-CLI-APROVAR-TITULO (S) — primeiro comando real na CLI
```

Com este ticket fechado, **5/5 primitivas básicas do módulo financial estarão prontas** (estrutura + CLI + FITID + 3 IDs). A partir de `FIN-VO-BENEFICIARY-BANK-DATA` começamos VOs compostos e depois o primeiro agregado.
