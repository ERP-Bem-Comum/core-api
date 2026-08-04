---
paths:
  - 'src/modules/*/application/**/*.ts'
  - 'tests/modules/*/application/**/*.ts'
verify:
  - claim: 'nenhum módulo acopla em notifications — o e-mail sai por evento'
    root: 'src/modules'
    pattern: 'modules/notifications/public-api'
    expect: []
---

Application orquestra: não tem regra de negócio nem conhece infra. A regra de dependência (não importar `adapters/`) e a proibição de `interface` em port são cobradas por `tests/cleanup/application-depends-inward.test.ts`; `class` é barrado globalmente por ESLint. A atomicidade do `INSERT` na outbox vive em [`adapters.md`](./adapters.md), porque `appendOutboxInTx` é chamado em 12 arquivos de `adapters/` e em **nenhum** de `application/`.

- **Use case é factory function que recebe `Deps` e devolve `Result`.** `(deps: Readonly<{…}>) => (input) => Promise<Result<O, E>>` — 153 dos 157 use cases declaram um tipo `*Deps`, 151 devolvem `Promise<Result<…>>`. A sequência dentro é sempre a mesma: **validar → buscar → decidir no domínio → persistir → publicar evento**. O que faz esse formato valer não é a estética: é que `deps` ser argumento torna o teste uma chamada de função, sem container nem mock de módulo.

- **Se um `if` decide estado de negócio, ele está na camada errada.** Orquestração pergunta "deu certo?" e encaminha; regra pergunta "pode?" e decide. `if (contract.status === 'Active')` num use case é regra que vazou — o lugar dela é uma operação de `domain/` que devolve `Result` com o erro nomeado. É a única afirmação desta rule que exige julgamento, e por isso a única que nenhum gate substitui.

- **E-mail transacional é evento, não chamada** ([ADR-0047](../../handbook/architecture/adr/0047-transactional-email-via-producer-domain-event.md)). A operação de negócio grava um evento no outbox **do próprio módulo produtor**, na mesma transação do save; o `notifications` consome e envia. Chamada síncrona produtor → notifications é rejeitada por três razões independentes: acopla os BCs em runtime, não é atômica, e uma falha de SMTP derrubaria a operação de negócio. O payload carrega token de uso único — o outbox é interno e **não é logado**.

> **Read-after-write ainda não tem realização.** O [ADR-0026](../../handbook/architecture/adr/0026-mysql-read-write-split-connection.md) determina que leitura crítica pós-escrita vá ao primário, com roteamento explícito no use case. Hoje **não há nada** sobre isso em `application/` — nenhuma decisão de rota, nenhum teste. E o reader pool só existe em `contracts` e `partners` (ver [`adapters.md`](./adapters.md)); nos outros seis módulos não há para onde rotear. Tratar como norma pendente, não como prática vigente: escrever código que assume o roteamento seria assumir infraestrutura que não está lá.

Definição de ports (Repository, EventBus, Storage, Clock): skill [`ports-and-adapters`](../skills/ports-and-adapters/SKILL.md).
