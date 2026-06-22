# Revisão do épico Lançar Documento/criação (PR #199, diff dev..HEAD)

Revisão independente (read-only) em 2 lentes sobre os 6 commits do épico. **Veredito: aprovado** — sem Blocker, sem bug de correção Major.

## Lente 1 — correção/arquitetura (general-purpose)
APROVADO. Regras de camada (domínio puro, ports `type`, mappers `Result`), ADR-0006/0014/0020 conformes; migrations 0014-0017 estritamente aditivas/back-compat; paridade in-memory↔drizzle correta; legacy `NULL` tratado (payeeKind→'supplier'); zero regressão de contrato (campos só aditivos; lista de documentos usa schema separado). Saldo do `listCedenteAccountsWithBalance` correto.
- Achados: Minor (join de approvers sem teste de integração MySQL — coberto-por-design + e2e in-memory; mesma lacuna do `list`); parentId sem guarda de ciclo (inócuo — seed vazio); nit (comentário em categoriesToDto).

## Lente 2 — segurança backend (security-backend-expert)
Sem injeção SQL (Drizzle paramétrico); RBAC fail-closed; sem IDOR/secrets. Achados: LIMIT ausente no join; minimização de `email` em /approvers (ressalva: NÃO é exposição nova — `GET /users` já retorna email ao mesmo gate `user:list`); `parentId` como `z.string()`; `payable:approve` hardcoded.

## Ajustes aplicados pós-revisão (commit de hardening; aprovados pelo Gabriel)
1. `.limit(500)` em `user-query.drizzle.ts#listByPermission` (teto defensivo do dropdown).
2. `categoryResponseSchema.parentId` → `z.uuid().nullable()` (era `z.string()`).
3. `/approvers` projeção/schema → `{ id, name }` (remove `email`; minimização OWASP API3). Teste ajustado (filtragem por contagem 2-de-4 + ausência de email).
4. Nit: comentário de `categoriesToDto` atualizado.

Não aplicados (opcionais/postura existente): constante compartilhada p/ `payable:approve`; CHECK de UUID nas refs cross-BC (postura já estabelecida); teste de integração MySQL do join (follow-up pequeno).

Gates pós-hardening: typecheck/lint/format verdes; `pnpm test` 3060 pass / 0 fail / 18 skip.

**MERGE NÃO REALIZADO** — aguardando o Gabriel concluir a reestruturação de arquitetura e disparar o merge na dev.
