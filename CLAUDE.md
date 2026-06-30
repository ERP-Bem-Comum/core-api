# CLAUDE.md

> Este arquivo é um **stub**. O contexto canônico deste repo vive em `AGENTS.md`
> (padrão aberto, multi-ferramenta). O Claude Code carrega o conteúdo via import abaixo.

@AGENTS.md

<!-- SPECKIT START -->

Plano corrente: `specs/028-fin-approver-limit/plan.md` (validação de alçada do aprovador no Lançar Documento — issue #289, go-live p1, sub-validação da #89). Bloqueia documento cujo aprovador tem alçada (limite monetário) < valor líquido + **cascata** ao próximo aprovador com alçada suficiente. **Autocontido (FR-007a, cobrança do solicitante):** alçada = **+1 coluna** `approval_limit_cents BIGINT NULL` no agregado `Role` existente (`auth`), sem reformar RBAC nem tocar `mass-approver-role`#45/spec 005. `financial` lê projeção mínima `{canApprove, limitCents}` via `auth/public-api/read.ts` (estende `AuthUserReadPort`#207) — **ACL/estado remoto mínimo**, Vernon p.158 (citado, grounding 5/5). Regra `alçada ≥ líquido` + `escalate` (cascata) = funções puras no domínio do `financial` (`approval-policy.ts`); alçada efetiva = MAX dos papéis c/ `payable:approve`; sem alçada = fail-closed (bloqueia). Valida em create + submit (Draft→Open #91), só com `netValue !== null`. Erros EN kebab: `approver-not-found`/`approver-missing-permission`/`approver-limit-exceeded`/`no-approver-with-sufficient-limit`. Tamanho **L** fatiado em 3 tickets (AUTH→POLICY→CASCADE), 1 módulo/sessão. Próximo: `/speckit-tasks`.
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan.

<!-- SPECKIT END -->
