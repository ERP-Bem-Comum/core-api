# Quality Check — Ticket FIN-VO-TAX-ID

**Skill:** `ts-quality-checker` (W3 — gate final)
**Data:** 2026-05-22T19:33Z
**Veredito final:** ✅ **ALL GREEN** (após refactor — 2 categorias de erros lint/format encontradas e corrigidas)

| # | Check | Status | Detalhes |
| :- | :--- | :--- | :--- |
| 1 | Type check (`pnpm run typecheck`) | ✅ | zero erros (sempre verde, todos os rounds) |
| 2 | Format check (`pnpm run format:check`) | ✅ após fix | round 1: 1 arquivo desformatado (bank-transaction-id.ts, regressão pré-existente) → `pnpm run format` → round 2: clean |
| 2-bis | Lint (`pnpm run lint`) | ✅ após refactor | round 1: 6 errors → refactor → 1 error → final fix → 0 |
| 3 | Testes (`pnpm test`) | ✅ | `# tests 933  pass 917  fail 0  skipped 16` |
| 4 | Build | ⏭️ SKIPPED | Fase 1 |

---

## ⚠️ Round 1 W3 BLOCKED — 2 categorias de erro

### 1.1. format:check (1 arquivo)

```
[warn] src/modules/financial/domain/shared/bank-transaction-id.ts
[warn] Code style issues found in the above file.
```

**Origem:** regressão silenciosa do **ticket FIN-IDS-PAYABLE** — o arquivo foi criado em W1 daquele ticket, Prettier hook tentou formatar mas algo não pegou (verificado por inspeção: o multiline da assinatura do `rehydrate` ficou em estilo levemente diferente do canônico após `pnpm run format`).

**Não é regressão deste ticket** — `bank-transaction-id.ts` não foi tocado em FIN-VO-TAX-ID. Fix in-place: `pnpm run format` regenerou a formatação canônica.

### 1.2. lint — conflito entre 2 regras typescript-eslint

```
src/modules/financial/domain/shared/tax-id.ts
  88:59  error  Use a ! assertion to more succinctly remove null and undefined from the type
                @typescript-eslint/non-nullable-type-assertion-style
  ... (6 ocorrências)
```

**Causa:** os casts `CPF_WEIGHTS_DV1[i] as number` (justificados por `noUncheckedIndexedAccess`) violavam `non-nullable-type-assertion-style` — que prefere `!` sobre `as T` quando o tipo é apenas `T | undefined`.

**Primeira tentativa de fix:** `pnpm run lint:fix` converteu `as number` → `!`. Mas então **outra regra acionou**:

```
  88:59  error  Forbidden non-null assertion
                @typescript-eslint/no-non-null-assertion
```

`!` é proibido. Conflito real entre as 2 regras — só é resolvível **eliminando a necessidade de indexed access**.

### 1.3. Refactor aplicado: `for + indexed` → `reduce()`

```diff
-const calculateCpfDV1 = (digits: string): number => {
-  let sum = 0;
-  for (let i = 0; i < 9; i++) sum += Number(digits[i]) * CPF_WEIGHTS_DV1[i]!;
-  return moduleEleven(sum);
-};
+const calculateCpfDV1 = (digits: string): number => {
+  const sum = CPF_WEIGHTS_DV1.reduce(
+    (acc, weight, i) => acc + (digits.charCodeAt(i) - 48) * weight,
+    0,
+  );
+  return moduleEleven(sum);
+};
```

**Por que `reduce` resolve:**

- `weight` callback param tem tipo `number` (não `number | undefined`) — `reduce` itera elementos definidos.
- `digits.charCodeAt(i) - 48` extrai o valor numérico **sem indexed access** (`charCodeAt(i)` retorna `number` direto, retorna `NaN` apenas se `i` out-of-bounds, mas o loop limita por `weights.length`).
- Sem `let sum` (também aponta para Sugestão 1 do W2 — refactor casual fechou as 3 ramificações).
- Sem casts `as`/`!`.

**Bônus:** o helper `charToValue` (não exportado) virou unused após refactor → removido (lint flagou `'charToValue' is assigned a value but never used`). Cleanup de 2 linhas.

### 1.4. Decisão: fix in-place sem refazer W1/W2

Padrão consolidado dos tickets `FIN-CLI-WIRE` e `FIN-VO-FITID`: fix técnico in-place em W3 quando o issue é detectável só por ferramentas automáticas (lint/format). REPORTs W1/W2 ficam históricos como estavam; este REPORT W3 documenta integralmente a evolução.

**Trilha de auditoria preservada.**

---

## 📝 Lição CRÍTICA registrada — propagar para próximos tickets

**Conflito `non-nullable-type-assertion-style` × `no-non-null-assertion`** — armadilha do `typescript-eslint` strict do projeto:

- ❌ `arr[i] as T` viola `non-nullable-type-assertion-style`.
- ❌ `arr[i]!` viola `no-non-null-assertion`.
- ✅ **Resolver eliminando indexed access**: usar `.reduce()`, `.map()`, `for...of` com `entries()`, ou destructuring com narrowing explícito.

**Aplicação imediata:**
- Próximo ticket (`FIN-VO-BENEFICIARY-BANK-DATA`) NÃO terá indexed access — validação inline via regex/condicionais é trivial.
- Future tickets com loops aritméticos sobre arrays: começar direto com `.reduce()`.

**Atualização do checklist do code-reviewer (recomendação):**

> H.6 — **Evitar indexed access em arrays no domínio.** Se necessário, usar `Array.reduce`/`map`/`for...of` em vez de `for + arr[i]`. Sob typescript-eslint strict, `as T` e `!` em indexed access são proibidos simultaneamente.

---

## Saída integral (pós-refactor)

### Check 1 — `pnpm run typecheck`

```
> core-api@0.1.0 typecheck
> tsc --noEmit
```

Zero erros. Exit 0.

### Check 2 — `pnpm run format:check`

```
Checking formatting...
All matched files use Prettier code style!
```

### Check 2-bis — `pnpm run lint`

```
> core-api@0.1.0 lint
> eslint .
```

Zero warnings/errors. Exit 0.

### Check 3 — `pnpm test`

```
ℹ tests 933  pass 917  fail 0  skipped 16  duration_ms 38160
```

**Os 32 testes do TaxId continuam verdes após o refactor.** Golden CA-24 (CPF) e CA-25 (CNPJ) confirmam que `reduce` produz exatamente o mesmo resultado aritmético que o `for` original — pesos e ASCII tabela inalterados, lógica preservada.

### Check 4 — Build

```
SKIPPED na Fase 1.
```

---

## CAs do 000-request — re-verificação após refactor

| CA | Status | Onde |
| :--- | :--- | :--- |
| CA-1 .. CA-25 | ✅ | W1 + W2 confirmaram |
| CA-26 (typecheck) | ✅ | Check 1 |
| CA-27 (format:check) | ✅ | Check 2 (após fix de regressão pré-existente) |
| CA-28 (pnpm test) | ✅ | Check 3 |
| CA-29 (lint sem shadowing) | ✅ | Check 2-bis (após refactor `reduce`) |
| CA-30 (`as Brand` só no return final) | ✅ | W2 confirmou — casts intermediários eliminados pelo refactor |

**30/30 CAs verdes.**

---

## Padrão histórico do módulo Financial — atualizado

| Ticket | Size | W3 round 1 | Round 2 fix |
| :--- | :---: | :--- | :--- |
| FIN-MODULE-SCAFFOLD | XS | ALL-GREEN | — |
| FIN-CLI-WIRE | XS | BLOCKED (require-await + restrict-template) | inline |
| FIN-VO-FITID | XS | BLOCKED (no-shadow) | inline |
| FIN-IDS-PAYABLE | XS | ALL-GREEN | — |
| **FIN-VO-TAX-ID** | **S** | **BLOCKED (lint conflict + format regression)** | **inline (refactor reduce + format)** |

3 de 5 tickets tiveram BLOCK em W3 round 1. **Cada BLOCK ensinou uma armadilha lint nova** que está agora documentada — próximos tickets terão menos riscos.

---

## Próximo passo

**ALL GREEN → ticket fecha.**

```bash
pnpm run pipeline:state close FIN-VO-TAX-ID
```

**Próximo:** retomar `FIN-VO-BENEFICIARY-BANK-DATA` (já open, request atualizado para consumir `TaxId`). W0 desse ticket já pode começar — `TaxId` está pronto e estável.
