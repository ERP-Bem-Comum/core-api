# W3 — GREEN — FIN-DOC-INGEST-HTTP

Gate final (skill `ts-quality-checker`). 4 gates no **projeto inteiro** (regressão zero), após W2 APPROVED round 2 (hardening de borda M1/M2/m1/m2).

## Gates (saída literal)

```
1/4 pnpm run typecheck    → exit 0
2/4 pnpm run format:check → All matched files use Prettier code style!
3/4 pnpm run lint         → 0 errors, 0 warnings
4/4 pnpm test             → tests 3644 · pass 3626 · fail 0 · skipped 18 (integração MySQL gateada)
```

Delta vs #2 (3637): **+7 testes** (ingest e2e: CA1–CA4 + CA7 413 + M2 XML-sniff + m1 fileName).

## Resultado

**Todos os 4 gates verdes.** Rota `POST /api/v2/financial/documents/ingest` entregue: upload seguro (parser isolado em sub-scope + `bodyLimit` 20 MiB, magic-bytes PDF **e** XML-sniff, mime allowlist, `sanitizeFilename`) + `authorize(fiscal-document:write)` + error-mapping (413/400/503 sem vazar interno). Segurança de borda auditada e endurecida (M1 parser-leak, M2 upload arbitrário, m1 traversal, m2 buffer).

Auto-contido (`fastify.inject`) — não requer MySQL real. Ticket completo.

## 🏁 Fatia 2 (ingest completo, feature 034) — COMPLETA

| Ticket | Size | Entrega |
| :-- | :-: | :-- |
| #1 FIN-DOC-SOURCE-FILE-REF | M | `Document.sourceFileRef` + migrations (falta só CA4 MySQL real) |
| #2 FIN-DOC-INGEST-USECASE | L | `ingestDocument` (reader+storage+rascunho) + hardening (traversal/órfão) |
| #3 FIN-DOC-INGEST-HTTP | M | `POST /documents/ingest` seguro |

## Follow-ups
- **contracts M1:** o parser octet-stream de `contracts/http/plugin.ts` tem o mesmo gap de scope → issue.
- **#1 CA4:** validar migrations no MySQL real (sob autorização).
- **F5 (#2):** reconfirmar CNPJ/CPF na `description` com o DPO.
