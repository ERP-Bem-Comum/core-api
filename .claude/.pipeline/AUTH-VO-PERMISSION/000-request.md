# AUTH-VO-PERMISSION — VO `Permission` do módulo `auth`

## Origem

Série [ADR-0024](../../../handbook/architecture/adr/0024-identity-and-rbac-auth-module.md) (RBAC com
permissions granulares), ticket D2 da Fase D. Backlog: [`.claude/.planning/AUTH-MODULE-TICKETS.md`](../../.planning/AUTH-MODULE-TICKETS.md).
`Permission` é o átomo do RBAC — `Role` (D4) agrega `readonly Permission[]`; o authorization service
checa `Permission` por igualdade.

## Estado atual

- Módulo `auth` existe só com `domain/identity/email.ts` (D1, closed-green).
- Infra reutilizável: `shared/primitives/{result,brand}.ts`. Padrão a espelhar: o próprio `email.ts`.

## Formato canônico

`resource:action` — exatamente dois segmentos separados por `:`. Cada segmento é kebab alfanumérico
(`[a-z0-9]` com hífens internos). Exemplos: `contract:delete`, `contract:mass-approve`, `user:register`.

## Critérios de aceitação

- **CA1 (válido):** `parse('contract:delete')` → `ok(Permission)`; valor preservado. `parse` normaliza
  **trim + lowercase** (`'  Contract:Mass-Approve  '` → `'contract:mass-approve'`).
- **CA2 (vazio):** string vazia ou só espaços → `err('permission-empty')`.
- **CA3 (formato):** sem `:`, `:` no início/fim (segmento vazio), mais de um `:`, ou caractere fora de
  `[a-z0-9-]` → `err('permission-invalid-format')`.
- **CA4 (branded):** `Permission` não atribuível de `string` crua sem o smart constructor. Sem `class`,
  sem `throw`, sem `new Error`.

## Fora de escopo

- `Role` e agregação de permissions (D4).
- Wildcard (`contract:*`) ou hierarquia de permissões — YAGNI; reabrir se requisito surgir.
- Acessores `resource(p)`/`action(p)` — adicionar só quando `Role`/authorize precisarem.

## Notas

- **Skill:** `ts-domain-modeler`. Domínio puro, Padrão D (module-as-namespace), smart constructor `parse`.
- **Idioma:** código EN; erros kebab EN (`'permission-empty'`, `'permission-invalid-format'`).
- **Path:** `src/modules/auth/domain/authorization/permission.ts` (nova subpasta `authorization/` para RBAC;
  `identity/` fica para `User`/`Email`).
- **Pipeline W0→W3:** W0 RED em `tests/modules/auth/domain/authorization/permission.test.ts` (`node:test`).
- Precedência: trim+lowercase → `permission-empty` → `permission-invalid-format`. ASCII puro.
