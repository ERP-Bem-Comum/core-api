# AUTH-SYNC-PERMISSIONS-JOB — escopo (#462)

> Job one-shot que sincroniza o `PermissionCatalog` com o banco — **executável em produção**.
> Size **M**. Issue **#462**. Bloqueia a entrega do **#374/#413**.

## Problema

**O seed de permissões não roda em produção.** O `Dockerfile` copia `src` (`:109`) mas **não `scripts/`** (`:105`), e o `seed:admin` vive em `scripts/seed/admin-user.ts`. O `migrate` roda porque é **job em `src/jobs/`** e tem taskdef. Não há job de seed (`ls src/jobs/` → `contracts financial migrate partners`), e no Fargate não existe `docker cp`.

**Efeito:** toda permissão nova entra no catálogo em código e **nunca chega** a um ambiente já semeado. O sintoma é **403 mudo** — o módulo sobe conectado e autenticado, e nega.

**Medido (QA, 2026-07-15):** catálogo = **44** · ambiente = **42**. Faltavam `budget-plan:read`/`write` (do #315, posterior ao seed inicial). **Produção tem a mesma lacuna** — quando o #374 for deployado, o budget-plans sobe conectado e responde **403**.

### É a 4ª tentativa contra o mesmo sintoma — e as 3 anteriores não cobrem produção

| Esforço | O que fez | Cobre prod? |
| :--- | :--- | :--- |
| **#176** / **#200** (closed) | registraram `reconciliation:*` e `reference:read` **no catálogo em código** | ❌ |
| **`AUTH-PERM-CATALOG-RECON`** (closed-green) | +6 entradas no `CATALOG_RAW`; _"propaga para o seed do admin **de dev**"_ | ❌ |
| **`USR-SEED-PERMISSIONS`** (closed-green) | `dev-seed.ts` derivado do catálogo, com teste anti-drift — mas **env-driven** (`CORE_API_E2E=1` + `AUTH_SEED_JSON`), e _"provisionar o ambiente real"_ é **fora de escopo** declarado | ❌ |
| **este** | job em `src/jobs/`, executável no deploy | ✅ |

As três primeiras curam **"faltou no código"** e o **dev**. Nenhuma cura **"o código está certo e o ambiente não sabe"**.

## Escopo

### 1. Operação na public-api — `src/modules/auth/public-api/sync-permissions.ts`

Molde: `auth/public-api/migrate.ts` (a porta pelo qual o job `migrate` atua sem tocar adapters — ADR-0006).

```ts
export const syncPermissionCatalog = (
  connectionString: string,
): Promise<Result<SyncPermissionsOutcome, SyncPermissionsError>>
```

Extrai o **passo 4** do `scripts/seed/admin-user.ts` (`:256-341`), que já faz exatamente isto:

- role `admin-sistema`: reusa se existir, cria senão;
- **loop serial** sobre `PermissionCatalog.all` (não `Promise.all` — evita deadlock no `name_idx`), com **ignore-then-reselect** em corrida (`isPermissionNameDupEntry`);
- `auth_role_permission`: DELETE + INSERT batch (idempotente).

**Sem as envs de usuário** (`ADMIN_EMAIL`/`ADMIN_PASSWORD`/…) — elas não fazem sentido para sincronizar catálogo, e hoje são obrigatórias (exit 78).

Devolve o outcome (`{ permissionsTotal, roleId }`) para o job logar o que fez.

### 2. Job — `src/jobs/auth/sync-permissions/`

Molde: `src/jobs/migrate/` (`run.ts` + `config.ts` puro).

- `config.ts`: lê `AUTH_DATABASE_URL`; ausente/vazia → `err('auth-database-url-missing')`.
- `run.ts`: one-shot (conecta → sincroniza → sai); `process.exitCode`, **nunca** `process.exit` (deixa o event loop esvaziar).
- Exit codes (sysexits.h): **0** sucesso/idempotente · **78** `EX_CONFIG` · **1** runtime.
- `package.json`: `"job:auth:sync-permissions"`.

### 3. `scripts/seed/admin-user.ts` passa a delegar

O passo 4 deixa de ter lógica própria e chama `syncPermissionCatalog` — **uma regra, dois pontos de entrada**. Comportamento do script inalterado.

## Critérios de aceite

- [ ] **CA1** — **Dado** um ambiente com N−2 permissões e o catálogo com N, **Quando** o job roda, **Então** o ambiente fica com **N** e as novas são atribuídas à role `admin-sistema`.
- [ ] **CA2** — **Dado** um ambiente **já sincronizado**, **Quando** o job roda de novo, **Então** **nada muda** e o exit é **0** (idempotente).
- [ ] **CA3** — **Dado** usuários existentes, **Quando** o job roda, **Então** `auth_user` e `auth_user_role` ficam **intactos** — ele sincroniza **só o catálogo** (≠ `seed:admin`).
- [ ] **CA4** — **Dado** `AUTH_DATABASE_URL` ausente/vazia, **Quando** o job roda, **Então** exit **78** e stderr nomeia a env.
- [ ] **CA5** — **Dado** o job, **Quando** a imagem é construída, **Então** ele **está** nela (vive em `src/jobs/`) — diferente do `scripts/seed`.
- [ ] **CA6** — **Dado** o `seed:admin`, **Quando** roda, **Então** delega a sincronização ao mesmo código e o comportamento não muda.
- [ ] **CA7** — **Dado** uma role `admin-sistema` inexistente, **Quando** o job roda, **Então** ele a cria com todas as permissões.

## Fora de escopo

- **Taskdef do job** no ERP-INFRA (molde `migrate.taskdef.json`) — outro repo; registrar na #462.
- **Decidir** se roda automático no deploy (como o `migrate`) ou manual — recomendação vai no PR; é decisão de ops.
- Mudar o catálogo (`permission-catalog.ts` é a fonte) ou o `dev-seed` (env-driven, segue como está).
- Criar/alterar usuário — **explicitamente não**.

## Invariantes

- Job em `src/jobs/` (**vai para a imagem**); config puro devolvendo `Result`; `process.exitCode`.
- Application/domínio não importam `adapters/` — o job usa a **public-api** (ADR-0006).
- Erros EN kebab-case; docs PT.
- Regressão zero: baseline **4076** testes, 0 falhas.
- Validação em **MySQL real** (x99 offline → OrbStack avulso; `test:integration:*` **destrói a infra dev**).

## Waves

| Wave | Agente/Skill | Saída |
| :--- | :--- | :--- |
| **W0** | `tdd-strategist` | `002-tests/REPORT.md` — RED |
| **W1** | `nodejs-runtime-expert` (job/exit codes) + `ports-and-adapters` (public-api) | `003-impl/REPORT.md` |
| **W2** | `code-reviewer` | `004-code-review/REVIEW.md` — máx 3 rounds |
| **W3** | `ts-quality-checker` | `005-quality/REPORT.md` |
