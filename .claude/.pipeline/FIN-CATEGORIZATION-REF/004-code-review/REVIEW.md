# Code Review — FIN-CATEGORIZATION-REF (US1 Categoria)

**Reviewer:** code-reviewer · **Data:** 2026-06-20

**Escopo revisado:** `domain/category/{category-id,category-group,types,category}.ts`, `application/ports/category-read.ts`, `adapters/persistence/repos/category-read.{in-memory,drizzle}.ts`, `adapters/persistence/seed/reference-categories.ts`, `adapters/persistence/schemas/mysql.ts` (finCategories), `migrations/mysql/0012_*.sql`, `adapters/http/{schemas,dto,plugin,composition,error-mapping}.ts`, `public-api/permissions.ts`, e os 3 testes do US1.

---

## Round 1 — **REJECTED**

### 🔴 Crítica

#### Issue 1 — `tests/modules/financial/adapters/http/categories.http.test.ts:74-83`

**Categoria:** F (TS moderno) / H (tests) — quebraria o gate W3 (`pnpm run lint`).
**Problema:** 8 erros de ESLint. `const body = res.json() as ReadonlyArray<{...}>` seguido de `assert.ok(Array.isArray(body))` — o `Array.isArray` **re-narrowa** `body` para `any[]` (gotcha conhecido do typescript-eslint), disparando `no-unsafe-member-access` em `.id`/`.name`/`.group`, `restrict-template-expressions` e `array-type` (`ReadonlyArray<T>` proibido → `readonly T[]`).
**Fix aplicado:** remover o `Array.isArray(body)` redundante (o cast já garante o tipo array) e trocar `ReadonlyArray<T>` por `readonly T[]`.

```ts
// antes
const body = res.json() as ReadonlyArray<{ id: string; name: string; group: string }>;
assert.ok(Array.isArray(body));
// depois
const body = res.json() as readonly { id: string; name: string; group: string }[];
```

**Evidência pós-fix:** `eslint` nos arquivos do ticket → 0 problemas; 3 testes do US1 → 9 pass / 0 fail.

---

## Round 2 — **APPROVED**

Após o fix do Issue 1, o diff adere às regras. Verificações:

| Categoria | Resultado |
| --- | --- |
| **A** Domínio puro | ✅ `Result`, branded id, union fechada, `immutable`, sem `class`/`throw`/`any`/`let`. |
| **B** Smart constructors | ✅ `Category.create → Result`; `as Branded` só pós-validação (`isUuidV4`/`VALUE_SET.has`). |
| **D** Ports & Adapters | ✅ `CategoryReadPort` = `type Readonly<{}>`; drizzle converte `throw→Result` (boundary try/catch) e o mapper revalida via smart constructor (rejeita inválido). |
| **E** Modular monolith (ADR-0006/0014) | ✅ Tudo `fin_*`; nenhum acesso cru a outro módulo. Programa (US3) ficará via `programs/public-api` — fora desta fatia. |
| **ADR-0020** | ✅ `group` = varchar(12)+CHECK (sem ENUM); `boolean`; seed via `ON DUPLICATE KEY UPDATE` (permitido); sem JSON. |
| **F** ESM/TS | ✅ imports `.ts`, `import type`, return types explícitos. `tsc --noEmit` 0 erros. |
| **G** Idioma | ✅ Código EN; erro interno `category-read-unavailable` (EN kebab). `group ∈ {despesa,receita,ajuste}` em PT é **valor de contrato/produto** ditado pela spec (FR-005) e consistente com o precedente `AccountType` (`corrente\|poupanca\|investimento`) — não é identificador interno. Seeds (`Aluguel`, `Doações`…) são dados de negócio, não código. |

### 🟡 Importante (não-bloqueia — registrar)

- **Cobertura de integração Drizzle ausente** nesta fatia: `category-read.drizzle.ts` não tem teste de execução real contra MySQL (nem entrada no script `test:integration:financial`). Mitigado por `typecheck` + paridade total com os demais read stores. **Recomendação:** adicionar `category-read.drizzle-mysql.test.ts` + a migration 0012 exercitada por `applyMigrations` — avaliar no W3 ou follow-up.

### 🔵 Sugestão

- `category-read.in-memory.ts`: `categories.filter(...).sort(...)` — `sort` muta o array do `filter` (cópia nova, seguro). `toSorted()` deixaria a intenção read-only mais explícita. Cosmético.
- Ordenação `localeCompare` (in-memory) vs `ORDER BY` (Drizzle/collation) pode divergir em acentuação extrema; irrelevante para os grupos atuais. A ordenação canônica é a do DB.

---

## O que está bom

- Reuso fiel dos padrões canônicos do módulo (`cedente-account-id.ts`, `entry-type.ts`, read-port #178) — zero invenção de estilo.
- Seed com **fonte única** (`reference-categories.ts`) compartilhada entre in-memory e migration, com UUIDs fixos garantindo SC-002.
- Slug RBAC `reference:read` transversal — decisão correta vs. acoplar a um fluxo.
- Sem regressão: suíte HTTP financial 121/121.

## Veredito final: **APPROVED** (round 2) → avançar para W3.
