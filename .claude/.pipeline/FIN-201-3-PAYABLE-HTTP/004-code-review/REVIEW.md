# Code Review — FIN-201-3-PAYABLE-HTTP (#222) — Round 1

**Veredito:** APPROVED · **Reviewer:** code-reviewer · **Data:** 2026-06-23

Path-conflict resolvido (conciliação `/payables` intacta; grid em `/payable-titles`, RBAC distinto). Rota
espelha o grid de documento (Zod query/response + filter→use-case→DTO). Refactor do store compartilhado é
aditivo (4º param opcional; back-compat provada por `pnpm test` fail 0). DTO em centavos-string + data ISO.
Boundary correta (sendDomainError + RBAC no preHandler).

Issues: nenhuma 🔴/🟡. 🔵 sem filtro de emissão (fora do read path; #164); nome do fornecedor não resolvido
aqui (igual ao grid de documento). APPROVED → fecha a feature #201 (read path #221 + borda #222).
