# PARTNERS-COLLABORATOR-BULK-IMPORT — Importação em massa (insert + unicidade + import parcial)

> **Size:** M · **ADR:** [ADR-0031](../../../handbook/architecture/adr/0031-partners-registry-module.md) · **Épico:** `.claude/.planning/EPIC-PARTNERS-CADASTROS.md` (Fase 4, linha 99)
> **Legado:** `POST /collaborators/import` (openapi.yaml:365-389, multipart CSV → `ImportResult`). Skill: `application-cli-builder`.
> **Nota de tamanho:** épico marca L incluindo o parser CSV/multipart; aqui o parsing fica na **borda** (fora), e o use case reusa `registerCollaborator` — por isso **M**.

## Contexto

Importação em massa **insert-only** de colaboradores. O legado é **não-transacional** ("import parcial" —
openapi.yaml:371): linhas válidas entram, inválidas são reportadas com `line` + `message` em `errors[]`
(`ImportResult` openapi.yaml:2506-2520, `isPartialImport: boolean`). Valida **unicidade por CPF e email**
(RG é nullable no nosso modelo — fora) tanto **intra-arquivo** quanto **contra o banco**.

Sem borda HTTP/CSV nesta fase (Fase 2+ exige ADR Fastify). Entregamos o **use case de aplicação** que
recebe linhas já tipadas (`RegisterCollaboratorCommand[]`); o parser CSV→command e o multipart ficam na
futura borda. `/collaborators/history/import` é migration/seed (épico:104) — **fora**.

### Decisão de design

- **Reusa `registerCollaborator` linha a linha** (DRY): cada linha faz `Collaborator.register` + guards de
  CPF/email duplicado (`findByCpf`/`findByEmail`) + `save`. Import parcial = **não aborta** no 1º erro.
- **Sequencial proposital** (`for ... of rows.entries()` com `await`): a unicidade **intra-arquivo** exige
  que a linha N seja salva antes de a linha N+1 ser verificada ("primeira ocorrência ganha"). Paralelizar
  tornaria a detecção de duplicado intra-arquivo não-determinística.
- **Sempre `ok(report)`** — falhas individuais vão em `failed`; não há erro global (`Result<_, never>`).

## Escopo (`src/modules/partners/application/use-cases/import-collaborators.ts`)

1. **`ImportCollaboratorsCommand`** = `{ rows: readonly RegisterCollaboratorCommand[] }`.
2. **`ImportCollaboratorFailure`** = `{ index: number; error: RegisterCollaboratorError }` (`index`
   0-based na lista; a borda CSV mapeia para o número de linha do arquivo somando o offset do header).
3. **`ImportCollaboratorsOutput`** = `{ importedCount: number; failed: readonly ImportCollaboratorFailure[]; isPartialImport: boolean }`.
   `isPartialImport = importedCount > 0 && failed.length > 0`.
4. **`importCollaborators(deps)(cmd)`** — Deps `{ collaboratorRepo, clock }`. Itera as linhas reusando
   `registerCollaborator(deps)`; acumula sucesso (count) e falhas (`{index, error}`). Retorna `ok(output)`.

## Fora de escopo

- Parser CSV → `RegisterCollaboratorCommand` e multipart/upload (borda HTTP/CLI futura).
- `POST /collaborators/history/import` (migration/seed, não-produto).
- Update/upsert (import é **insert-only**); `rowData` no erro (a borda anexa a linha crua se precisar).
- Mudança no domínio/persistência/port.

## Critérios de aceite

- [ ] Import vazio (`rows: []`) → `importedCount=0`, `failed=[]`, `isPartialImport=false`.
- [ ] 2 linhas válidas distintas → `importedCount=2`, `failed=[]`, `isPartialImport=false`; ambos persistidos.
- [ ] 1 válida + 1 com CPF inválido → `importedCount=1`, `failed=[{index:1, error:'invalid-cpf'}]`, `isPartialImport=true`.
- [ ] Duplicado **intra-arquivo** (2 linhas mesmo CPF) → 1 importado, 1 `failed` com `register-collaborator-cpf-duplicate`.
- [ ] Duplicado **contra o banco** (CPF já persistido antes do import) → linha vira `failed` (cpf-duplicate); demais entram.
- [ ] Email duplicado intra-arquivo → `register-collaborator-email-duplicate` na 2ª linha.
- [ ] Import **continua** após uma falha no meio (linhas seguintes válidas entram).
- [ ] W3 verde: typecheck + format:check + test + lint.

## Notas de disciplina

- W0 RED antes de `src/`. Use case curried `(deps) => (cmd)`; tempo via `Clock`. Reusa `registerCollaborator`.
- Loop sequencial com `await` é **intencional** (unicidade intra-arquivo) — justificar se ESLint `no-await-in-loop` reclamar.
- `index` 0-based; a tradução para "linha do arquivo" é responsabilidade da borda (sem suposição de header aqui).
