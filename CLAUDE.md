# CLAUDE.md

> Este arquivo é um **stub**. O contexto canônico deste repo vive em `AGENTS.md`
> (padrão aberto, multi-ferramenta). O Claude Code carrega o conteúdo via import abaixo.

@AGENTS.md

<!-- SPECKIT START -->

**Plano corrente:** [`specs/040-rules-match-code-reality/plan.md`](specs/040-rules-match-code-reality/plan.md) — reconstrução das `.claude/rules/` ancorada no código real. As 12 rules foram destiladas de 44 ADRs sem confrontar `src/`, e uma delas afirmava um read/write split de pools que o código nunca implementou. Invariante: **zero mudanças em `src/`**. Aguarda gate humano na Fase 1 (inventário) antes de qualquer rule ser escrita.

**Também abertas, não commitadas:** [`038-retire-pipeline-w0w3`](specs/038-retire-pipeline-w0w3/plan.md) (aposentadoria da pipeline W0→W3) e [`039-claude-native-harness`](specs/039-claude-native-harness/spec.md) (consolidação do harness nas primitivas nativas). Nenhuma das três presume que as outras fecharam.

<!-- SPECKIT END -->
