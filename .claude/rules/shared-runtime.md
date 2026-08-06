---
paths:
  - 'src/shared/utils/**/*.ts'
  - 'src/shared/ports/**/*.ts'
  - 'src/shared/adapters/**/*.ts'
  - 'src/shared/observability/**/*.ts'
  - 'src/shared/runtime/**/*.ts'
  - 'src/shared/index.ts'
verify:
  - claim: 'os cinco diretórios de suporte do shared existem'
    glob: 'src/shared/{utils,ports,adapters,observability,runtime}/*.ts'
    expect:
      - 'src/shared/adapters/clock-fixed.ts'
      - 'src/shared/adapters/clock-real.ts'
      - 'src/shared/observability/correlation.ts'
      - 'src/shared/ports/clock.ts'
      - 'src/shared/runtime/last-resort.ts'
      - 'src/shared/utils/csv.ts'
      - 'src/shared/utils/date.ts'
      - 'src/shared/utils/hash.ts'
      - 'src/shared/utils/id.ts'
      - 'src/shared/utils/string.ts'
---

Nove arquivos pequenos e muito consumidos: `Clock` tem ~100 consumidores, `newUuid` 42, `correlation` 15. A proibição de ler o relógio no domínio é cobrada por `tests/cleanup/domain-clock-injection.test.ts`; a razão está no docblock de lá.

- **`utils/` NÃO é a fronteira com `node:`.** Os docblocks de `id.ts` e `hash.ts` dizem "encapsula `node:crypto`", e isso descreve o que aqueles dois arquivos fazem — não uma norma do repositório. **21 arquivos importam `node:crypto` diretamente**, a maioria em `adapters/crypto/` do `auth` e `partners`, onde a primitiva é o próprio assunto. Não tratar um import de `node:*` fora daqui como violação, e não centralizar por centralizar.

- **`ClockFixed` é o mecanismo de determinismo, não um detalhe de teste.** 78 arquivos de `tests/` o usam. Ao escrever operação nova que dependa de tempo, o instante entra por parâmetro (`at`) resolvido pelo use case a partir do `Clock` — o que torna o teste determinístico sem congelar relógio global.

- **O `shutdown` passado ao `installLastResortHandlers` tem de DRENAR, não só abortar.** Em `uncaughtException` o `finally` do `try` **nunca roda** — então quem fecha o pool no caminho normal não é chamado. Passar um shutdown que só faz `controller.abort()` satisfaz o gate e não resolve nada: o processo morre com as conexões abertas, que ficam no servidor até o `wait_timeout` ([Incident-0001](../../handbook/incidents/0001-prod-rds-connection-exhaustion-2026-07-10.md)). O padrão do repo é um `drain` que aborta **e** fecha, usado tanto no `finally` quanto no handler. Quais entrypoints precisam instalar é cobrado por `tests/cleanup/longrunning-drains-pool.test.ts` — job one-shot fica de fora por desenho (ADR-0041).

- **`src/shared/index.ts` é barrel parcial, por omissão e não por desenho.** Exporta `Result`, `Brand`, `immutable`, `exhaustiveStringUnion` e `newUuid` — mas não `Clock`, `correlation`, `csv`, `sha256Hex`, `isValidDate` nem `isBlank`, que se importam pelo caminho completo. Os 43 consumidores do barrel convivem com imports diretos do mesmo diretório; ao acrescentar utilitário, o barrel não é o default.
