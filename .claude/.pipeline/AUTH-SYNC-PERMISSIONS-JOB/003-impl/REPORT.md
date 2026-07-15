# W1 — Implementação (#462)

> Agente: `nodejs-runtime-expert` (job/exit codes) + `ports-and-adapters` (public-api) · Resultado: **GREEN**.

## Arquivos

| Arquivo | O quê |
| :--- | :--- |
| `src/modules/auth/public-api/sync-permissions.ts` | **novo** — `syncPermissionCatalog(connStr)` |
| `src/jobs/auth/sync-permissions/config.ts` | **novo** — lê `AUTH_DATABASE_URL` (puro) |
| `src/jobs/auth/sync-permissions/run.ts` | **novo** — entrypoint one-shot; exit 0/78/1 |
| `package.json` | `+job:auth:sync-permissions` |
| `scripts/seed/admin-user.ts` | passo 4 **delega**; −85 linhas |

## A decisão que mudou o desenho: reusar o `RoleRepository`, não copiar o SQL

O `000-request` previa extrair o passo 4 do seed (upsert de role + loop serial de permissões +
replace do vínculo). Ao ler o código, achei que **`RoleRepository.save` já faz exatamente isso** —
as 3 fases, com `ignore-then-reselect` no `auth_permission_name_idx` e replace idempotente do
`auth_role_permission` (`role-repository.drizzle.ts:238-300`). O seed tinha **reimplementado** tudo
à mão, contornando o agregado.

Extrair a cópia do seed teria criado a **terceira** cópia da mesma regra — e "duas cópias da regra"
é a mecânica exata que produziu o #462. A public-api ficou com ~40 linhas: carrega a role por nome,
`Role.setPermissions(role, PermissionCatalog.all)` (ou `Role.create` se ausente), `save`.

Efeito colateral: `getDupEntryInfo`/`isPermissionNameDupEntry` saíram do seed (−85 linhas líquidas).
Quem trata corrida agora é o repositório, que já era testado para isso.

## Consequência real, e não cosmética: `auth_role.description` vira NULL

O agregado `Role` **não modela `description`**, e o mapper grava `description: null` por decisão
documentada (`role.mapper.ts:8`, "Decisao 3 do 000-request"). Como agora o seed persiste via
repositório, ele **deixa de escrever** a descrição que escrevia no create — e rodar o job num
ambiente já semeado **nulifica** a descrição existente. Verificado no MySQL real: `(NULL)`.

Impacto medido: **nenhum na aplicação**. Ninguém lê o campo — o mapper o ignora e o response HTTP
(`roleListItemSchema`) não o expõe. Qualquer edição de papel pela própria aplicação já o nulificava.
Mas é uma mudança de dado em produção e não fica escondida no diff: **vai no corpo do PR**.

> Achado para o revisor decidir (não corrigido aqui — ADR-0040, fora do escopo): `auth_role.description`
> é vestigial — escrito por ninguém, lido por ninguém. Ou o agregado passa a modelá-lo, ou a coluna sai.

## Ordem de operações preservada no job

`applyMigrations: false` na public-api: o job `migrate` provisiona o schema antes. Sincronizar não é
migrar — se a tabela não existe, o erro deve aparecer, não ser mascarado por uma migration silenciosa.
Ordem no deploy: `migrate` → `auth:sync-permissions` → `http`/workers.

## Validação em MySQL real (8.4.10)

x99 offline → container **descartável** na porta **3307** (`--rm`), **sem tocar a infra dev**
(`core-api-mysql` seguiu up/healthy o tempo todo). Nunca `pnpm test:integration:*` (destrói a infra).

```
CA7/CA1 banco sem role → cria admin-sistema com o catálogo inteiro   ok
CA2     rodar de novo é idempotente — nada muda                       ok
CA1     ambiente atrás do catálogo → job traz de volta ao total       ok
CA3     usuário e vínculo sobrevivem — role reusada, não recriada     ok
```

Estado final do banco: `permissoes=44 · vinculos_admin=44 · roles_admin=1 · usuarios=2 · atribuicoes=2`.
**44 é o número do catálogo** — o mesmo que o QA media como 42. É a lacuna do #462 fechada.

Caminho real do deploy, ponta a ponta:

```
pnpm job:auth:sync-permissions  → "ok: 44 permissões em 'admin-sistema' (role 61bfcbc1…, reconciliada)"  exit 0
(2ª rodada)                     → mesma role id, 44                                                       exit 0  (idempotente)
sem AUTH_DATABASE_URL           → "configuração inválida: auth-database-url-missing (defina AUTH_DATABASE_URL)"  exit 78
pnpm seed:admin (CA6)           → "role reutilizada: 61bfcbc1… (44 permissoes)" + usuário criado          exit 0
```

## Correção de rota no W0: o teste de integração ia contaminar a infra dev

O fixture limpa `auth_role`/`auth_permission`/`auth_user_role`/`auth_role_permission` inteiras — CA7
exige ausência da role, que a função resolve por **nome fixo**. Seguindo a convenção dos outros
testes (`?? 'mysql://…@127.0.0.1:3306/core'`), um `MYSQL_INTEGRATION=1 pnpm test` apagaria o RBAC do
dev, e o `admin-sistema` recriado com id novo deixaria os `auth_user_role` órfãos — tirando o acesso
do admin local. Trocaria um 403 por outro.

Correção: **`AUTH_SYNC_TEST_DATABASE_URL` explícita, sem default**. Sem URL, os casos de banco não
rodam. Não existe caminho acidental até um banco com dados.

## CA3 foi reescrito porque era vazio

Na primeira versão ele contava `auth_user` antes/depois num banco **sem usuários** — afirmava
`0 === 0` e passaria mesmo se o job apagasse tudo. Reescrito para o risco que realmente existe em
produção: o job **recriar** a role com id novo, deixando `auth_user_role` apontando para o id antigo.
Agora insere usuário + vínculo e exige que a role seja **reusada** (mesmo id) e o vínculo sobreviva.

## Gate

`typecheck` ✓ · `format:check` ✓ · `lint` ✓ · `pnpm test` → **4088 testes, fail 0, exit 0**.

> O bloco `✖ failing tests` do reporter mostra `native-pdf-real.local.test.ts` (CA4 DamISS) — é um
> **todo** anotado (`# #388: hex Identity-H sem /ToUnicode`), um dos 5 todos. Não reprova a suíte
> (`fail 0`, exit 0), é follow-up conhecido do #388 e não tem relação com este diff (reader de PDF).

## Próxima wave

**W2** — `code-reviewer` (read-only).
