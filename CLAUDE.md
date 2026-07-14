# CLAUDE.md

> Este arquivo é um **stub**. O contexto canônico deste repo vive em `AGENTS.md`
> (padrão aberto, multi-ferramenta). O Claude Code carrega o conteúdo via import abaixo.

@AGENTS.md

<!-- SPECKIT START -->

Plano corrente: `specs/029-fin-transfer-counterpart/plan.md` (transferência entre contas com contrapartida pendente — issue #269, pós-go-live, evolução da #143). Ao conciliar A→B (`record-manual-entry` + `destinationAccountRef`, tipo `Transfer`), cria na conta de destino uma **Contrapartida Esperada** — novo agregado `financial` (`fin_expected_counterpart`, ciclo `Pending → Matched | Discarded`), **não** uma `StatementTransaction` marcada (é expectativa, não fato — Vernon _IDDD_ p.450, "Model True Invariants in Consistency Boundaries", grounding 3/3). `suggest-matches` passa a casar transação real × contrapartida (valor exato + janela ~5d, reusa `match-score`); confirmar **consome** a contrapartida (dedup, sem 2ª transação) + vínculo A↔B; desfazer a origem descarta/reabre. Eventos `TransferCounterpartCreated/Matched/Discarded` via outbox (produtor). Clarifications: expiração=indefinida no MVP (P.O. confirma), casamento=valor exato+data, escopo=só Transferência. Tamanho **L** fatiado em 3 tickets (CREATE→MATCH→UNDO), 1 módulo/sessão. Próximo: `/speckit-tasks`.
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan.

<!-- SPECKIT END -->
