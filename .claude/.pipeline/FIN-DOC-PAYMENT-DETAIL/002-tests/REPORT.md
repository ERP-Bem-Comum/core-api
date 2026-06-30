# W0 — Testes RED · FIN-DOC-PAYMENT-DETAIL

**Outcome**: RED ✅ · **Agente**: tdd-strategist · **Feature**: 027 · **Issue**: #273

## Arquivos de teste criados

1. `tests/modules/financial/domain/document-create-payment-detail.test.ts` — domínio (CA1/CA2): `Document.create` aceita e preserva `paymentDetail`; ausência → `null`.
2. `tests/modules/financial/adapters/persistence/document-repository-payment-detail.test.ts` — integração Drizzle-MySQL, **gated por `MYSQL_INTEGRATION`** (CA1/CA4): round-trip insert→select; linha legada (coluna nullable) lê `null`.
3. `tests/modules/financial/adapters/http/document-payment-detail.routes.test.ts` — borda `fastify.inject` (CA1/CA2/CA3/CA5): create + detalhe + rejeições 400 + ausência na listagem. (PATCH/CA6 fica na fase US2.)

## Prova do RED (validada pelo orquestrador, não só pelo subagent)

`pnpm test` → **3241 tests · 3213 pass · 10 fail · 18 skipped** (exit 1).

As **10 falhas são exatamente os testes novos**, pelo motivo-raiz uniforme (`paymentDetail`/`payment_detail` ainda não existe em domínio/Zod/DTO/persistência):

- **Domínio** (2): `document.paymentDetail` → `actual: undefined`, esperado valor / `null`.
- **HTTP CA1/CA2** (2): create 201 OK, mas `GET /documents/:id` não ecoa `paymentDetail` (`undefined`) — `documentResponseSchema`/DTO ainda sem o campo.
- **HTTP CA3** (6: vazio, só-espaços, `\n`, `\r`, `\x00`, >255): `actual: 201`, esperado `400` — `createDocumentBodySchema` (`z.object`) hoje faz *strip* da chave desconhecida em vez de validar.

Verificação independente: `grep '^  ✖' | grep -v paymentDetail` → **vazio** (nenhuma falha alheia). CA5 (listagem) já passa — guard de invariante, verde de W0 a W1. Teste de integração não registrado no `pnpm test` puro (opt-in): `[financial:payment-detail] MYSQL_INTEGRATION não definido — pulando`.

Adicionalmente o `tsc` fica vermelho (excess-property em `Document.create({ ..., paymentDetail })`) — RED de W3 esperado em W0, a fechar em W1. `src/` intocado.

## Conclusão

RED estabelecido e validado; baseline para o W1 = 3213 pass / 10 fail-alvo. Nenhuma regressão introduzida.
