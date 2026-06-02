# W2 — Code Review (CTR-TEST-MYSQL-PORT-CONFIGURABLE)

**Data:** 2026-06-02 · **Veredito:** ✅ APPROVED

- **Consistência:** padrão idêntico ao já adotado em auth/partners/etl. ✅
- **Comportamento preservado:** default `3306` quando `MYSQL_PORT` ausente → contagem de testes inalterada (2033, 0 fail). ✅
- **Escopo correto:** literais de parsing (`parse-driver-flags`) não alterados; só conn strings reais de integração. ✅
- **Uso:** `MYSQL_PORT=3307 pnpm test:integration` sobe o MySQL em 3307 (compose `${MYSQL_PORT:-3306}:3306`) e os testes conectam em 3307 — sem parar o stack `bemcomum-*` na 3306. ✅
