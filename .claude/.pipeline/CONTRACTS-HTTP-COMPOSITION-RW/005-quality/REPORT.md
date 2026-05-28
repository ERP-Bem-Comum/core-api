# W3 (Quality Gate) — CONTRACTS-HTTP-COMPOSITION-RW (C0)

> Skill: `ts-quality-checker` · Outcome: **GREEN** (4/4 gates)

| Gate | Comando | Resultado |
| :-- | :-- | :-- |
| Typecheck | `pnpm run typecheck` (`tsc --noEmit`) | ✅ exit 0 |
| Format | `pnpm run format:check` (`prettier --check .`) | ✅ "All matched files use Prettier code style!" |
| Lint | `pnpm run lint` (`eslint .`) | ✅ exit 0 |
| Test | `pnpm test` | ✅ **1457 pass · 0 fail · 16 skipped** (491 suites) |

> Os 16 skipped são os gates de integração MySQL (`MYSQL_INTEGRATION=1`), fora do escopo desta fatia (memory-only, sem Docker).

## Ajuste durante o W3 (tagged errors)

O typecheck pegou um problema real **não óbvio**: após `CTR-DOMAIN-TAGGED-ERRORS` (último commit da branch), `ContractRepositoryError` deixou de ser `extends string` — inclui `OutboxAppendError`, que é união de 3 **tagged records** (`{ tag: 'OutboxAppend*' }`). O `sendResult<T, E extends string>` exige `E extends string`, então passar `result` (err) direto falhava (`TS2345`).

**Correção:** helper `repoErrorCode(e)` na borda (`plugin.ts`) — `typeof e === 'string' ? e : e.tag` — normaliza o erro do repo para um code string antes do envelope HTTP. Reads só produzem `contract-repo-*`; o `.tag` cobre os tagged defensivamente. Sem `any`, sem cast inseguro. Documentado inline com referência ao ticket de origem.

## Definition of Done — verificação

- [x] CA1–CA5 verdes (memory, W0→W3).
- [x] Composition dual-pool (writer/reader handles; single-node reusa); `listContracts`→reader.
- [x] `GET /api/v2/contracts` protegida (`requireAuth`) + no OpenAPI; `server.ts` compõe auth + contracts.
- [x] typecheck/format/lint/test verdes; **sem dependência nova**.
- [x] Split físico (reader real) diferido para C5 (E2E mysql) — registrado.
