# PARTNERS-DISABLE-REASON-LEGACY-MARKER — `LEGACY_MIGRATION` no enum DisableReason

> **Size:** XS · **ADR:** ADR-0031 §D2 · Pré-requisito de domínio do collaborator mapper ([`PARTNERS-ETL-CORE`](../PARTNERS-ETL-CORE/000-request.md)). Decisão tomada pelo **especialista de domínio** (skill `ts-domain-modeler`) — ver consulta na sessão.

## Contexto

A ETL migra colaboradores inativos (`active=0`). `Collaborator.rehydrate` exige `disableBy: DisableReason` não-null para o estado `Inactive`. O legado tem `disableBy` nullable — inativos sem motivo precisam de um valor de backfill (D10). O marcador `'legacy-migration'` da D10 não é um `DisableReason` válido (enum estrito de 4 valores).

**Decisão do especialista de domínio:** adicionar `'LEGACY_MIGRATION'` ao union como **marcador de proveniência de ETL** (distinto dos 4 motivos de RH). Honra D8/D10 sem fabricar motivo de negócio (≠ C), sem perder registros (≠ B), sem afrouxar a invariante `InactiveCollaborator.disableBy` não-null (≠ D). Naming UPPER_SNAKE/EN por coerência com o enum.

## Escopo

1. `src/modules/partners/domain/collaborator/disable-reason.ts`:
   - `+ '| LEGACY_MIGRATION'` no type `DisableReason` + no `Set` `VALUES`.
   - Comentário explicitando: marcador de proveniência de ETL, **não** motivo de negócio.

## Fora de escopo

- O mapper ETL (consome o valor — fica em `PARTNERS-ETL-CORE`).
- Helper `isBusinessReason` (YAGNI até a 1ª tela de estatística de desligamento).
- Rótulo PT-BR no formatter (vem se/quando houver UI).

## Critérios de aceite

- [ ] `DisableReason.parse('LEGACY_MIGRATION')` → `ok`.
- [ ] Os 4 motivos de negócio continuam válidos; valor desconhecido → `err`.
- [ ] W3 verde; sem regressão no collaborator.
