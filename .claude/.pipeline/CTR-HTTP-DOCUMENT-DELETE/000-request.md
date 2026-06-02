# CTR-HTTP-DOCUMENT-DELETE — rota HTTP de exclusão (lógica) de documento

> **Size:** S · **Origem:** [po-feedback/0001 §B Bucket B #7](../../../handbook/po-feedback/0001-gap-api-v2-contracts.md). Gap de **borda** (use case existe; falta só a rota HTTP).

## Contexto

O relatório da P.O. pede `DELETE /contracts/{id}/documents/{documentId}` **com motivo** (auditoria + UX). O use case de domínio **já existe** — `logicallyDelete(active, reason, by, at)` (`domain/document/document.ts:119-168`, RN-11): exclusão **lógica** (nunca física — princípio #14 do handbook), com `deletedReason` obrigatório (máx 500 chars). Falta apenas expor a rota HTTP (hoje só há caminho CLI).

## Escopo

- Rota `DELETE /contracts/{id}/documents/{documentId}` no plugin HTTP de contracts.
- Body `{ reason: string }` validado por Zod (não-vazio, ≤ 500). `by` = user autenticado (UserRef da sessão).
- Handler chama o use case existente → `Result` → `sendResult` (204 No Content em sucesso; 404 se documento inexistente/já-excluído; 400 reason inválido).

## Critérios de Aceite

- [ ] CA1 — `DELETE` com `reason` válido → documento vira `LogicallyDeleted` (preserva a trilha; **nunca** apaga fisicamente). 204.
- [ ] CA2 — `reason` vazio/>500 → 400 (Zod).
- [ ] CA3 — documento inexistente ou já excluído → 404 (sem efeito).
- [ ] CA4 — `deletedBy` = user da sessão; `deletedAt` = clock; auditoria registrada.
- [ ] CA5 — teste HTTP (`fastify.inject`) cobrindo sucesso + 400 + 404.
- [ ] CA6 — OpenAPI atualizado (ADR-0027).

## Fora de escopo

Exclusão de **contrato** (recusada por imutabilidade — ver po-feedback/0001 §B Bucket D). Preview/download de documento (Bucket B, ticket separado se priorizado).

## Pipeline

W0 RED → W1 (rota + Zod + wiring do use case) → W2 → W3. Skill: `application-cli-builder`/`fastify` + `ports-and-adapters`.
