# PARTNERS-COLLABORATOR-CSV — Export CSV da listagem de colaboradores

> **Size:** S · **ADR:** [ADR-0031](../../../handbook/architecture/adr/0031-partners-registry-module.md) · **Épico:** `.claude/.planning/EPIC-PARTNERS-CADASTROS.md` (Fase 4)
> **Espelha:** `PARTNERS-SUPPLIER-CSV` (template entregue). **Depende de:** `CORE-CSV-SHARED-UTIL` (`#src/shared/utils/csv.ts`).

## Contexto

Export do legado `GET /collaborators/csv`. **Achatamento concreto** do agregado `Collaborator`
(discriminado por `status`) em linhas planas + serialização via o util compartilhado
`src/shared/utils/csv.ts` (`toCsv`/`escapeCsvCell`). **Não reimplementar** a mecânica de escape
(anti-fórmula é security MUST e vive num lugar só).

Adapter de apresentação puro — sem port, sem use case, sem IO. Reusável por uma futura rota/CLI sem
refactor. Transformação determinística sobre `readonly Collaborator[]`.

## Escopo (`src/modules/partners/adapters/export/collaborator-csv.ts`)

1. `collaboratorsToCsv(collaborators: readonly Collaborator[]): string` — função pura.
2. **Projeção concreta** `collaboratorToCells(c: Collaborator): readonly string[]` — switch exaustivo por
   `status` (Active/Inactive), achata em colunas de ordem fixa.
3. **Colunas em ordem fixa (26):**
   `id`, `name`, `email`, `cpf`, `occupationArea`, `role`, `startOfContract`, `employmentRelationship`,
   `registrationStatus`, `status`, `rg`, `dateOfBirth`, `genderIdentity`, `race`, `education`,
   `foodCategory`, `foodCategoryDescription`, `completeAddress`, `telephone`, `emergencyContactName`,
   `emergencyContactTelephone`, `allergies`, `biography`, `experienceInThePublicSector`, `disableBy`,
   `deactivatedAt`.
4. **Achatamento:**
   - `cpf` via valor normalizado do VO (`String(c.cpf)`).
   - Datas em ISO 8601 (`.toISOString()`): `startOfContract` (sempre presente); `dateOfBirth` vazio quando null.
   - Pessoais nullable → célula vazia (`''`) quando null.
   - `experienceInThePublicSector`: `'true'`/`'false'`/`''` (null).
   - `disableBy` e `deactivatedAt` só preenchidos para `InactiveCollaborator` (switch); vazios em `Active`.
5. **Serialização:** delegar a `toCsv(HEADER, collaborators.map(collaboratorToCells))`. Zero escape local.

## Fora de escopo

- Rota HTTP / CLI / driver mysql; import CSV (bulk).
- `/timeline/csv` e `/data` — dependem de `collaborator_history` (projeção não modelada) e de export
  individual LGPD; tickets próprios.
- Paginação/filtros (a query `listCollaborators` já entrega a coleção).
- Qualquer reimplementação de escape/BOM/RFC 4180 (vem de `CORE-CSV-SHARED-UTIL`).

## Critérios de aceite

- [ ] `collaboratorsToCsv([])` retorna BOM + linha de header + `\r\n` (sem linhas de dados).
- [ ] Collaborator Active+PreRegistration: `status=Active`, pessoais/`disableBy`/`deactivatedAt` vazios,
      `registrationStatus=PreRegistration`, `cpf` normalizado (11 dígitos).
- [ ] Collaborator Active+Complete: enums pessoais preenchidos (`genderIdentity`, `race`, etc.),
      `experienceInThePublicSector` = `true`/`false`.
- [ ] Collaborator Inactive: `status=Inactive`, `disableBy` preenchido, `deactivatedAt` em ISO 8601.
- [ ] Header e ordem de colunas estáveis; cada linha termina em `\r\n`.
- [ ] Projeção alimenta o escape do util (nome com vírgula/`=` sai corretamente) — sem re-testar a mecânica.
- [ ] `collaborator-csv.ts` **não** declara escape/BOM/separador próprios — importa de `#src/shared/utils/csv.ts`.
- [ ] W3 verde: typecheck + format:check + test + lint.

## Notas de disciplina

- W0 RED antes de `src/`. Função pura, determinística (sem `Clock`/IO). Sem `Result` (entrada já é domínio válido).
- Código EN; consome `#src/shared/utils/csv.ts`. Sem JSON.
- O achatamento por `status` é o único conhecimento de domínio — switch exaustivo, sem `default`.
