# W2 — Code review (read-only)

> Resultado: **APPROVED** · round 1

## Itens verificados

- **ADR-0020 (dialeto MySQL único):** `date` é tipo permitido para data-calendário.
  Nenhuma feature proibida (sem JSON, ENUM, AUTO_INCREMENT) introduzida. ✅
- **ADR-0014 (isolamento por prefixo):** colunas tocadas seguem em `ctr_*`. ✅
- **Coerência domínio↔schema:** `date` reflete o VO `PlainDate` (inquiry 0020) sem
  componente de hora — alinhamento conceitual correto. ✅
- **Mappers:** diff não tocou mappers; contrato `PlainDate ↔ Date` preservado. ✅
- **Migration:** 5 `MODIFY COLUMN` idempotentes em forma, nullability preservada
  por coluna (`NOT NULL` em `*_period_start`, nullable nos demais). ✅
- **Colunas de instante:** `datetime(3)` mantido onde há componente de hora. ✅

## Observação

Sem `import type` afetado; `date` é valor (função), import correto no bloco existente.
Nada a corrigir. Aprovado para W3.
