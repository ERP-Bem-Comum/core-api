# W2 — REVIEW — PARTNERS-DISABLE-REASON-LEGACY-MARKER

**Round:** 1 · **Veredito: APPROVED**

- Domínio puro: union + Set, smart constructor inalterado (`parse` já cobre via `VALUES.has`). ✅
- `LEGACY_MIGRATION` (16 chars) cabe em `disable_by varchar(40)`; sem CHECK de enum no banco. ✅
- Comentário distingue proveniência de motivo de negócio (decisão do especialista de domínio). ✅
- Risco residual (consumidor de estatística deve excluir o marcador) registrado; helper `isBusinessReason` YAGNI.

APPROVED.
