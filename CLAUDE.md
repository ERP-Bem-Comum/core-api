# CLAUDE.md

> Este arquivo é um **stub**. O contexto canônico deste repo vive em `AGENTS.md`
> (padrão aberto, multi-ferramenta). O Claude Code carrega o conteúdo via import abaixo.

@AGENTS.md

<!-- SPECKIT START -->

Plano corrente: `specs/015-collaborator-complete-registration/plan.md` (épico #65 Colaborador + #46 grids). Estende `partners` em **6 user stories serializadas** (US1 banco/PIX → US2 perfil → US3 território → US4 histórico+CSV → US5 autocadastro → US6 contagem nos grids), **uma migration por vez** `0010`→`0015` (`db:generate` nunca concorrente — corrige a causa-raiz do reset dos PRs #83–86, que colidiram em `0009`). Cada US é um ticket pipeline W0→W3 com gate verde antes da próxima. Decisões travadas: `sex` (F|M) coexiste com `genderIdentity`; `childrenAges` = `varchar` CSV (ADR-0020); TTL convite = 7 dias; CSV de histórico = cabeçalho legado + coluna `programa` vazia (usa `src/shared/utils/csv.ts`). **US6 é cross-BC** (Contratos enriquece eventos com `contractorRef`; Parceiros projeta read-model `par_contract_count_view` via worker dedicado `src/workers/contract-count-projection/`, molde da feature 014) e é **bloqueada pelo novo ADR-0046**. US5 exige review `web-security-backend`.
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan.

<!-- SPECKIT END -->
