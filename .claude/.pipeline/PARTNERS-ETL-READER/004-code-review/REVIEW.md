# W2 — REVIEW — PARTNERS-ETL-READER

**Round:** 1 · **Veredito: APPROVED**

- `child_process` via execFile/spawn (NUNCA shell); senha via MYSQL_PWD (não argv). ✅
- Efêmero descartável: `tmpfs` + `down -v` + teardown em try/finally (mesmo em falha). ✅
- Localhost-only porta alt (3309) — coexiste com a 3306 do dev; SELECT-only via `etl_ro`. ✅
- decode sem `any`; `password` jamais decodificado (D6). ✅
- Dump de PRODUÇÃO JAMAIS nos testes — fixture sintético; archive gitignored (PII). ✅
- Skip-guard de daemon (FIN-TEST-INFRA-SKIP-GUARD): offline → skip, nunca RED. ✅

APPROVED.
