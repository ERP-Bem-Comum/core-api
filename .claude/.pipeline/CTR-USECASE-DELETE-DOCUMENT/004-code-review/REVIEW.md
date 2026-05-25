# Code Review - CTR-USECASE-DELETE-DOCUMENT - Round 1

**Veredito:** APPROVED

## Issues

Nenhuma critica/importante.

## O que esta bom

1. **Switch sobre status no use case** — discriminacao compile-time de Active/LogicallyDeleted/Superseded. Cada estado emite erro especifico (`already-deleted`, `already-superseded`).
2. **Mapper round-trip robusto** — discriminate por status no from/to. Active limpa campos delete_*; LogicallyDeleted preenche os 3.
3. **State validator estendido** — REGR-#1 honrado: state file nao pode injetar `LogicallyDeleted` sem os 3 campos audit.
4. **DATE_KEYS reviver** — `deletedAt` adicionado para round-trip Date↔ISO.
5. **Schema CHECK consistencia** — DB rejeita estado inconsistente (status='LogicallyDeleted' sem campos).
6. **Migration hardening utf8mb4_bin** em deleted_by — consistente com outros UUID columns.
7. **CLI command pragmatico** — `--documento --motivo --user-id?` minimo necessario.
8. **Public-api expoe use case** — consumers futuros injetam `deleteDocument(deps)` direto.

## CAs

9/9 plenos.

## Proximo passo

APPROVED -> W3.
