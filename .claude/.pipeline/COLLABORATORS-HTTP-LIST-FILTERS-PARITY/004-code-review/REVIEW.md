# W2 — REVIEW — COLLABORATORS-HTTP-LIST-FILTERS-PARITY (P1c)

> Skill: `code-reviewer` (audit read-only). **Round 1 — APPROVED.**

## Veredito: ✅ APPROVED

## Conformidade

| Regra | Status | Evidência |
| :--- | :--- | :--- |
| Filtro puro na application (sem clock) | ✅ | `collaboratorMatchesFilter` permanece puro; `age` (que exigiria `now`) foi adiado por decisão do dono. |
| Semântica nullable correta | ✅ | `matchesInNullable`: `null` não casa filtro presente; `disableReasons` lê `disableBy` só em Inactive. |
| Zod na borda; valores validados | ✅ | `collaboratorListQuerySchema` com `z.enum` por filtro → 400 em valor inválido; arrays via `preprocess`. |
| Mapeamento legado | ✅ | `queryToFilter`: `breeds`→`races`, `disableBy`→`disableReasons`. |
| Sem regra de negócio na borda; reuso | ✅ | borda só mapeia query→filter; lógica no predicado da application. |
| AND/OR/vazio = não restringe | ✅ | mantém a convenção dos filtros existentes. |

## Observações

- Filtro/paginação seguem em memória na borda (varredura) — débito já registrado (P1b); migrar para WHERE no repo quando crescer.
- `age` adiado: follow-up se a P.O. confirmar uso (precisa de data de referência + semântica exata/idade vs faixa).

## Gate (audit log)

```
$ pnpm run lint      → eslint .   (zero)
$ pnpm run typecheck → tsc --noEmit (zero)
```

## Próximo passo

W3 (QUALITY) — gate final encadeado.
