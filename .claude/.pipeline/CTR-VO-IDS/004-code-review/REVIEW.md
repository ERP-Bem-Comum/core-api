# Code Review — Ticket CTR-VO-IDS — Round 1

**Veredito:** ✅ **APPROVED**

**Reviewer:** code-reviewer
**Data:** 2026-05-14
**Escopo revisado:**
- `src/modules/contracts/domain/shared/ids.ts` (30 linhas)
- `tests/modules/contracts/domain/shared/ids.test.ts` (84 linhas) — revisão de coerência

---

## Resumo executivo

Implementação **mínima e coesa** seguindo o padrão estabelecido pelo `Money`. Os 3 branded IDs são pares funcionais idênticos com tipos nominais distintos — exatamente o que se espera de IDs no domínio. **Aprovado para W3**, zero issues bloqueantes.

---

## Checklist aplicado

### A. Regras absolutas do domínio

| Item | Status | Evidência |
| :--- | :---: | :--- |
| Zero `throw` | ✅ | `grep "throw" src/modules/contracts/domain/` → 0 |
| Zero `class` | ✅ | `grep "class" ...` → 0 |
| Zero `this` | ✅ | confirmado |
| Zero `any` | ✅ | confirmado |
| Toda função exportada tem return type | ✅ | linhas 14-16, 20-22, 26-28 |

### B. Smart constructors e Branded types

| Item | Status | Evidência |
| :--- | :---: | :--- |
| Smart constructor retorna `Result<Branded, Error>` | ✅ | `rehydrate` em cada namespace |
| `as Branded` apenas em local justificado | ✅ | Em `generate` após `newUuid()` (UUID v4 garantido por construção); em `rehydrate` após `isUuidV4`. |
| Smart constructor não faz I/O | ✅ | `isUuidV4` é regex pura |
| Erro é string literal union | ✅ | `ContractIdError`, `AmendmentIdError`, `DocumentIdError` |

### C. Discriminated unions

N/A.

### D. Ports & Adapters

N/A — domínio puro.

### E. Modular Monolith

| Item | Status | Evidência |
| :--- | :---: | :--- |
| `domain/` só importa de `shared/`/`shared-kernel/`/próprio módulo | ✅ | imports `../../../../shared/` (Result, id, brand) |

### F. ESM / NodeNext / TypeScript moderno

| Item | Status | Evidência |
| :--- | :---: | :--- |
| Imports terminam com `.ts` | ✅ | linhas 1-3 |
| `import type` em imports puramente de tipo | ✅ | `import type { Brand }`; `import { type Result, ok, err }` inline |
| Sem `require`/`enum`/`namespace`/`module.exports` | ✅ | confirmado |
| `tsc --noEmit` zero erros | ✅ | rodado em W1 |

### G. Naming, EN/PT

| Item | Status | Evidência |
| :--- | :---: | :--- |
| Identificadores em EN | ✅ | `ContractId`, `AmendmentId`, `DocumentId`, `generate`, `rehydrate` |
| Erros string literal EN kebab-case | ✅ | `'contract-id-invalid'`, `'amendment-id-invalid'`, `'document-id-invalid'` |
| Sem prefix `I`, sufixo `Impl` | ✅ | confirmado |

### H. Tests (coerência)

| Item | Status | Evidência |
| :--- | :---: | :--- |
| Helper `runIdNamespaceSuite` evita copy-paste | ✅ | 24 testes a partir de 1 implementação |
| Casos de borda cobertos | ✅ | empty, non-UUID, UUID v1, uppercase, trailing whitespace |
| Sem matchers vagos | ✅ | `assert.equal` exato + `assert.match(regex)` para UUID format |

---

## Pontos positivos (explícitos)

1. **Padrão consistente com `Money`** — mesma estrutura (namespace de funções, branded type, smart constructor, erro string literal). Quem leu o Money entende IDs em 10 segundos.

2. **Erros individuais (D5)** — `'contract-id-invalid'` ≠ `'amendment-id-invalid'` ≠ `'document-id-invalid'`. Permite mensagens humanas distintas no `format.ts` futuro, e logs estruturados precisos.

3. **`generate` separado de `rehydrate`** — verbos distintos para semânticas distintas:
   - `generate` = criar ID novo (não pode falhar — UUID v4 sempre válido).
   - `rehydrate` = recuperar ID que existia antes (pode falhar — input é externo).

   Aderente à terminologia DDD ("hydration" = trazer entity persistida de volta para memória).

4. **Reuso do shared** — `newUuid` e `isUuidV4` já existiam em `src/shared/id.ts`. Zero duplicação. A skill `modular-monolith` é respeitada: `domain/` só importa de `shared/`.

5. **Helper de teste DRY** — `runIdNamespaceSuite` é a abstração certa **nos testes**, enquanto o código de produção mantém repetição literal (D5). Decisão consciente, justificada: tests podem usar helpers porque a leitura linear não é tão importante quanto manutenibilidade; código de produção prioriza clareza local.

---

## Notas (🔵 não-bloqueantes)

### Nota 1 — `as ContractId` em `generate` sem validação

```ts
generate: (): ContractId => newUuid() as ContractId,
```

Não chama `isUuidV4` para validar. Confiável porque `newUuid` é wrapper direto de `node:crypto.randomUUID()`, que **sempre** retorna UUID v4 válido (RFC 4122 §4.4).

**Trade-off considerado:**
- A: cast direto (escolhido) — eficiente, confia na lib nativa.
- B: `rehydrate(newUuid())` — paranoia que pega bug futuro se `newUuid` quebrar.

Opção A é canônica em projetos TS modernos. Se um dia trocarmos `randomUUID` por algo de terceiros, vale revisitar. **Sem ação.**

### Nota 2 — Repetição de 3 namespaces

22 das 30 linhas são quase idênticas:

```ts
export const ContractId = {
  generate: (): ContractId => newUuid() as ContractId,
  rehydrate: (raw: string): Result<ContractId, ContractIdError> =>
    isUuidV4(raw) ? ok(raw as ContractId) : err('contract-id-invalid'),
};
// ... 2x mais
```

D5 do request justifica: factory genérica `createIdNamespace<Tag>(...)` é tecnicamente possível mas exige especificar Tag manualmente (TS não consegue inferir Brand tag), o que devolve a verbosidade pra outro lugar com pior legibilidade. A repetição literal vence aqui.

**Se eventualmente surgirem 6+ IDs** (ContractId, AmendmentId, DocumentId, OutboxId, ProgramId, SupplierId, ...), reabrir a discussão. Por enquanto **sem ação**.

### Nota 3 — Sem teste para `generate` colidir

Cada `generate()` retorna UUID v4 distinto, conforme RFC 4122 — probabilidade de colisão para 2¹²² possíveis valores é desprezível. Não há teste para "geramos 10.000 e nenhum colide" — over-engineering. **Sem ação.**

### Nota 4 — `rehydrate` rejeita whitespace, mas não normaliza

`rehydrate(' 7f3a...')` falha (espaço inicial). Se o adapter receber UUID com whitespace por descuido, o erro é informativo (`'contract-id-invalid'`) mas não auto-correção. **Política defensiva correta** — adapter deve sanitizar input antes de chamar `rehydrate`. Documentar no `code-reviewer/SKILL.md` quando criarmos o ticket de adapter. **Sem ação aqui.**

---

## Próximo passo

W3 — `ts-quality-checker` roda `tsc` + `pnpm test`. Esperado: ALL GREEN com 44 testes (20 Money + 24 IDs).
