# FIN-SUPPLIER-VIEW-BACKFILL-RERUN — escopo

> Issue **#111** (Onda A). Módulo **financial** (+ worker de projeção partners→fin). Size **S**. Prioridade **P3**.
> ⚠️ **NÃO confundir** com o ticket fechado `FIN-SUPPLIER-VIEW-BACKFILL` (closed-green 2026-06-17, commit `a1c94e6`, backfill original US2 #47 — histórico, não tocar). Este ticket é a **investigação + re-execução operacional**: o backfill existe mas **não populou** o ambiente.

## Problema
`GET /api/v2/financial/documents` retorna `supplierName`/`supplierDocument` **null** para todos, mesmo com `supplierRef` válido — `fin_supplier_view` não está populado. Suspeita dupla: backfill (`a1c94e6`) **não disparado** no ambiente **e/ou** worker `par_outbox → fin_supplier_view` não drenou os eventos existentes.

## Escopo (in)
1. **Diagnosticar** por que `fin_supplier_view` está vazio (backfill não rodou vs. worker parado) — causa-raiz, não fix empírico.
2. **Disparar/garantir** o backfill one-shot (idempotente) a partir dos fornecedores cadastrados.
3. **Confirmar worker** de projeção ativo (processa `SupplierRegistered`/`SupplierEdited`).
4. **Runbook**: documentar como acionar o backfill localmente (comando/cron) para validação do front.

## Fora de escopo
- Reescrever o backfill original (`a1c94e6`) — só re-executar/corrigir o disparo. Reprojeção além de fornecedor.

## Critérios de aceite
- **CA1** `GET /api/v2/financial/documents` retorna `supplierName`/`supplierDocument` **não-nulos** para documentos com fornecedor projetado.
- **CA2** **idempotente** (rodar 2× não altera o resultado).
- **CA3** fornecedor em quarentena (#275) sem dados → degrada para `null`, não falha o backfill.

## Pipeline (agentes por wave)
| Wave | Atividade | Especialista |
| :-- | :-- | :-- |
| W0 | RED (reader + idempotência; repro do view vazio) | skill **`tdd-strategist`** |
| W1 | diagnóstico + disparo do backfill + verificação do worker + runbook | agente **`nodejs-runtime-expert`** (por que o worker não drenou) + agente **`drizzle-orm-expert`** + skill **`nodejs-process-runner`** |
| W2 | audit (idempotência + projeção) | skill **`code-reviewer`** + agente **`drizzle-orm-expert`** |
| W3 | gate + `test:integration:financial` | skill **`ts-quality-checker`** |

## Research (agentes + MCPs)
- **`Explore`** sobre `FIN-SUPPLIER-VIEW-BACKFILL` (ticket fechado) + commit `a1c94e6` + worker `par_outbox → fin_supplier_view`.
- **`nodejs-runtime-expert`**: diagnóstico operacional do worker (memória `consult-nodejs-expert-for-runtime-issues`).
- **`acdg-skills`**: outbox/projeção (ADR-0015/0022).

## DoD
Gate W3 verde. Lista financeira mostra nome/CNPJ do fornecedor no ambiente. Fecha #111. Desbloqueia a feature web-app `financial-supplier-readmodel-029`.
