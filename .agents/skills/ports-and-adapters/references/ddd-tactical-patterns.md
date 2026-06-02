# DDD Tactical Patterns aplicados em TypeScript

> 📖 **Fontes:**
>
> - Eric Evans — _Domain-Driven Design_ (DDD original, 2003).
> - Vaughn Vernon — _Implementing Domain-Driven Design_ (IDDD), Caps. 5–11.
> - Marcio Valente — _Fundamentos de Manutenção de Software_ (PT-BR).
> - Sempre [`handbook/reference/typescript/`](../../../../../handbook/reference/typescript/) para sintaxe TS moderna.

---

## 1. Os patterns que usamos

| Pattern DDD                     | Aplicação em TS no projeto                                                                                         |
| :------------------------------ | :----------------------------------------------------------------------------------------------------------------- |
| **Entity**                      | `type X = Readonly<{ id: XId; ... }>` — identidade via branded `XId`                                               |
| **Value Object (VO)**           | `type Moeda = Brand<{ centavos: number }, 'Moeda'>` — sem identidade, comparado por valor                          |
| **Aggregate**                   | Raiz + sub-entidades sob a mesma fronteira de consistência. Funções de domínio operam sobre a raiz.                |
| **Aggregate Root**              | A "entrada" do agregado. Ex.: `Contrato` é root, `Aditivo` é entidade interna                                      |
| **Repository**                  | Port (type) em `application/ports/`. Adapters em `adapters/`.                                                      |
| **Domain Service**              | Função pura que orquestra múltiplos agregados sem pertencer a nenhum                                               |
| **Domain Event**                | Discriminated union com `type` literal e `ocorridoEm: Date`                                                        |
| **Bounded Context (BC)**        | Pasta `src/modules/<bc>/` com fronteira clara (ver [`modular-monolith/SKILL.md`](../../modular-monolith/SKILL.md)) |
| **Anti-Corruption Layer (ACL)** | Adapter que isola domínio de sistema externo                                                                       |

---

## 2. Entity vs. Value Object

### Entity — identidade matters

```ts
type Contrato = Readonly<{
  id: ContratoId; // identidade
  numeroSequencial: string;
  status: StatusContrato;
  valorVigente: Moeda;
}>;

// Duas instâncias com mesmo `id` são "o mesmo contrato"
// mesmo que status mude
const igual = (a: Contrato, b: Contrato) => a.id === b.id;
```

### Value Object — valor matters

```ts
type Moeda = Brand<{ readonly centavos: number }, 'Moeda'>;

// Dois VOs com mesmo valor são intercambiáveis
const igual = (a: Moeda, b: Moeda) => a.centavos === b.centavos;
```

> **Regra:** se a regra de negócio precisa saber "é o mesmo objeto?", é Entity. Se só importa "tem o mesmo valor?", é VO.

---

## 3. Aggregate — fronteira de consistência

Um Aggregate é o **escopo de uma transação**. Tudo que muda junto vive sob a mesma raiz.

```ts
// src/modules/contratos/domain/contrato/types.ts
export type Contrato = Readonly<{
  id: ContratoId;
  numeroSequencial: string;
  titulo: string;
  status: StatusContrato;
  valorOriginal: Moeda;
  vigenciaOriginal: Periodo;
  valorVigente: Moeda;
  vigenciaVigente: Periodo;

  // Aditivo é entidade interna, vive dentro do agregado Contrato
  aditivosHomologados: readonly Aditivo[];
}>;
```

Regras:

- **Operações de mudança são funções que recebem o root inteiro** e devolvem um novo root:
  ```ts
  export const homologarAditivo = (
    contrato: Contrato,
    aditivo: Aditivo,
    agora: Date,
  ): Result<Contrato, ContratoError> => { ... };
  ```
- **Sub-entidades não são acessadas diretamente de fora do agregado.** Quem quer ler `aditivosHomologados[0]` passa pelo root.
- **Repository persiste o agregado inteiro**, não pedaços.

---

## 4. Domain Event

Eventos são **fatos imutáveis** que aconteceram no domínio. Discriminated union:

```ts
export type ContratoEvento =
  | {
      readonly type: 'ContratoMaeCriado';
      readonly contratoId: ContratoId;
      readonly ocorridoEm: Date; /* ... */
    }
  | {
      readonly type: 'EstadoContratualAtualizado';
      readonly contratoId: ContratoId;
      readonly ocorridoEm: Date; /* ... */
    }
  | {
      readonly type: 'ContratoEncerrado';
      readonly contratoId: ContratoId;
      readonly ocorridoEm: Date; /* ... */
    };
```

Pontos:

- **Nomes EN, no passado** (Criado, Atualizado, Encerrado) — fato consumado.
- **`ocorridoEm` sempre presente** — injetado pelo Clock.
- **Payload mínimo** — quem quer detalhes, lê o repositório.
- **Persistir via Outbox** ([ADR-0015](../../../../../handbook/architecture/adr/0015-mysql-outbox-pattern.md)) — só publica depois de commit do agregado.

---

## 5. Repository — abstração simples

> "A REPOSITORY represents all objects of a certain type as a conceptual set... It is similar to a collection." — Evans, DDD

```ts
export type ContratoRepository = Readonly<{
  findById: (id: ContratoId) => Promise<Result<Contrato | null, RepositoryError>>;
  save: (c: Contrato) => Promise<Result<void, RepositoryError>>;
  // queries específicas só quando há justificativa
  listVigentes: () => Promise<Result<readonly Contrato[], RepositoryError>>;
}>;
```

Anti-patterns DDD em repository:

| ❌ Errado                                       | ✅ Certo                                                |
| :---------------------------------------------- | :------------------------------------------------------ |
| `repo.update(...)`, `repo.create(...)`          | Apenas `save` (upsert lógico). Repo não sabe se é novo. |
| `repo.execute(sql)`                             | Repo expõe operações de domínio, não SQL                |
| `repo.findByNumeroSequencial(...)` proliferando | Adicione só quando o use case exigir                    |
| Repository de VO                                | VOs não têm repository — vivem dentro do agregado       |
| `repo.findById(id, includeAditivos: true)`      | Repo carrega o agregado inteiro sempre                  |

---

## 6. Domain Service

Quando uma operação **não pertence naturalmente a um agregado**, é Domain Service.

```ts
// Domain Service que calcula limite de aprovação combinando múltiplos agregados
export const calcularLimiteAprovacao = (
  contrato: Contrato,
  programa: Programa,
  usuario: UsuarioRef,
): Moeda => {
  /* ... pura, sem repo, sem effects ... */
};
```

Regras:

- **Recebe agregados como argumentos**, nunca acessa repository.
- **É pura** — sem `Date.now()`, sem random, sem I/O.
- Vive em `domain/<modulo>/services/` se ficar grande.

---

## 7. Anti-Corruption Layer (ACL)

ACL é um **adapter especial** que protege o domínio novo de um sistema legado/externo com modelo divergente.

No nosso caso: o **legado** (`abc-erp-financeiro-prod`, MySQL 8.4 com `contracts` legado) usa modelo achatado. O **novo** modela Contrato Mãe + Aditivo separados. O ACL traduz.

```ts
// src/modules/contratos/adapters/legacy-contrato-adapter.ts
// Lê schema legado e devolve o tipo Contrato/Aditivo do novo modelo
export const LegacyContratoAdapter = (
  db: LegacyDb,
): Readonly<{
  readContratoMae: (legacyId: number) => Promise<Result<Contrato, AdapterError>>;
  readAditivos: (legacyParentId: number) => Promise<Result<readonly Aditivo[], AdapterError>>;
}> => ({
  /* ... mapeia colunas do legado para tipos do domínio ... */
});
```

---

## 8. Bounded Context boundary

Dentro do mesmo monolito, módulos diferentes (`modules/contratos/`, `modules/financeiro/`) são **Bounded Contexts**. Eles se comunicam **apenas via eventos** ([ADR-0015](../../../../../handbook/architecture/adr/0015-mysql-outbox-pattern.md)):

```
modules/contratos ──── ContratoMaeCriado ────▶  modules/financeiro
                  ──── EstadoContratualAtualizado ──▶
                  ──── ContratoEncerrado ──▶
```

**Proibido:**

- `modules/financeiro/...` importando `modules/contratos/domain/*`
- Repository de Contratos sendo chamado por Financeiro
- Tabela compartilhada `fin_*` lida ou escrita por Contratos

Ver [`modular-monolith/SKILL.md`](../../modular-monolith/SKILL.md) para detalhes.

---

## 9. Anti-padrões DDD em TS

| ❌ Errado                                                     | ✅ Certo                                              |
| :------------------------------------------------------------ | :---------------------------------------------------- |
| Anêmico: entity com getters/setters, regra fora               | Função pura que recebe entity + retorna nova entity   |
| Active Record: entity faz `save()` em si                      | Repository fora do agregado                           |
| Domain → infra (repo importado no domain)                     | Domain define type Port; application/repo implementam |
| Compartilhar entity entre BCs                                 | Eventos cross-BC; modelos próprios em cada lado       |
| VO mutável                                                    | VO `Readonly<>` sempre                                |
| Aggregate root expondo entidades internas para mutação direta | Mutação só via funções do root                        |

---

## 10. Como aplicar quando há dúvida

1. **É algo identificável e tem ciclo de vida?** → Entity.
2. **É um valor sem identidade própria?** → VO.
3. **É uma fronteira de consistência transacional?** → Aggregate.
4. **É uma operação que não pertence a um agregado?** → Domain Service.
5. **É um fato que aconteceu e quero outros saberem?** → Domain Event.
6. **Preciso de algo de fora (banco, clock, evento)?** → Port + Adapter.
7. **O outro lado do mundo é caótico/legado?** → ACL adapter.
