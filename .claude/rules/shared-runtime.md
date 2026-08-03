---
paths:
  - 'src/shared/utils/**/*.ts'
  - 'src/shared/ports/**/*.ts'
  - 'src/shared/adapters/**/*.ts'
  - 'src/shared/observability/**/*.ts'
  - 'src/shared/runtime/**/*.ts'
  - 'src/shared/index.ts'
verify:
  - claim: 'os handlers de último recurso são instalados só pelo server.ts'
    root: 'src'
    pattern: 'installLastResortHandlers'
    expect:
      - 'src/server.ts'
      - 'src/shared/runtime/last-resort.ts'
---

Nove arquivos pequenos e muito consumidos: `Clock` tem ~100 consumidores, `newUuid` 42, `correlation` 15. A proibição de ler o relógio no domínio é cobrada por `tests/cleanup/domain-clock-injection.test.ts`; a razão está no docblock de lá.

- **`utils/` NÃO é a fronteira com `node:`.** Os docblocks de `id.ts` e `hash.ts` dizem "encapsula `node:crypto`", e isso descreve o que aqueles dois arquivos fazem — não uma norma do repositório. **21 arquivos importam `node:crypto` diretamente**, a maioria em `adapters/crypto/` do `auth` e `partners`, onde a primitiva é o próprio assunto. Não tratar um import de `node:*` fora daqui como violação, e não centralizar por centralizar.

- **`ClockFixed` é o mecanismo de determinismo, não um detalhe de teste.** 78 arquivos de `tests/` o usam. Ao escrever operação nova que dependa de tempo, o instante entra por parâmetro (`at`) resolvido pelo use case a partir do `Clock` — o que torna o teste determinístico sem congelar relógio global.

- **Os handlers de último recurso cobrem só a borda HTTP.** `installLastResortHandlers` é chamado apenas em `src/server.ts`. Nenhum worker ou job o instala — e o docblock de `last-resort.ts` registra o custo exato dessa ausência: sem eles, um `throw` fora da cadeia de promise encerra o processo **sem drenar o pool MySQL**, que fica pendurado até o `wait_timeout`. Em processo long-running com pool, isso é a mecânica do [Incident-0001](../../handbook/incidents/0001-prod-rds-connection-exhaustion-2026-07-10.md). Ao escrever entrypoint novo, decidir conscientemente — não herdar a ausência por cópia.

- **`src/shared/index.ts` é barrel parcial, por omissão e não por desenho.** Exporta `Result`, `Brand`, `immutable`, `exhaustiveStringUnion` e `newUuid` — mas não `Clock`, `correlation`, `csv`, `sha256Hex`, `isValidDate` nem `isBlank`, que se importam pelo caminho completo. Os 43 consumidores do barrel convivem com imports diretos do mesmo diretório; ao acrescentar utilitário, o barrel não é o default.
