# W3 — GREEN — FIN-DOC-INGEST-USECASE

Gate final (skill `ts-quality-checker`). 4 gates no **projeto inteiro** (regressão zero), após W2 APPROVED round 2 (hardening de segurança F1–F6).

## Gates (saída literal)

```
1/4 pnpm run typecheck    → exit 0
2/4 pnpm run format:check → All matched files use Prettier code style!
3/4 pnpm run lint         → 0 errors, 0 warnings
4/4 pnpm test             → tests 3637 · pass 3619 · fail 0 · skipped 18 (integração MySQL gateada)
```

Delta vs base (#1, 3630): **+7 testes** (ingest: mapper + 4 CAs + F1/F2 traversal + F4 órfão).

## Resultado

**Todos os 4 gates verdes.** Use case de ingestão entregue: `ingestDocument` compõe reader + storage + saveDraft por classe de erro; mapper puro; port próprio + adapters (in-memory + S3 aws-sdk direto); save-draft estendido. **Segurança endurecida** (auditada por `security-backend-expert`): validação anti-traversal **antes** do write (F1/F2), `ChecksumSHA256` (F3), compensação do órfão (F4), classificação exaustiva de erro (F6).

Auto-contido (fakes/in-memory) — **não requer MySQL real**. Ticket completo.

## Follow-ups registrados
- **F5** (CNPJ/CPF na `description`): reconfirmar com o dono/DPO (decisão P.O. de supplierRef nulo; nota LGPD).
- **F7/F8**: requisitos de segurança da borda → **ticket #3** (`FIN-DOC-INGEST-HTTP`): `bodyLimit`, magic-bytes vs `declaredMime`, sanitização de `fileName`, `requireAuth`+`authorize(write)`.

Desbloqueia `FIN-DOC-INGEST-HTTP` (#3) — a rota `POST /documents/ingest`.
