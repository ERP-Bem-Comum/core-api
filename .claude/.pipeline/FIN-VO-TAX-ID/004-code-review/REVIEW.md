# Code Review — Ticket FIN-VO-TAX-ID — Round 1

**Veredito:** **APPROVED**

**Reviewer:** `code-reviewer` (skill canônica W2)
**Data:** 2026-05-22T19:30Z
**Round:** 1 / 3
**Escopo revisado:** 2 arquivos

| # | Arquivo | Linhas |
| :--- | :--- | ---: |
| 1 | `src/modules/financial/domain/shared/tax-id.ts` | 189 |
| 2 | `tests/modules/financial/domain/shared/tax-id.test.ts` | ~295 |

---

## Issues encontradas

### 🔴 Crítica (bloqueia approval)

Nenhuma.

### 🟡 Importante (não-bloqueia, mas registrar)

Nenhuma.

### 🔵 Sugestão (estilo / clareza)

#### Sugestão 1 — `tax-id.ts:87,93,99,107` — `let sum = 0` em loop de acumulação

**Categoria:** A (regras absolutas de domínio — letra ambígua)
**Observação:** 4 ocorrências de `let sum = 0` dentro dos `calculate*DV*`. Regra `.claude/rules/domain.md` diz "Sem `let` reatribuído em **entidades**". `sum` aqui é **variável local de acumulação dentro de helper privado**, não estado de entidade. Interpretação consistente com `tests/modules/contracts/...` e outros VOs do projeto que usam loops aritméticos.

**Não bloqueia** porque:
- "Entidade" no contexto da regra são agregados/VOs com identidade — não loops internos.
- Alternativa `reduce()` ficaria muito mais verbosa sob `noUncheckedIndexedAccess` (cada `acc + weights[i] as number` parece pior que `sum += ...`).
- Helper é módulo-privado, não expõe state mutável fora dele.

**Possível refactor futuro** (não bloqueador): extrair `dotProduct(values, weights): number` helper genérico se outros VOs (`FIN-VO-MOEDA-LIQUIDA-COMPLEXA` hipotética) repetirem o padrão.

#### Sugestão 2 — `tax-id.ts:88,94,101,109` — `as number` / `as string` em indexed access

**Categoria:** F (TypeScript moderno — cast localizado)
**Observação:** 6 casts (`CPF_WEIGHTS_DV1[i] as number`, `chars[i] as string`) forçados por `noUncheckedIndexedAccess`. Range é provável (loop `for i < N`) mas TS não infere.

**Não bloqueia** — é o padrão canônico do projeto sob `noUncheckedIndexedAccess`. Visto em vários outros arquivos. Refactor para tuple-typed arrays (`readonly [number, number, number, number, number, number, number, number, number]`) tiraria os casts mas adicionaria 9 valores na declaração + perda de leitura.

#### Sugestão 3 — `tax-id.ts:187` — `return false` "inalcançável"

**Categoria:** F (TS strict — falso código morto)
**Observação:** No `equals` (linha 183-188), após verificar `a.kind !== b.kind`, os 2 `if` cobrem `(CPF, CPF)` e `(CNPJ, CNPJ)`. O último `return false` (linha 187) é tecnicamente inalcançável mas TS exige porque o sistema de tipos não consegue narrow após combinatória de discriminators.

**Não bloqueia** — pattern conhecido (equivalente ao `_exhaustive: never` no `format`). Alternativa seria `switch (a.kind)` aninhado, mas piora legibilidade.

---

## O que está bom

### Auditoria automática — todas verdes

```
$ grep -nE "throw |\bclass\b|new Error|extends Error|: any\b|as any" tax-id.ts
(nenhum encontrado)
```

- ✅ **Zero `throw`/`class`/`new Error`/`extends Error`/`any`** — domínio puro respeitado.
- ✅ **`as CPF`/`as CNPJ` aparecem exatamente 1 vez cada**, no return final dos respectivos smart constructors, **após validação completa** (length, regex, allSame, DV match). CA-30 satisfeita literalmente.

### Algoritmo módulo 11 — confere com §3 do 000-request

| Item | §3 | tax-id.ts | Match |
| :--- | :--- | :--- | :--- |
| Pesos CPF DV1 | `[10,9,8,7,6,5,4,3,2]` | linha 63 | ✅ |
| Pesos CPF DV2 | `[11,10,9,8,7,6,5,4,3,2]` | linha 64 | ✅ |
| Pesos CNPJ DV1 | `[5,4,3,2,9,8,7,6,5,4,3,2]` | linha 65 | ✅ |
| Pesos CNPJ DV2 | `[6,5,4,3,2,9,8,7,6,5,4,3,2]` | linha 66 | ✅ |
| Tabela ASCII | `ord(char) - 48` | linha 69 (`charToValue`) | ✅ |
| Regra final DV | `< 2 → 0; senão 11 - rest` | linha 81-84 (`moduleEleven`) | ✅ |

**Golden tests confirmam algoritmo end-to-end:**
- CA-24 (`'111.444.777-35'` — CPF §3.1) → ok
- CA-25 (`'12.ABC.345/01DE-35'` — CNPJ §3.2 Serpro) → ok

### Encapsulamento dos helpers (D6 do 000-request)

```
$ grep -nE "^export " tax-id.ts
46:export type CPF
47:export type CNPJ
48:export type TaxId
50:export type TaxIdError
116:export const fromCpf
134:export const fromCnpj
154:export const fromString
164:export const format
183:export const equals
```

`charToValue`, `normalize`, `allSame`, `moduleEleven`, `calculateCpfDV1/2`, `calculateCnpjDV1/2`, `CPF_BODY_REGEX`, `CNPJ_BODY_REGEX`, `CPF_WEIGHTS_*`, `CNPJ_WEIGHTS_*` — todos **module-private**. Domínio expõe apenas o necessário (5 funções + 4 tipos + 4 const types).

### Discriminated union + exhaustive switch

- ✅ `TaxId = CPF | CNPJ` (linha 48) com discriminator `kind: 'CPF' | 'CNPJ'`.
- ✅ `format(id)` (linha 164-179) usa `switch (id.kind)` com `_exhaustive: never` no `default`.
- ✅ `equals` (linha 183) usa narrowing por `kind` antes de comparar payload.
- ✅ Test exhaustive sobre `TaxIdError` (5 variantes) com `_exhaustive: never` — protege contra adição silenciosa.

### Smart constructors — fluxo robusto

Cada smart constructor (`fromCpf`, `fromCnpj`) faz validação em camadas:

1. **Empty check** (linha 118, 136) → `tax-id-empty`
2. **Length check** (linha 119, 137) → `tax-id-invalid-length`
3. **Charset regex** (linha 120, 138) → `tax-id-invalid-charset`
4. **All-same rejection** (linha 121, 139) — D9 (RFB-reservados) → `*-check-digit-mismatch`
5. **DV aritmético** (linha 123-129, 141-147) → `*-check-digit-mismatch`

Após todas as validações, branding final único (linha 131, 149). Sequência clara, auditável.

### Header doc

- ✅ **Transcreve §3 do 000-request com 35 linhas** — auditor não precisa abrir o request para entender pesos, tabela ASCII, regra final.
- ✅ Cita o ticket-source: `.claude/.pipeline/FIN-VO-TAX-ID/000-request.md §3`.
- ✅ Padrão D explicado (linha 36-37).

### Test file

- ✅ **AAA explícito** em cada test.
- ✅ **Golden fixtures literais** no topo (linha 31-49) — debug visual fácil.
- ✅ **`classify`** (linha 271) em vez de `describe` no exhaustive switch — lição FIN-VO-FITID W3 absorvida preventivamente.
- ✅ **Boundary tests** explícitos: comprimento 0/3/11/12/14/15.
- ✅ **Charset error** com input que mantém 14 chars após normalize (`'12ABC34501DEAB'`) — semantica correta após ajuste documentado em W1 §3.
- ✅ **`fromCpf` recebe CNPJ** → invalid-length (cross-construtor test).

---

## Checklist explícita aplicada

| Categoria | Resultado |
| :--- | :--- |
| A. Regras absolutas | ✅ zero throw/class/this/any/extends Error; `let sum` em helper privado é local de acumulação (Sugestão 1) |
| B. Smart constructors / Branded | ✅ `fromCpf`/`fromCnpj`/`fromString` retornam `Result<Brand, Error>`; `as CPF`/`as CNPJ` 1× cada após validação; sync, puro; erro é string union |
| C. Discriminated unions | ✅ `kind: 'CPF' \| 'CNPJ'` discriminator EN PascalCase; switch exhaustivo no `format`; teste exhaustive no `TaxIdError` |
| D. Ports & Adapters | N/A |
| E. Modular Monolith | ✅ importa apenas `#src/shared/primitives/*`; zero cross-module |
| F. ESM / NodeNext / TS moderno | ✅ extensão `.ts`; `import type { Brand }`; `import { type Result, ok, err }`; sem require/namespace/enum; casts `as number`/`as string` localizados sob `noUncheckedIndexedAccess` (Sugestão 2) |
| G. Naming, PT/EN, clareza | ✅ identifiers EN; siglas técnicas maiúsculas (`CPF`, `CNPJ`); erros kebab-case EN; sem `I`/`Impl` |
| H. Tests | ✅ AAA, sem mocks, golden fixtures, exhaustive switch sobre erros, sem shadowing |

---

## Observação meta — padrão consolidado

Com FIN-VO-TAX-ID closing, o módulo Financial fechará **6 tickets** (5 XS + 1 S, este). Histórico W3:

| Ticket | Size | W3 round 1 |
| :--- | :---: | :--- |
| FIN-MODULE-SCAFFOLD | XS | ALL-GREEN |
| FIN-CLI-WIRE | XS | BLOCKED (require-await, restrict-template-expressions) |
| FIN-VO-FITID | XS | BLOCKED (no-shadow) |
| FIN-IDS-PAYABLE | XS | ALL-GREEN ✅ |
| **FIN-VO-TAX-ID** | **S** | **expectativa ALL-GREEN** (lições aplicadas preventivamente) |

A escala XS → S não introduziu regressão nas lições — boa indicação de robustez do ciclo.

---

## Próximo passo

- **APPROVED** → pipeline-maestro avança para **W3**.
- Após W3 ALL-GREEN, `pnpm run pipeline:state close FIN-VO-TAX-ID`.
- **Próximo:** retomar `FIN-VO-BENEFICIARY-BANK-DATA` (já aberto) agora que `TaxId` está disponível para consumo via `holderTaxId: TaxId`.
