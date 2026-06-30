# FIN-DOC-PAYMENT-DETAIL — escopo + CAs

> Ticket de pipeline da feature `027-fin-document-payment-detail`. Issue: **#273** (sub-issue da #89). Size **S**.

## Escopo

Adicionar o atributo opcional `paymentDetail` (complemento da forma de pagamento — linha digitável/código de barras de boleto, id de cartão corporativo, referência de câmbio) ao agregado `Document` (Contas a Pagar, módulo `financial`). Hoje o front captura e o `create` descarta. Atributo primitivo `string | null` propagado pela cadeia existente (domínio → application → persistência → borda HTTP), espelhando `issueDate` #163 / `accessKey` #115 / `competencia` #197.

**Pré-validado por 5 canais** (agentes drizzle/zod/security + MCP DDD-Vernon-p.292 + MCP OWASP) — ver `specs/027-fin-document-payment-detail/research.md`. 0 bloqueante.

## Fora de escopo

- Validação de formato do boleto/linha digitável (campo opaco).
- Sanitização de conteúdo no backend (XSS = output-encoding do front — handoff #89).
- Exposição na listagem (`documentSummarySchema` intocado).
- VO/branded type (Vernon p.292: atributo simples).

## Critérios de aceite

- **CA1** — `POST /documents` com `paymentDetail` válido → persiste; `GET /documents/:id` retorna idêntico.
- **CA2** — `create` sem `paymentDetail` → documento criado com `paymentDetail: null` (back-compat).
- **CA3** — `paymentDetail` vazio / só-espaços / com caracteres de controle (`\n`/`\r`/`\x00`) / `>255` → **400**, sem persistir.
- **CA4** — documentos pré-existentes (coluna nova nullable) → legíveis com `paymentDetail: null`, sem erro de mapper.
- **CA5** — `GET /documents` (listagem) → **não** contém `paymentDetail`.
- **CA6** — `PATCH /documents/:id` com novo valor ou `null` → atualiza/apaga; timeline registra before/after (200); inválido → 400.

## Plano de testes W0 (RED)

- Domínio: `Document.create` com/sem `paymentDetail`; ausência → `null`.
- Persistência (integração Drizzle-MySQL, Docker): round-trip insert→select; linha legada lê `null`.
- Borda (`fastify.inject`): create (CA1/CA3) + detalhe (CA1/CA2/CA4) + listagem (CA5) + patch (CA6).

## Definition of Done (W3)

`pnpm run typecheck` + `format:check` + `lint` + `test` + `test:integration` verdes; contagem ≥ baseline; migration `0026` versionada.
