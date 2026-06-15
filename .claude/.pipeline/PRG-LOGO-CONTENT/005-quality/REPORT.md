# W3 — QUALITY GATE — PRG-LOGO-CONTENT

**Data:** 2026-06-15 · **Skill:** ts-quality-checker · **Resultado:** GREEN ✅

Gate final de qualidade — todos verdes. Regressão zero. Inclui o teste de integração S3 do logo
(gate criado neste ticket, achado do W2) provado verde no home dele.

## Comandos

| Gate | Comando | Resultado |
| :--- | :--- | :--- |
| Typecheck | `pnpm run typecheck` | ✅ 0 erros |
| Format | `pnpm run format:check` | ✅ All matched files use Prettier code style |
| Lint | `pnpm run lint` | ✅ limpo (após correção de causa raiz — ver Incidente) |
| Test | `pnpm test` | ✅ **2620 pass / 0 fail** / 18 skipped (2638 total) |
| Integração S3 | `pnpm run test:integration:logo` | ✅ **4 pass / 0 fail** (round-trip MinIO) |

## Incidente — OOM do V8 no `pnpm run lint` (diagnosticado e corrigido)

**Sintoma:** `pnpm run lint` crashou de forma reproduzível (exit 134 / SIGABRT):
`FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of
memory` (heap parou em ~2028 MB, o teto default do V8).

**Diagnóstico (agente `nodejs-runtime-expert`):** o `eslint.config.js` não excluía
`.claude/worktrees/`, e o flat config do ESLint 10 **não lê `.gitignore`**. Os worktrees de sessões
paralelas (`fin-module`, `handoff-2`) são cópias completas de `src/` e `tests/` de outras branches —
**1748 arquivos `.ts` extras**. O `projectService` type-aware passou a lintar **2586** arquivos em vez
de **838**, estourando o heap. Explica o "passou há 1h e agora não": os worktrees já existiam no
limiar dos 2 GB; os arquivos novos do ticket empurraram além.

**Correção (causa raiz, não mascarada):** adicionado `'.claude/**'` e `'.agents/**'` aos `ignores`
do `eslint.config.js`. O `pnpm run lint` **puro** (heap default do V8, sem `NODE_OPTIONS`) voltou ao
verde. **Descartado** o guardrail `NODE_OPTIONS=--max-old-space-size=1536` sugerido como opção: a
correção estrutural basta e o teto reduzido diminuiria a folga do default — mascararia em vez de
corrigir.

## Arquivos tocados além de `src/` e `tests/` do ticket (correções de gate/infra)

1. `package.json` — novo script `test:integration:logo` (espelha `test:integration:photo`). Fecha o
   achado não-bloqueante do W2 (o teste S3 do logo existia mas não tinha comando de execução).
2. `eslint.config.js` — `ignores` += `.claude/**`, `.agents/**`. Correção de causa raiz do OOM acima.

## Prova do verde

```
$ tsc --noEmit            # 0 erros
$ prettier --check .      # All matched files use Prettier code style!
$ eslint .                # limpo (exit 0, heap default)

$ pnpm test
ℹ tests 2638 · pass 2620 · fail 0 · skipped 18

$ pnpm run test:integration:logo
▶ createS3LogoStorage — MinIO
  ✔ CA1: upload persiste o objeto no bucket
  ✔ CA1b: download devolve bytes identicos + ContentType gravado no upload
  ✔ CA1c: download de key inexistente -> logo-object-missing
  ✔ CA2: remove apaga o objeto
ℹ tests 4 · pass 4 · fail 0
```

## Critérios de aceitação

Os 6 CAs do `000-request.md` cobertos: CA1–CA4 e CA6 pelas suítes da W0/W1 (`pnpm test` verde);
**CA5** (round-trip S3 gated) agora executável e verde via `test:integration:logo`. Decisão de design
"criação com logo = fluxo 2 passos oficial" registrada no `000-request.md` (fora de escopo do backend).
