# W1 — Implementação GREEN · AUTH-VO-PERMISSION

- **Wave:** W1 (GREEN) · **Skill:** `ts-domain-modeler` · **Data:** 2026-05-27 · **Outcome:** GREEN (10/10 · typecheck limpo)

## Arquivo criado

`src/modules/auth/domain/authorization/permission.ts` (nova subpasta `authorization/` para RBAC).

```ts
export type Permission = Brand<string, 'Permission'>;
export type PermissionError = 'permission-empty' | 'permission-invalid-format';
export const parse = (raw: string): Result<Permission, PermissionError> => { ... };
```

## Aderência à SKILL `ts-domain-modeler`

- **Primitivo-brand** (§3.B.2), **Padrão D** (§3.B.3), **smart constructor `parse`** com cast único auditado (§3.B.4).
- Imports relativos intra-`src/` + `import type { Brand }`.
- **YAGNI** — só `parse`. Sem acessores `resource`/`action` (entram quando `Role`/authorize precisarem).

## Decisões aplicadas

- Formato `resource:action` via regex composta de `SEGMENT = [a-z0-9]+(?:-[a-z0-9]+)*` → `^SEGMENT:SEGMENT$`. Garante exatamente um `:`, segmentos não-vazios, kebab alfanumérico.
- Normalização trim + toLowerCase. Precedência: empty → invalid-format.

## Testes

```
ℹ tests 10
ℹ pass 10
ℹ fail 0
```

`pnpm run typecheck`: sem erros.

## Checklist auto-revisão

- [x] Zero `throw`/`class`/`this`/`any`. Cast único no smart constructor.
- [x] Return type explícito; `import type`; `.ts` nos imports; ASCII puro.
- [x] Identificadores EN; erros kebab EN. Isolamento de módulo (sem import cross-módulo).

## Próxima wave

W2 (code review read-only).
