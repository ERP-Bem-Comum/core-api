# W3 — REPORT (NOTIF-EMAIL-RATE-LIMIT, #133)

## Gate
- `typecheck` ✅ · `format:check` ✅ · `lint` ✅
- `test` ✅ **3510 pass / 0 fail** · 18 skipped · 3528 total.

## CAs (todos verdes)
CA1 excede · CA2 independência · CA2b case-insensitive · CA3 janela expira · CA4 delega · CA5 delivery
descarta (não retry/DLQ) · CA6 anti-enumeração (auditada, íntegra) · CA7 gate verde.

## Hardening de segurança (W2 — auditoria)
Além dos CAs, os achados da auditoria foram corrigidos e testados: **B1** Map bounded (maxKeys + evição),
**M2** cc/bcc contados, **m1** dedup, **M3** fail-loud (boot falha com config inválida), **M4** log do
descarte, **M1** normalização documentada. Ver `004-code-review/REVIEW.md`.

## Follow-ups (registrados, não silenciados — ADR-0040)
- **M4**: métrica agregada `WorkerStats` (delivered vs suppressed) no worker genérico de outbox.
- **i2**: sanitização do `reason` interpolado em `deliveryUnavailable` (afeta smtp-rejected/bounce, não o rate-limit).
- **Ativação em prod**: definir `EMAIL_RATE_LIMIT_MAX`/`_WINDOW_MS` no deploy (ausente = desligado). Ops.
