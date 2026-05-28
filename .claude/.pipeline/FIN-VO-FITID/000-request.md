# FIN-VO-FITID — VO `FITID` (anti-duplicidade de transação bancária)

> **Size:** XS · **Status:** open · **Criado por:** main-session (Opus 4.7)
> **Predecessores:** [`FIN-MODULE-SCAFFOLD`](../FIN-MODULE-SCAFFOLD/STATE.md) (closed-green), [`FIN-CLI-WIRE`](../FIN-CLI-WIRE/STATE.md) (closed-green)
> **Sucessor previsto:** `FIN-IDS-PAYABLE` (XS) — branded UUIDs `PayableId`, `RemittanceId`. Independente deste ticket, paralelizável.

---

## 1. Contexto

Primeiro VO do domínio financeiro. `FITID` (Financial Institution Transaction ID, padrão OFX — Open Financial Exchange) é o **identificador único de transação bancária** que serve de chave anti-duplicidade ao importar extratos OFX/CNAB/PDF/XLSX.

**Citações literais do handbook:**

- `handbook/domain/04-titulos-liquidacao-context.md:105` — **"FITID** — Identificador único da transação bancária; impede que um pagamento de R$ 100,00 seja lançado duas vezes se o arquivo for reimportado."
- `handbook/domain/04-titulos-liquidacao-context.md:57` — "**R4 (Anti-Duplicidade FITID)** — O sistema deve recusar a importação de qualquer transação de extrato (OFX, XLSX, PDF) cujo `FITID` já tenha sido processado anteriormente."
- `handbook/domain/05-integracao-bancaria-context.md:49` — "**R1 (Proteção de Duplicidade)** — Nenhuma transação com o mesmo `FITID` pode ser processada duas vezes, independente do arquivo de origem (OFX, PDF, etc.)."
- `handbook/domain_questions/financeiro/especificacao-mestre.md:106` — "**FITID:** Identificador transacional do banco, usado como chave de unicidade na conciliação."

O VO é usado por **dois Bounded Contexts** internos ao módulo: BC Títulos & Liquidação (campo de `Payable.dadosPagamento.fitid`) e BC Integração Bancária (campo de `BankTransaction.fitid`). Por ser de uso exclusivo do módulo `financial`, vive em `src/modules/financial/domain/shared/`, **não em `src/shared/kernel/`** (que é reservado a VOs genuinamente cross-module como `Money`/`Period`).

---

## 2. Escopo (o que entra)

### 2.1. Arquivo de produção — `src/modules/financial/domain/shared/fitid.ts`

VO branded string com smart constructor, no padrão D (module-as-namespace) já adotado por `src/shared/kernel/money.ts`. Estrutura esperada (não literal — implementer decide detalhes):

```ts
import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type { Brand } from '#src/shared/primitives/brand.ts';

// Padrão D (entrevista 0001 §B DO§8): module-as-namespace.
// Consumir com `import * as FITID from '#src/modules/financial/domain/shared/fitid.ts'`.

export type FITID = Brand<string, 'FITID'>;

export type FITIDError = 'fitid-empty' | 'fitid-too-long';

// OFX 2.x §11.4.2 — FITID máximo 255 caracteres alfanuméricos.
const MAX_LENGTH = 255;

export const fromString = (raw: string): Result<FITID, FITIDError> => {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return err('fitid-empty');
  if (trimmed.length > MAX_LENGTH) return err('fitid-too-long');
  return ok(trimmed as FITID);
};

export const equals = (a: FITID, b: FITID): boolean => a === b;
```

### 2.2. Decisões de modelagem

| # | Decisão | Justificativa |
| :--- | :--- | :--- |
| **D1** | `Brand<string, 'FITID'>` (não objeto wrapper). | OFX define como string opaca; sem subcampos. Match com `ContractId`/`AmendmentId` em `contracts/domain/shared/ids.ts`. |
| **D2** | Smart constructor faz `trim()` antes da validação. | FITIDs vindos de parsers OFX/CNAB/XLSX podem ter whitespace nas pontas. Trim é normalização canônica, não perda de informação semântica. |
| **D3** | Reject `length === 0` após trim → `'fitid-empty'`. | String vazia não é identificador. |
| **D4** | Reject `length > 255` → `'fitid-too-long'`. Constante `MAX_LENGTH = 255` documentada com referência OFX 2.x §11.4.2. | Standard OFX. CNAB usa subset menor mas FITID neste VO precisa cobrir o caso máximo. |
| **D5** | **NÃO** validar charset (alfanumérico, hex, base64…). | FITIDs reais variam: Bradesco usa numérico, Itaú usa hash hex, alguns bancos usam base64 com `+`/`/`. Permissivo para evitar rejeição de FITID legítimo. Caractere de controle (NUL etc.) cai naturalmente fora do limite de comprimento útil. |
| **D6** | `equals(a, b)` faz comparação literal `===` (não case-insensitive). | OFX trata FITID como case-sensitive. Bancos brasileiros preservam case em retornos. |
| **D7** | **NÃO** expor `MAX_LENGTH` como `export const`. | Constante interna. Quem precisa do limite usa o erro `'fitid-too-long'`. |
| **D8** | Nome do módulo: `FITID` (sigla maiúscula). Não `Fitid` nem `FitID`. | Casa com o jargão OFX/CNAB e a literatura financeira BR — consistência com handbook. |

### 2.3. Localização

```
src/modules/financial/
└── domain/
    └── shared/
        └── fitid.ts        ← criado neste ticket
```

Pasta `domain/shared/` nasce com este arquivo. Futuras adições de VOs específicos do módulo (`BeneficiaryBankData`, `RemittanceFileHash`, …) entram aqui também.

---

## 3. Fora de escopo

- **Persistência** — schema Drizzle `fin_payables.fitid VARCHAR(255)` vem em ticket de persistência (`FIN-SCHEMA-DRIZZLE-PAYABLE` futuro).
- **Anti-duplicidade real** — a UNIQUE constraint no banco e a checagem em tempo de import do extrato (R1/R4) são responsabilidade de application + adapter. Este ticket só dá a **representação imutável** do valor.
- **`BankTransaction`/`Payable.dadosPagamento`** — agregados maiores que consomem `FITID` virão depois.
- **Validação de charset alfanumérico** — D5 deliberadamente permissiva.
- **Normalização case** — D6 mantém literal.
- **Helper `fromOfxLine(line)` ou `fromCnabSegment(segment)`** — extração de FITID de formatos específicos é trabalho de adapters de Integração Bancária, não do VO.
- **`fitid-only-whitespace`** como erro separado — D2 trim antes, daí `length === 0` cobre. Não inflar union de erros.

---

## 4. Critérios de aceitação

| # | Critério | Como verificar |
| :--- | :--- | :--- |
| **CA-1** | Arquivo `src/modules/financial/domain/shared/fitid.ts` existe. | filesystem |
| **CA-2** | Type `FITID` é exportado e é `Brand<string, 'FITID'>` (estruturalmente). | typecheck + teste de tipo via `BrandOf<FITID>` |
| **CA-3** | Type `FITIDError` é exportado e é exatamente a union `'fitid-empty' \| 'fitid-too-long'`. | typecheck + exhaustive switch em teste |
| **CA-4** | `fromString('abc123')` retorna `ok` com o valor brandado. | teste |
| **CA-5** | `fromString('')` retorna `err('fitid-empty')`. | teste |
| **CA-6** | `fromString('   ')` (só whitespace) retorna `err('fitid-empty')` — trim aplicado antes. | teste |
| **CA-7** | `fromString('  abc  ')` retorna `ok` com valor `'abc'` (trim aplicado). | teste comparando `String(result.value) === 'abc'` |
| **CA-8** | `fromString('x'.repeat(256))` retorna `err('fitid-too-long')`. | teste |
| **CA-9** | `fromString('x'.repeat(255))` retorna `ok` (limite incluso). | teste |
| **CA-10** | `equals(a, b)` retorna `true` quando ambos foram construídos do mesmo input pós-trim. | teste |
| **CA-11** | `equals(a, b)` retorna `false` quando inputs diferem. | teste |
| **CA-12** | `equals` é case-sensitive — `fromString('AB')` ≠ `fromString('ab')` (D6). | teste |
| **CA-13** | Header doc cita OFX 2.x §11.4.2 (origem do `MAX_LENGTH = 255`) e o handbook (R4/R1). | code-reviewer em W2 |
| **CA-14** | `pnpm run typecheck` verde. | comando |
| **CA-15** | `pnpm run format:check` verde. | comando |
| **CA-16** | `pnpm test` verde — novos testes incluídos. | comando |
| **CA-17** | `pnpm run lint` verde. | comando |
| **CA-18** | Nenhum `as` aparece fora do smart constructor `fromString`. | code-reviewer em W2 |

---

## 5. Padronizações invariantes (lembrete)

### 5.1. Regras de domínio (`.claude/rules/domain.md` — assumir vigente)

- ❌ `throw`, `class`, `this`, `new Error`, `any`, `as any`.
- ❌ `extends Error` — erros são string literal union.
- ❌ Smart constructor com I/O. `fromString` é puro síncrono.
- ✅ `as FITID` permitido **apenas** dentro do smart constructor após validação (D1).
- ✅ Return type explícito em **todas** funções exportadas.
- ✅ `Readonly<>` implícito via `Brand<string, ...>` (string é primitiva imutável).

### 5.2. Imports

- Subpath `#src/shared/primitives/{result,brand}.ts` (não `../../../../shared/...`).
- Extensão `.ts` literal em todos os relativos.
- `import type` para `Brand` (não há valor exportado por brand.ts).
- `import { type Result, ok, err }` — `Result` é tipo, `ok`/`err` são valores.

### 5.3. Naming

- Sigla `FITID` em maiúscula (D8).
- Erros em kebab-case EN prefixados pelo VO: `fitid-empty`, `fitid-too-long`.
- Constante interna em `SCREAMING_SNAKE_CASE`: `MAX_LENGTH`.
- Funções camelCase: `fromString`, `equals`.

---

## 6. Pipeline previsto

| Wave | Skill / agent | Outcome esperado | REPORT |
| :--- | :--- | :--- | :--- |
| **W0** | `tdd-strategist` (delegada à skill `ts-domain-modeler` para revisar contrato do VO antes dos testes? não — XS dispensa) | RED — testes em `tests/modules/financial/domain/shared/fitid.test.ts` cobrem CA-2..CA-12; falham por ERR_MODULE_NOT_FOUND. | `002-tests/REPORT.md` |
| **W1** | `main-session` (poderia escalar para `ts-domain-modeler` se ticket fosse M+; XS dispensa) | GREEN — cria `fitid.ts` (≈25 linhas) + criar pastas `domain/shared/` na mesma operação. | `003-impl/REPORT.md` |
| **W2** | `code-reviewer` | APPROVED — header doc com referências (OFX + handbook), `as` só dentro de `fromString`, sem throw/class/any, exhaustive nos testes. | `004-code-review/REVIEW.md` |
| **W3** | `ts-quality-checker` | ALL-GREEN — incluindo lint (lição do `FIN-CLI-WIRE`: não há `async` neste arquivo, mas atenção a `noUncheckedIndexedAccess` se aparecer destructuring). | `005-quality/REPORT.md` |

---

## 7. Estratégia de teste (W0)

Testes em `tests/modules/financial/domain/shared/fitid.test.ts` — runner `node:test` puro. Sem subprocess, sem mocks. AAA implícito mas claro:

| Teste | CA | Arrange | Act | Assert |
| :--- | :--- | :--- | :--- | :--- |
| `accepts valid string` | CA-4 | `'abc123'` | `FITID.fromString('abc123')` | `result.ok && result.value === 'abc123'` |
| `trims whitespace` | CA-7 | `'  abc  '` | `FITID.fromString('  abc  ')` | `result.value === 'abc'` |
| `rejects empty` | CA-5 | `''` | `FITID.fromString('')` | `result.error === 'fitid-empty'` |
| `rejects whitespace-only` | CA-6 | `'   '` | `FITID.fromString('   ')` | `result.error === 'fitid-empty'` |
| `accepts max length 255` | CA-9 | `'x'.repeat(255)` | `FITID.fromString(...)` | `result.ok` |
| `rejects length 256` | CA-8 | `'x'.repeat(256)` | `FITID.fromString(...)` | `result.error === 'fitid-too-long'` |
| `equals identical values` | CA-10 | duas construções idênticas | `FITID.equals(a, b)` | `true` |
| `equals different values` | CA-11 | duas construções distintas | `FITID.equals(a, b)` | `false` |
| `equals is case-sensitive` | CA-12 | `'AB'` vs `'ab'` | `FITID.equals(a, b)` | `false` |
| **type-level smoke** | CA-2, CA-3 | nenhum | declarar `const _check: FITIDError = 'fitid-empty'` etc. | compila |

Total: ~10 testes em ~1 `describe`.

---

## 8. Riscos e mitigações

| Risco | Mitigação |
| :--- | :--- |
| Validação de charset poderia rejeitar FITID legítimo de algum banco. | D5 — não validar. Documentar em comentário com exemplos (Bradesco numérico, Itaú hex, base64 SES). |
| `MAX_LENGTH = 255` ficar mágico no código. | Comentário cita OFX 2.x §11.4.2 (origem) — auditor pode rastrear. |
| `equals` em `Brand<string, ...>` ser dispensável (igualdade estrutural). | Manter explícito por consistência com outros VOs (`Money.equals`, `Period.equals`). Custa 1 linha, ganha clareza. |
| Lint `restrict-template-expressions` ou similar reclamar de algo. | Sem template literals neste VO. Lições do `FIN-CLI-WIRE` orientam atenção, não bloqueiam. |
| `Brand<string, 'FITID'>` ser invariante estrutural — outros lugares podem casualmente atribuir `string` para `FITID`. | Smart constructor é a única porta de entrada. `as FITID` proibido fora dele (CA-18 explícita). |

---

## 9. Próximos tickets da fatia

```
FIN-MODULE-SCAFFOLD     (XS) ✅ closed-green
FIN-CLI-WIRE            (XS) ✅ closed-green
FIN-VO-FITID            (XS) ← este
  ├─ FIN-IDS-PAYABLE     (XS) — PayableId, RemittanceId, BankTransactionId (branded UUID v4) — independente, paralelizável
  └─ FIN-VO-BENEFICIARY-BANK-DATA (S) — bank, agency, account VOs compostos
      └─ FIN-AGG-PAYABLE-CORE (M) — agregado Payable nos estados Open + Approved
          └─ ... resto da máquina de estados
```

`FIN-VO-FITID` desbloqueia `FIN-AGG-PAYABLE-CORE` indiretamente (Payable referencia `fitid` quando estado vira `Paid`).
