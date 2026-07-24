# W0 — SEMGREP-ADR-ENFORCER (#548) — RED

**Agente:** `tdd-strategist` · **Resultado:** RED (6/6 fail por ausência dos artefatos)

## O que o teste garante

`tests/scripts/semgrep-workflow.test.ts` — asserção de estrutura (molde de
`integration-matrix-workflow.test.ts`, `tryRead` + regex, zero-dep ADR-0011):

- **CA1** — job `semgrep` roda o Semgrep apontando para `.semgrep/`.
- **CA2** — gatilhos `pull_request: [dev, main]` + `workflow_dispatch`.
- **CA3** — toda action SHA-pinada (40 hex, nunca `@vX`) + sem `|| true`/`continue-on-error: true`
  (gate real, não report-only — CWE-703, mesma lição da Fase 2 do #523).
- **CA4** — `.semgrep/rules.yml` declara as 3 rules do MVP (`mysql-enum-forbidden`,
  `mysql-json-forbidden`, `no-npm`), cada uma com message/severity/languages; a `no-npm` tem âncora
  de fronteira (não casa `pnpm`).

## Escopo do MVP (decidido no W0/W1, com evidência)

2 rules **precisas e ADR-ancoradas** (AST TypeScript) — verificado por grep que **nenhuma** bate em
código existente (0 `mysqlEnum(`, 0 `json(` bare, 0 `JSON_EXTRACT/OBJECT/ARRAY`):

| rule | ADR | fonte |
| --- | --- | --- |
| `mysql-enum-forbidden` | ADR-0020 (ENUM nativo proibido → VARCHAR+CHECK) | `mysqlEnum(...)` |
| `mysql-json-forbidden` | ADR-0020 (coluna JSON nativa proibida) | `json(...)` |

**Diferidas COM RAZÃO** (não silenciosamente):

- `no-npm` — num scan estático **falso-positiva no próprio `block-npm.sh`** (o comentário dele
  documenta o ban `npm install`/`npm run`) e em qualquer doc que mencione o ban. O risco **real** de
  `npm` já é coberto pelo hook `block-npm.sh` (execução) + ADR-0012 — Semgrep não agregaria sem gritar
  falso-positivo. Fica p/ fatia 2 só se houver desenho preciso (ex.: escopar a `run:` de workflow).
- `nodenext-ts-extension` — o **tsc já barra** (TS2835 sob NodeNext); Semgrep seria redundante.
- `no-throw-exhaustive-default` — **impreciso** em Semgrep (falso-positivo em switch não-exaustivo).

O valor único do gate = as 2 rules de ADR-0020 (drift de schema que **nem tsc, nem ESLint, nem hook**
pegam). Adicionar rules precisas depois é trivial (append no `rules.yml`).

## Evidência RED

```
ℹ tests 6 · pass 0 · fail 6
AssertionError: workflow .github/workflows/semgrep.yml ausente — o W1 ainda não o escreveu (RED esperado)
AssertionError: arquivo .semgrep/rules.yml ausente — o W1 ainda não o escreveu (RED esperado)
```

## Próximo (W1)

Escrever `.semgrep/rules.yml` (3 rules) + fixtures `.semgrep/tests/` anotadas (`# ruleid:`/`# ok:`) +
`.github/workflows/semgrep.yml` (SHA-pinado). Validar com `pipx run semgrep --test` (rules casam o
positivo e ignoram o negativo, incl. `pnpm`) **e** o node:test GREEN.
