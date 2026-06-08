# W2 — Code Review (read-only) · AUTH-ROLE-REPO-CRUD

**Agente:** code-reviewer · **Veredito:** APPROVED ✅ (round 1)

## Checklist

| Critério | Status |
| --- | --- |
| Adapter converte erro → `Result` na borda (`safe`) | ✅ `isInUse` via `safe` |
| ADR-0020 — sem ODKU/ENUM; SELECT simples + índice | ✅ `isInUse` usa `auth_urt_role_idx`, `LIMIT 1` |
| Bug fix `status` no UPDATE | ✅ archive agora persiste (provado na integração CA5) |
| Port simétrico in-memory + drizzle | ✅ ambos implementam `isInUse` |
| YAGNI — sem métodos redundantes | ✅ `update`/`archive`/`listAll` reusam `save`/`list` |
| Helpers de teste fora do `RoleRepository` | ✅ `markInUse`/`clearUsage` no store, não no port |
| Cobertura honesta | ✅ lacuna `isInUse:true` no drizzle declarada no REPORT |

## Observações

- O bug do UPDATE (status não persistido) era latente e só apareceria no archive (US7). Pego cedo pela contract suite CA5 estendida — bom retorno do investimento em suíte compartilhada.
- `isInUse` com `LIMIT 1` é a forma correta (existência, não contagem) — barato e indexado.
- `id as unknown as string` na query: cast de borda branded→raw, consistente com o resto do adapter.

Sem issues. Aprovado para W3.
