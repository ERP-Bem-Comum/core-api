---
paths:
  - 'src/modules/*/public-api/**/*.ts'
  - 'tests/modules/*/public-api/**/*.ts'
verify:
  - claim: 'barrel não é universal — 5 dos 8 módulos têm index.ts'
    glob: 'src/modules/*/public-api/index.ts'
    expect:
      - 'src/modules/contracts/public-api/index.ts'
      - 'src/modules/financial/public-api/index.ts'
      - 'src/modules/notifications/public-api/index.ts'
      - 'src/modules/partners/public-api/index.ts'
      - 'src/modules/programs/public-api/index.ts'
---

Esta é a fronteira do [ADR-0006](../../handbook/architecture/adr/0006-modular-monolith-core-api.md): o que atravessa daqui é a superfície declarada de um módulo, e é o que sustenta a promessa de extraí-lo como serviço sem refactor traumático. A proibição de furar a fronteira é cobrada por `tests/cleanup/module-boundary.test.ts` — não repetida aqui.

- **Não é um barrel, é uma superfície de arquivos nomeados por propósito.** `auth`, `budget-plans` e `reports` **não têm `index.ts`**, e metade dos imports cross-módulo entra por arquivo nomeado, não pelo barrel. Os nomes são estáveis e significam papel: `http.ts` (plugin Fastify, montado pelo `server.ts`), `migrate.ts` (job de migração), `read.ts` (leitura cross-módulo), `permissions.ts` (catálogo RBAC), `events.ts` (contrato de evento versionado), `etl.ts`, `<assunto>-projection.ts` (read-model; `financial` tem oito). Ao expor algo novo, o nome do arquivo é parte do contrato — escolher por propósito, não criar `index.ts` por hábito.

- **É fachada de re-export, não código.** Os arquivos daqui reexportam de `domain/`, `application/` e `adapters/` **do próprio módulo**. É exatamente isso que permite mover o interior sem quebrar consumidor — e é a razão de um `export` novo aqui ser mais caro do que parece: vira compromisso público. Lógica nova não nasce neste diretório.

- **O composition root fica fora da fronteira, por desenho.** `src/server.ts`, `src/workers/` e `src/jobs/` alcançam `adapters/` de vários módulos diretamente, e isso é a função do papel — o `workers/runner/specs.ts` liga repositórios Drizzle de quatro módulos. A fronteira restringe **módulo → módulo**; o composition root é quem monta as peças concretas.

- **Evento público é versionado, e a regra é assimétrica.** `CONTRACTS_SCHEMA_VERSION` fixa o wire format da outbox: **acrescentar** variante nunca quebra v1 (o consumidor faz switch exaustivo), mas **remover ou renomear** exige bump para v2 com o decoder v1 mantido lado a lado. Um consumidor de outbox lê linha gravada antes do deploy — a compatibilidade é para trás no tempo, não só entre módulos.
