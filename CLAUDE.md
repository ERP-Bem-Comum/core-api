# CLAUDE.md

> Este arquivo é um **stub**. O contexto canônico deste repo vive em `AGENTS.md`
> (padrão aberto, multi-ferramenta). O Claude Code carrega o conteúdo via import abaixo.

@AGENTS.md

<!-- SPECKIT START -->

Plano corrente: `specs/027-fin-document-payment-detail/plan.md` (complemento da forma de pagamento — `paymentDetail` — no lançamento de documento, módulo `financial`; sub-issue da #89). Adiciona atributo primitivo `paymentDetail: string | null` ao agregado `Document` (linha digitável/código de barras de boleto, id de cartão, ref. de câmbio) que o front captura e o `create` HOJE descarta. **Validado por 5 canais antes da spec** (agentes drizzle/zod/security + MCP DDD-Vernon-p.292 + MCP OWASP), 0 bloqueante. Borda `z.string().trim().min(1).max(255).regex(/^[^\x00-\x1F\x7F]*$/).optional()` (sem sanitizar conteúdo; XSS = output-encoding do front). Persistência `payment_detail varchar(255) NULL` + migration **0026** (`ALTER ADD`, INSTANT MySQL 8.4, row-version 8/64; sem index/CHECK/COLLATE). Detail-only (não na listagem; BE-030). Cadeia de 7 camadas (types→SaveDocumentCommand→Document.create→schemas→plugin bridge `?? null`→documentResponseSchema→dto/mapper). Segue precedente `issueDate`#163/`accessKey`#115/`competencia`#197. Clarify resolvido: campo **editável via PATCH em escopo** (US2; `.nullable().optional()` + auditoria). Tamanho **S**, ticket `FIN-DOC-PAYMENT-DETAIL`. Próximo: `/speckit-tasks`.
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan.

<!-- SPECKIT END -->
