# W2 — REVIEW · FIN-PAYABLE-READMODEL (#235)

**Metodologia:** dois agentes especialistas read-only, escopos disjuntos (cobrança do Gabriel — "usar os agentes").
- **`typescript-language-expert`** — domínio/application (eventos + projetor).
- **`drizzle-orm-expert`** — persistência (schema/migration/store).

## Round 1 — ambos **REJECTED**. Round 2 — achados endereçados, gate verde. **Veredicto final: APPROVED** (escopo núcleo).

## Achados do `typescript-language-expert`

| # | Sev | Achado | Resolução |
| :-- | :-- | :-- | :-- |
| M1 | Major | `parsePayableIds` rejeitava `DocumentCancelled` com `payableIds: []` (descarte de rascunho via `cancelDraft`) → o no-op virava retry+DLQ. | **Corrigido** — array presente (mesmo vazio) é usado; +teste RED `M1`. |
| m4 | Minor | array populado com entrada não-string era silenciosamente dropado. | **Corrigido** — rejeita se qualquer entrada ≠ string; +teste `m4`. |
| m3 | Minor | `dueDate`/`payableId` sem validação de formato (assimetria vs `valueCents`). | **Corrigido** — `^\d{4}-\d{2}-\d{2}$` p/ dueDate + `payableId` não-vazio. |
| m2 | Minor | `status` do snapshot é `string`, desacoplado de `DocumentStatus`/`PayableViewStatus` (drift silencioso se um status novo entrar num snapshot). | **Follow-up** — latente (snapshots só carregam Open/Approved/Paid hoje). Registrado. |
| obs | — | **Projeção exige entrega FIFO por título** (senão `PayableApproved` antes do `DocumentSaved` perde a transição). | **Follow-up** — decisão de ordenação é do worker. |

Confirmações positivas: enriquecimento **aditivo** (nenhum consumidor quebra; timeline mapper lê colunas de row, não payload); `DOCUMENT_EVENT_TYPES`/`TIMELINE_EVENT_TYPES` intactos; serialização JSON-safe consistente produtor↔consumidor; camadas/regras de domínio OK.

## Achados do `drizzle-orm-expert`

| # | Sev | Achado | Resolução |
| :-- | :-- | :-- | :-- |
| — | Major | **CHECK ausente** em `kind`/`status`/`retention_type` (precedente `fin_payables_*_chk`; skill `drizzle-schema-author`). | **Corrigido** — 3 `check(...)` adicionados; migration `0027` **regenerada limpa** (CREATE TABLE já com CHECKs; não deployada ainda). |
| — | Major | `list()` reclassificava enum inválido (`toStatus`→'Open') em vez de `Result` (viola `.claude/rules/adapters.md`). | **Corrigido** — `payable-view.mapper.ts` (`Result`-based, molde `payable-list.mapper.ts`) + `PayableViewStoreError` ganha `'payable-view-row-invalid'`; `list()` propaga. |
| — | Minor | índices sem sufixo `_ref_idx` (convenção local). | **Corrigido** — renomeados. |
| — | Minor | sem `$inferSelect`/`$inferInsert`. | **Corrigido** — `PayableViewRow`/`NewPayableViewRow` exportados. |
| — | Major | **guard de recência ausente** no upsert (sem `occurred_at`; vs molde `fin_supplier_view`) — `DocumentSaved` fora de ordem sobrescreve campos descritivos mais novos. | **Follow-up** — tie com a decisão de ordenação do worker; documentado. |
| — | Major | **zero teste** do adapter Drizzle (nunca rodou contra MySQL real). | **Follow-up** — trio `.suite`/`.in-memory.test`/`.drizzle-mysql.test` vai com a fatia worker+integração. In-memory é exercitado transitivamente por `apply-payable-event.test`. |
| — | Minor | `VALUES(col)` deprecated no Refman 8.4. | **Não-bloqueante** — idêntico ao molde `supplier-view` já em produção; tech-debt transversal (Drizzle 0.45.x não expõe row-alias). |

Sem violação da lista proibida ADR-0020 (sem JSON/ENUM/trigger/proc/AUTO_INCREMENT). Boundary try/catch→`Result` OK. Paridade in-memory↔drizzle na preservação de `status` OK.

## Gate pós-correções (round 2)

`typecheck` ✓ · `lint` ✓ · `format:check` ✓ · `pnpm test` **3303 pass / 0 fail / 18 skipped**. Testes novos do projetor: **6 GREEN** (CA2-CA4 + skip + M1 + m4).

## Itens deferidos → follow-up `FIN-PAYABLE-PROJECTION-WORKER`

1. Worker `payable-view-projection` + **outbox-reader do financial** (nunca existiu — `fin-outbox-helpers` é produtor-apenas).
2. **Guard de recência** (`occurred_at` + `IF(fresher)`) OU decisão documentada de confiar em FIFO do worker.
3. Trio de testes do store + **integração Drizzle-MySQL real** (valida `ON DUPLICATE KEY UPDATE` em lote + CHECKs no banco).
4. m2 (tipar `PayableSnapshot.status` como `DocumentStatus` + mapa explícito) antes de qualquer status novo de payable entrar no snapshot.
