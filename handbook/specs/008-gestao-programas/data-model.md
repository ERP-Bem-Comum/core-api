# Phase 1 — Data Model: Gestão de Programas

> Modelagem do agregado `Program`, VOs, eventos, schema Drizzle (`prg_*`) e port. Tipos em EN; segue ADR-0018/0020 (UUID PK, sem ENUM/JSON nativo, Money/datas mapeadas) e os padrões reais de `contracts`.

---

## Agregado: `Program` (raiz)

```ts
// domain/program/types.ts
export type Program = Readonly<{
  id: ProgramId; // UUID v4 (PK de domínio)
  programNumber: number; // sequencial interno (BIGINT), gerado pela app
  name: string; // obrigatório
  sigla: Sigla; // VO — único (case-insensitive)
  director: string | null; // opcional, texto livre
  generalCharacteristics: string | null; // opcional, texto longo
  logoKey: string | null; // referência ao objeto no storage (opcional)
  status: ProgramStatus; // 'ATIVO' | 'INATIVO'
  version: number; // optimistic-lock (inicia 1)
  createdAt: Date;
  updatedAt: Date;
}>;
```

**Identidade**: `id` é a referência cross-módulo (`ProgramaID` no Financeiro/Documentos). `programNumber` é exibição interna; nunca usado como FK.

### Operações puras (`domain/program/program.ts`)

| Operação     | Assinatura                                                                      | Invariantes                                                   | Evento               |
| ------------ | ------------------------------------------------------------------------------- | ------------------------------------------------------------- | -------------------- |
| `create`     | `(input) => Result<{ program; event }, ProgramError>`                           | name não-vazio (≥2); sigla válida; nasce `ATIVO`, `version=1` | `ProgramCreated`     |
| `update`     | `(program, patch, expectedVersion) => Result<{ program; event }, ProgramError>` | name/sigla mantêm validações; `version` confere               | `ProgramUpdated`     |
| `deactivate` | `(program) => Result<{ program; event }, ProgramError>`                         | exige `status==='ATIVO'` senão `program-not-active`           | `ProgramDeactivated` |
| `reactivate` | `(program) => Result<{ program; event }, ProgramError>`                         | exige `status==='INATIVO'` senão `program-not-inactive`       | `ProgramReactivated` |

> `programNumber` **não** é gerado no domínio puro (depende de estado global da tabela); é atribuído pelo repositório no `save` (ver D3). O domínio cria o `Program` com `programNumber` recebido como parte do input do `save` ou via porta — o use case `create-program` orquestra: monta o agregado, delega geração ao repo dentro da transação.

---

## Value Objects

### `ProgramId` (`domain/shared/program-id.ts`)

```ts
export type ProgramId = Brand<string, 'ProgramId'>;
export type ProgramIdError = 'program-id-invalid';
export const generate = (): ProgramId => newUuid() as ProgramId;
export const rehydrate = (raw: string): Result<ProgramId, ProgramIdError> =>
  isUuidV4(raw) ? ok(raw as ProgramId) : err('program-id-invalid');
```

### `Sigla` (`domain/program/sigla.ts`)

- Normalização: `trim` + `toUpperCase`.
- Validação: não-vazia; sem espaços internos; `^[A-Z0-9]{2,20}$` (letras/dígitos, 2–20). Rejeita `program-sigla-invalid`.
- Unicidade (case-insensitive) garantida na persistência via coluna normalizada `sigla` + `UNIQUE` (a app sempre grava normalizado).

### `ProgramStatus` (`domain/program/status.ts`)

```ts
export type ProgramStatus = 'ATIVO' | 'INATIVO';
```

Transições válidas: `ATIVO → INATIVO` (deactivate), `INATIVO → ATIVO` (reactivate). Switch exaustivo com `const _: never`.

---

## Erros (`domain/program/errors.ts`)

```ts
export type ProgramError =
  | 'program-name-required'
  | 'program-sigla-invalid'
  | 'program-sigla-duplicated'
  | 'program-not-active' // desativar algo já inativo
  | 'program-not-inactive' // reativar algo já ativo
  | 'program-version-conflict' // optimistic-lock
  | 'program-not-found';
```

---

## Eventos (`domain/program/events.ts`)

```ts
export type ProgramEvent = Readonly<
  | { type: 'ProgramCreated'; programId: ProgramId; occurredAt: Date }
  | { type: 'ProgramUpdated'; programId: ProgramId; occurredAt: Date }
  | { type: 'ProgramDeactivated'; programId: ProgramId; occurredAt: Date }
  | { type: 'ProgramReactivated'; programId: ProgramId; occurredAt: Date }
>;
```

`public-api/events.ts` re-exporta como `ProgramsModuleEvent` (com decoder versionado), contrato que o outbox conhece. Publicação: `INSERT` em `prg_outbox` na **mesma transação** do `save` (append-in-tx, padrão contracts).

---

## Port (`domain/program/repository.ts`)

```ts
export type ProgramRepositoryError =
  | 'program-repo-unavailable'
  | 'program-repo-conflict'
  | OutboxAppendError;

export type ProgramRepository = Readonly<{
  findById: (id: ProgramId) => Promise<Result<Program | null, ProgramRepositoryError>>;
  findBySigla: (siglaNormalized: string) => Promise<Result<Program | null, ProgramRepositoryError>>;
  listPaged: (query: ListProgramsQuery) => Promise<Result<ProgramPage, ProgramRepositoryError>>;
  save: (
    program: Program,
    events: readonly ProgramsModuleEvent[],
  ) => Promise<Result<void, ProgramRepositoryError>>;
}>;

export type ListProgramsQuery = Readonly<{
  page: number; // 1-based
  limit: 5 | 10 | 25; // default 5
  order: 'ASC' | 'DESC';
  search?: string; // substring case-insensitive em name OU sigla
  status?: ProgramStatus;
}>;
```

> `save` é responsável por: gerar `programNumber` (MAX+1 sob `FOR UPDATE`) quando novo; aplicar optimistic-lock (`WHERE version = expected`) quando update; e append no outbox — tudo numa transação.

---

## Schema Drizzle (`adapters/persistence/schemas/mysql.ts`)

```ts
export const programs = mysqlTable(
  'prg_programs',
  {
    id: varchar('id', { length: 36 }).primaryKey().notNull(), // UUID v4 (COLLATE utf8mb4_bin na migration)
    programNumber: bigint('program_number', { mode: 'number' }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    sigla: varchar('sigla', { length: 20 }).notNull(), // já normalizado (uppercase)
    director: varchar('director', { length: 255 }),
    generalCharacteristics: text('general_characteristics'),
    logoKey: varchar('logo_key', { length: 512 }),
    status: varchar('status', { length: 16 }).notNull(),
    version: int('version').notNull(),
    createdAt: datetime('created_at', { mode: 'date', fsp: 3 }).notNull(),
    updatedAt: datetime('updated_at', { mode: 'date', fsp: 3 }).notNull(),
  },
  (t) => [
    check('prg_programs_status_chk', sql`${t.status} IN ('ATIVO','INATIVO')`),
    uniqueIndex('prg_programs_number_uq').on(t.programNumber),
    uniqueIndex('prg_programs_sigla_uq').on(t.sigla),
    index('prg_programs_status_idx').on(t.status),
    index('prg_programs_name_idx').on(t.name),
  ],
);
```

**Tabela `prg_outbox`**: espelha `ctr_outbox` (id, aggregate_type, aggregate_id, event_type, payload `text` (não JSON nativo — ADR-0020), occurred_at, published_at nullable).

**Migration**: `pnpm run db:generate` → editar SQL para `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci` e `sigla`/`id` com collation apropriada (`id` → `utf8mb4_bin`). Tabela de controle: `__drizzle_migrations_programs`.

---

## Rastreabilidade FR → modelo

| FR          | Onde                                                         |
| ----------- | ------------------------------------------------------------ |
| FR-001/002  | `Program` (id + programNumber + atributos)                   |
| FR-003      | `create` nasce `ATIVO`                                       |
| FR-004      | `createdAt`/`updatedAt`                                      |
| FR-006      | `program-name-required` / `program-sigla-invalid`            |
| FR-007/015  | `findBySigla` + `UNIQUE` + `program-sigla-duplicated`        |
| FR-008..011 | `listPaged` + `ListProgramsQuery`                            |
| FR-012/013  | `findById` → `program-not-found`                             |
| FR-016      | `version` + `program-version-conflict`                       |
| FR-017/018  | `deactivate`/`reactivate` + `program-not-active`/`-inactive` |
| FR-019      | sem DELETE físico (status)                                   |
| FR-021/022  | `logoKey` + port `LogoStorage`                               |
