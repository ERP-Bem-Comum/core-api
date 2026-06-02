# W2 — REVIEW — PARTNERS-ETL-CORE

**Round:** 1 · **Veredito: APPROVED**

- Mappers puros, zero infra/IO; reusam smart constructors do domínio (zero regra nova). ✅
- `combine` acumula todos os erros da linha (D-combine); `QuarantineReason` exhaustive sem throw. ✅
- D10/D12/D13 aplicadas; `users.password` jamais lido (ausente em `LegacyUserRow`). ✅
- Fixtures sintéticos (sem PII). ✅
- `#scripts/*` ADR-0006-neutro (script de tooling, não módulo). ✅
- 🔵 Decode + `collaboratorRef`/`userRef` deferidos ao WRITER/READER — escopo correto.

APPROVED.
