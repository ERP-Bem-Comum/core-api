# CLAUDE.md

> Este arquivo é um **stub**. O contexto canônico deste repo vive em `AGENTS.md`
> (padrão aberto, multi-ferramenta). O Claude Code carrega o conteúdo via import abaixo.

@AGENTS.md

<!-- SPECKIT START -->

Plano corrente: `specs/023-fin-reconciled-grid/plan.md` (CONCILIADO reflete no grid de Contas a Pagar / issue #204, P1, bloqueia tesouraria) no módulo `financial`. A conciliação flipa o título pagável Paid→Reconciled (`reconciliation-repository.drizzle.ts:59`), mas o grid `GET /api/v2/financial/documents` lê `fin_documents.status` (nunca vira Reconciled) → documento segue "Pago". **Decisão clarify (ADR-0022:37/40 + emenda #130): indicador DERIVADO em tempo de leitura** — a query do grid deriva de `fin_payables` (documento Reconciled sse status=Paid E **todos** os títulos Reconciled; parcial→Paid), reflete no `status` do DTO (front já lê `status`/chip Conciliado) e estende o filtro (`schemas.ts:159`) p/ Paid|Reconciled. **NÃO** escreve em `fin_documents`, **NÃO** cria projeção/consumidor (evita #127); undo reverte automaticamente. Sem migration/evento/schema (ADR-0020 permite JOIN/subquery/COUNT). Toca read store drizzle + in-memory (paridade) + DTO + schema. Tamanho **M**, ticket `FIN-RECON-GRID-INDICATOR`. Princípio IX: `research.md` cita ADR-0022 literal. (Planos anteriores: #200/PR#212, #202/PR#213.)
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan.

<!-- SPECKIT END -->
