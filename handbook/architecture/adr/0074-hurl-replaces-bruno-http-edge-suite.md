[← Voltar para ADRs](./README.md)

# ADR-0074: Hurl substitui o Bruno como suíte da borda HTTP; `api-collections/` é removida

- **Status:** Accepted
- **Date:** 2026-10-06
- **Deciders:** Gabriel Aderaldo (dono) + backend
- **Supersedes:** [ADR-0034](./0034-adopt-bruno-api-client-cli.md) (adoção do `@usebruno/cli`), [ADR-0038](./0038-bruno-cli-mandatory-and-bru-authoring.md) (Bruno obrigatório via CLI + autoria `.bru`)
- **Relacionado:** [ADR-0037](./0037-http-first-retire-embedded-cli.md) (borda HTTP é a UX primária), [ADR-0027](./0027-zod-openapi-contract-first-http-edge.md) (contrato da borda), [ADR-0029](./0029-pnpm-11-supply-chain-defaults.md) (supply-chain)

## Contexto

O ADR-0038 fixou a regra que sustentava o Bruno: **um `.bru` escrito e não executado é cobertura
ilusória**, logo toda coleção precisa de runner CLI. Em 2026-10-05 o runner único
(`scripts/e2e/bruno-all.sh`, mapeado em `test:integration:all`) foi **removido** por estar
desatualizado — e com ele caiu a única coisa que executava os 266 `.bru`. Pelo critério do próprio
ADR-0038, a coleção inteira passou a ser cobertura ilusória: 266 arquivos que ninguém rodava.

Não é defeito de disciplina; é o custo do formato. O `.bru` guarda o encadeamento em **JavaScript**
(`script:post-response` + `bru.setVar`) e as asserções em **chai**, o que exige o runtime do Bruno
para qualquer coisa — inclusive para descobrir se o arquivo está correto. O dono classificou o
formato como "pesado e burocrático" e, em 05/10, adotou **Hurl 8.0.1** na frente de QA/pen-test
(`penTest_rest/`, com convenções próprias já escritas).

## Decisão

1. **Hurl é a suíte da borda HTTP.** As coleções vivem em `api-collections-hurl/casos/<módulo>/`,
   com variáveis por `--variables-file` — o arquivo **nasce sem segredo**.

2. **`api-collections/` (os 266 `.bru`) é REMOVIDA**, e `@usebruno/cli` sai do `package.json`. A
   conversão foi feita e medida: **241 requests em 23 arquivos**, `hurlfmt --check` verde nos 23.

3. **O `.http` é camada de visualização, não de gate.** `api-collections-http/` existe para
   disparar request pela IDE (Cockpit, `ck http`). Não roda assertion e **não** é cobertura.

4. **Autoria Hurl:** `hurlfmt --check` antes de commitar; `--jobs 1` sempre (o rate limit de login
   é compartilhado e `--test` paraleliza por default); `--continue-on-error` em CI. Sem status
   conhecido, o request afirma `[Asserts] status < 500` — a invariante do projeto.

5. **O que o ADR-0038 dizia e CONTINUA valendo**, reafirmado aqui por inteiro para não depender de
   documento superseded: *o resultado do runner é a fonte de verdade, nunca a leitura do arquivo*;
   *asserção reflete o comportamento observado, não o presumido*; *nunca 500*; *dado de cadastro
   sintético, CPF/CNPJ por módulo 11, UUID v4 real* (o nil UUID devolve 400, não 404);
   *expected-fail isolado em pasta própria* — agora `casos/_known-defects/`, e a antiga
   `z-pending-fixes` virou `casos/regressao/`, porque os cinco tickets foram implementados e o nome
   mentia.

## O que Hurl resolve e o Bruno não resolvia

| Necessidade | `.bru` | `.hurl` |
| --- | --- | --- |
| Encadear token | JavaScript (`bru.setVar`) | `[Captures]` nativo |
| Segredo fora do arquivo | não | `--variables-file` |
| Relatório de CI | reporter do `bru` | `--report-junit` / `--report-tap` / `--report-html` |
| Validar sintaxe sem rodar | não existe | `hurlfmt --check` |
| Valor único por execução | `Date.now()` em script | `{{newUuid}}` nativo |

## Limites medidos — não suposições (06/10/2026)

- **`[Captures]` NÃO cruzam arquivos.** Medido: capture em `a.hurl` + uso em `b.hurl`, no mesmo
  comando e com `--jobs 1`, falha com `you must set the variable`. Consequência de desenho: ou o
  arquivo é autocontido (login → ações, como as convenções de `penTest_rest/` recomendam), ou os
  tokens vêm de `--variables-file`. A coleção convertida usa a segunda forma, porque é a que
  preserva o `.bru` 1:1 — ele também dependia de um `0-auth/` prévio.
- **A suíte exige o seed E2E**, igual ao `.bru`: 8 perfis de token, e nenhum e-mail de
  `environments/local.bru` existe no banco de dev. Hoje `82 de 241` requests executam; o resto para
  em variável indefinida. **Zero 500** nos 82 (`ck telemetry errors` → 0 casos).
- **Hurl para no primeiro assert que falha** dentro do arquivo, salvo `--continue-on-error`. Com
  10–40 requests por arquivo, um vermelho no começo esconde o resto.
- **Ferramental:** `hurlfmt` é o único oficial de autoria — **não há LSP, JSON schema nem MCP**
  (manual em hurl.dev, consultado em 06/10). Ele pegou dois defeitos silenciosos na conversão:
  `{{process.env.X}}`, que o Hurl trunca para `{{process}}` sem erro, e body de texto sem a cerca
  ```` ``` ````, que faz a primeira palavra do corpo ser lida como método HTTP.

## Consequências

- **Positivas:** o encadeamento sai do JavaScript; a suíte nasce sem segredo e versionável; CI ganha
  relatório JUnit; a sintaxe é verificável sem servidor; uma dependência menos no `package.json`
  (`@usebruno/cli` e suas transitivas de build saem do `pnpm-workspace.yaml`).
- **Negativas:** a coleção **não tem gate automático** enquanto o seed E2E não existir — e isso já
  era verdade desde 05/10, quando o runner caiu. O `.hurl` não executa JavaScript, então o que o
  `.bru` fazia em script e não tem equivalente declarativo ficou como comentário, para reescrita
  manual.
- **`handbook/reference/bruno/`** (≈189 `.mdx`) permanece como **acervo**, não como norma: é
  referência de uma ferramenta que saiu. O agente `bruno-api-client-expert` fica sem objeto no
  repositório.
- O registro histórico (`handbook/specs/**`, `handbook/tickets/**`, `CHANGELOG`) **não é reescrito**
  (ADR-0057 §5): aquelas páginas descrevem corretamente o que era verdade quando foram escritas.

## Referências

- `api-collections-hurl/README.md` (estado medido da suíte, layout, comandos).
- `penTest_rest/_hurl-conventions.md` (convenções de asserção e discovery; local, gitignored).
- Regra path-scoped: [`.claude/rules/api-collections.md`](../../../.claude/rules/api-collections.md).
