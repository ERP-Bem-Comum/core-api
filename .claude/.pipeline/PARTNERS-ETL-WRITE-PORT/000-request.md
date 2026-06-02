# PARTNERS-ETL-WRITE-PORT — Port de provisionamento idempotente das 4 entidades par_*

> **Size:** M · **Módulo:** `partners` (apenas `par_*`) · **Slice:** 3b-i da cadeia `PARTNERS-ETL-BOOTSTRAP`.
> **Decisão (sessão 2026-06-02):** espelhar o auth (D14) — a ETL escreve em partners via **public-api**, não
> via insert direto dos schemas. Análogo a `AUTH-ETL-USER-PROVISIONING` (3a). **3b-ii depende deste.**

## Contexto

O writer da ETL (slice 3b-ii, em `scripts/etl/`) precisa persistir os agregados `Supplier`, `Financier`,
`Collaborator` e `UserProfile` (já construídos pelos mappers do CORE) de forma **idempotente por `legacy_id`**.
Os repos Drizzle atuais de partners fazem `save` (upsert por `id`) e **não** conhecem `legacy_id` (os
`*ToInsert` não o setam, e não há `findByLegacyId`). Este ticket entrega a camada ciente de `legacy_id`
atrás da public-api de partners, para o 3b-ii consumir sem tocar os internos de persistência (ADR-0006).

`legacy_id INT NULL UNIQUE` já existe nas 4 `par_*` (P2, em `dev`) — **sem migration neste ticket**.

## Escopo

### 1. Port `PartnersEtlPort` (public-api)

Novo `src/modules/partners/public-api/etl.ts`. Port genérico por entidade:

```
type LegacyEntityStore<A, Ref> = Readonly<{
  findByLegacyId: (legacyId: number) => Promise<Result<Ref | null, PartnersEtlStoreError>>;
  provision: (aggregate: A, legacyId: number) => Promise<Result<ProvisionOutcome, PartnersEtlStoreError>>;
}>;
type ProvisionOutcome = 'created' | 'already-exists';

type PartnersEtlPort = Readonly<{
  suppliers: LegacyEntityStore<Supplier, SupplierId>;
  financiers: LegacyEntityStore<Financier, FinancierId>;
  collaborators: LegacyEntityStore<Collaborator, CollaboratorId>;
  userProfiles: LegacyEntityStore<UserProfile, UserRef>;
  close: () => Promise<void>;
}>;
```

- **`provision(aggregate, legacyId)`** recebe o agregado **já construído** (o rehydrate fica nos mappers do
  CORE; este port só persiste). Insert idempotente: SELECT FOR UPDATE by `legacy_id` → skip se já existe
  (`already-exists`), senão INSERT com `legacy_id` (`created`). **NUNCA UPDATE** (re-run não sobrescreve).
  Captura `ER_DUP_ENTRY (1062)` no `par_<x>_legacy_id_idx` (corrida) → `already-exists`.
- **`findByLegacyId`** → ref (PK) já migrada, ou null. Nota: `userProfiles` tem PK `user_ref` (não `id`).
- Reusa os mappers `*ToInsert` (adicionando `legacyId` à row). Sem regra de negócio nova.

### 2. Adapters

- **InMemory** genérico `makeInMemoryLegacyEntityStore<A, Ref>(refOf)` (`Map<legacyId, {aggregate, ref}>`) — para testes + o 3b-ii rodar offline.
- **Drizzle** `createDrizzlePartnersEtlStores(handle, clock)` → as 4 `LegacyEntityStore` reais (helper compartilhado de SELECT-FOR-UPDATE-by-legacy_id → skip/insert).

### 3. Factory `buildPartnersEtlPort` (public-api)

`buildPartnersEtlPort({ connectionString }): Promise<Result<PartnersEtlPort, PartnersMysqlDriverError>>` —
wira `openPartnersMysql(applyMigrations: true)` + os 4 stores Drizzle, sem subir Fastify. Espelha `buildAuthEtlPort`.

## Critérios de aceite

- [ ] `provision` cria o registro com `legacy_id` setado; 2ª chamada com mesmo `legacyId` → `already-exists` e **não** reescreve (idempotência skip-não-UPDATE), por entidade.
- [ ] `findByLegacyId` retorna a ref migrada (ou null); funciona para `userProfiles` (PK `user_ref`).
- [ ] Agregado `Inactive` migra preservando `deactivatedAt`/`disableBy` (rehydrate já feito no CORE; o port não altera estado).
- [ ] `ER_DUP_ENTRY` em `par_<x>_legacy_id_idx` (corrida) tratado como `already-exists`, não erro fatal.
- [ ] Port montável de connection-string sem Fastify; exportado pela public-api.
- [ ] Teste de integração gated (`MYSQL_INTEGRATION=1`) cobre idempotência das 4 entidades + `findByLegacyId`. Adicionado a `test:integration:partners` (reprodutível, não falso-verde).
- [ ] W3 verde: typecheck + format + lint + test.

## Fora de escopo

- Mappers/rehydrate (são do CORE, já entregue) e qualquer escrita em `auth_*`.
- Orquestração, ordem entre entidades, quarentena, reconciliação, `scripts/etl/` — é o slice **3b-ii** (`PARTNERS-ETL-ORCHESTRATOR`).
- Migration (a coluna `legacy_id` já existe nas `par_*`).

## Notas de disciplina

- Módulo único `partners` nesta sessão (anti-padrão #4). Espelha o padrão de `AUTH-ETL-USER-PROVISIONING`/`buildAuthEtlPort`.
- Reusa agregados/mappers/repos existentes; zero regra de negócio nova. Idioma: erros EN kebab-case; doc PT-BR.
