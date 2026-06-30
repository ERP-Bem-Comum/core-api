# Validação cruzada (W2) — AUTH-DB-REPO-ROLE — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer (Claude) · **Data:** 2026-05-27
**Escopo:** `role-repository.drizzle.ts`, `role.mapper.ts`.

> Comportamento real (CA5/CA6 contra MySQL) é o W3.

## Conformidade verificada
| Item | Resultado |
| :-- | :-- |
| `save` 3 fases (SELECT-FOR-UPDATE upsert `auth_role` → `resolvePermissionId` serial → replace `auth_role_permission` skip-vazio) | ✅ blueprint §save |
| `resolvePermissionId`: SELECT por name → INSERT → `ER_DUP_ENTRY` (`auth_permission_name_idx`) → **re-SELECT** (ignore-then-reselect) | ✅ idempotente; correto p/ InnoDB (dup-entry não aborta a tx, só o statement) |
| `isPermissionNameDupEntry`: errno 1062 + idx + checa `e.cause` | ✅ espelha P1 |
| `findById` 2 queries; `list` 2 queries + agrupamento `Map` (sem N+1) | ✅ blueprint §findById/§list |
| Mapper `roleFromRows` → `Result`; `description` ignorado; tagged errors; `roleToInsert` description null | ✅ |
| Erros: name dup / FK / I/O / mapper → `role-repo-unavailable` (Decisão 2 YAGNI) | ✅ |
| ADR-0020 (sem ON DUPLICATE KEY) · ADR-0014 (só `auth_*`) · zero throw vazando | ✅ |

## O que está bom
- `resolvePermissionId` resolve a reconciliação valor→entidade com **idempotência total** sob corrida — o
  re-SELECT pós-dup-entry é a escolha certa (a permission é imutável; qualquer id é correto).
- Loop **serial** sobre permissions (não `Promise.all`) evita deadlock no `auth_permission_name_idx` (blueprint §2).
- `list` agrupa via `Map<roleId, perms>` — sem N+1, padrão P1.

## Issues
Nenhuma 🔴/🟡. 🔵: mesma observação do P1 (casts `branded as unknown as string` na borda — padrão de adapter, aceitável).

## Próximo passo
- **APPROVED** → W3 (`ts-quality-checker` + `test:integration`: CA5/CA6 contra MySQL real).
