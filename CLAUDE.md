# CLAUDE.md

> Este arquivo é um **stub**. O contexto canônico deste repo vive em `AGENTS.md`
> (padrão aberto, multi-ferramenta). O Claude Code carrega o conteúdo via import abaixo.

@AGENTS.md

<!-- SPECKIT START -->

Plano corrente: `specs/016-fin-remessa-cnab240/plan.md` (Fatia 3 / #58 do épico Financeiro #64) — **geração de remessa CNAB 240 Bradesco** no módulo `financial`. Operador seleciona documentos `Approved` (forma `TED`/`TransferenciaBancaria`); o sistema **agrupa por conta-cedente** → 1 arquivo CNAB 240/conta (segmentos P/Q/J) via **ACL** (`CnabRemittanceTranslator`), persistido em object-storage (ADR-0019) com hash SHA-256 + **NSA monotônico por conta**; documentos transicionam `Approved→Transmitted`; eventos `RemittanceGenerated`/`DocumentTransmitted` via outbox. **Escopo = só geração** (retorno/extrato/conciliação são sub-fatias seguintes). Decisões travadas (clarify): entrega via storage; seleção por subconjunto; múltiplas contas; NSA por conta. Decisão de modelagem: **D-CEDENTE** = novo `fin_cedente_accounts` + coluna `fin_documents.debit_account_ref` (migration `0004`). **Fatiar em 4 tickets W0→W3** (DOMAIN → CNAB-ACL → PERSIST → USECASE-HTTP). Pendência: citação canônica ACDG (Princípio IX; MCP off nesta sessão).
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan.

<!-- SPECKIT END -->
