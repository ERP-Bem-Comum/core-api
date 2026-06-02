# CTR-PERMISSION-CATALOG — Catálogo type-safe de permissions do módulo contracts

> **Size:** XS · **ADR:** ADR-0006 (public-api por módulo), ADR-0024 (RBAC). · **Cadeia:** 2º pré-requisito (P3) de [`PARTNERS-ETL-BOOTSTRAP`](../PARTNERS-ETL-BOOTSTRAP/000-request.md).

## Contexto

O RBAC do `auth` modela `Permission` como branded string livre (`resource:action`), validada só por formato — **sem catálogo**. As permissions concretas de contratos (`contract:read`, `contract:write`) vivem como **magic strings inline** no `plugin.ts` e nos seeds. A ETL precisa conceder `contract:mass-approve` (migração da flag legada `users.massApprovalPermission`) e um typo na concessão falha **silenciosamente** (fail-closed) — risco real num ERP financeiro.

Decisão (pós-consulta a `security-backend-expert` + `typescript-language-expert` + 3 especialistas externos): **catálogo type-safe por módulo** em `contracts` — não constante solta (inconsistente), não catálogo central em auth (acoplamento/drift com o banco). Forma: `const` object + union literal derivada. Branded `Permission` da borda permanece intacto.

## Escopo

1. Criar `src/modules/contracts/public-api/permissions.ts`:
   ```ts
   export const CONTRACT_PERMISSION = {
     read: 'contract:read',
     write: 'contract:write',
     massApprove: 'contract:mass-approve',
   } as const;
   export type ContractPermission =
     (typeof CONTRACT_PERMISSION)[keyof typeof CONTRACT_PERMISSION];
   ```
2. Re-exportar de `src/modules/contracts/public-api/index.ts` (ADR-0006 — a ETL e outros módulos importam APENAS daqui).
3. Refatorar `src/modules/contracts/adapters/http/plugin.ts`: substituir as ~12 ocorrências inline `authorize('contract:read'|'contract:write')` por `CONTRACT_PERMISSION.read|write`.

## Fora de escopo

- Mudança no domínio do `auth` (nenhuma necessária — string livre já suporta).
- Allowlist/validação de catálogo na borda (`parse` continua aceitando qualquer `resource:action` — seeds forward-compatible). YAGNI.
- A concessão de `contract:mass-approve` aos users migrados (é trabalho do `PARTNERS-ETL-BOOTSTRAP`).
- Catálogo de permissions de outros módulos (financial etc.).

## Critérios de aceite

- [ ] `CONTRACT_PERMISSION` expõe `read`/`write`/`massApprove` com os valores corretos.
- [ ] `ContractPermission` é a union literal derivada (compile-time: typo vira erro de `tsc`).
- [ ] Re-exportado pela `public-api/index.ts`.
- [ ] `plugin.ts` sem magic string de permission (usa as constantes); rotas continuam protegidas.
- [ ] W3 verde: typecheck + lint + format + testes (incl. suites de rotas de contracts sem regressão).

## Notas de disciplina

- O `const` object dá acesso nomeado (autocomplete nos call-sites) + `Object.values()` se precisar do array. SSoT única.
- `authorize: (permissionName: string)` aceita `string` → `ContractPermission` (subtipo) encaixa sem cast.
