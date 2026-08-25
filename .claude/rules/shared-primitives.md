---
paths:
  - 'src/shared/primitives/**/*.ts'
  - 'tests/shared/*.test.ts'
verify:
  - claim: 'os testes das primitivas ficam fora do mirror, em tests/shared/'
    glob: 'tests/shared/primitives/**/*.ts'
    expect: []
  - claim: 'três das quatro primitivas têm teste; exhaustive.ts não tem'
    glob: 'tests/shared/*.test.ts'
    expect:
      - 'tests/shared/brand.test.ts'
      - 'tests/shared/immutable.test.ts'
      - 'tests/shared/result.test.ts'
---

Quatro arquivos que quase todo o `src/` consome. O uso restrito de `Brand` (só VO folha, nunca agregado), a razão das facades de imutabilidade e a mecânica do `exhaustiveStringUnion` estão **nos docblocks de cada arquivo** — não repetidos aqui. `Object.freeze` fora da facade é cobrado por `tests/cleanup/immutable-facade-single-source.test.ts`; a semântica de `combine`, por 8 casos em `tests/shared/result.test.ts`.

- **`result.ts` é a fundação de ~640 arquivos — e não parece.** São 25 linhas sem docblock, e a aparência de utilitário trivial esconde o raio de alcance: `Result` é importado por mais arquivos que qualquer outra coisa do repositório. Mudar a forma de `Result<T, E>`, de `ok`/`err` ou dos type predicates é breaking em massa. A rede é o `tsc`, que pega assinatura — não pega semântica de quem já consumia. _(Sem `verify:`: contagem exata quebraria a cada arquivo novo, e o aviso não depende do número.)_

- **Os testes das primitivas não seguem o mirror da [`testing.md`](./testing.md).** Estão em `tests/shared/result.test.ts`, `brand.test.ts` e `immutable.test.ts` — não em `tests/shared/primitives/`. É herança do commit `e03a146a` (2026-05-25), que moveu os arquivos de `src/shared/` para `src/shared/primitives/` sem levar os testes junto. Ao procurar o teste de uma primitiva, olhe um nível acima do esperado; ao **criar** um, criar em `tests/shared/primitives/` passaria a haver dois lugares para a mesma coisa. `exhaustive.ts` é a única sem teste.
