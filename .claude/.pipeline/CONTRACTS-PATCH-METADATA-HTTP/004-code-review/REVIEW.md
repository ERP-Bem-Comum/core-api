# Code Review — Ticket CONTRACTS-PATCH-METADATA-HTTP — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer
**Data:** 2026-06-06T23:40Z
**Escopo revisado:**

- `src/modules/contracts/application/use-cases/update-contract-metadata.ts` (NOVO)
- `src/modules/contracts/adapters/http/{schemas,composition,plugin}.ts`
- testes (`update-contract-metadata.test.ts`, `patch-contract-metadata.routes.test.ts`)

---

## Issues encontradas

Nenhuma 🔴 / 🟡.

### 🔵 Sugestão

- O cast `req.body as ContractMetadataPatch` é runtime-safe (Zod omite chaves ausentes; `null` é intencional p/ campos nullable) e está comentado. Aceitável na borda. Sem ação.

## Verificações-chave

- **Use-case** — factory `(deps) => (cmd) => Promise<Result>`; `Deps` Readonly; sequência load→domínio(`updateContract`)→save; sem regra de negócio na borda; `contract-not-found` para inexistente (RBAC puro, sem tenant — coerente com a decisão da feature). ✓
- **Imutabilidade (#14)** — DELETE recusado com **405** `contract-delete-forbidden`, `requireAuth` antes da política (não vaza rota). Campos imutáveis inalcançáveis pelo PATCH (não estão no schema → `.strict()` → 400). ✓
- **Status (decisão /analyze)** — campo imutável/chave extra → **400** (Zod `.strict()`), não 422; `{}` → 400 (`.refine`); `title`/`objective` vazio → 400 (`min(1)`). ✓
- **Zod 4** — `z.email()` (não o depreciado `.string().email()`); nullable nos metadados (null limpa o campo). ✓
- **Resposta** — detalhe recomposto (getContractDetail + getContractorBlock) reflete metadados + contratado pós-patch; headers `Deprecation`/`Sunset` (rota de leitura composta, ADR-0032). Consistente com o GET. ✓
- **RBAC** — `authorize(contract:write)` no PATCH e no DELETE; 401 sem sessão, 403 sem permissão (testado). ✓
- **Prova de verde** — use-case 4/4, rota 9/9, default 2256/0, lint/typecheck/format limpos, integração 88/0.

## O que está bom

- Cobertura negativa completa (imutável, vazio, title vazio, inexistente, 401, 403, DELETE 405, DELETE 401) — trava a US-002 da spec.
- Reuso do helper de domínio `updateContract` (sem duplicar lógica de mutação); resposta reaproveita a composição do detalhe.

## Próximo passo

- **APPROVED:** segue para W3.
