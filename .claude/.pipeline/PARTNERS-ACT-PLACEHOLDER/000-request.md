# PARTNERS-ACT-PLACEHOLDER — novo tipo de parceiro ACT (placeholder, espelha Collaborator núcleo)

Size: L. Pedido de produto (decisão genérica; regras reais pendentes). ADR-0036 (provisório).
Significado da sigla ACT: PENDENTE (identificador técnico = `act`).

## Escopo (clone ENXUTO do núcleo do Collaborator — NÃO completo)
- domain/act/ (Entity PF: 7 campos pré-cadastro + status duplo + soft-delete) espelhando collaborator
- application: register/get/list/edit/deactivate/reactivate (sem import, sem complete-27, sem filtros avançados)
- schema par_acts (active+deactivated_at+CHECK, prefixo par_*) + migration
- repos in-memory + drizzle; plugin /api/v1/acts; ACT_PERMISSION {read,write}; wiring composition/server/public-api
- FORA até regras: import, complete-registration de 27 campos, filtros avançados, eventos

## CAs: CRUD via /api/v1/acts (201/200), 401/403 RBAC, soft-delete, CPF inválido→422, status duplo.
