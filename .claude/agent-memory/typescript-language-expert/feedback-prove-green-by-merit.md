---
name: feedback-prove-green-by-merit
description: Em revisão de type system, provar empiricamente (probe tsc/eslint/runtime) se o verde é por mérito ou por acidente — nunca afirmar comportamento de narrowing de memória
metadata:
  type: feedback
---

Numa revisão de type system, quando `typecheck`/`lint`/testes já estão verdes, a pergunta do Gabriel é **"passam por acidente ou por mérito?"**. A resposta tem de vir de **probe executado**, não de afirmação sobre o comportamento do compilador.

Técnica que funcionou (revisão do `scripts/ci/deadman-audit.ts`, #368):

- Probe de tipo isolado no scratchpad + `npx tsc --ignoreConfig --noEmit --strict --noUncheckedIndexedAccess --exactOptionalPropertyTypes --target ES2024 --module NodeNext --moduleResolution NodeNext --lib ES2024 --skipLibCheck <arquivo>`. O `--ignoreConfig` é obrigatório: sem ele o TS 6 recusa (`TS5112`) quando há `tsconfig.json` na cwd e arquivos na linha de comando.
- `type IsAny<T> = 0 extends 1 & T ? true : false` + `type Expect<T extends true> = T` para provar se um narrowing produziu `any`.
- `// @ts-expect-error` para provar que um estado inválido é **inconstruível** na modelagem proposta.
- Ler a **fonte da regra** em `node_modules` quando a dúvida é "o ESLint pegaria isso?" (ex.: `type-utils/dist/isUnsafeAssignment.js` mostra que `any → unknown` é explicitamente permitido, logo `no-unsafe-argument` NÃO cobre anotação `unknown` removida).
- Probe de **runtime** (`node --experimental-strip-types` num arquivo do scratchpad importando o módulo por caminho absoluto) para provar que a hipótese de buraco realmente dispara — e não só "poderia".

**Why:** o valor da revisão está em separar a anotação que é redundância cosmética da que é a única coisa segurando `any` fora do código. Só o probe distingue as duas.

**How to apply:** toda revisão de type system deste repo; a saída deve dizer, item a item, **o que foi verificado e passou** (não só os achados), e cada achado de narrowing precisa citar o probe que o sustenta.

Ver também [[project-consistent-type-definitions-vs-readonly]].
