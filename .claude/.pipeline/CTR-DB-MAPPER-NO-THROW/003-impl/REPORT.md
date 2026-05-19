# W1 — Patch GREEN

## Mudanças aplicadas

4 substituições idênticas em 2 arquivos. Diff conceitual:

```diff
   default: {
     const _exhaustive: never = X;
-    throw new Error(`unreachable: ${JSON.stringify(_exhaustive)}`);
+    return _exhaustive;
   }
```

### Arquivos

1. **`src/modules/contracts/adapters/persistence/mappers/period.mapper.ts`**
   - Linha ~21-24 (`periodToColumns`, switch sobre `p.kind`) — `_exhaustive: never = p` → `return _exhaustive`.
   - Linha ~37-40 (`periodFromColumns`, switch sobre `cols.kind`) — `_exhaustive: never = cols.kind` → `return _exhaustive`.
2. **`src/modules/contracts/adapters/persistence/mappers/amendment.mapper.ts`**
   - Linha ~51-54 (`amendmentToInsert`, switch sobre `a.kind`) — `_exhaustive: never = a` → `return _exhaustive`.
   - Linha ~111-114 (`amendmentFromRow`, switch sobre `row.kind` após o narrow por `isKind`) — `_exhaustive: never = row.kind` → `return _exhaustive`.

---

## Por que `return _exhaustive` compila sem cast

`never` é o tipo bottom em TypeScript: assignable a todo outro tipo. Logo:

| Função | Tipo de retorno do switch | `return _exhaustive` válido? |
| :--- | :--- | :-- |
| `periodToColumns` | `PeriodColumns` | ✅ `never` ⊑ `PeriodColumns` |
| `periodFromColumns` | `Result<Period, PeriodMapperError>` | ✅ `never` ⊑ qualquer tipo |
| `amendmentToInsert` | `AmendmentInsert` | ✅ idem |
| `amendmentFromRow` | `Result<Amendment, AmendmentMapperError>` | ✅ idem |

`tsconfig.json` opções relevantes (todas ativas) — nenhuma quebra:

- `strict: true`
- `noFallthroughCasesInSwitch`: `default:` é um case explícito, não há fallthrough.
- `noImplicitReturns`: `return _exhaustive;` cobre o branch.
- `exactOptionalPropertyTypes`: não afeta `never`.

---

## Verificação local

```bash
$ grep -rn "throw new Error" src/modules/contracts/adapters/persistence/mappers/
# (0 hits, exit 1)

$ pnpm run typecheck
# tsc --noEmit exit 0, sem erros.

$ pnpm test
ℹ tests 444 | pass 433 | fail 0 | skipped 11 | duration_ms 38339.29
# Skipped = suítes guardadas por MYSQL_INTEGRATION=1.

$ pnpm run format:check
All matched files use Prettier code style!
```

Comportamento de runtime inalterado — branch `default` segue inalcançável (TS prova `never`).

---

## Critério de saída do GREEN

- [x] 0 ocorrências de `throw new Error` em `src/modules/contracts/adapters/persistence/mappers/`.
- [x] `pnpm run typecheck` verde.
- [x] `pnpm test` verde (433/0/11).
- [x] `pnpm run format:check` verde.
- [x] Cada `default` tem a forma `default: { const _exhaustive: never = X; return _exhaustive; }`.

**Pronto para W2.**
