# W2 — CODE REVIEW · PRG-ETL-BOOTSTRAP

**Skill:** code-reviewer · **Outcome:** APPROVED ✅ · **Round:** 1/3 · **Data:** 2026-07-01

## Escopo revisado
Diff da branch `feat/legacy-etl-programs` (17 arquivos, +189/−11). Foco: adesão ao padrão `partners`,
ADR-0006 (public-api), ADR-0014 (prefixo `prg_*`), ADR-0020 (SELECT-then-INSERT, sem `ON DUPLICATE KEY`),
regras de domínio (validação estrita) e regressão zero.

## Verificações

| Item | Resultado |
| --- | --- |
| Reconstrução passa pelo domínio (`Program.create`/`deactivate`, nunca INSERT direto) | ✅ `program.mapper.ts:68,88` |
| `combine` acumula todos os erros da linha → quarentena | ✅ `program.mapper.ts:58` |
| Idempotência por `legacy_id` (SELECT `.for('update')` → skip, nunca UPDATE) | ✅ adapter Drizzle |
| `classifyProvisionError` distingue already-exists / integrity-violation / unavailable | ✅ prefixo `prg_` |
| Cross-módulo só via `public-api/etl.ts` (path direto, fora do barrel) — ADR-0006 | ✅ |
| Prefixo `prg_*` + índice `prg_programs_legacy_id_idx` — ADR-0014 | ✅ |
| Sem `ON DUPLICATE KEY`; sem `throw` cruzando a borda (tudo `Result`) — ADR-0020 | ✅ |
| Imports com extensão `.ts` + `#src` + `import type` — regras TS | ✅ |
| Segredo/PII: `LegacyProgramRow` não carrega segredo; quarentena `DomainRejected` é PII-free | ✅ |
| Regressão zero: `orchestrate.test.ts` atualizado (não quebrado) | ✅ |

## Observações (não bloqueantes)
- `logoKey = null` é decisão consciente (o `logo` legado é URL, não chave S3). Registrado como fatia futura de re-upload — **OK** documentar em vez de migrar dado semanticamente inválido.
- `migrateAggregateRow` generalizado para `EtlStore<A,Ref,E extends string>` — necessário porque as uniões de erro de `partners` e `programs` são disjuntas; feito **sem cast**. Bom.
- Ramo de erro de `Program.create` no mapper é defensivo (nome/sigla já pré-validados) — aceitável (fail-safe).

## Veredito
**APPROVED** — sem issues bloqueantes. Segue fielmente o padrão `partners` e as ADRs. Prossegue para W3.
