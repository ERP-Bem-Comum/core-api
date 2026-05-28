# Code Review — CTR-CLI-VALIDATE-FLAGS-BEFORE-STATE — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer
**Data:** 2026-05-27
**Escopo revisado:** `cli/main.ts`, `cli/registry.ts`, 12 × `cli/commands/*.ts`, `tests/modules/contracts/cli/flag-validation-before-state.test.ts` (diff do W1).

---

## Análise

Diff de +31 linhas em 14 arquivos. Reordena a validação de flags do subcomando para **antes** do
load de state, sem alterar a assinatura de `cmd.run` nem o fluxo de drivers.

- ✅ **Causa-raiz tratada na ordem certa:** `main.ts` valida `rest` (`parseFlags` +
  `validateAllowedFlags(_, cmd.allowedFlags)`) imediatamente após `parseDriverFlags` e **antes** de
  `buildContext`. Flag desconhecida/duplicada → `EXIT_USAGE` (64) sem tocar I/O de state.
- ✅ **Fonte única da allowlist:** cada comando re-exporta sua `ALLOWED` privada como
  `allowedFlags`. `main` reusa a mesma lista — impossível divergir da validação interna.
- ✅ **`SubCommand.allowedFlags` tipado** (`readonly string[]`); os 12 módulos satisfazem via
  `import * as`. `tsc` força a presença em compile-time.
- ✅ **Mensagens corretas:** `formatFlagError` (mesma usada pelos comandos) — consistência de UX.
- ✅ **Sem `throw`/`class`/`any`**; tudo via `Result`. Import order respeitada (lint exit 0).
- ✅ **CA1–CA5 cobertos:** teste hermético (3/3), REGR #10 verde sem depender do cwd (2/2),
  suíte CLI 66/66, distinção 64 (uso) vs 74 (I/O real) preservada.

## Gate verificado (read-only)

```
pnpm run typecheck    → limpo
pnpm run format:check → All matched files use Prettier code style!
pnpm run lint         → exit 0
```

## 🔵 Sugestão (não bloqueia)

A validação de flags fica **duplicada** (em `main` e dentro de cada `cmd.run`). É **defense-in-depth
aceitável**: a allowlist é fonte única, e os comandos seguem corretos/testados isoladamente. Caso,
no futuro, se garanta por contrato que `main` sempre valida antes, a checagem interna dos comandos
poderia ser removida para reduzir a redundância — fora do escopo deste ticket.

## O que está bom

- Mudança cirúrgica e uniforme nos 12 comandos (1 linha cada); risco baixo.
- `format:check`/`lint` antecipados no W1 — sem rejeição de formatação neste round
  (o `strict-void-return` do teste foi pego e corrigido ainda no W1).

## Próximo passo

**APPROVED → W3:** gate final automatizado.
