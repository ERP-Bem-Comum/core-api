# FIN-VO-TAX-ID — VO `TaxId` (CPF | CNPJ alfanumérico) com validação módulo 11

> **Size:** S · **Status:** open · **Criado por:** main-session (Opus 4.7)
> **Predecessores:** FIN-MODULE-SCAFFOLD, FIN-CLI-WIRE, FIN-VO-FITID, FIN-IDS-PAYABLE (todos closed-green)
> **Bloqueia:** FIN-VO-BENEFICIARY-BANK-DATA (que consome `TaxId` no campo `holderTaxId`)
> **Reuso futuro:** BC Gestão de Documentos Fiscais (`FiscalDocument.payerTaxId`/`payeeTaxId`), Contracts (refactor `UserRef.taxId` se aplicável)

---

## 1. Contexto

`TaxId` é o **identificador fiscal de pessoa** no Brasil — discriminated union de duas variantes:

- **CPF** (Cadastro de Pessoa Física) — 11 dígitos numéricos com 2 dígitos verificadores (DV) calculados via módulo 11.
- **CNPJ alfanumérico** (Cadastro Nacional da Pessoa Jurídica, versão 2026 da Receita Federal) — 14 caracteres: 12 primeiros podem ser **alfanuméricos** (`[0-9A-Z]`), 2 últimos são DVs **numéricos** calculados via módulo 11 sobre valores derivados (ASCII - 48).

O CNPJ alfanumérico foi anunciado pela Receita Federal em 2024 (com produção em 2026) — sucessor do CNPJ exclusivamente numérico. CPF permanece numérico. Especificação literal fornecida no §3.2 abaixo.

### Por que VO próprio (não inline no BeneficiaryBankData)

Validação módulo 11 é regra densa — ~80 linhas de algoritmo + tabela ASCII. Encapsular em sub-VO:

1. **Reuso garantido:** `FiscalDocument` (BC futuro) terá `payerTaxId` e `payeeTaxId`; `BeneficiaryBankData` tem `holderTaxId`; futura entidade `LegalEntity` terá `taxId`.
2. **Teste isolado:** algoritmo módulo 11 é complexo (especialmente CNPJ alfanumérico com tabela ASCII) — merece bateria dedicada de fixtures conhecidos.
3. **Discriminated union em ação:** `TaxId = { kind: 'CPF'; … } | { kind: 'CNPJ'; … }` — caso canônico para `switch` exhaustivo com `_exhaustive: never` no default (CLAUDE.md §Regras invariantes).

### Fonte normativa

| Tópico | Fonte |
| :--- | :--- |
| Algoritmo CPF módulo 11 | Especificação Receita Federal (fornecida literal pelo usuário em 2026-05-22, transcrita §3.1) |
| Algoritmo CNPJ alfanumérico módulo 11 | Especificação **Serpro/Receita Federal**: "Cálculo dos dígitos verificadores de CNPJ alfanumérico" (fornecida literal pelo usuário em 2026-05-22, transcrita §3.2) |
| Tabela ASCII para conversão letra→valor (CNPJ) | "Valor para cálculo do DV" = `ord(char) - 48` (A=17, B=18, ..., Z=42) |

---

## 2. Escopo (o que entra)

### 2.1. Arquivo de produção — `src/modules/financial/domain/shared/tax-id.ts`

VO discriminated union no padrão D (module-as-namespace). Estrutura esperada:

```ts
import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import { immutable } from '#src/shared/primitives/immutable.ts';
import type { Brand } from '#src/shared/primitives/brand.ts';

// Padrão D — `import * as TaxId from '...'`

export type CPF = Brand<{ readonly kind: 'CPF'; readonly digits: string }, 'CPF'>;
export type CNPJ = Brand<{ readonly kind: 'CNPJ'; readonly chars: string }, 'CNPJ'>;
export type TaxId = CPF | CNPJ;

export type TaxIdError =
  | 'tax-id-empty'
  | 'tax-id-invalid-length'
  | 'tax-id-invalid-charset'
  | 'cpf-check-digit-mismatch'
  | 'cnpj-check-digit-mismatch';

// Smart constructor unificado — detecta CPF vs CNPJ pelo comprimento após normalização.
export const fromString = (raw: string): Result<TaxId, TaxIdError> => { … };

// Smart constructors específicos (úteis quando o consumidor já sabe o tipo).
export const fromCpf = (raw: string): Result<CPF, TaxIdError> => { … };
export const fromCnpj = (raw: string): Result<CNPJ, TaxIdError> => { … };

// Formatação canônica para display (não para CNAB — adapter formata).
export const format = (id: TaxId): string => { … }; // "123.456.789-01" ou "12.ABC.345/01DE-35"

// Equality field-by-field.
export const equals = (a: TaxId, b: TaxId): boolean => { … };

// Internal: módulo 11 helpers. Privados ao módulo (NÃO exportados).
```

### 2.2. Decisões de modelagem

| # | Decisão | Justificativa |
| :--- | :--- | :--- |
| **D1** | Discriminated union `CPF \| CNPJ` (não um único Brand `TaxId`). | Tipos refinados expressam invariante: CPF é sempre 11 dígitos numéricos; CNPJ é 12 alfanuméricos + 2 dígitos. Compilador força exhaustiveness. |
| **D2** | `kind: 'CPF'` / `kind: 'CNPJ'` (discriminator EN PascalCase). | Consistência com `status: 'Active'`/`'Expired'` do Contract. |
| **D3** | Payload do CPF guarda `digits: string` (11 chars 0-9); payload do CNPJ guarda `chars: string` (14 chars `[0-9A-Z]`). | Forma canônica sem máscara — adapter normaliza antes. |
| **D4** | `fromString(raw)` detecta CPF/CNPJ por comprimento APÓS limpar caracteres não-alfanuméricos. | Aceita inputs com máscara comum (`'123.456.789-01'`, `'12.ABC.345/01DE-35'`) e sem máscara. |
| **D5** | Normalização case: letras viram UPPERCASE antes da validação (CNPJ). | Receita Federal trata `'12.abc.345/01DE-35'` e `'12.ABC.345/01DE-35'` como mesmo CNPJ. |
| **D6** | Algoritmo módulo 11 separado em helpers internos `calculateCpfDV1`, `calculateCpfDV2`, `calculateCnpjDV1`, `calculateCnpjDV2`. Não exportados. | Testabilidade interna sem expor superfície. Tests usam fixtures de CPFs/CNPJs conhecidos válidos para cobrir o algoritmo end-to-end. |
| **D7** | Erros específicos por tipo de falha: `tax-id-empty`, `tax-id-invalid-length`, `tax-id-invalid-charset`, `cpf-check-digit-mismatch`, `cnpj-check-digit-mismatch`. | Não inflar union desnecessariamente, mas distinguir falha de forma (`length`/`charset`) de falha aritmética (`check-digit-mismatch`). |
| **D8** | `format(id)` retorna string com máscara canônica: CPF `'XXX.XXX.XXX-XX'`, CNPJ `'XX.XXX.XXX/XXXX-XX'`. Mantém letras em UPPERCASE no CNPJ. | Display humano (CLI, relatórios). Adapter de CNAB usa forma canônica `.digits`/`.chars` direto. |
| **D9** | **Rejeitar CPFs/CNPJs com todos os dígitos iguais** (`'00000000000'`, `'11111111111'`, etc.). | Esses passam pela aritmética módulo 11 mas são reservados (não atribuíveis por Receita Federal) — erro comum em formulários. Erro: `cpf-check-digit-mismatch` (não vale a pena dedicar erro próprio). |
| **D10** | Sem helper `isCpf(x: unknown): x is CPF` no MVP. | Type narrowing via `kind` discriminator é suficiente. Type guards externos chegam quando consumers reais aparecerem. |

---

## 3. Algoritmo (especificação literal do usuário — fonte normativa)

### 3.1. CPF — algoritmo módulo 11

> Citação literal da especificação fornecida pelo usuário:

**Exemplo:** CPF fictício `111.444.777-05` (forma final: `111.444.777-35` — calculada abaixo).

#### Passo 1 — primeiro DV

Separar os primeiros 9 dígitos: `1 1 1 4 4 4 7 7 7`

Multiplicar cada um (da esquerda para a direita) pelos pesos `10, 9, 8, 7, 6, 5, 4, 3, 2`:

```
 1 × 10 = 10
 1 ×  9 =  9
 1 ×  8 =  8
 4 ×  7 = 28
 4 ×  6 = 24
 4 ×  5 = 20
 7 ×  4 = 28
 7 ×  3 = 21
 7 ×  2 = 14
        ----
Soma:   162
```

Resto da divisão `162 / 11` = **8**.

Regra:
- **Se resto < 2 → DV = 0**
- **Se resto ≥ 2 → DV = 11 - resto**

No exemplo: `11 - 8 = 3`. **Primeiro DV = 3.**

#### Passo 2 — segundo DV

Anexar o primeiro DV ao final dos 9 dígitos → `1 1 1 4 4 4 7 7 7 3` (10 dígitos).

Pesos: `11, 10, 9, 8, 7, 6, 5, 4, 3, 2`.

```
 1 × 11 = 11
 1 × 10 = 10
 1 ×  9 =  9
 4 ×  8 = 32
 4 ×  7 = 28
 4 ×  6 = 24
 7 ×  5 = 35
 7 ×  4 = 28
 7 ×  3 = 21
 3 ×  2 =  6
        ----
Soma:   204
```

Resto `204 / 11` = **6**. Como 6 ≥ 2: `11 - 6 = 5`. **Segundo DV = 5.**

**CPF final: `111.444.777-35`.**

### 3.2. CNPJ alfanumérico — algoritmo módulo 11

> Citação literal da especificação Serpro/Receita Federal fornecida pelo usuário:

CNPJ alfanumérico tem **12 caracteres alfanuméricos** + **2 DVs numéricos**.

#### Tabela de conversão letra → valor

Para cada caractere, atribuir o valor "Valor para cálculo do DV" = `ord(char) - 48`:

| Char | ASCII | Valor |
| :--- | ---: | ---: |
| `'0'` | 48 | 0 |
| `'1'` | 49 | 1 |
| ... | ... | ... |
| `'9'` | 57 | 9 |
| `'A'` | 65 | 17 |
| `'B'` | 66 | 18 |
| ... | ... | ... |
| `'Z'` | 90 | 42 |

#### Passo 1 — primeiro DV

**Exemplo:** CNPJ `12.ABC.345/01DE` (sem DVs ainda).

| Posição | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
| :--- | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| Char | `1` | `2` | `A` | `B` | `C` | `3` | `4` | `5` | `0` | `1` | `D` | `E` |
| Valor | 1 | 2 | 17 | 18 | 19 | 3 | 4 | 5 | 0 | 1 | 20 | 21 |
| Peso | 5 | 4 | 3 | 2 | 9 | 8 | 7 | 6 | 5 | 4 | 3 | 2 |
| Mult | 5 | 8 | 51 | 36 | 171 | 24 | 28 | 30 | 0 | 4 | 60 | 42 |

**Distribuição dos pesos:** 5,4,3,2,**recomeça 9**,8,7,6,5,4,3,2 (da esquerda para a direita).

Soma: `5+8+51+36+171+24+28+30+0+4+60+42 = 459`.

Resto `459 / 11` = **8**. Regra:
- **Se resto < 2 → DV = 0**
- **Se resto ≥ 2 → DV = 11 - resto**

`11 - 8 = 3`. **Primeiro DV = 3.**

#### Passo 2 — segundo DV

Anexar primeiro DV → `1 2 A B C 3 4 5 0 1 D E 3` (13 caracteres). Pesos: `6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2`.

| Char | `1` | `2` | `A` | `B` | `C` | `3` | `4` | `5` | `0` | `1` | `D` | `E` | `3` |
| :--- | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| Valor | 1 | 2 | 17 | 18 | 19 | 3 | 4 | 5 | 0 | 1 | 20 | 21 | 3 |
| Peso | 6 | 5 | 4 | 3 | 2 | 9 | 8 | 7 | 6 | 5 | 4 | 3 | 2 |
| Mult | 6 | 10 | 68 | 54 | 38 | 27 | 32 | 35 | 0 | 5 | 80 | 63 | 6 |

Soma: `6+10+68+54+38+27+32+35+0+5+80+63+6 = 424`.

Resto `424 / 11` = **6**. `11 - 6 = 5`. **Segundo DV = 5.**

**CNPJ final: `12.ABC.345/01DE-35`.**

---

## 4. Critérios de aceitação

| # | Critério | Como verificar |
| :--- | :--- | :--- |
| **CA-1** | Arquivo `src/modules/financial/domain/shared/tax-id.ts` existe | filesystem |
| **CA-2** | Type `CPF` = `Brand<{kind:'CPF',digits:string}, 'CPF'>` | typecheck |
| **CA-3** | Type `CNPJ` = `Brand<{kind:'CNPJ',chars:string}, 'CNPJ'>` | typecheck |
| **CA-4** | Type `TaxId = CPF \| CNPJ` (discriminated union) | typecheck + exhaustive switch test |
| **CA-5** | Type `TaxIdError` é union de 5 literais EN kebab-case | exhaustive switch |
| **CA-6** | `fromString('111.444.777-35')` → ok com `kind: 'CPF'`, digits `'11144477735'` | teste — fixture do §3.1 |
| **CA-7** | `fromString('11144477735')` (sem máscara) → ok CPF | teste D4 |
| **CA-8** | `fromString('12.ABC.345/01DE-35')` → ok com `kind: 'CNPJ'`, chars `'12ABC34501DE35'` | teste — fixture do §3.2 |
| **CA-9** | `fromString('12abc34501de35')` (lowercase) → ok CNPJ chars normalizado UPPERCASE | teste D5 |
| **CA-10** | `fromString('')` → err `'tax-id-empty'` | teste |
| **CA-11** | `fromString('   ')` → err `'tax-id-empty'` (post-trim/normalize) | teste |
| **CA-12** | `fromString('123')` → err `'tax-id-invalid-length'` (curto demais) | teste |
| **CA-13** | `fromString('1'.repeat(15))` → err `'tax-id-invalid-length'` (longo demais) | teste |
| **CA-14** | `fromString('11122233344')` (CPF com DV errado) → err `'cpf-check-digit-mismatch'` | teste |
| **CA-15** | `fromString('00000000000')` → err `'cpf-check-digit-mismatch'` (D9 — todos iguais rejeitado) | teste |
| **CA-16** | `fromString('12.ABC.345/01DE-99')` (CNPJ com DV errado) → err `'cnpj-check-digit-mismatch'` | teste |
| **CA-17** | CPF com caracteres não-numéricos no corpo (ex.: `'11A44477735'`) → err `'tax-id-invalid-charset'` | teste |
| **CA-18** | CNPJ com símbolos não-alfanuméricos no corpo (ex.: `'12.@BC.345/01DE-35'` após normalização) → err `'tax-id-invalid-charset'` | teste |
| **CA-19** | `fromCpf` e `fromCnpj` retornam tipos específicos (não union) | typecheck — `r.value.kind === 'CPF'` narrowed |
| **CA-20** | `format(cpf)` retorna `'XXX.XXX.XXX-XX'` | teste |
| **CA-21** | `format(cnpj)` retorna `'XX.XXX.XXX/XXXX-XX'` com letras em maiúsculo | teste |
| **CA-22** | `equals` retorna `false` para CPF vs CNPJ (kind difere) | teste |
| **CA-23** | `equals` retorna `true` para dois `fromString` com mesmo input válido | teste |
| **CA-24** | **Fixture do exemplo §3.1** (`111.444.777-35`) passa pelo algoritmo — teste verifica DV calculado === 3 e 5 | teste end-to-end |
| **CA-25** | **Fixture do exemplo §3.2** (`12.ABC.345/01DE-35`) passa — teste verifica DV calculado === 3 e 5 | teste end-to-end |
| **CA-26** | `pnpm run typecheck` verde | comando |
| **CA-27** | `pnpm run format:check` verde | comando |
| **CA-28** | `pnpm test` verde | comando |
| **CA-29** | `pnpm run lint` verde — sem shadowing, sem async-sem-await, sem template inválido | comando |
| **CA-30** | `as CPF` / `as CNPJ` aparecem apenas no return final dos smart constructors após validação completa | code-reviewer em W2 |

---

## 5. Estratégia de teste (W0)

~30 testes em 6 `describe`s.

| Describe | Testes | CAs cobertos |
| :--- | ---: | :--- |
| Module-as-namespace (Padrão D) | 2 | smoke + sem namespace aninhado |
| `fromString` — CPF happy path | 3 | CA-6, CA-7, CA-24 (fixture §3.1) |
| `fromString` — CNPJ happy path | 4 | CA-8, CA-9, CA-25 (fixture §3.2), uppercase already |
| `fromString` — comprimento | 4 | CA-10, CA-11, CA-12, CA-13 |
| `fromString` — DV mismatch | 4 | CA-14 (CPF DV errado), CA-15 (todos iguais), CA-16 (CNPJ DV errado), CA-17 (CPF não-numérico), CA-18 (CNPJ não-alfanumérico) |
| `fromCpf` / `fromCnpj` específicos | 3 | CA-19 (CPF), CA-19 (CNPJ), 1 falha cruzada (`fromCpf` recebe CNPJ → err) |
| `format` | 4 | CA-20 (CPF formatado), CA-21 (CNPJ formatado), CPF format roundtrip, CNPJ format roundtrip |
| `equals` | 4 | CA-22 (CPF≠CNPJ), CA-23 (CPF==CPF), CNPJ==CNPJ, valores distintos |
| Type-level smoke | 2 | CA-2..CA-5 (BrandOf, exhaustive switch sobre kind) |
| **Total** | **~30** | |

**Fixtures literais** no topo do arquivo:
- `VALID_CPF = '111.444.777-35'` (com DVs corretos — algoritmo §3.1)
- `VALID_CPF_DIGITS = '11144477735'`
- `VALID_CNPJ = '12.ABC.345/01DE-35'` (CNPJ alfanumérico de exemplo da Serpro)
- `VALID_CNPJ_CHARS = '12ABC34501DE35'`
- `INVALID_CPF_DV = '11144477700'` (mesmos 9 primeiros, DVs errados)
- `INVALID_CNPJ_DV = '12.ABC.345/01DE-99'`
- `ALL_ZEROS_CPF = '00000000000'`

---

## 6. Fora de escopo

- **Validação de CPF/CNPJ via consulta a Receita Federal** — apenas validação aritmética módulo 11. Status no SERPRO é outro adapter.
- **CPF/CNPJ formato antigo (somente numérico para CNPJ)** — implementação aceita formato alfanumérico (que cobre numérico como subset — números 0-9 são alfanuméricos válidos). Antes de 2026, CNPJs eram só dígitos; nosso algoritmo trata letras E dígitos uniformemente via tabela ASCII.
- **Detecção de CPF/CNPJ de teste/sandbox** (ex.: `'11111111111'`, `'22222222222'`) além dos "todos iguais" (D9). Detecção mais elaborada de "CPFs reservados" sai do MVP.
- **Internacionalização** — só BR. CPF/CNPJ são identificadores nacionais.

---

## 7. Padronizações invariantes (lembrete)

### 7.1. Lições propagadas

| Lição | Origem | Aplicação aqui |
| :--- | :--- | :--- |
| Sem shadowing de built-ins | FIN-VO-FITID W3 | Tests sem `const describe = ...`. Função de classificação usa `classify`/`labelOf`. |
| `restrict-template-expressions` | FIN-CLI-WIRE W3 | Não usar `${dv}` se `dv: number \| undefined` — typar antes. |
| `require-await` | FIN-CLI-WIRE W3 | Funções `fromString`/`format`/`equals` são síncronas. |
| `as <Brand>` só no smart constructor após validação | FIN-VO-FITID W2 | `as CPF`/`as CNPJ` no return final, após módulo 11 OK. |
| Imports `#src/*` | FIN-IDS-PAYABLE W1 | Padrão. |

### 7.2. Regras de domínio

- ❌ throw, class, this, new Error, any, extends Error.
- ✅ `as CPF`/`as CNPJ` apenas no return final dos smart constructors.
- ✅ Discriminated union `kind: 'CPF' | 'CNPJ'` — `switch` exhaustivo com `_exhaustive: never` no `default`.
- ✅ `immutable()` ao construir o payload do Brand.
- ✅ Helpers de módulo 11 são internos (não exportados) — domínio expõe apenas `fromString`/`fromCpf`/`fromCnpj`/`format`/`equals`.

---

## 8. Pipeline previsto

| Wave | Skill | Outcome esperado |
| :--- | :--- | :--- |
| **W0** | `tdd-strategist` | RED — ~30 testes falham por `ERR_MODULE_NOT_FOUND` |
| **W1** | `main-session` | GREEN — cria `tax-id.ts` (~120-150 linhas: header + DU + 4 helpers internos + 5 funções exportadas) |
| **W2** | `code-reviewer` | APPROVED — algoritmo módulo 11 confere com §3.1/§3.2; `as <Brand>` restrito; switch exhaustivo no `kind`; sem helpers exportados além do necessário |
| **W3** | `ts-quality-checker` | ALL-GREEN round 1 (esperado — todas as lições FIN-* aplicadas) |

---

## 9. Riscos e mitigações

| Risco | Mitigação |
| :--- | :--- |
| Erro no algoritmo módulo 11 (off-by-one, peso errado) | Fixtures literais do §3.1/§3.2 são **golden test** — se o algoritmo errar, esses 2 inputs darão DV diferente. |
| Tabela ASCII errada para CNPJ (ex.: assumir A=10 em vez de 17) | §3.2 documenta literalmente `ord(char) - 48`. Teste CA-25 com fixture Serpro pega divergência. |
| Performance — módulo 11 chamado em loop alto-throughput | `O(14)` por validação. Sem preocupação. Se virar hotspot futuro, optimize depois. |
| `fromString` heurística de detecção CPF vs CNPJ falha | Detecção por comprimento normalizado: 11 → CPF, 14 → CNPJ. Outros tamanhos → `tax-id-invalid-length`. Sem ambiguidade. |
| Caractere especial inesperado no input (acento, espaço unicode) | Normalização aceita `[0-9A-Za-z]` + pontuação canônica (`.`, `-`, `/`). Outros chars → `tax-id-invalid-charset`. |
| Lib externa para módulo 11 ser tentada (ex.: `cpf-cnpj-validator` npm) | **PROIBIDO no MVP** — supply chain (ADR-0011) + domínio puro (CLAUDE.md). Implementação caseira é ~80 linhas, testada e auditável. |

---

## 10. Próximos tickets

```
FIN-VO-TAX-ID                 (S) ← este (sub-VO próprio)
  └─ FIN-VO-BENEFICIARY-BANK-DATA (S) — agora consome TaxId
      └─ FIN-AGG-PAYABLE-CORE (M)
          └─ ...
```

`FIN-VO-TAX-ID` desbloqueia o `BeneficiaryBankData` e prepara terreno para `FiscalDocument` (Fatia 6+).
