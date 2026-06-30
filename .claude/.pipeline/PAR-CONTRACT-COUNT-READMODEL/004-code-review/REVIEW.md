# W2 — Code Review · PAR-CONTRACT-COUNT-READMODEL (US6b)

**Agente:** code-reviewer (general-purpose) · **Outcome:** APPROVED (round 2) · 2 rounds.

## Round 1 — REJECTED (0 Blockers, 2 Majors, 2 Minors)

Núcleo técnico reconhecido **correto e bem-feito**: idempotência por eventId (dedup `par_contract_count_processed` + PK como backstop de corrida), atomicidade dedup+delta na mesma tx, ADR-0006 (consome contracts só via public-api; worker no composition root importa adapters dos 2 — sancionado ADR-0041), delta correto, migration sequencial (sem reset #83-86), worker (graceful shutdown, 2 pools, env, `applyMigrations:false`), convenções TS, chave por UUID sem risco de colisão.

### Achados + disposição (round 2)
| ID | Sev | Achado | Disposição |
|----|-----|--------|-----------|
| **M1** | Major | Coluna `count` diverge do nome normativo **`active_count`** do ADR-0046 §4 (ADR aceito vence) | ✅ **CORRIGIDO** — renomeado `active_count` (schema + migration `0015` **regenerada** + store Drizzle). `db:generate` → "No schema changes" (snapshot consistente); integração 46/46 com a coluna nova. |
| **M2** | Major | `000-request`/DoD declaram "leitura nos grids" não-entregue (read-model populado sem consumidor) | ✅ **CORRIGIDO** — `000-request` atualizado: display **fatiado para a issue #105** (read-model pronto/consumível via `getCount`); não é deliverable desta fatia. Os CAs do W0 (projeção) estão completos. |
| **m1** | Minor | `active_count` pode ir negativo (sem clamp) | ⛔ **REJEITADO com fundamento** — clampar no store **quebra a convergência** (sob reordenação End-antes-de-Create, a soma de deltas não-clampados converge ao valor certo; clampar não). O transiente negativo resolve na reprojeção (ADR-0022). O clamp pertence ao **display** (anotado na issue #105). O próprio revisor reconheceu "o estado converge" e marcou como não-bloqueante. |
| **m2** | Minor | Comentário "exactly-once" impreciso | ✅ **CORRIGIDO** — "effectively-once (dedup sobre at-least-once)". |

## Round 2 — APPROVED

Os 2 Majors resolvidos e verificados (rename: `db:generate` no-diff + integração 46/46; fatiamento: `000-request` + issue #105). m2 corrigido; m1 rejeitado com argumento técnico (alinhado ao próprio reconhecimento do revisor de que converge). Gates: typecheck/format/lint verdes; `pnpm test` 2722 pass/0 fail; `test:integration:partners` 46/46.

**Verdito: APPROVED → W3.**
