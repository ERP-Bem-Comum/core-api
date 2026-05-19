---
name: ports-and-adapters
description: >
  Define como o domínio expressa dependências externas como Ports (types puros) e
  como Application orquestra essas dependências. Adapters são implementações concretas
  fora do domínio. SKILL CANÔNICA para src/modules/*/application/ e src/modules/*/adapters/.
---

# Ports & Adapters (Hexagonal Architecture)

## Persona

Você é o **especialista em fronteira de arquitetura** entre domínio puro e mundo real (banco, HTTP, storage, clock, eventos). Sua função é garantir que **o domínio nunca conhece infra** — ele declara o que precisa via **Ports (types)**, e Adapters (em outra camada) implementam.

> **Fronteira:** edita `src/modules/<modulo>/application/` (use cases, ports out) e `src/modules/<modulo>/adapters/` (implementações). Não toca em `domain/` — esse é território da [`ts-domain-modeler`](../ts-domain-modeler/SKILL.md).

---

## Source of Truth

Para TypeScript moderno, sempre [`handbook/reference/typescript/`](../../../../handbook/reference/typescript/). Para o padrão arquitetural, ver `references/`:

| Tópico | Reference local | Cita |
| :--- | :--- | :--- |
| Ports (driving vs. driven) | [`./references/hexagonal-architecture.md`](./references/hexagonal-architecture.md) | Cockburn (Hexagonal), Vernon (IDDD), handbook do projeto |
| DDD tático aplicado | [`./references/ddd-tactical-patterns.md`](./references/ddd-tactical-patterns.md) | Evans (DDD), Vernon (IDDD) |

---

## 📚 Referências específicas deste projeto

| Tópico | Onde olhar |
| :--- | :--- |
| Regras transversais (zero `throw` em application, ports são `type`, eventos só após save) | [`../../../CLAUDE.md`](../../../CLAUDE.md) |
| **Persistência MySQL única** — port único, adapter Drizzle/mysql2, schema único (`schemas/mysql.ts`), lista normativa de features SQL permitidas/proibidas, upsert estrito por PK via SELECT-then-UPDATE-or-INSERT | [`ADR-0020`](../../../handbook/architecture/adr/0020-mysql-only-supersedes-dual-dialect.md) (supersedes ADR-0018) |
| **Storage de documentos** — AWS S3 (prod) + MinIO Docker (dev), `@aws-sdk/client-s3` único, troca por endpoint | [`ADR-0019`](../../../handbook/architecture/adr/0019-document-storage-s3-with-minio-dev.md) |
| **Email** — mesmo padrão port/adapter aplicado em outro recurso externo | [`ADR-0010`](../../../handbook/architecture/adr/0010-email-port-adapter-pattern.md) |
| **MySQL engine de produção** | [`ADR-0013`](../../../handbook/architecture/adr/0013-mysql-database-engine.md) |
| **Outbox** — eventos cross-módulo persistidos no MySQL antes de publicação | [`ADR-0015`](../../../handbook/architecture/adr/0015-mysql-outbox-pattern.md) |
| Drizzle ORM (queries, schemas, migrations, dialetos) | [`handbook/reference/drizzle/`](../../../handbook/reference/drizzle/) |
| mysql2 driver (quando MySQL real for wired) | [`handbook/reference/mysql2/`](../../../handbook/reference/mysql2/) |
| Node 24 + ESM/NodeNext | [`handbook/reference/nodejs/`](../../../handbook/reference/nodejs/) |
| Handbook §07 (ACL/fronteira externa) — vocabulário aceito na borda | [`handbook/domain_questions/contratos/07-external-context.md`](../../../handbook/domain_questions/contratos/07-external-context.md) |
| Exemplos vivos: use cases entregues | `.claude/.pipeline/CTR-USECASE-CREATE-CONTRACT/`, `CTR-USECASE-CREATE-AMENDMENT/`, `CTR-USECASE-HOMOLOGATE-AMENDMENT/`, `CTR-USECASE-ATTACH-DOCUMENT/`, `CTR-USECASE-QUERIES/` |
| Exemplos vivos: adapters entregues | `.claude/.pipeline/CTR-ADAPTER-DRIZZLE-DUAL/`, `CTR-STORAGE-PORT/` |
| Código de produção que materializa este padrão | `src/modules/contracts/application/{ports,use-cases}/`, `src/modules/contracts/adapters/persistence/{drivers,schemas,mappers,repos,migrations}/` |

---

## Princípios

1. **Dependency inversion** — domínio define o tipo (Port); adapter implementa.
2. **Ports são `type`, não `interface`** — `interface` em TS sugere OO; `type` casa com nosso estilo funcional.
3. **Sem `class` em ports** — apenas funções e shapes Readonly.
4. **Use case = factory function** — recebe deps, devolve função que executa.
5. **`throw` em adapter é OK, mas conversão para `Result` antes de devolver pro use case.**
6. **Events publicados via outbox** ([ADR-0015](../../../../handbook/architecture/adr/0015-mysql-outbox-pattern.md)), nunca via dispatcher in-memory.

---

## Tipos de Ports

### Driving Ports (entrada — quem chama o domínio)

Exemplos: HTTP controller, CLI command, message consumer. **Não modelamos como type** em geral — o use case é a "porta de entrada" direta.

```ts
// Use case = driving port implícito
export type RegistrarAditivoUseCase = (
  cmd: RegistrarAditivoCommand,
) => Promise<Result<AditivoRegistrado, RegistrarAditivoError>>;
```

### Driven Ports (saída — o que o domínio precisa do mundo)

Exemplos: Repository, EventBus, Clock, ID generator, Storage, ExternalAPI. **Sempre modelados como type explícito.**

```ts
// src/modules/contratos/application/ports/contrato-repository.ts
import type { Contrato, ContratoId } from '../../domain/index.ts';
import type { Result } from '../../../../shared/result.ts';

export type ContratoRepositoryError =
  | 'db-unavailable'
  | 'optimistic-lock-conflict';

export type ContratoRepository = Readonly<{
  findById: (id: ContratoId) => Promise<Result<Contrato | null, ContratoRepositoryError>>;
  save: (contrato: Contrato) => Promise<Result<void, ContratoRepositoryError>>;
  listVigentes: () => Promise<Result<readonly Contrato[], ContratoRepositoryError>>;
}>;
```

```ts
// src/modules/contratos/application/ports/clock.ts
export type Clock = Readonly<{
  now: () => Date;
}>;
```

```ts
// src/modules/contratos/application/ports/event-bus.ts
import type { ContratoEvento } from '../../domain/index.ts';
import type { Result } from '../../../../shared/result.ts';

export type EventBusError = 'outbox-write-failed';

export type EventBus = Readonly<{
  publish: (evento: ContratoEvento) => Promise<Result<void, EventBusError>>;
}>;
```

---

## Use Case = Factory Function

```ts
// src/modules/contratos/application/use-cases/criar-contrato.ts
import { type Result, ok, err, isErr } from '../../../../shared/result.ts';
import { Contrato, type ContratoError } from '../../domain/contrato/index.ts';
import type { ContratoRepository } from '../ports/contrato-repository.ts';
import type { Clock } from '../ports/clock.ts';
import type { EventBus, EventBusError } from '../ports/event-bus.ts';

export type CriarContratoCommand = Readonly<{
  numeroSequencial: string;
  titulo: string;
  objeto: string;
  valorOriginalCentavos: number;
  inicioVigencia: string; // ISO
  fimVigencia: string;    // ISO
}>;

export type CriarContratoError =
  | ContratoError
  | ContratoRepositoryError
  | EventBusError
  | 'data-invalida';

type Deps = Readonly<{
  contratoRepo: ContratoRepository;
  clock: Clock;
  eventBus: EventBus;
}>;

export const criarContrato =
  (deps: Deps) =>
  async (cmd: CriarContratoCommand): Promise<Result<Contrato, CriarContratoError>> => {
    const inicio = new Date(cmd.inicioVigencia);
    const fim = new Date(cmd.fimVigencia);

    const novo = Contrato.criar({
      numeroSequencial: cmd.numeroSequencial,
      titulo: cmd.titulo,
      objeto: cmd.objeto,
      valorOriginalCentavos: cmd.valorOriginalCentavos,
      inicioVigencia: inicio,
      fimVigencia: fim,
      agora: deps.clock.now(),
    });
    if (isErr(novo)) return novo;

    const persistido = await deps.contratoRepo.save(novo.value);
    if (isErr(persistido)) return persistido;

    const evento = {
      type: 'ContratoMaeCriado' as const,
      contratoId: novo.value.id,
      numeroSequencial: novo.value.numeroSequencial,
      valorOriginal: novo.value.valorOriginal,
      vigenciaOriginal: novo.value.vigenciaOriginal,
      ocorridoEm: deps.clock.now(),
    };
    const publicado = await deps.eventBus.publish(evento);
    if (isErr(publicado)) return publicado;

    return ok(novo.value);
  };
```

Pontos-chave:

- **Factory function:** `(deps) => (cmd) => Promise<Result<...>>` — DI explícito.
- **Sequência obrigatória:** validar → buscar → operar (domínio) → persistir → emitir evento.
- **Eventos depois de save** — se save falha, evento não sai.
- **`Deps` é `Readonly<>`** — não dá pra trocar adapter no meio do uso.
- **Error union explícita** — todo erro possível tipado.

---

## Adapter pattern — exemplo MySQL

```ts
// src/modules/contratos/adapters/contrato-repository.mysql.ts
import { type Result, ok, err } from '../../../../shared/result.ts';
import type { Contrato, ContratoId } from '../../domain/index.ts';
import type { ContratoRepository, ContratoRepositoryError } from '../application/ports/contrato-repository.ts';

type DbConnection = /* tipo da lib (Drizzle, mysql2, etc.) */ unknown;

export const ContratoRepositoryMysql = (db: DbConnection): ContratoRepository => ({
  findById: async (id) => {
    try {
      const row = await /* query */ null;
      if (row === null) return ok(null);
      return ok(mapRowToContrato(row));
    } catch (e) {
      // `throw` é OK aqui. Convertido para Result antes de devolver ao use case.
      return err('db-unavailable');
    }
  },
  save: async (contrato) => {
    try {
      await /* upsert */ null;
      return ok(undefined);
    } catch (e) {
      return err('db-unavailable');
    }
  },
  listVigentes: async () => {
    try {
      const rows = /* query */ [] as readonly unknown[];
      return ok(rows.map(mapRowToContrato));
    } catch (e) {
      return err('db-unavailable');
    }
  },
});

const mapRowToContrato = (row: unknown): Contrato => {
  // mapeamento + uso de smart constructors com `unwrap` no caso row-bem-formado-pela-coluna,
  // ou retornar Result se o row pode estar corrompido
  return {} as Contrato;
};
```

Adapter equivalente em memória (para testes e CLI da P.O.):

```ts
// src/modules/contratos/adapters/contrato-repository.in-memory.ts
export const ContratoRepositoryInMemory = (): ContratoRepository => {
  const store = new Map<ContratoId, Contrato>();
  return {
    findById: async (id) => ok(store.get(id) ?? null),
    save: async (c) => { store.set(c.id, c); return ok(undefined); },
    listVigentes: async () => ok([...store.values()].filter(c => c.status === 'Vigente')),
  };
};
```

---

## Ports compartilhadas vs. próprias do módulo

| Port | Local | Reusabilidade |
| :--- | :--- | :--- |
| `Clock` | `src/shared/ports/clock.ts` | Compartilhada — todo módulo usa |
| `IdGenerator` | `src/shared/ports/id-generator.ts` | Compartilhada |
| `EventBus` | `src/shared/ports/event-bus.ts` (interface) + módulos definem eventos próprios | Compartilhada o port, próprio o payload |
| `ContratoRepository` | `src/modules/contratos/application/ports/` | Específica do módulo |
| `DocumentoStorage` | `src/modules/contratos/application/ports/` | Específica do módulo |

> Regra: se 2+ módulos usam, sobe pro `shared/`. Senão, fica no módulo.

---

## Workflow

1. **Ler o handbook de domínio do BC alvo** (`handbook/domain/contratos/` ou `domain/financeiro/`).
2. **Identificar as dependências externas** que o use case precisa (DB? Clock? EventBus?).
3. **Criar/atualizar os Ports** em `application/ports/`.
4. **Implementar o use case** como factory function que recebe deps.
5. **Implementar 2 adapters** sempre: um real (MySQL) e um InMemory (para testes + CLI da P.O.).
6. **Validar** que o use case roda contra o InMemory sem mudar uma linha.

---

## Checklist de qualidade

- [ ] Ports são `type Readonly<{...}>` com funções, nunca `class`.
- [ ] Use cases são factory functions `(deps) => (input) => Promise<Result<...>>`.
- [ ] `throw` zero em application; convertido para `Result` no adapter.
- [ ] Dois adapters por port: real + InMemory.
- [ ] Error unions agregam erros do domínio + de cada port.
- [ ] Eventos emitidos via `EventBus.publish` apenas após `repo.save` retornar `ok`.
- [ ] `Clock.now()` em vez de `new Date()` em qualquer ponto fora do adapter.

---

## Anti-padrões

| ❌ Errado | ✅ Certo |
| :--- | :--- |
| `interface ContratoRepository` | `type ContratoRepository = Readonly<{...}>` |
| `class ContratoRepositoryImpl implements ContratoRepository` | `const ContratoRepositoryMysql = (db) => ({ findById: ..., save: ... })` |
| Use case importando `mysql2` direto | Use case só importa Port; adapter usa lib |
| `new Date()` dentro do use case | `deps.clock.now()` |
| `eventBus.publish(...)` antes de `repo.save(...)` | Save primeiro, evento depois |
| Adapter lançando exceção pra application | Adapter converte exception em `Result` |
| 1 adapter só (MySQL) sem InMemory | Sempre par real + InMemory |
| Port no `domain/` | Port no `application/ports/` (domain não conhece infra) |

---

## Como esta skill se relaciona com outras

```
ts-domain-modeler  (modela tipos puros e regras invariantes)
       ▼
ports-and-adapters ◄── você está aqui (orquestra use cases + Ports + adapters)
       │
       ├─► modular-monolith         (decide o que é cross-módulo vs. módulo-próprio)
       │
       └─► application-cli-builder  (CLI consome use cases via InMemory adapter)
```

---

## Changelog

- **2026-05-14:** Criação.
