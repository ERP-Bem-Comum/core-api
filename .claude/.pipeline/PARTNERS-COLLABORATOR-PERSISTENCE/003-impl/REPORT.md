# W1 — GREEN · PARTNERS-COLLABORATOR-PERSISTENCE

**Skill:** drizzle-schema-author · **Resultado:** GREEN (mapper unit 14/14; suíte partners 157/157)

## Arquivos criados/editados

**Schema** `adapters/persistence/schemas/mysql.ts`
- `par_collaborators` (3ª tabela do módulo): 28 colunas. PRE_CADASTRO obrigatórios + pessoais nullable +
  soft-delete (`active`/`disable_by`/`deactivated_at`) + `registration_status` (varchar livre).
- CHECK `par_collaborators_soft_delete_chk`: `active=false ⟺ deactivated_at NOT NULL ⟺ disable_by NOT NULL`.
- UNIQUE `par_collaborators_cpf_idx` **e** `par_collaborators_email_idx`. Exporta `CollaboratorRow`/`NewCollaboratorRow`.

**Migration** `migrations/mysql/0002_young_cerise.sql`
- Gerada por `pnpm db:generate:partners` + edição manual: `COLLATE utf8mb4_bin` em `id`/`cpf`;
  `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`. Journal próprio aplica só a 0002.

**Mapper** `mappers/collaborator.mapper.ts`
- `collaboratorToInsert(c, now)`: enums/pessoais achatados; `active`/`disable_by`/`deactivated_at` do soft-delete.
- `collaboratorFromRow(row)`: reconstrói `Cpf`/`OccupationArea`/`EmploymentRelationship` + enums nullable
  (`parseNullable` helper), valida `registration_status`, delega a `Collaborator.rehydrate` (domínio
  **não tocado** — `rehydrate` já existia). Erros: `*-invalid-{id,cpf,enum,state}`.

**Repo Drizzle** `repos/collaborator-repository.drizzle.ts`
- `createDrizzleCollaboratorStore` implementa `CollaboratorRepository` (findById/findByCpf/findByEmail/list/save).
- `save` = SELECT-then-UPDATE-or-INSERT (ADR-0020 sem ODKU). `dupEntryIndex` discrimina ER_DUP_ENTRY (1062)
  pelo nome do índice no `sqlMessage`: `cpf` → `collaborator-cpf-duplicate`, `email` → `collaborator-email-duplicate`.

**package.json**
- `test:integration:partners` estendido com `collaborator-repository.drizzle.test.ts`.

## Decisões de design

- **`registration_status` sem CHECK de enum** — varchar livre, igual `service_category` do supplier
  (confia no domínio + mapper). YAGNI; ADR-0020 proíbe ENUM nativo.
- **Sem destino de pagamento** (mais simples que supplier), mas **2 unicidades** exigiram discriminar o
  índice no erro de duplicata (supplier tinha só CNPJ).
- **`biography` varchar(2000)** — suficiente; evita TEXT por consistência com o resto do schema.

## Confirmação GREEN

```
mapper unit:      ℹ tests 14  · pass 14 · fail 0
suíte partners:   ℹ tests 157 · pass 157 · fail 0
```

> Repo Drizzle valida sob integração (Docker, `MYSQL_INTEGRATION=1`) — **não rodado** neste W1 para não
> alterar/zerar (`down -v`) o container `bemcomum-mysql` do usuário sem autorização. Gap conhecido,
> mesmo padrão de supplier/financier.
