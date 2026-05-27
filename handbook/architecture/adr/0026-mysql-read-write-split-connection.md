[← Voltar para ADRs](./README.md)

# ADR-0026: Read/Write Split de Conexão MySQL (writer/reader pools — Master-Slave ready, transversal)

- **Status:** Accepted
- **Date:** 2026-05-27
- **Deciders:** Gabriel Aderaldo + Arquiteto técnico
- **Relacionado:** [ADR-0014](./0014-mysql-database-isolation.md) (uma instância, réplica read-only permitida — NÃO superseded), [ADR-0022](./0022-read-models-via-projection-over-event-stream.md) (separação leitura/escrita lógica), [ADR-0013](./0013-mysql-database-engine.md) (MySQL 8), [ADR-0006](./0006-modular-monolith-core-api.md) (ports & adapters)

---

## Contexto

Surgiu o requisito de **escalar leitura via réplica (Master-Slave)** quando o volume crescer. O [ADR-0014](./0014-mysql-database-isolation.md) já permite réplica de leitura como padrão e fixa a regra de ouro:

> **Cada database tem UM único escritor. Sempre. Sem exceção.** — `0014-mysql-database-isolation.md:60`

> Read replica usada por BI (`readonly_bi`) consultando ambos databases — Read-only, sem mutação — `:141`

Falta a **camada de aplicação** que roteia escrita → primário e leitura → réplica, de forma que ligar a réplica depois seja **só configuração**, sem refactor.

Esta decisão é **transversal** ao core-api, não específica de um módulo. Observação relevante: o módulo `auth` ([ADR-0024](./0024-identity-and-rbac-auth-module.md)) é **write-heavy** (login verifica+emite; refresh rotaciona = escrita; logout = escrita; validação de access token nem toca o banco). O ganho do split aparece sobretudo nas **queries de `contracts`/`fin`** e nos **read-models projetados** do [ADR-0022](./0022-read-models-via-projection-over-event-stream.md).

---

## Decisão

Separar **caminho de escrita** e **caminho de leitura** na borda de persistência, com **dois pools de conexão**.

### Mecanismo

- **Dois endpoints de conexão**: `writer` (primário) e `reader` (réplica). Em MySQL gerenciado (RDS/Cloud SQL/Aurora) são endpoints distintos; o primário aceita escrita, o reader é read-only.
- **Dois pools** (`mysql2`): um por endpoint.
- **Ports de persistência separados por intenção**:
  - Comando/mutação (`save`, `insert`, `update`) → pool **writer**.
  - Query/leitura (`findById`, `list`, projeções) → pool **reader**.

### Single node hoje, réplica depois

Enquanto houver uma só instância, **ambos os pools apontam para o mesmo host** — comportamento idêntico ao atual. Ao introduzir a réplica, o pool de leitura passa a apontar para o `reader endpoint`. **Zero mudança de código** — só a connection string injetada no composition root muda.

### Read-after-write

Replicação MySQL é **assíncrona** (replication lag). Fluxos *read-after-write* críticos (ex.: ler logo após escrever) **leem do primário**. A decisão de roteamento é explícita no use case, não implícita.

### Preserva a regra de ouro

Há **um único escritor** por database (`core_app` no pool writer). O pool reader é estritamente read-only — nunca emite `INSERT/UPDATE/DELETE`. ADR-0014 mantido, não superseded.

---

## Consequências

### Positivas

- Réplica de leitura torna-se *plugável por configuração*, sem refactor — o split nasce pronto.
- Alinha com a separação leitura/escrita lógica do ADR-0022 (read-models podem ler da réplica).
- Isola, desde já, a intenção de cada operação (comando vs query) nos ports.

### Negativas

- Dois pools = mais conexões e mais configuração (timeouts, tamanho de pool por endpoint).
- Replication lag exige disciplina de read-after-write — erro de roteamento causa *stale read*.
- Em single node, o segundo pool é overhead marginal (mitigável apontando ambos ao mesmo host com pool menor).

### Neutras

- Compatível com proxy externo (ProxySQL) ou reader endpoint do Aurora, se um dia for preferível mover o split para a infra.

---

## Alternativas Consideradas

### A. Ler tudo do primário (sem split)

**Rejeitada porque:** não escala leitura; ligar réplica depois exigiria refactor dos repositórios (separar reads de writes sob pressão).

### B. Split transparente via proxy (ProxySQL)

**Rejeitada nesta fase porque:** adiciona um componente de infra (contra "infra reduzida") e esconde o roteamento read-after-write, que é decisão de domínio. Mantida como evolução se o split na aplicação virar fardo.

### C. CQRS físico completo (banco de leitura separado)

**Rejeitada porque:** desproporcional ao volume atual; o ADR-0022 já entrega CQRS lógico (read-models projetados) sem exigir banco separado.

---

## Quando Re-avaliar

- Quando a réplica for de fato provisionada (validar lag aceitável e roteamento read-after-write em staging).
- Se o roteamento manual na aplicação virar fonte de bug recorrente → considerar ProxySQL (alternativa B).
- Se a leitura exigir store especializado (ex.: ElasticSearch para busca textual de contratos).

---

## Invariantes normativas

- **Escrita sempre no pool writer.** O pool reader nunca emite DML de mutação.
- **Read-after-write crítico lê do primário** — nunca da réplica.
- Um único escritor por database (regra de ouro do ADR-0014, mantida).
- O roteamento writer/reader é **explícito** na escolha de port pelo use case, não mágica de runtime.

---

## Referências

- [ADR-0014](./0014-mysql-database-isolation.md) — isolamento, regra de ouro (`:60`), réplica read-only (`:141`).
- [ADR-0022](./0022-read-models-via-projection-over-event-stream.md) — separação leitura/escrita lógica (read-models projetados).
- [ADR-0013](./0013-mysql-database-engine.md) — MySQL 8 como engine.
- [ADR-0006](./0006-modular-monolith-core-api.md) — ports & adapters (a separação vive nos ports).
