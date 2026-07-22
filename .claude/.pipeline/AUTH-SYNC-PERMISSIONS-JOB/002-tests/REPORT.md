# W0 — Testes RED (#462)

> Agente: `tdd-strategist` · Resultado: **RED** · 4 arquivos, 13 casos.

## Comando

```bash
node --test --experimental-strip-types --no-warnings 'tests/jobs/auth/*.test.ts'
# ℹ tests 7 · pass 1 · fail 6   (sem MYSQL_INTEGRATION — os 6 casos de banco não entram na conta)
```

RED por **inexistência da API** (`ERR_MODULE_NOT_FOUND`) — não por assert quebrado. É o fail-first
correto: os módulos `#src/modules/auth/public-api/sync-permissions.ts` e
`#src/jobs/auth/sync-permissions/{config,run}.ts` ainda não existem.

## Arquivos

| Arquivo | CAs | Camada |
| :--- | :--- | :--- |
| `tests/jobs/auth/sync-permissions-config.test.ts` | CA4 | unit (função pura) |
| `tests/jobs/auth/sync-permissions-run.test.ts` | CA4 | processo (exit code real) |
| `tests/jobs/auth/sync-permissions-deployable.test.ts` | CA5 | estrutural (anti-regressão) |
| `tests/jobs/auth/sync-permissions.drizzle-mysql.test.ts` | CA1/CA2/CA3/CA7 | integração (MySQL real, opt-in) |

## O único verde — e por que ele é honesto

`CA5c: o Dockerfile copia src para a imagem` **passa já no W0**. Não é falso-verde: ele afirma uma
**pré-condição existente** (`COPY src ./src`, `Dockerfile:109`), não comportamento novo. Ele é o
outro lado do CA5a/CA5b (ambos RED): juntos travam a invariante *"o entrypoint está na imagem"*.
Se um dia alguém remover o `COPY src`, o job silenciosamente some do deploy — e este teste grita.

## Decisões de teste

**CA5 existe porque o #462 não é um bug de lógica, é de endereço.** O `seed:admin` sincroniza o
catálogo corretamente há meses — mas mora em `scripts/`, que o Dockerfile **não copia** (`:105`
copia só `package.json`/lock/workspace; `:109` copia `src`). Em Fargate não há `docker cp`. As 3
tentativas anteriores (#176/#200, `AUTH-PERM-CATALOG-RECON`, `USR-SEED-PERMISSIONS`) consertaram a
lógica e **todas** seguiram fora da imagem. Sem o CA5, a 5ª tentativa repete o ciclo.

> **Achado colateral (evidência):** o `Dockerfile:102-104` mantém o `pnpm-workspace.yaml` no runtime
> justificando *"`pnpm seed:admin` no deploy"* — um comando que **não pode existir** na imagem, já
> que `scripts/` não é copiado. A intenção estava documentada e quebrada. Vai para o W1/PR.

**CA4 é testado no processo, não só no config puro.** O `migrate` só testa `readMigrateConfig`; aqui
o exit code é o contrato que o orquestrador do deploy realmente lê — um job que sai 0 sem ter feito
nada é indistinguível de sucesso, e o 403 mudo volta calado. O teste roda **sem banco** (a env falha
antes de abrir handle), o que também trava essa **ordem**: validar → conectar. Um job que conectasse
primeiro daria exit 1, não 78.

**Env explícita no spawn.** `runJob` monta `{ PATH, ...env }` em vez de herdar `process.env` — herdar
vazaria uma `AUTH_DATABASE_URL` da máquina do dev e o teste passaria a depender do ambiente.

**CA1 simula o drift real, não um banco vazio.** O caso que gerou a issue é *"ambiente com N−2, código
com N"* (QA medido: 44 × 42). O teste remove 2 permissões já persistidas e exige que voltem — é o
conserto do 403 mudo, não um seed genérico.

**CA3 trava a diferença deste job para o `seed:admin`:** ele **não cria nem altera usuário**. Sem esse
teste, nada impede alguém de "aproveitar" o job e reintroduzir as envs `ADMIN_*` — que hoje são
obrigatórias e fariam o job sair 78 no deploy, exatamente o que queremos evitar.

## Gating

Os 6 casos de MySQL ficam atrás de `MYSQL_INTEGRATION=1` (padrão do projeto) — no `pnpm test` puro só
o teste estrutural (`shape`) roda. Validação em **MySQL real** no W3 via container avulso: `x99`
offline e `pnpm test:integration:*` **destrói a infra dev**.

## CA6 — ~~coberto por teste existente~~ **afirmação errada, corrigida no W2**

> ⚠️ O que este relatório dizia — *"`tests/scripts/seed/admin-user.test.ts` protege a validação de
> perfil do seed; o comportamento observável do script não muda"* — **não se sustenta**, e o W2
> pegou. Aquele teste cobre só `validateAdminProfile`: não toca `main()` nem o passo 4. E o
> comportamento **muda** (`description` → NULL, ver W1).
>
> Corrigido no W2 com `tests/jobs/auth/sync-permissions-seed-delegation.test.ts`, que roda o
> `seed:admin` de verdade. Fica registrado como erro de julgamento do W0, não editado para parecer
> que sempre esteve certo.

## Próxima wave

**W1** — `nodejs-runtime-expert` (job/exit codes) + `ports-and-adapters` (public-api).
