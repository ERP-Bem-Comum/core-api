# W3 (QUALITY) — AUTH-USER-PASSWORD-OPTIONAL

**Skill:** ts-quality-checker · **Wave:** W3 · **Data:** 2026-06-02 · Docker OFF (gate sem Docker).

> Materializado pelo orquestrador-main (harness bloqueou escrita pelo subagent).
> Ticket NÃO fechado: CA5 (round-trip NULL) provada com Docker via `!` antes do `close`.

## Veredito: ✅ ALL GREEN (4/4 gates)

| Gate | Comando | Resultado |
| :--- | :--- | :--- |
| Typecheck | `pnpm run typecheck` | zero erros |
| Format | `pnpm run format:check` | "All matched files use Prettier code style!" |
| Lint | `pnpm run lint` | zero erros |
| Test | `pnpm test` | **1945 / 1929 pass / 0 fail / 16 skipped** |

## Skip da CA5 (não regrediu)

`user-federated-roundtrip.drizzle.test.ts` carrega (`✔ 874ms`) e o teste round-trip aparece
`﹣ SKIP - MYSQL_INTEGRATION=1 desligado`. Zero `ERR_MODULE_NOT_FOUND` → skip legítimo (gate opt-in,
[[project-test-integration-auth-gap]]), não falso-verde. Os 16 skipped são integração gated por
`MYSQL_INTEGRATION=1`/`COMPOSE_INTEGRATION=1` (Docker OFF), por design.

## CA5 — PROVADA end-to-end com Docker (2026-06-02)

⚠️ **Falso-verde corrigido antes do fecho:** o teste CA5 `user-federated-roundtrip.drizzle.test.ts`
estava **órfão** — não constava no comando `test:integration:auth` (package.json:41). O 1º run passou
(32/32) mas SEM exercer a CA5 (mesmo gap de [[project-test-integration-auth-gap]]). Adicionado o arquivo
ao gate e re-rodado:

`pnpm run test:integration:auth` (`MYSQL_INTEGRATION=1`): **33 tests / 33 pass / 0 fail**. O bloco
`AUTH-USER-PASSWORD-OPTIONAL — CA5: round-trip federado (Drizzle)` confirmou no MySQL real:
`save user passwordHash=null → password_hash NULL; findById reidrata null` ✔. O round-trip fecha — o
bug `?? ''` está corrigido de ponta a ponta.

## Conclusão

W0→W3 ALL-GREEN + CA5 provada end-to-end. Gate `test:integration:auth` agora inclui o teste federado
(sem órfão). Ticket pronto para `close`.
