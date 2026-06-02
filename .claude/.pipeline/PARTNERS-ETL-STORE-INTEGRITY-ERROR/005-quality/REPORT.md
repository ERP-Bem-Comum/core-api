# W3 — QUALITY (gate final) — PARTNERS-ETL-STORE-INTEGRITY-ERROR

**Skill:** ts-quality-checker · **Wave:** W3 · **Data:** 2026-06-02 · Docker OFF (gate sem Docker).

> Materializado pelo orquestrador-main (harness bloqueou escrita pelo subagent).
> Ticket NÃO fechado: a CA6 (integração 2-DB) é provada com Docker via `!` antes do `close`.

## Veredito: ✅ ALL GREEN (4/4 gates)

| Gate | Comando | Resultado |
| :--- | :--- | :--- |
| Typecheck | `pnpm run typecheck` | zero erros |
| Format | `pnpm run format:check` | "All matched files use Prettier code style!" |
| Lint | `pnpm run lint` | zero problemas |
| Test | `pnpm test` | **1939 / 1923 pass / 0 fail / 16 skipped** |

## Skip da integração (defeito do ticket NÃO regrediu)

`partners-etl-store-integrity.integration.test.ts` resolve todos os imports (sem `ERR_MODULE_NOT_FOUND`)
e curto-circuita a montagem da suite sem `MYSQL_INTEGRATION=1` (`integrationEnabled()` guard, mesmo padrão
de `partners-etl-port.integration.test.ts`). Os 11 unit de `classifyProvisionError` + o contrato de tipo
rodam no gate puro (parte dos 1923 pass).

## CA6 — PROVADA end-to-end com Docker (2026-06-02)

`pnpm run test:integration:partners` (`MYSQL_INTEGRATION=1`): **26 tests / 26 pass / 0 fail**.
O bloco `store ETL: violacao de UNIQUE secundaria -> integrity-violation` confirmou no MySQL real:
- `suppliers: mesmo CNPJ com legacy_id distintos -> integrity-violation (NÃO unavailable/already-exists)` ✔
- `collaborators: mesmo CPF com legacy_id distintos -> integrity-violation` ✔
- `mesmo legacy_id (re-run) continua already-exists — idempotencia preservada` ✔

O `log()` corrigido emitiu o `.cause` real no stderr (antes truncado):
`... | cause: Duplicate entry '...' for key 'par_suppliers.par_suppliers_cnpj_idx' (errno=1062 code=ER_DUP_ENTRY sqlMessage=...)`.
PII (valor duplicado) só no stderr efêmero; o `Result`/reason é PII-free.

## Conclusão

W0→W3 ALL-GREEN + CA6 provada. Ticket pronto para `close`.
