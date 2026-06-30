# W1 — Implementação mínima · AUTH-ROLE-REPO-CRUD

**Agente:** drizzle-orm-expert · **Outcome:** GREEN ✅

## Mudanças

1. **Port** `role-repository.ts` — `isInUse: (id) => Promise<Result<boolean, RoleRepositoryError>>`.
2. **In-memory** `role-repository.in-memory.ts` — `Set<RoleId>` de uso; `isInUse`; helpers `markInUse`/`clearUsage` no store (teste).
3. **Drizzle** `role-repository.drizzle.ts`:
   - **Bug fix**: `save` UPDATE passa a gravar `status` (`.set({ name, description, status, updatedAt })`) — sem isso `archive` não persistia.
   - `isInUse`: `SELECT roleId FROM auth_user_role WHERE role_id = ? LIMIT 1` (usa `auth_urt_role_idx`), via helper `safe`.

## Reuso (YAGNI)

`update`/`archive`/`listAll` **não** viraram métodos novos: `save` já é upsert (create/update/archive=save com status) e `list` é listAll. Só `isInUse` era genuinamente ausente.

## Cobertura — lacuna declarada (no silent caps)

`isInUse: true` é coberto no **in-memory** (`markInUse`) e o caminho `false` roda real na contract drizzle. O caso **`true` no drizzle** (atribuição real em `auth_user_role`) **não** tem teste dedicado — exigiria inserir um `auth_user` completo (13 colunas + FK), custo alto para uma query trivial já coberta estruturalmente. Registrado como lacuna consciente, não omissão.

## Prova de GREEN

```
in-memory + contract: tests 7 · pass 7 · fail 0
suite completa: 2454 · pass 2436 · fail 0 · skipped 18
integração MySQL (test:integration:auth): 40 · pass 40 · fail 0
  ← CA5 status round-trip no drizzle (prova do bug fix) + CA6 isInUse false real
```
