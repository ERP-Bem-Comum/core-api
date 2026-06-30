# Code Review — CTR-PIPELINE-SUPERSEDE-NO-SELF — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer · **Data:** 2026-05-27
**Escopo:** `scripts/pipeline/state-cli.ts` (guarda `cmdSupersede`) + `state-cli.test.ts` (CA-S4).

---

- ✅ Guarda posicionada **cedo** (após `requireFlag('by')`, antes de `loadState`/aplicação) — falha
  rápida `EXIT=2` com mensagem clara, sem tocar o estado.
- ✅ Diff mínimo (3 linhas) e cirúrgico; CA-S1/S2/S3 (regressão) verdes; CA-S4 cobre a auto-referência.
- ✅ Fora de escopo respeitado (sem ciclos transitivos — só auto-referência direta, conforme request).
- ✅ Gate read-only: typecheck/format/lint OK; supersede 4/4.

## Próximo passo

APPROVED → W3.
