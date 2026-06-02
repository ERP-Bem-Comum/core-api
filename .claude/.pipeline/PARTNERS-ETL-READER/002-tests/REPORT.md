# W0 — RED — PARTNERS-ETL-READER

**Skill:** nodejs-runtime-expert · **Outcome:** RED

- `tests/etl/decode.test.ts` — decode puro (5 casos): tipos, zero-date→DateInvalid, required ausente, **password jamais lido**, nullable. RED por inexistência do módulo.
- `tests/etl/legacy/reader.integration.test.ts` — integração gated (`PARTNERS_ETL_INTEGRATION=1`) + skip-guard de daemon: restore do dump sintético → read → decode → archive.
