# Ticket CTR-DB-MAPPER-NO-THROW

> **Categoria:** Conformidade com CLAUDE.md (Anti-padrão #7).
> **Origem:** Audit `handbook/reviews/0002-audit-adapters-persistence-mysql.md` §H2 — *"`throw new Error(...)` em `default` exaustivo dos mappers"*.
> **Tamanho:** XS (4 linhas em 2 arquivos). Primeiro ticket da sequência sugerida no audit (`§3` — *"warm-up, ganho de conformidade imediato"*).

---

## ⚠️ Skills obrigatórias

- 🧪 [`ts-domain-modeler`](../../skills/ts-domain-modeler/SKILL.md) — fundamentos de discriminated unions + exhaustiveness check em TS 6 (a regra anti-`throw` no `default` vem direto daqui).
- 📚 [`clean-code-theorist`](../../skills/clean-code-theorist/SKILL.md) — ratio legis do princípio "erros são valores, não exceções".

Citação literal que sustenta este ticket — `CLAUDE.md` raiz §"Anti-padrões" #7:

> *"`throw new Error(...)` no `default` de switch exhaustivo — usar `const _: never = x` apenas"*.

---

## Objetivo

Remover 4 ocorrências de `throw new Error(...)` em branches `default` de switches exaustivos nos mappers Drizzle, substituindo por `return _exhaustive;` (já que `_exhaustive` é `never`, o tipo de retorno do switch é preservado e o branch é tecnicamente inalcançável em runtime).

---

## Escopo

### O que entra

1. **`src/modules/contracts/adapters/persistence/mappers/period.mapper.ts`** — 2 `default` (linhas ~21-25 em `periodToColumns` e ~37-41 em `periodFromColumns`).
2. **`src/modules/contracts/adapters/persistence/mappers/amendment.mapper.ts`** — 2 `default` (linhas ~51-54 em `amendmentToInsert` e ~111-114 em `amendmentFromRow`).

### O que NÃO entra

- Nenhuma mudança de assinatura, comportamento, schema, teste, migration.
- Demais issues do audit (H1 N+1, H3 pool tuning, M*, L*) ficam para os próximos tickets na ordem sugerida pelo audit (§3).

---

## Decisões

### Por que `return _exhaustive` e não outras formas

- **`throw new Error`** — viola Anti-padrão #7 e mancha o grep `throw new Error` no domínio/adapter (auditoria automatizada).
- **Omitir `default`** — possível, mas (a) `noFallthroughCasesInSwitch` não obriga, (b) `_exhaustive: never` explicita a intenção e (c) o padrão `const _: never` já é usado no domínio puro (`src/modules/contracts/domain/contract/contract.ts`, `amendment.ts`).
- **`return _exhaustive;`** — `never` é assignable a qualquer tipo, então o tipo de retorno do switch é preservado sem cast. Em runtime o branch é inalcançável: chegar até ele significa que o `kind` recebido não é nenhum dos discriminantes válidos — situação que, se ocorrer, sairá silenciosamente devolvendo `undefined` (impossível pois TS prova `never`). Não há regressão observável.

### Trade-off

Zero. Comportamento de runtime idêntico (linha já era inalcançável por construção). Ganho: aderência ao CLAUDE.md, remoção de 4 ruídos no grep `throw new Error`.

---

## Critérios de aceite (DoD)

- [ ] `grep -rn "throw new Error" src/modules/contracts/adapters/persistence/mappers/` retorna **0 ocorrências**.
- [ ] `pnpm run typecheck` verde.
- [ ] `pnpm run format:check` verde.
- [ ] `pnpm test` verde (suítes de mapper + drizzle-mysql + inmemory cobrem o round-trip dos discriminantes).
- [ ] Cada `default` substituído tem a forma exata `default: { const _exhaustive: never = X; return _exhaustive; }` (sem `throw`, sem `JSON.stringify`).

---

## Referências cruzadas

- Audit: [`handbook/reviews/0002-audit-adapters-persistence-mysql.md`](../../../handbook/reviews/0002-audit-adapters-persistence-mysql.md) §H2 + §3.
- ADR-0020: [`handbook/architecture/adr/0020-mysql-only-supersedes-dual-dialect.md`](../../../handbook/architecture/adr/0020-mysql-only-supersedes-dual-dialect.md) — mappers são parte do adapter MySQL único.
- Padrão canônico do `const _: never` no domínio puro: `src/modules/contracts/domain/contract/contract.ts`, `amendment.ts`.
