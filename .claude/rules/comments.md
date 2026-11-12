---
paths:
  - 'src/**/*.ts'
  - 'tests/**/*.ts'
  - 'scripts/**/*.ts'
verify:
  - claim: 'o scanner da regra de comentários vive num único arquivo de suporte'
    root: 'tests/support'
    pattern: 'export const scanComments'
    expect:
      - 'tests/support/comment-scan.ts'
---

Em `.ts`, a única forma de texto ao humano dentro do código é **TSDoc que documenta uma declaração**. Comentário em prosa sobre o código não existe: se um trecho precisa de explicação, o conserto é no código.

Cobrado por `tests/cleanup/comments.test.ts` sobre os caminhos de `SANITIZED_ROOTS`; arquivo avulso: `node --enable-source-maps scripts/ci/check-comments.ts <arquivo.ts...>` (sai com 1 se houver achado). O scanner é `tests/support/comment-scan.ts`.

## R1 — onde o TSDoc pode estar

`/** ... */` colado **imediatamente** acima de uma declaração, começando a própria linha, sem linha em branco nem outro comentário no meio (a diretiva permitida da R4 pode ficar entre os dois):

- `function`, `const`/`let` e `type`/`interface` no nível do módulo;
- membro de `interface` ou de type literal;
- propriedade de objeto que é o valor de um `const`/`let` **exportado**.

Proibido: `//`, `/* */`, e `/** */` solto — cabeçalho de arquivo, entre statements, dentro de corpo de função, no fim de linha, antes de `import`/`export { }`.

## R2 — o que cabe e o que não cabe no TSDoc

| Cabe | Não cabe |
| --- | --- |
| o que a declaração é ou faz | o **porquê** de uma decisão |
| `@param` para cada parâmetro (nome igual ao da assinatura) | `@remarks`, `@privateRemarks`, `@todo` |
| `@typeParam` para cada parâmetro de tipo | histórico, alternativa descartada, alerta ao futuro |
| `@returns`, incluindo as variantes de erro do `Result` (as strings kebab-case) | número de ADR, issue, ticket ou PR |
| `@throws` | datas, "medido em", narrativa |
| no máximo **um** `@example` | um segundo `@example` |
| `@defaultValue`, `@deprecated` | tag fora desta coluna |
| `@see {@link Simbolo}` ou `@see {@link Simbolo \| rótulo}` — para declaração do código; `@see tests/…/x.test.ts` — para o teste que prova a frase. O alvo é o conteúdo inteiro da tag | `@see` para documento, URL ou pessoa; texto depois do alvo |

Se o bloco tem algum `@param`, todo parâmetro da assinatura tem o seu (idem `@typeParam`). Parâmetro desestruturado é documentado por posição, com o nome que melhor o descreve.

## R3 — toda frase tem teste

Cada frase do TSDoc está provada por um teste que **passa** e cujo nome descreve aquele comportamento. Frase sem teste não se escreve — o TSDoc encolhe até caber no que está provado.

## Como registrar o porquê de um guard

Guard, early return ou exceção de allowlist sem explicação parece código morto, e a próxima limpeza o remove. O porquê não volta como prosa: vira **um teste que falha quando o guard é removido**.

1. Escreva o teste e prove o vermelho aplicando a mutação "remover o guard". Se o teste passa sem o guard, ele não prova o porquê (ex.: `inArray(col, [])` vira `WHERE false` e devolve vazio do mesmo jeito; o que o guard evita é a consulta, e é isso que o teste mede).
2. Se um gate existente já falha sem a decisão (ex.: a allowlist de nomes de `tests/cleanup/lint-gaps.test.ts`), ele é o teste — não escreva outro.
3. O TSDoc da declaração descreve o comportamento que o guard garante (o quê, R2) e cita o teste com `@see tests/…/x.test.ts`.

O scanner aceita como conteúdo inteiro do `@see` só `{@link Simbolo}`, `{@link Simbolo | rótulo}` ou um caminho `tests/**/*.test.ts` sem segmento `.` ou `..` (`see-target-not-allowed`). `tests/cleanup/comments.test.ts` lê os `@see tests/…` dos blocos TSDoc de todo `.ts` versionado e recusa o que não aponta para um teste versionado no git.

## R4 — diretivas: conjunto fechado

| Sobrevive | Condição |
| --- | --- |
| `// oxlint-disable-next-line <regra>` ou `// eslint-disable-next-line <regra>` | regra de borda `any`/`unknown`/`undefined` — `no-explicit-any`, `no-unsafe-*`, `no-non-null-assertion` — e estruturalmente necessária (ex.: o `Result`); sem `-- descrição` |
| `// @ts-expect-error` | só em `tests/`, puro, afirmando que um tipo é recusado; o nome do teste diz qual |
| `#!` (shebang) e `/// <reference ... />` | sempre |

Qualquer outra diretiva (`@ts-ignore`, `@ts-nocheck`, `eslint-disable` de bloco, `prettier-ignore`, regra fora da lista acima): conserte o código para não precisar dela.

## R5 — o conserto é nome, extração ou tipo

| Em vez de… | Faça |
| --- | --- |
| `// soma os juros do período` acima de três linhas | extraia `sumPeriodInterest(...)` |
| `// 12 alfanuméricos + 2 DVs` ao lado de um literal | `const ALPHANUMERIC_BODY_LENGTH = 12` |
| `// só Active chega aqui` | um tipo que só admite `Active` |
| `// TODO`, `// HACK`, `// ver issue` | registrar fora do código e manter o código correto |

Não renomeie nem remova símbolo **exportado** — outros módulos importam. A refatoração é interna ao arquivo.
