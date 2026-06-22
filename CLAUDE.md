# CLAUDE.md

> Este arquivo é um **stub**. O contexto canônico deste repo vive em `AGENTS.md`
> (padrão aberto, multi-ferramenta). O Claude Code carrega o conteúdo via import abaixo.

@AGENTS.md

<!-- SPECKIT START -->

Plano corrente: `specs/024-fin-transactional-outbox/plan.md` (outbox transacional do Financeiro — atomicidade estado+evento / issue #127, ADR-0015) no módulo `financial`. Hoje persiste estado e faz `outbox.append` em DUAS operações separadas; e **o financial não tem outbox persistente** (`composition.ts:340` usa `createInMemoryOutbox()` mesmo no driver mysql) → achado de recon que torna o #127 **L** (a issue dizia M "sem schema"). **Solução**: criar tabela `fin_outbox` (migration, espelha `ctr_outbox`: char(36) PK `event_id` p/ idempotência, payload **varchar(8192)** não-JSON, índice unprocessed) + helper `appendFinOutboxInTx` + gravar estado e INSERT no outbox na MESMA `db.transaction`, passando os eventos PARA DENTRO do repo (como contracts). **Escopo (clarify via discussão de 3 especialistas — drizzle/mysql/DDD)**: inclui os 7 use-cases de documento (DocumentRepository.save, tx em `:224`) E a conciliação (ReconciliationRepository.confirm/confirmManualEntry/undo, tx em `:51`) — atomicidade é propriedade do emissor (Vernon:7562/Newman:2966). Sem novo ADR (conformidade ADR-0015). W0 RED = teste que injeta falha no outbox e prova rollback total (`COUNT==baseline`), incl. integração drizzle-mysql (Docker). Tamanho **L**, ticket `FIN-OUTBOX-ATOMIC` (fatiável A=documento, B=conciliação). (Anteriores entregues: #200/PR#212, #202/PR#213, #204/PR#214 — todos merged na dev.)
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan.

<!-- SPECKIT END -->
