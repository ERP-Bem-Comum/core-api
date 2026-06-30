# FIN-CANCEL-OPTIMISTIC-LOCK — request

> Ticket da feature `011-financial-hardening` (US2, P2). Origem: GitHub issue **#55** (débito, concorrência).

## Problema

`cancelDocument` (`application/use-cases/cancel-document.ts:35`) faz `findById` → `cancel` → `repo.delete(id)` SEM `expectedVersion`, abrindo TOCTOU entre o `findById` e o `delete`. `adjust`/`approve`/`undo` já exigem `expectedVersion` (FR-009). `cancel` é a única mutação fora do optimistic lock.

## Escopo

- `cancelDocument` passa a EXIGIR `expectedVersion`. Versão corrente ≠ expectedVersion → 409 `document-version-conflict`, NÃO apaga.
- `delete` do port/adapters passa a receber `expectedVersion`; Drizzle faz `DELETE ... WHERE id=? AND version=?` dentro de `db.transaction` com SELECT FOR UPDATE (espelha o `save`).
- Borda: `DELETE /documents/:id` ganha body `{ version }` (mudança de contrato intencional, coordenada com web-app v2).

## Critérios de aceite (testáveis)

- **CA1**: DELETE com `version` corrente → 204, documento removido.
- **CA2**: outra tx incrementou a versão → DELETE com version defasada → 409 `conflict`, documento permanece.
- **CA3**: DELETE sem `version` no body → 400 (validação).
- **CA4**: simetria com adjust/approve/undo (mesmo padrão de tx + SELECT FOR UPDATE).

## Definition of Done

- W0 RED → W1 GREEN; W2 (drizzle-orm-expert) com citação canônica (lost-update/concorrência, §IX); W3 verde + `test:integration:financial`.

## Size

**M** — port + drizzle + in-memory + use case + http schema/handler; testes existentes de DELETE (CA7/CA8) ajustados ao novo contrato.
