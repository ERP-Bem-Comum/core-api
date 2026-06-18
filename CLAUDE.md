# CLAUDE.md

> Este arquivo é um **stub**. O contexto canônico deste repo vive em `AGENTS.md`
> (padrão aberto, multi-ferramenta). O Claude Code carrega o conteúdo via import abaixo.

@AGENTS.md

<!-- SPECKIT START -->

Plano corrente: `specs/017-fin-conciliacao-bancaria/plan.md` (Conciliação Bancária / BC Core ⭐ do épico Financeiro #64) — **submódulo Conciliação completo (US1–US6)** no módulo `financial`. Importa extrato **OFX/CSV** (parser à mão, sem lib — ADR-0011) com anti-duplicidade por **FITID** (nativo no OFX, sintético no CSV); **sugere** match por score determinístico (read-model) sem nunca conciliar sozinho (R1); **concilia** Individual/Múltiplo/Parcial (fechamento 100% — R3); **lançamento manual**/lote; **desfaz** (Unreconcile) preservando histórico (R7); **fecha período** e **exporta** (OFX/CSV). Transiciona títulos `Paid→Reconciled` (e volta) na mesma tx; **publica** eventos cross-módulo no outbox (`PayableReconciled`/`ReconciliationUndone` — **só produtor**, ADR-0015). Borda **HTTP** `/api/v2/financial/...` (Fastify+Zod). Decisões travadas (clarify): BC completo; formatos sem-lib (OFX/CSV); borda HTTP incluída; só produtor. Modelagem: 2 agregados novos (`BankStatement`, `Reconciliation`) + 7 tabelas `fin_*` (migrations `0005+`, serializadas após a `0004` da 016). **Fatiar em 8 tickets W0→W3**. Dependência: 016 (conta-cedente + título `Paid`). Princípio IX: citações de fronteira/consistência ✅ ancoradas (Vernon p. 458/450 — `research.md`; MCP `acdg-skills` ON). (Plano da remessa 016 preservado em `specs/016-fin-remessa-cnab240/plan.md`.)
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan.

<!-- SPECKIT END -->
