# CLAUDE.md

> Este arquivo é um **stub**. O contexto canônico deste repo vive em `AGENTS.md`
> (padrão aberto, multi-ferramenta). O Claude Code carrega o conteúdo via import abaixo.

@AGENTS.md

<!-- SPECKIT START -->

Plano corrente: `specs/009-contract-auto-expire/plan.md` (expiração automática de contratos: sweep no worker de outbox que aplica `Contract.expire` aos contratos vencidos — Active+Fixed, `current_period_end < hoje_BRT`; borda D+1 em UTC-3; reusa evento `ContractExpired`; sem schema/HTTP novos; ver `research.md`, `data-model.md`, `contracts/internal-contracts.md`).
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan.

<!-- SPECKIT END -->
