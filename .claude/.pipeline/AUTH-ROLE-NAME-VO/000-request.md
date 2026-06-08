# AUTH-ROLE-NAME-VO

> Spec: `specs/006-gestao-acessos` (Phase 2 Foundational) · Tasks: T004 (RED) + T007 (impl) · Size: S

## Escopo

Novo Value Object `RoleName` em `src/modules/auth/domain/authorization/role-name.ts` — branded `string` com smart constructor `Result`, para dar identidade/normalização ao nome de papel (hoje `Role.name` é `string` cru). Base para o CRUD de papéis (US5/US6) validar nome.

**Fora de escopo:** unicidade (é regra de repositório, não do VO); integração no agregado `Role` (fica em `AUTH-ROLE-LIFECYCLE-AGG`, T008).

## Critérios de aceitação

- **CA1**: `RoleName.create(raw)` retorna `Result<RoleName, 'role-name-invalid'>`.
- **CA2**: Normaliza — `trim` + colapsa espaços internos múltiplos em um único.
- **CA3**: Rejeita vazio/só-espaços → `err('role-name-invalid')`.
- **CA4**: Rejeita comprimento acima do limite (alinhar a `auth_role.name varchar(64)` → máx. 64 após normalização).
- **CA5**: Branded — o tipo `RoleName` não é atribuível a partir de `string` cru sem passar pelo constructor.
- **CA6**: ASCII puro no arquivo (precaução Node 24 strip-types); module-as-namespace (`import * as RoleName`).

## Referências de reuso (T001)

- `shared/primitives/result.ts` (`Result`, `ok`, `err`), `shared/primitives/brand.ts` (`Brand`).
- Espelhar o padrão de `permission.ts` (branded + smart constructor `parse` + regex/normalização).

## Pipeline

- **W0** (T004): `tests/modules/auth/domain/authorization/role-name.test.ts` RED.
- **W1** (T007): `role-name.ts` mínimo até GREEN.
- **W2/W3**: review read-only + gate (`typecheck`+`format:check`+`lint`+`test`).
