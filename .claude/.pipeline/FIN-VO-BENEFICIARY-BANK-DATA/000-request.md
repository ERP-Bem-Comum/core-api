# FIN-VO-BENEFICIARY-BANK-DATA — VO composto `BeneficiaryBankData`

> **Size:** S · **Status:** open · **Criado por:** main-session (Opus 4.7)
> **Predecessores:** FIN-MODULE-SCAFFOLD, FIN-CLI-WIRE, FIN-VO-FITID, FIN-IDS-PAYABLE (todos closed-green) · **FIN-VO-TAX-ID** (S, bloqueia este — deve fechar antes)
> **Sucessor previsto:** `FIN-AGG-PAYABLE-CORE` (M) — primeiro estado (Open + Approved) do agregado Payable
>
> **Mudança de escopo registrada em 2026-05-22 — versão 2:** A validação real de CPF/CNPJ (módulo 11 + CNPJ alfanumérico) é regra de domínio densa demais para inline e foi extraída para sub-VO `TaxId` próprio. Este ticket agora consome `TaxId` em vez de validar string. CAs CA-12/CA-13/CA-14 (CPF/CNPJ inline) foram **removidas** e movidas para `FIN-VO-TAX-ID/000-request.md`.

---

## 1. Contexto

`BeneficiaryBankData` é o **VO composto** que representa "para quem pagar" — agrupa banco, agência, conta corrente e identificação do titular. É campo obrigatório do agregado `Payable` (Título Financeiro) quando o método de pagamento é `Remessa_Bancaria`.

**Citação literal do handbook:**

- `handbook/domain/04-titulos-liquidacao-context.md:23` — campo `beneficiario: DadosBancarios` na estrutura de `TituloFinanceiro`.

O handbook não detalha os campos internos de `DadosBancarios` — esta é uma **lacuna do handbook** que este ticket fecha com decisão registrada em ADR-light dentro do header doc.

### Por que VO composto, não múltiplos sub-VOs

Para o MVP, validamos os 5 campos inline com regex. Decompor cada um em sub-VO próprio (`BankCode`, `Agency`, `BankAccount`, `TaxId`, `HolderName`) é correto teoricamente mas adiciona:

- 5 arquivos × ~15 linhas = 75 linhas de produção
- 5 arquivos × ~80 linhas de teste = 400 linhas
- 5 imports em cada consumidor de `BeneficiaryBankData`

Custo > benefício no MVP. Se algum sub-VO ganhar regra própria significativa (ex.: `TaxId` precisar validar módulo 11 do CPF e dígitos verificadores do CNPJ), abrimos ticket dedicado `FIN-VO-TAX-ID` e refatoramos.

**Trade-off documentado** — qualquer reviewer/maintainer futuro entende a decisão.

---

## 2. Escopo (o que entra)

### 2.1. Arquivo de produção — `src/modules/financial/domain/shared/beneficiary-bank-data.ts`

VO composto `BeneficiaryBankData` no padrão D (module-as-namespace) consistente com `Money` (referência: `src/shared/kernel/money.ts`). Estrutura esperada:

```ts
import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import { immutable } from '#src/shared/primitives/immutable.ts';
import type { Brand } from '#src/shared/primitives/brand.ts';

import type { TaxId } from './tax-id.ts';
// `TaxId` (CPF | CNPJ) vem do ticket FIN-VO-TAX-ID — predecessor obrigatório.

export type BeneficiaryBankData = Brand<
  {
    readonly bankCode: string;
    readonly agency: string;
    readonly account: string;
    readonly holderTaxId: TaxId;
    readonly holderName: string;
  },
  'BeneficiaryBankData'
>;

export type BeneficiaryBankDataError =
  | 'bank-code-invalid'
  | 'agency-invalid'
  | 'account-invalid'
  | 'holder-name-empty'
  | 'holder-name-too-long';
// holder-tax-id-invalid foi REMOVIDO — validação semântica do TaxId acontece
// no smart constructor TaxId.fromString antes de chegar aqui. Este VO consome
// o TaxId já válido.

export type BeneficiaryBankDataInput = Readonly<{
  bankCode: string;
  agency: string;
  account: string;
  holderTaxId: TaxId; // já validado pelo TaxId smart constructor
  holderName: string;
}>;

export const fromRaw = (
  input: BeneficiaryBankDataInput,
): Result<BeneficiaryBankData, BeneficiaryBankDataError> => { /* fail-fast */ };

export const equals = (a: BeneficiaryBankData, b: BeneficiaryBankData): boolean => /* field-by-field */;
```

### 2.2. Regras de validação (decisões deliberadas)

| Campo | Regex | Justificativa |
| :--- | :--- | :--- |
| `bankCode` | `/^\d{3}$/` | Código Bacen — sempre 3 dígitos (`341` Itaú, `237` Bradesco, `001` BB). |
| `agency` | `/^\d{1,5}(-[\dXx])?$/` | 1-5 dígitos + opcional dígito verificador (DV) que pode ser `X` (módulo 11). Aceita `1234`, `12345`, `1234-5`, `1234-X`. |
| `account` | `/^\d{1,12}-[\dXx]$/` | Dígitos + DV obrigatório (banco brasileiro sempre tem DV em conta). Aceita `12345-6`, `1234567890-X`. |
| ~~`holderTaxId`~~ | — | **Movido para FIN-VO-TAX-ID.** Este ticket recebe `TaxId` já validado. |
| `holderName` | trim + length 1-255 | Nome de fornecedor/pessoa pode ter qualquer caractere visível. Bacen não restringe charset. |

**Sem validação de módulo 11 / DV bancário** — escopo MVP. Documentar como dívida técnica.

### 2.3. Decisões deliberadas adicionais

| # | Decisão | Justificativa |
| :--- | :--- | :--- |
| **D1** | Fail-fast no `fromRaw` (retorna 1º erro). | Consistente com `Money.fromCents`. Validação multi-erro é responsabilidade da application/UI. |
| **D2** | `holderTaxId` aceita apenas dígitos (sem máscara `XXX.XXX.XXX-XX`). | Normalização: o adapter de UI/CLI tira a máscara antes de chamar `fromRaw`. VO trabalha com forma canônica. |
| **D3** | `holderName` faz trim. Empty após trim → `holder-name-empty`. | Análogo ao `FITID.fromString` (D2 daquele VO). |
| **D4** | `holderName` máximo 255 chars (após trim) → `holder-name-too-long`. | Limite CNAB 240 padrão (campo de 30-40 chars no Segmento Q, mas o domínio guarda nome completo; truncamento é responsabilidade do adapter de remessa). |
| **D5** | `equals` faz comparação field-by-field. | Brand garante identidade nominal; equals semântico exige comparar valores. |
| **D6** | Sem helper `format()` para CNAB. | Formatação de saída é responsabilidade do adapter de Integração Bancária (ADR-0008). VO é forma canônica do dado. |
| **D7** | `BeneficiaryBankDataInput` exportado como tipo separado. | Permite consumers (CLI, application) tiparem o input sem precisar de assertion. |
| **D8** | `as BeneficiaryBankData` apenas no final do `fromRaw` após validar TODOS os campos. | Consistente com Money/FITID pattern. |

---

## 3. Fora de escopo

- **Sub-VOs próprios** (`BankCode`, `Agency`, `BankAccount`, `TaxId`, `HolderName`) — virão se algum ganhar regra crítica.
- **Validação módulo 11 do CPF/CNPJ** — `holderTaxId` só verifica forma (11 ou 14 dígitos numéricos). Validação aritmética fica para `FIN-VO-TAX-ID` futuro.
- **Validação de DV agência/conta** — só forma (regex). Cada banco tem fórmula própria de DV; validar requer tabela banco-por-banco, fora do escopo.
- **PIX (chave de pagamento)** — método alternativo a "dados bancários tradicionais". Modelar quando agregado `Payable` suportar `paymentMethod: 'Pix'`. Sum type: `PaymentTarget = BeneficiaryBankData | PixKey` — não neste ticket.
- **TED/DOC distinction** — método de transferência é orchestration do adapter, não do VO.
- **Helper `format()` para CNAB output** — responsabilidade do adapter (ADR-0008).
- **Helper `fromCnabSegment(p, q)` ou `fromOfxBeneficiary(node)`** — extração de formato específico é adapter.

---

## 4. Critérios de aceitação

| # | Critério | Como verificar |
| :--- | :--- | :--- |
| **CA-1** | Arquivo `src/modules/financial/domain/shared/beneficiary-bank-data.ts` existe | filesystem |
| **CA-2** | `BeneficiaryBankData` é `Brand<{...}, 'BeneficiaryBankData'>` com 5 campos `readonly string` | typecheck + BrandOf test |
| **CA-3** | `BeneficiaryBankDataError` é union de 6 literais EN kebab-case | exhaustive switch |
| **CA-4** | `BeneficiaryBankDataInput` exportado como `Readonly<{...}>` | typecheck |
| **CA-5** | `fromRaw` retorna `ok` para input completo válido (`bankCode='341'`, `agency='1234-5'`, `account='12345-6'`, `holderTaxId='12345678901'`, `holderName='Fornecedor X Ltda'`) | teste |
| **CA-6** | Rejeita `bankCode` com 2 dígitos (`'34'`) → `'bank-code-invalid'` | teste |
| **CA-7** | Rejeita `bankCode` com letras (`'34A'`) → `'bank-code-invalid'` | teste |
| **CA-8** | Aceita `agency` sem DV (`'1234'`) e com DV (`'1234-5'`, `'1234-X'`) | teste |
| **CA-9** | Rejeita `agency` malformada (`'abc'`, `'-5'`) → `'agency-invalid'` | teste |
| **CA-10** | Aceita `account` com DV (`'12345-6'`, `'1234567890-X'`) | teste |
| **CA-11** | Rejeita `account` sem DV (`'12345'`) → `'account-invalid'` | teste (DV obrigatório por D2.3) |
| ~~CA-12~~ | ~~Aceita `holderTaxId` CPF/CNPJ~~ | **movido para FIN-VO-TAX-ID** |
| ~~CA-13~~ | ~~Rejeita comprimentos errados~~ | **movido para FIN-VO-TAX-ID** |
| ~~CA-14~~ | ~~Rejeita máscara~~ | **movido para FIN-VO-TAX-ID** |
| **CA-15** | `holderName` trim aplicado: `'  Foo  '` → ok com `holderName === 'Foo'` | teste |
| **CA-16** | Rejeita `holderName` vazio ou só whitespace → `'holder-name-empty'` | teste |
| **CA-17** | Rejeita `holderName` > 255 chars (após trim) → `'holder-name-too-long'` | teste boundary 255/256 |
| **CA-18** | Fail-fast: input com `bankCode` e `agency` ambos errados retorna **somente** `'bank-code-invalid'` | teste de ordem |
| **CA-19** | `equals(a, b)` retorna `true` para mesmos valores em todos os campos | teste |
| **CA-20** | `equals(a, b)` retorna `false` quando qualquer campo difere | teste por campo (5 testes) |
| **CA-21** | Header doc cita `handbook/domain/04-titulos-liquidacao-context.md:23` (lacuna do handbook + decisão MVP) | code-reviewer em W2 |
| **CA-22** | `as BeneficiaryBankData` aparece **apenas no return final** de `fromRaw`, após todas as validações | code-reviewer em W2 |
| **CA-23** | `pnpm run typecheck` verde | comando |
| **CA-24** | `pnpm run format:check` verde | comando |
| **CA-25** | `pnpm test` verde | comando |
| **CA-26** | `pnpm run lint` verde | comando |

---

## 5. Padronizações invariantes (lembrete)

### 5.1. Lições propagadas (de tickets FIN-* anteriores)

| Lição | Origem | Aplicação aqui |
| :--- | :--- | :--- |
| Não sombreiar built-ins (`describe`, `it`, etc.) | FIN-VO-FITID W3 | Tests não declaram `const describe = ...` etc. Para função de classificação de erro, usar `classify`/`labelOf`. |
| `restrict-template-expressions` em `${x}` com `T \| undefined` | FIN-CLI-WIRE W3 | N/A — sem templates suspeitos. |
| `require-await` em async sem await | FIN-CLI-WIRE W3 | N/A — `fromRaw`/`equals` são síncronos. |
| `as <Brand>` dentro do smart constructor | FIN-VO-FITID W2 | Pattern preservado. |
| Imports `#src/*` (modernização) | FIN-IDS-PAYABLE W1 | Usar `#src/shared/primitives/*` em todos os imports. |

### 5.2. Regras de domínio

- ❌ throw, class, this, new Error, any, extends Error.
- ✅ `as BeneficiaryBankData` permitido apenas **uma vez**, ao final de `fromRaw` após validação completa.
- ✅ Return type explícito em todas as funções exportadas.
- ✅ `Readonly<>` no payload do Brand — campos readonly inline.
- ✅ `immutable()` (facade Object.freeze) ao construir o objeto antes do `as Brand`.

### 5.3. Naming

- VO em PascalCase EN: `BeneficiaryBankData`.
- Erros em kebab-case EN com prefixo por campo (não por VO): `bank-code-invalid` (não `beneficiary-bank-data-bank-code-invalid` — verboso).
- Funções: `fromRaw`, `equals`.

---

## 6. Pipeline previsto

| Wave | Skill / agent | Outcome esperado | REPORT |
| :--- | :--- | :--- | :--- |
| **W0** | `tdd-strategist` | RED — ~25-30 testes em `tests/modules/financial/domain/shared/beneficiary-bank-data.test.ts` falham por `ERR_MODULE_NOT_FOUND`. | `002-tests/REPORT.md` |
| **W1** | `main-session` (S — não escala para `ts-domain-modeler` skill; padrão segue Money) | GREEN — cria `beneficiary-bank-data.ts` (~80 linhas) com header doc citando handbook + decisões. | `003-impl/REPORT.md` |
| **W2** | `code-reviewer` | APPROVED — checklist consolidada das lições do FIN-VO-FITID. `as` restrito ao return final do `fromRaw`. | `004-code-review/REVIEW.md` |
| **W3** | `ts-quality-checker` | ALL-GREEN round 1 (expectativa baseada no padrão do FIN-IDS-PAYABLE). | `005-quality/REPORT.md` |

---

## 7. Estratégia de teste (W0)

Cobertura proporcional ao S. **~25-30 testes em 5 `describe`s**:

| Describe | Testes | CAs cobertos |
| :--- | ---: | :--- |
| Module-as-namespace (Padrão D) | 2 | smoke + ausência de namespace aninhado |
| `fromRaw` — happy path | 1 | CA-5 |
| `fromRaw` — bankCode validation | 3 | CA-6, CA-7 (+ 1 lower-boundary `'001'` ok) |
| `fromRaw` — agency validation | 4 | CA-8 (2 testes), CA-9 (2 testes) |
| `fromRaw` — account validation | 3 | CA-10 (2 testes), CA-11 |
| `fromRaw` — holderTaxId validation | 4 | CA-12 (CPF + CNPJ = 2), CA-13, CA-14 |
| `fromRaw` — holderName validation | 5 | CA-15, CA-16 (empty + whitespace = 2), CA-17 (boundary 255 + 256 = 2) |
| `fromRaw` — fail-fast order | 1 | CA-18 |
| `equals` | 6 | CA-19, CA-20 (5 campos × 1 teste = 5) |
| Type-level smoke | 1 | CA-2, CA-3, CA-4 via type references |
| **Total** | **30** | |

**Fixtures literais** definidas no topo do arquivo: `VALID_INPUT` (objeto pronto), `VALID_HOLDER_NAME_255`, `VALID_CPF`, `VALID_CNPJ`.

---

## 8. Riscos e mitigações

| Risco | Mitigação |
| :--- | :--- |
| Regex de validação não cobrir caso real de algum banco brasileiro. | Decisões D1-D7 documentadas. Caso real divergente → ticket dedicado de patch (regex specific, ou sub-VO). |
| Reviewer questionar fail-fast vs combine. | D1 cita Money como precedente. Combine fica para camada de application/CLI. |
| `holderName` com 256 chars passar por engano. | CA-17 boundary explícita (255 ok, 256 err). |
| Múltipla validação ineficiente. | Validação inline com `if/early-return` é O(n) — sem overhead vs sub-VOs. |
| Esquecimento de `immutable()` no return. | Padrão Money seguido. Code-reviewer audita em W2. |
| `holderTaxId` com máscara passar. | CA-14 explícita rejeita `'123.456.789-01'`. |

---

## 9. Próximos tickets da fatia

```
FIN-MODULE-SCAFFOLD     (XS) ✅
FIN-CLI-WIRE            (XS) ✅
FIN-VO-FITID            (XS) ✅
FIN-IDS-PAYABLE         (XS) ✅
FIN-VO-BENEFICIARY-BANK-DATA (S) ← este — primeiro S do módulo
  └─ FIN-AGG-PAYABLE-CORE (M) — agregado Payable: estados Open + Approved + Approve
      ├─ FIN-AGG-PAYABLE-TRANSMISSION (M) — Transmitted/Rejected/Overdue
      └─ FIN-AGG-PAYABLE-PAYMENT (M) — Paid/Settled
          └─ FIN-PORT-PAYABLE-REPO (S)
              └─ FIN-USECASE-APPROVE-PAYABLE (S)
                  └─ FIN-CLI-APROVAR-TITULO (S) — primeiro comando real
```

Este ticket fecha a fase de VOs primitivos e habilita o ticket M do agregado Payable.
