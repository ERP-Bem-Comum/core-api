---
paths:
  - 'src/modules/*/domain/**/*.ts'
  - 'src/shared/kernel/**/*.ts'
  - 'tests/modules/*/domain/**/*.ts'
  - 'tests/shared/kernel/**/*.ts'
verify:
  - claim: 'o VO Cnpj aceita letras — o shape não é numérico-only'
    root: 'src/shared/kernel'
    pattern: '/^[0-9A-Z]{12}[0-9]{2}$/'
    expect:
      - 'src/shared/kernel/cnpj.ts'
---

Domínio puro: zero infra, zero framework, zero I/O. Abrange `src/modules/*/domain/` e o shared kernel (`src/shared/kernel/` — `Money`, `NonZeroMoney`, `Period`, `PlainDate`, `UserRef`, `Cpf`, `Cnpj`).

O que já é cobrado por mecanismo e **não** se repete aqui: `throw` (`tests/cleanup/domain-no-throw.test.ts`), `class`/`this` (ESLint `no-restricted-syntax`), `any` (`no-explicit-any`), `switch` exaustivo (`switch-exhaustiveness-check` + `noFallthroughCasesInSwitch`) e parâmetro mutável (`prefer-readonly-parameter-types`). As primitivas `Result`, `Brand`, `immutable` e `exhaustiveStringUnion` vivem em `src/shared/primitives/` e têm rule própria — [`shared-primitives.md`](./shared-primitives.md).

- **Erro de domínio é string literal union, nunca classe.** `type ContractError = 'contract-not-active' | 'contract-cannot-expire-yet' | …`. É o que faz o `E` do `Result` ser exaustivo no `switch` do chamador — e o que o compilador consegue cobrar. Uma classe de erro devolve a decisão para runtime e reintroduz hierarquia onde o projeto escolheu união fechada.

- **Valor validado nasce por smart constructor, nunca por cast.** `Money.fromCents(raw): Result<Money, MoneyError>`. O branded type sozinho não valida nada: ele apenas **registra** que a validação aconteceu. Um `as Money` num valor cru produz um tipo que mente — e mente exatamente nos pontos onde o resto do código confia sem checar de novo.

- **⚠️ CNPJ pode conter letras** ([ADR-0044](../../handbook/architecture/adr/0044-cnpj-alphanumeric-kernel.md)). Desde 07/2026 a Receita emite CNPJ alfanumérico: 14 caracteres uppercase sem máscara, `^[0-9A-Z]{12}[0-9]{2}$` — 12 alfanuméricos + 2 DVs numéricos. `12ABC34501DE35` é válido; `11222333000181` continua válido. **Nunca assumir "só dígitos"**: um `\d{14}` ou `[0-9]{14}` sobre CNPJ é bug, em máscara, export ou `CHECK` de schema. O checksum é o mesmo módulo 11 com `valor(c) = ASCII(c) − 48` — não reimplementar, usar o VO do kernel.

  > Hoje **não há** regex numérico-only em `src/`, mas **10 descrições de borda ainda dizem "14 dígitos"** (`.meta({ description })` de Zod, que vai para o OpenAPI). A validação está correta — `z.string().length(14)`, sem regex; o que engana é a documentação pública da API. É o achado `ADR-0044-C5` do inventário de decisões, que registrava 6.

- **Operação que RECONSTRÓI o agregado não gera identidade nova para a entidade que continua existindo.** Recalcular valores e recriar filhos é legítimo; trocar o id de quem não deixou de existir, não — a responsabilidade mais básica de uma entidade é estabelecer continuidade, e é ela que a torna referenciável de fora (Evans, *Domain-Driven Design*, p.49). Gerar id é **efeito**: dentro de uma função de rebuild, ele silenciosamente converte uma atualização em substituição, e o domínio fica sintaticamente puro (sem I/O, sem `throw`) e semanticamente destrutivo.

  O sinal de alerta é a operação já **receber** o estado anterior e ignorá-lo — foi o caso aqui: o input do ajuste carregava os títulos atuais e chamava o construtor mesmo assim. Preservar exige uma regra de correspondência explícita e determinística (casar por forma, consumindo cada anterior uma vez), não `find` ingênuo: sem ela, duas entidades irmãs do mesmo tipo casam de maneira imprevisível.

  Quem sofre com a troca vive fora do domínio — FK, vínculo, read-model. O outro lado dessa moeda está em [`adapters.md`](./adapters.md); **não replicar aqui** o que é regra de schema.

Modelagem de agregado, VO e evento: skill [`ts-domain-modeler`](../skills/ts-domain-modeler/SKILL.md).
