# ADR-0004 (feature 010): Remoção das permissões RBAC inertes (emenda ao ADR-0004/009)

**Status**: Proposed

**Data**: 2026-06-15

**Feature**: `specs/010-fin-listagem-timeline/`

**Decisores**: Gabriel (P.O./arquiteto) + agente Financeiro

## Contexto

O ADR-0004/009 declarou o catálogo RBAC do Financeiro (`fiscal-document:*`, `payable:*`). Na implementação da fatia 1,
`payable:read` e `payable:undo-approval` foram adicionadas ao catálogo do auth + `FINANCIAL_PERMISSION`, mas **nenhuma
rota as enforça**: a leitura usa `fiscal-document:read` e o undo-approval usa `payable:approve` (conforme o contrato). A W2
(security F.../code-review Issue 2) marcou as permissões inertes. O `/speckit-clarify` (FR-010) decidiu **remover**.

## Decisão

Remover `payable:read` e `payable:undo-approval` do catálogo deploy-time do auth e de `FINANCIAL_PERMISSION`. O
desfazer-aprovação permanece sob `payable:approve` (quem aprova, desfaz — decisão de produto da fatia 1). O catálogo passa
a conter **apenas permissões efetivamente enforçadas por rota**. Emenda o ADR-0004/009 (não cria novo princípio).

## Citação canônica _(princípio IX)_

Princípio do **menor privilégio** (least privilege): conceder apenas as permissões efetivamente exercidas, evitando
direitos latentes. Ancorado na skill de segurança do projeto [`web-security-backend`](../../../.claude/skills/web-security-backend/SKILL.md)
e no achado da W2 ([`004-code-review/SECURITY-REVIEW.md`](../../009-fin-documentos-titulos/) da fatia 1). Sem citação de
livro do fallback DDD (tema de segurança, fora do escopo Evans/Vernon) — referência normativa interna.

## Alternativas consideradas

- **Wire `payable:undo-approval` na rota undo** (separar de `payable:approve`) — rejeitada no clarify: adiciona um perfil
  de permissão sem demanda de negócio; pode ser reintroduzida numa fatia futura se houver requisito de segregação.
- **Manter as permissões "para uso futuro"** — rejeitada: viola menor privilégio; permissão inerte confunde auditoria de RBAC.

## Consequências

- **Positivas**: catálogo RBAC sem permissões mortas; menor superfície; auditoria de acesso mais clara.
- **Negativas / trade-offs**: se no futuro quisermos segregar undo de approve, será preciso reintroduzir a permissão +
  ajustar o contrato.
- **Impacto**: edita `auth/domain/authorization/permission-catalog.ts` (+ teste do catálogo) e
  `financial/public-api/permissions.ts`. Sem impacto em dados (RBAC é deploy-time). Verificar que nenhum role/seed
  referencia as permissões removidas.
