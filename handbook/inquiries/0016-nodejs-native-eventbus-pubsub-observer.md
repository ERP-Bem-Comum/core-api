# Inquiry-0016: Soluções nativas do Node.js para EventBus / Pub-Sub / Observer

- **Status:** Deferred (watchlist — registrar agora, decidir quando houver caso de uso)
- **Opened:** 2026-05-22
- **Closed/Decided:** —
- **Opened by:** Gabriel Aderaldo
- **Asked to:** investigação interna sobre `handbook/reference/nodejs/`
- **Impact:** futuro ADR sobre eventos in-process dentro de um módulo de `core-api`; possível complemento ao ADR-0015 (outbox MySQL cross-módulo)

---

## 1. Contexto

Durante o trabalho do ticket `CTR-STORAGE-S3-ADAPTER` surgiu a dúvida: o Node.js tem solução **nativa** para os padrões clássicos de mensageria intra-processo — Pub/Sub, Observer, EventBus — ou só por bibliotecas externas?

A premissa importava porque:

- ADR-0011 (supply-chain hardening) exige rigor para adicionar dependência externa.
- ADR-0015 já define **outbox MySQL** para eventos cross-módulo (`ctr_*` ↔ `fin_*`), mas **dentro de um único módulo** ainda não há decisão sobre como propagar eventos de domínio (ex.: `ContractCreated` saindo do agregado para o adapter de outbox).
- Antes de cogitar EventEmitter wrapper / mitt / RxJS, valia confirmar o que o runtime já entrega de fábrica.

---

## 2. Pergunta(s) feita(s)

> "Não existe nenhuma solução nativa de Pub/Sub, Observers, EventBus ou algo assim no Node.js?"

---

## 3. Respostas / Investigação

### 2026-05-22 — `handbook/reference/nodejs/Events.md`

Citação literal (`Events.md:19-31`):

> All objects that emit events are instances of the `EventEmitter` class. These objects expose an `eventEmitter.on()` function that allows one or more functions to be attached to named events. (...) When the `EventEmitter` object emits an event, all of the functions attached to that specific event are called synchronously.

API canônica de Observer/EventBus do runtime. Exemplo mínimo (handbook `Events.md:34-46`):

```ts
import { EventEmitter } from 'node:events'
class MyEmitter extends EventEmitter {}
const myEmitter = new MyEmitter()
myEmitter.on('event', () => console.log('triggered'))
myEmitter.emit('event')
```

Inclui ainda:

- `eventEmitter.once(name, listener)` — listener de execução única.
- `events.once(emitter, name)` — converte em **Promise** (await em vez de callback).
- `events.on(emitter, name)` — converte em **async iterator** (`for await (const [arg] of events.on(ee, 'x'))`).
- `errorMonitor` — escuta `'error'` sem interferir no behaviour padrão de crash.
- `captureRejections: true` — encaminha Promise rejections para o evento `'error'`.
- `getEventListeners()`, `setMaxListeners()`, `addAbortListener()` — utilidades.
- **`EventTarget`/`Event`** — mesma API que browser/Web Workers, útil para código universal.

### 2026-05-22 — `handbook/reference/nodejs/Diagnostics Channel.md`

Citação literal (`Diagnostics Channel.md:21-46`):

> The `node:diagnostics_channel` module provides an API to create **named channels** to report arbitrary message data for diagnostics purposes. (...) Channels are used along with the shape of the message data.

API explícita de **Pub/Sub**:

```ts
import diagnostics_channel from 'node:diagnostics_channel'

const channel = diagnostics_channel.channel('my-channel')
diagnostics_channel.subscribe('my-channel', (message, name) => { /* ... */ })

if (channel.hasSubscribers) {
  channel.publish({ some: 'data' })
}

diagnostics_channel.unsubscribe('my-channel', onMessage)
```

Detalhes relevantes:

- **Stable** desde Node ≥ 19 (segundo metadado do `.md` capturado).
- `channel.hasSubscribers` — **escape hatch barato**: só serializa o payload se alguém estiver ouvindo. Otimização que `EventEmitter` não dá de graça.
- `tracingChannel(name)` — camada acima com canais `start`/`end`/`asyncStart`/`asyncEnd`/`error` para tracing estruturado de operações.

### 2026-05-22 — `handbook/reference/nodejs/Performance hooks.md`

Citação literal (`Performance hooks.md:21-27`):

```ts
import { performance, PerformanceObserver } from 'node:perf_hooks'

const obs = new PerformanceObserver((items) => {
  console.log(items.getEntries()[0].duration)
  performance.clearMarks()
})
obs.observe({ type: 'measure' })
```

Caso de uso restrito: observar entradas de performance (`mark`, `measure`, `resource`, `gc`, `function`). Não é EventBus de domínio — é instrumentação.

---

## 4. Análise interna

### Alternativas avaliadas

| Alternativa | Prós | Contras | Veredito |
| :--- | :--- | :--- | :--- |
| **`node:events` / `EventEmitter`** | API madura, ubíqua, base do próprio core (HTTP, streams, processes); `once()` Promise; `on()` async iterator; suporta Promise rejections; tipável via `TypedEventEmitter` | Sync por padrão (listener lento bloqueia próximos); sem `hasSubscribers` barato; nomes de evento são strings sem checagem global | ✅ **Default para EventBus intra-módulo** |
| **`node:diagnostics_channel`** | Pub/Sub literal com canais nomeados globais; `hasSubscribers` permite skip de serialização; `tracingChannel` pronto para observabilidade | API ainda focada em "diagnostics" (intenção semântica importa pra reviewers); subscribers rodam **synchronously** (mesmo trade-off do EE) | ✅ **Quando hot-path importa** (skip cheap) ou para **telemetria estruturada** |
| **`EventTarget`** (exposto em `node:events`) | Compatível Web (mesmo código no browser); `AbortSignal` integrado nativamente | API menos rica que EventEmitter (sem `once()` Promise nativo, sem capture-rejections); convenções diferentes (`new Event(name)`) | 🟡 Considerar **se o módulo tem fronteira com Web Workers / código portável** |
| **`PerformanceObserver`** | Observer nativo padronizado | Escopo estrito: só entries de performance | 🟡 Uso pontual (instrumentação) |
| Lib externa (`mitt`, `nanoevents`, `eventemitter3`, RxJS) | Tipagem por design (`mitt`), Observable completo (RxJS) | Adiciona dependência (atrito ADR-0011); nenhuma vantagem fundamental sobre nativo para nosso escopo Fase 1 | ❌ **Rejeitada** até prova em contrário |

### Limites importantes (todos os nativos)

- **In-process only** — perdem mensagens em crash, não atravessam Workers sem `MessageChannel` extra, não substituem outbox.
- **Síncronos por padrão** — listener pesado bloqueia o emit. Para fan-out lento, listener precisa fazer `queueMicrotask` / `setImmediate` próprio.
- **Sem persistência** — qualquer subscriber que precise garantir entrega após restart deve usar o **outbox MySQL** (ADR-0015), não EventEmitter.

### Encaixe na arquitetura atual

- **Cross-módulo (`ctr_*` ↔ `fin_*`):** `ADR-0015` (outbox MySQL) **vence**. Nativo não substitui.
- **Intra-módulo, sync, parte do mesmo use case:** chamada direta de função / port. Sem evento.
- **Intra-módulo, fan-out leve, no mesmo turn:** **`EventEmitter`** é candidato natural — ex.: domínio publica `ContractCreated` que o adapter outbox consome e enfileira para persistência.
- **Telemetria / tracing estruturado interno:** **`diagnostics_channel`** é o canal certo (semântica + `hasSubscribers`).

---

## 5. Decisão final

**Deferred.** Não há caso de uso imediato que exija eventos in-process. Quando houver (primeiro candidato: notificar adapter de outbox a partir do agregado sem acoplar imports diretos), abrir ADR específico decidindo entre `EventEmitter` e `diagnostics_channel` com base nos critérios desta análise.

Regra provisória até o ADR existir:

1. **Cross-módulo → outbox MySQL** (ADR-0015), sempre.
2. **Intra-módulo síncrono → função direta**, sem evento.
3. **Intra-módulo com fan-out → `EventEmitter` nativo** por default; subir para `diagnostics_channel` se `hasSubscribers` der ganho mensurável ou se o evento for puramente de telemetria.
4. **Nada de biblioteca externa** sem novo Inquiry justificando o que o nativo não resolve.

---

## 6. Saídas (outputs concretos)

- [ ] ADR a abrir quando o primeiro caso de uso real surgir (provavelmente junto da implementação do `ContractCreated` → adapter outbox).
- [ ] Atualizar `handbook/architecture/` apontando esta inquiry quando o ADR sair.
- [ ] Considerar mencionar no glossário/cheatsheet do módulo `contracts` quando ele existir.

---

## 7. Referências

### Handbook local

- [`handbook/reference/nodejs/Events.md`](../reference/nodejs/Events.md) — `EventEmitter`, `EventTarget`, `events.once`, `events.on`.
- [`handbook/reference/nodejs/Diagnostics Channel.md`](../reference/nodejs/Diagnostics%20Channel.md) — `channel()`, `subscribe`, `publish`, `hasSubscribers`, `tracingChannel`.
- [`handbook/reference/nodejs/Performance hooks.md`](../reference/nodejs/Performance%20hooks.md) — `PerformanceObserver`.

### ADRs relacionados

- [ADR-0006 — Modular monolith](../architecture/adr/0006-modular-monolith-core-api.md) — define fronteiras entre módulos.
- [ADR-0011 — Supply-chain hardening](../architecture/adr/0011-supply-chain-hardening.md) — justifica preferência por nativo sobre dependência externa.
- [ADR-0015 — Outbox MySQL](../architecture/adr/0015-mysql-outbox-pattern.md) — solução **autoritativa** para eventos cross-módulo.

### Ticket de contexto (quando a dúvida surgiu)

- `.claude/.pipeline/CTR-STORAGE-S3-ADAPTER/` — durante revisão da Wave W0, ao desenhar adapter de storage.
