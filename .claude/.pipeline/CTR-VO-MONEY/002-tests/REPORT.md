# W0 — RED — Ticket CTR-VO-MONEY

**Skill:** ts-domain-modeler (modo teste)
**Data:** 2026-05-14
**Status:** ✅ RED confirmado

> **Renomeado:** ticket era `CTR-VO-MOEDA`; virou `CTR-VO-MONEY` após o usuário declarar regra invariante de idioma (código EN, doc PT). Pasta `src/modules/contratos/` virou `src/modules/contracts/`. Arquivo `moeda.test.ts` virou `money.test.ts`. Identificadores todos em EN.

---

## Arquivos criados

- `tests/modules/contracts/domain/shared/money.test.ts` (133 linhas, 20 testes em 5 suítes)

> ⚠️ **Mudanças estruturais aplicadas durante a wave:**
> 1. Testes saíram de `src/.../shared/<name>.test.ts` para `tests/.../shared/<name>.test.ts` (preferência: testes nunca lado a lado com código).
> 2. `package.json` ganhou `"imports": { "#src/*": "./src/*" }` — Node subpath imports nativos, sem `../../../../` nos testes.
> 3. `tsconfig.json` perdeu `rootDir`, ganhou `tests/**/*` no `include`.
> 4. Toda nomenclatura de código migrada para EN (regra invariante).
> 5. Documentação atualizada em `.claude/skills/ts-domain-modeler/SKILL.md` e `.claude/README.md`.

---

## Inventário dos testes

### Suíte 1 — `Money.fromCents` (6 testes)
1. accepts zero
2. accepts any positive integer (`15050`)
3. rejects negative value → `'money-negative-value'`
4. rejects non-integer (`1.5`) → `'money-non-integer-value'`
5. rejects `NaN` → `'money-non-integer-value'`
6. rejects `Infinity` → `'money-non-integer-value'`

### Suíte 2 — `Money.zero()` (1 teste)
1. returns Money with `cents = 0`

### Suíte 3 — `Money.add` (4 testes)
1. adds values correctly (`100 + 50 = 150`)
2. is pure — does not mutate arguments
3. is associative (`a + (b + c) = (a + b) + c`)
4. has zero as identity (`a + 0 = a`)

### Suíte 4 — `Money.subtract` (4 testes)
1. subtracts when `b ≤ a`
2. accepts `b = a` (zero result)
3. rejects when `b > a` → `'money-negative-result'`
4. subtracting zero is identity

### Suíte 5 — Comparisons (5 testes)
1. `equals(a, a)` → true
2. `equals(a, b)` → false (different values)
3. `greaterThan(a, b)` → true (`a > b`)
4. `greaterThan(a, b)` → false (`a < b`)
5. `greaterThan(a, a)` → false

**Total: 20 testes.**

---

## Confirmação de RED

```
pnpm test
→ Error [ERR_MODULE_NOT_FOUND]: Cannot find module
  '.../src/modules/contracts/domain/shared/money.ts'
  imported from .../tests/modules/contracts/domain/shared/money.test.ts
→ tests 1, pass 0, fail 1
```

```
pnpm typecheck
→ tests/modules/contracts/domain/shared/money.test.ts:5
  error TS2307: Cannot find module '#src/modules/contracts/domain/shared/money.ts'
```

✅ **W0 RED confirmado** em runtime e em typecheck. O módulo `money.ts` precisa existir para os testes carregarem.

---

## Decisões de design pré-W1 (registradas para o implementador)

| # | Decisão | Justificativa |
| :-- | :--- | :--- |
| D1 | `type Money = Brand<{ readonly cents: number }, 'Money'>` | `references/ts-branded-types.md`. Garante nominalidade compile-time. |
| D2 | API exposta como "namespace de funções": `export const Money = { fromCents, zero, add, subtract, equals, greaterThan }` | `references/ts-smart-constructors.md`. `Money` é tipo E valor. |
| D3 | `MoneyError = 'money-negative-value' \| 'money-non-integer-value' \| 'money-negative-result'` | Regra raiz: erros como string literal union, kebab-case EN. |
| D4 | `add(a, b): Money` (sem Result) | Soma de inteiros ≥ 0 não falha. Sem overflow plausível. |
| D5 | `subtract(a, b): Result<Money, 'money-negative-result'>` | Sinal negativo proibido. Sinal de débito é semântica do `Amendment.kind = 'Suppression'`, não da `Money`. |
| D6 | `zero(): Money` é função, não constante | Uniformidade da API + zero risco de aliasing. |
| D7 | Sem `multiply`/`divide`/`fromReais` | YAGNI — adicionar quando regra real exigir. |
| D8 | `equals(a, b): boolean` e `greaterThan(a, b): boolean` | Comparações puras sem Result. |

---

## Próximo passo

W1 — implementar `src/modules/contracts/domain/shared/money.ts` aplicando D1–D8. Todos os 20 testes devem passar. Zero código além do mínimo.

Comando de validação após implementação:

```bash
pnpm typecheck   # zero erros
pnpm test        # 20 pass / 0 fail
```

---

## Notas sobre diagnostics do TS no editor

Durante a edição, o IDE pode mostrar dois falsos-positivos transitórios:

- `Cannot find name 'node:test'` / `node:assert` → cache stale; `@types/node 22.19.19` está instalado e ambos os módulos rodam em Node 24.
- `Cannot find module '#src/...'` em qualquer arquivo — esperado em W0 RED; some quando a impl existir.

Nenhum dos dois é blocker.
