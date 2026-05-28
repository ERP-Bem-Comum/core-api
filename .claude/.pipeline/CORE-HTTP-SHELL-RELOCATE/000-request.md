# CORE-HTTP-SHELL-RELOCATE — mover o shell HTTP para `src/shared/http/` + `src/server.ts`

## Origem

[ADR-0028](../../../handbook/architecture/adr/0028-http-edge-shell-location.md) (Accepted, 2026-05-28).
O H0 (`CORE-HTTP-FASTIFY-BOOTSTRAP`, closed-green) entregou o shell HTTP em `src/http/` (topo da árvore),
o que aparenta uma "camada HTTP horizontal" em tensão com a organização vertical-por-feature (ADR-0006).
O ADR-0028 fixa a home correta — que **cumpre** o ADR-0006:53-63 (`shared/` transversal + `server.ts` na raiz).

## Natureza

**Refactor de movimentação — ZERO mudança de comportamento.** Os testes do H0 (`bootstrap.test.ts`, 7 CAs
via `app.inject`) cobrem o comportamento e devem seguir verdes após o move. Não há lógica nova.

## Estado atual (mapeado)

- `src/http/{app,config,errors,reply,server}.ts` — 5 arquivos.
- Imports `#src/http/*` aparecem **apenas** em: `src/http/{app,reply,server}.ts` (entre si) e
  `tests/http/bootstrap.test.ts`. Nenhum módulo importa de `#src/http/` (auth ainda não tem HTTP).
- Nenhum script de `package.json` referencia `src/http/server.ts` (não há comando `serve`/`start` ainda).
- ESLint: override de borda em `eslint.config.js:276` cobre só `src/http/**/*.ts`.
- `src/server.ts` ainda não existe. `tests/http/` só tem `bootstrap.test.ts`.

## O que este ticket entrega

1. Mover `src/http/{app,config,errors,reply}.ts` → `src/shared/http/`.
2. Mover `src/http/server.ts` → **`src/server.ts`** (raiz — ADR-0006:63).
3. Reescrever imports `#src/http/*` → `#src/shared/http/*` (em `app`, `reply`, `server`, e no teste).
4. Mover `tests/http/bootstrap.test.ts` → `tests/shared/http/bootstrap.test.ts` (espelho — `.claude/rules/testing.md`).
5. ESLint `eslint.config.js`: glob `src/http/**` → `src/shared/http/**` **+** incluir `src/modules/*/adapters/http/**`
   (folgas de adapter de borda; já prepara o `AUTH-HTTP-PLUGIN-EXPORT`).
6. Remover o diretório `src/http/` (e `tests/http/`) após o move — sem duplicatas.

## Critérios de aceitação (detalhados na 001-spec/SPEC.md)

- **CA1 (comportamento preservado):** os 7 CAs do H0 seguem verdes a partir de `tests/shared/http/bootstrap.test.ts`
  importando `#src/shared/http/{app,reply}.ts`.
- **CA2 (sem duplicata):** `src/http/` e `tests/http/` não existem mais; nenhum import `#src/http/` remanescente.
- **CA3 (composition root):** `src/server.ts` existe, importa de `#src/shared/http/{app,config}.ts`.
- **CA4 (lint):** `pnpm run lint` verde com o glob cobrindo `src/shared/http/**` + `src/modules/*/adapters/http/**`.
- **CA5 (gate):** `pnpm test` + `typecheck` + `format:check` + `lint` verdes (W3) — zero regressão.

## Fora de escopo

- Criar o plugin de rotas do `auth` → **`AUTH-HTTP-PLUGIN-EXPORT`** (ticket seguinte; sua SPEC será reajustada
  para os novos paths por este refactor).
- Adicionar script `serve`/`start` que invoque `src/server.ts` (decisão de outra frente; H1+).
- Qualquer mudança de comportamento do shell (envelope, hardening, OpenAPI) — apenas movimentação.

## Notas

- **Skill:** `pipeline-maestro` + `ts-quality-checker` (W3). W1 sem agente especialista pesado (movimentação +
  reescrita de imports). **W0:** atualizar o import do teste movido para os novos paths → RED; W1 move → GREEN.
- Commitar o H0 antes? Decisão do usuário — o refactor funciona com o H0 untracked (vira um diff de move limpo).
- Idioma: código EN; doc PT-BR.
