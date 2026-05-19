# W2 — Code Review read-only

> **Reviewer:** orquestrador (skill `code-reviewer` em pipeline). Read-only — não modifica código.
> **Rounds:** 1.
> **Veredito:** **APPROVED.**

---

## 1. Checklist contra `CLAUDE.md` raiz

| # | Regra | Verificação | Status |
| :-- | :-- | :-- | :-- |
| 1 | §"Regras invariantes" → Sintaxe → "Anti-padrões" #7: `throw new Error` no `default` exaustivo é proibido | `grep -rn "throw new Error" src/modules/contracts/adapters/persistence/mappers/` retorna 0 hits | ✅ |
| 2 | §Domínio puro: "**`throw` proibido. Operações retornam `Result<T, E>`**" — mappers ficam no adapter, mas o audit explicitamente cobra a forma `const _: never = x` mesmo em adapters | Os 4 `default` agora têm exatamente essa forma | ✅ |
| 3 | §Domínio puro: "Discriminated unions + `switch` exaustivo. (...) Nunca usar `default: throw` — usar `default: { const _: never = x; return _; }` ou omitir default" | Forma aplicada literal | ✅ |
| 4 | §Sintaxe: `import type { X }` ou `import { type X }` | Imports do `period.mapper.ts` e `amendment.mapper.ts` já usavam `type` — não foram tocados | ✅ |
| 5 | §"Trabalho não-trivial passa pela pipeline W0→W3" | Ticket aberto em `.claude/.pipeline/CTR-DB-MAPPER-NO-THROW/`, REPORTs de W0+W1 escritos | ✅ |

---

## 2. Inspeção dos 4 trechos

### 2.1 `period.mapper.ts:21-24` (`periodToColumns`)

```ts
default: {
  const _exhaustive: never = p;
  return _exhaustive;
}
```

- `p: Period` é discriminated union `{ kind: 'Fixed', ... } | { kind: 'Indefinite', ... }`.
- Após os dois `case`, `p` é `never` — assignment válido.
- Tipo de retorno declarado: `PeriodColumns`. `never ⊑ PeriodColumns` ✅.

### 2.2 `period.mapper.ts:38-41` (`periodFromColumns`)

```ts
default: {
  const _exhaustive: never = cols.kind;
  return _exhaustive;
}
```

- `cols.kind: PeriodKindRaw = 'Fixed' | 'Indefinite'`.
- Após os dois `case`, `cols.kind` é `never` ✅.
- Tipo de retorno declarado: `Result<Period, PeriodMapperError>`. `never ⊑ Result<...>` ✅.

### 2.3 `amendment.mapper.ts:51-54` (`amendmentToInsert`)

```ts
default: {
  const _exhaustive: never = a;
  return _exhaustive;
}
```

- `a: Amendment` é union dos 4 kinds (`Addition`, `Suppression`, `TermChange`, `Misc`).
- `case 'Addition': case 'Suppression':` (fallthrough explícito), `case 'TermChange':`, `case 'Misc':` cobrem todos.
- Após eles, `a` é `never` ✅.
- Tipo de retorno declarado: `AmendmentInsert`. `never ⊑ AmendmentInsert` ✅.

### 2.4 `amendment.mapper.ts:111-114` (`amendmentFromRow`)

```ts
default: {
  const _exhaustive: never = row.kind;
  return _exhaustive;
}
```

- `row.kind` na origem é `string` (vem do schema Drizzle). Linha 65 aplica o guard `if (!isKind(row.kind)) return err(...)`, narrando para `AmendmentKind`.
- Os 4 `case` cobrem todos os discriminantes ⇒ `row.kind` no `default` é `never` ✅.
- Tipo de retorno declarado: `Result<Amendment, AmendmentMapperError>`. `never ⊑ Result<...>` ✅.

---

## 3. Inspeção de regressão

- **Round-trip semântico**: as 4 funções continuam tratando todos os discriminantes pelos `case` existentes. Nenhum `case` foi removido/movido.
- **Comportamento em runtime**: o branch `default` é inalcançável por construção; em runtime executá-lo significaria que TS deixou passar um valor não-discriminante — situação que só é possível se um cast/erosão de tipo aparecer no chamador. Mesmo assim, `return _exhaustive` apenas devolveria `undefined` em vez de jogar exceção — comportamento mais seguro para um adapter, e o `safe()` wrapper do repo continuaria capturando a anomalia se ela vazasse para um `await`.
- **Erros do `Result`**: nenhum `case` foi alterado. Os `err(...)` continuam emitindo as mesmas strings literais (`amendment-mapper-invalid-kind`, etc.).
- **Imports / assinaturas**: inalterados.
- **Format / lint**: prettier e tsc passam. Lint preexistente em `handbook/reference/mysql/.split-refman.mjs` é alheio ao escopo.

---

## 4. Issues encontradas

Nenhuma.

---

## 5. Sugestões para próximos tickets (não bloqueiam)

- `amendment.mapper.ts:99,107,110` ainda usa `as unknown as Amendment`. Justificável (montagem incremental do agregado por discriminante), mas o NIT do audit §202 sugere centralizar esses casts em helper. Fora do escopo deste ticket — anotar para ticket futuro de "type-safety dos mappers".
- `amendmentFromRow` poderia perder o guard `isKind` se a coluna `kind` virasse `varchar` com `CHECK` enum-like (já existem checks no schema), mas isso é otimização de M-tier — fora do escopo.

---

## 6. Veredito

**APPROVED.** Patch atende 100% do DoD do `000-request.md` e do Anti-padrão #7 do `CLAUDE.md`. Avançar para W3.
