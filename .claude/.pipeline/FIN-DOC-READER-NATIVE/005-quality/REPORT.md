# W3 — GREEN — FIN-DOC-READER-NATIVE

Gate final (skill `ts-quality-checker`). 4 gates no **projeto inteiro** (regressão zero), após W2 APPROVED round 2 (com hardening de segurança F1–F5 aplicado).

## Gates (saída literal)

```
1/4 pnpm run typecheck    → exit 0
2/4 pnpm run format:check → All matched files use Prettier code style!
3/4 pnpm run lint         → 0 errors, 0 warnings
4/4 pnpm test             → tests 3614 · pass 3596 · fail 0 · skipped 18 (integração MySQL gateada)
```

Delta vs FIN-DOC-READER-XML (3600): **+14 testes** (8 CAs funcionais + 4 regressão de segurança F1–F4 + 2 cascade F4/F5).

## Resultado

**Todos os 4 gates verdes.** Reader PDF nativo in-house entregue: WinAnsi + Identity-H (via CMap `/ToUnicode`) → VOs canônicos, 0 dependência de runtime nova (só `node:zlib`), **métrica batida sem fallback `unpdf`**. Segurança de parsing binário hostil endurecida e testada (ReDoS O(n), scan O(n), teto agregado de inflate, guarda de input, cascade com erro de recurso terminal). DoS explorável com <1KB (F1/F2) eliminado.

DoD satisfeita — com o XML, **desbloqueia o `FIN-DOC-READER-CASCADE`** (a skeleton já existe; falta wiring dos readers reais + gate integrado).
