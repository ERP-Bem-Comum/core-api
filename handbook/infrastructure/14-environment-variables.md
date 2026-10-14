[← Voltar para Infraestrutura](./README.md)

# 🔑 Variáveis de ambiente — catálogo completo

> **ARQUIVO GERADO** — não editar à mão. Fonte: [`src/deploy/env-catalog.ts`](../../src/deploy/env-catalog.ts)
> + [`src/deploy/workloads.ts`](../../src/deploy/workloads.ts). Regenerar com `pnpm run env:generate`;
> a concordância é cobrada por `tests/cleanup/env-artifacts-generated.test.ts`.

Toda variável lida é obrigatória em **todo** ambiente ([ADR-0068](../architecture/adr/0068-env-fail-fast-every-environment.md)):
ausente, o processo não sobe e diz qual campo falta. Degradar esconderia erro de configuração de
quem tem a mão nele — as variáveis de homologação e produção são postas à mão na console da AWS.

Para secrets (rotação, Secrets Manager, menor privilégio), ver [`03-secrets-catalog.md`](./03-secrets-catalog.md).
Este documento responde outra pergunta: **o que cada variável faz e onde ela entra.**

## Resumo

| Categoria | Quantas | O que significa |
| :--- | ---: | :--- |
| **Obrigatória** | 21 | ausente, o processo não sobe |
| Exigida por relação | 6 | nenhuma lista a exige sozinha; a regra está nas relações |
| Com default no código | 60 | tem substituto; ausência não derruba |
| Só em produção | 5 | exigida sob `NODE_ENV=production` |
| Sem unidade que a declare | 1 | existe código que a lê, fora do caminho de boot |
| **Total catalogado** | **106** | |

Unidades de deploy declaradas: **13**. O sufixo `*` numa unidade significa
`provisioning: declared-only` — o repositório sabe executá-la e ninguém a provisionou.

## Obrigatórias

Ausente, o processo **não sobe**. É a política de fail-fast do ADR-0068.

| Variável | Exemplo | Lida em | Unidades |
| :--- | :--- | :--- | :--- |
| **`AUTH_DATABASE_URL`** | `mysql://dev:dev@localhost:3306/core` | `shared/persistence/module-driver-config.ts` | backend, worker-email, sync-permissions, outbox-sweeper* |
| **`AUTH_DRIVER`** | `mysql` | `shared/persistence/module-driver-config.ts` | backend |
| **`BUDGET_PLANS_DATABASE_URL`** | `mysql://dev:dev@localhost:3306/core` | `shared/persistence/module-driver-config.ts` | backend |
| **`BUDGET_PLANS_DRIVER`** | `mysql` | `shared/persistence/module-driver-config.ts` | backend |
| **`CONTRACTS_DATABASE_URL`** | `mysql://dev:dev@localhost:3306/core` | `shared/persistence/module-driver-config.ts` | backend, worker-outbox, worker-projections, contract-count-backfill*, renumber-by-vigencia*, contracts-sweeper*, outbox-sweeper* |
| **`CONTRACTS_DRIVER`** | `mysql` | `shared/persistence/module-driver-config.ts` | backend |
| **`FINANCIAL_DATABASE_URL`** | `mysql://dev:dev@localhost:3306/core` | `shared/persistence/module-driver-config.ts` | backend, worker-projections, worker-van*, payable-view-backfill, supplier-view-backfill*, outbox-sweeper* |
| **`FINANCIAL_DRIVER`** | `mysql` | `shared/persistence/module-driver-config.ts` | backend |
| **`MIGRATE_DATABASE_URL`** | `mysql://dev:dev@localhost:3306/core` | `jobs/migrate/config.ts` | migrate |
| **`PARTNERS_DATABASE_URL`** | `mysql://dev:dev@localhost:3306/core` | `shared/persistence/module-driver-config.ts` | backend, worker-outbox, worker-projections, worker-email, supplier-view-backfill*, contract-count-backfill*, outbox-sweeper* |
| **`PARTNERS_DRIVER`** | `mysql` | `shared/persistence/module-driver-config.ts` | backend |
| **`PROGRAMS_DATABASE_URL`** | `mysql://dev:dev@localhost:3306/core` | `shared/persistence/module-driver-config.ts` | backend |
| **`PROGRAMS_DRIVER`** | `mysql` | `shared/persistence/module-driver-config.ts` | backend |
| **`PROGRAMS_LOGO_S3_BUCKET`** | `core-api-programs-logo` | `modules/programs/adapters/http/logo-storage-config.ts` | backend |
| **`PROGRAMS_LOGO_S3_ENDPOINT`** | `http://localhost:9000` | `modules/programs/adapters/http/logo-storage-config.ts` | backend |
| **`REPORTS_DRIVER`** | `mysql` | `shared/persistence/module-driver-config.ts` | backend |
| **`S3_BUCKET`** | `contracts-documents` | `modules/contracts/adapters/storage/s3-config-aws.ts` | backend |
| **`S3_REGION`** | `us-east-1` | `modules/contracts/adapters/storage/s3-config-aws.ts` | backend |
| **`VAN_S3_BUCKET`** | `core-api-van` | `modules/financial/adapters/van/van-s3-config.ts` | backend, worker-van* |
| **`VAN_S3_REGION`** | `us-east-1` | `modules/financial/adapters/van/van-s3-config.ts` | backend, worker-van* |
| **`WORKER_GROUP`** | `outbox` | `workers/runner/run.ts` | worker-outbox, worker-projections, worker-email, worker-van* |

**`AUTH_DATABASE_URL`** — Conexão de escrita do `auth`.

**`AUTH_DRIVER`** — `mysql` ou `memory`. ⚠️ `memory` só vale em desenvolvimento — o ADR-0068 revoga o FR-007, e driver em memória declarado não sobe em homologação nem produção.

**`BUDGET_PLANS_DATABASE_URL`** — Conexão de escrita do `budget-plans`.

**`BUDGET_PLANS_DRIVER`** — Driver de persistência do `budget-plans`. Ver `AUTH_DRIVER`.

**`CONTRACTS_DATABASE_URL`** — Conexão de escrita do `contracts`.

**`CONTRACTS_DRIVER`** — Driver de persistência do `contracts`. Ver `AUTH_DRIVER`.

**`FINANCIAL_DATABASE_URL`** — Conexão de escrita do `financial`.

**`FINANCIAL_DRIVER`** — Driver de persistência do `financial`. Ver `AUTH_DRIVER`.

**`MIGRATE_DATABASE_URL`** — Conexão usada pelo job `migrate`. Separada porque o boot NÃO migra: o schema é provisionado antes do deploy, para evitar corrida entre instâncias.

**`PARTNERS_DATABASE_URL`** — Conexão de escrita do `partners`.

**`PARTNERS_DRIVER`** — Driver de persistência do `partners`. Ver `AUTH_DRIVER`.

**`PROGRAMS_DATABASE_URL`** — Conexão de escrita do `programs`.

**`PROGRAMS_DRIVER`** — Driver de persistência do `programs`. Ver `AUTH_DRIVER`.

**`PROGRAMS_LOGO_S3_BUCKET`** — Bucket do logo de programa. ⚠️ A ausência deste bloco derrubou o ambiente de homologação por 4h20 em 24/08/2026 (#842): o fail-fast é deliberado, e o que faltava era a declaração.

**`PROGRAMS_LOGO_S3_ENDPOINT`** — Endpoint S3 do logo de programa.

**`REPORTS_DRIVER`** — Driver do `reports`. ⚠️ Ausente, a degradação silenciosa para `memory` devolvia HTTP 200 com lista vazia — foi o que os incidentes #374 e #444 sofreram, e a razão do fail-fast do #456.

**`S3_BUCKET`** — Bucket de documentos.

**`S3_REGION`** — Região do bucket de documentos (fiscal do `financial`, foto do colaborador).

**`VAN_S3_BUCKET`** — Bucket da VAN. ⚠️ Gravar objeto no prefixo de saída deste bucket É enfileirar pagamento (ADR-0060) — em produção, errar o nome do bucket é a diferença entre ensaio e dinheiro.

**`VAN_S3_REGION`** — Região do bucket da VAN. ⚠️ Obrigatória para o processo `http`, não só para o grupo `van`: `buildVanStorage` lança no boot e é chamado de forma eager na composição do `financial` sob `FINANCIAL_DRIVER=mysql`. Foi a ausência desta e de `VAN_S3_BUCKET` no `.env.example` que impedia um clone novo de subir (#1059).

**`WORKER_GROUP`** — Qual grupo de workers o processo executa: `outbox`, `projections`, `email` ou `van`. Um processo por grupo, não um por worker (consolidação #407). Valor inválido faz o runner recusar o boot.
<br>⚠️ Não vai no `.env`: o valor é o grupo DAQUELE processo. No `.env` ele valeria para os quatro, e os quatro rodariam o mesmo grupo — o `Procfile` e o `compose.yaml` o passam inline, um por serviço.

## Exigidas por relação

Nenhuma das três listas as exige sozinha — a obrigação está na relação entre elas, descrita na seção "Relações entre variáveis".

| Variável | Exemplo | Lida em | Unidades |
| :--- | :--- | :--- | :--- |
| **`AUTH_INVITE_FROM`** | _(vazio)_ | `modules/notifications/adapters/email/email-config.ts` | worker-email |
| **`AUTH_RESET_FROM`** | _(vazio)_ | `modules/notifications/adapters/email/email-config.ts` | worker-email |
| **`CONTRACTS_DATABASE_URL_FILE`** | _(vazio)_ | `jobs/contracts/sweeper/config.ts` | contracts-sweeper* |
| **`EMAIL_FROM`** | `nao-responda@example.test` | `modules/notifications/adapters/email/email-config.ts` | worker-email |
| **`EMAIL_FROM_INVITE`** | _(vazio)_ | `modules/notifications/adapters/email/email-config.ts` | worker-email |
| **`EMAIL_FROM_RESET`** | _(vazio)_ | `modules/notifications/adapters/email/email-config.ts` | worker-email |

**`AUTH_INVITE_FROM`** — Alias legado do remetente de convite. Ver `EMAIL_FROM`.

**`AUTH_RESET_FROM`** — Alias legado do remetente de redefinição. Ver `EMAIL_FROM`.

**`CONTRACTS_DATABASE_URL_FILE`** — Caminho de arquivo com a conexão do `contracts`, para secret montado como volume. ⚠️ Mutuamente exclusiva com `CONTRACTS_DATABASE_URL` — as duas juntas devolvem `sweeper-ambiguous-connection-config`.

**`EMAIL_FROM`** — Remetente padrão. ⚠️ Pelo menos UM dos remetentes precisa existir, senão a spec de e-mail não monta.

**`EMAIL_FROM_INVITE`** — Remetente específico do convite. Ver `EMAIL_FROM`.

**`EMAIL_FROM_RESET`** — Remetente específico da redefinição de senha. Ver `EMAIL_FROM`.

## Com default no código

Têm substituto no código; declarar é opcional, e o valor do exemplo é o que faz sentido em desenvolvimento.

| Variável | Exemplo | Lida em | Unidades |
| :--- | :--- | :--- | :--- |
| **`AUTH_LOGIN_RATE_LIMIT_MAX`** | `5` | `server.ts` | backend |
| **`AUTH_LOGIN_RATE_LIMIT_WINDOW`** | `15 minutes` | `server.ts` | backend |
| **`AUTH_RBAC_MODE`** | `enforced` | `modules/auth/adapters/http/rbac-mode.ts` | backend |
| **`AUTH_SEED_JSON`** | _(vazio)_ | `modules/auth/adapters/http/e2e-seed.ts` | backend |
| **`CONTRACTS_READER_URL`** | _(vazio)_ | `server.ts` | backend |
| **`CORE_API_E2E`** | `false` | `modules/auth/adapters/http/e2e-seed.ts` | backend |
| **`CORS_ORIGINS`** | `http://localhost:5173` | `shared/http/config.ts` | backend, worker-outbox, worker-projections, worker-email, worker-van*, migrate, sync-permissions, payable-view-backfill, supplier-view-backfill*, contract-count-backfill*, renumber-by-vigencia*, contracts-sweeper*, outbox-sweeper* |
| **`EMAIL_FROM_ALLOWED_DOMAINS`** | `example.test` | `modules/notifications/adapters/email/email-config.ts` | worker-email |
| **`EMAIL_FROM_NOTIFICATION`** | _(vazio)_ | `modules/notifications/adapters/email/email-config.ts` | worker-email |
| **`EMAIL_PROVIDER`** | `smtp` | `modules/notifications/adapters/email/email-config.ts` | worker-email |
| **`EMAIL_RATE_LIMIT_MAX`** | _(vazio)_ | `modules/notifications/adapters/email/rate-limit.ts` | worker-email |
| **`EMAIL_RATE_LIMIT_WINDOW_MS`** | _(vazio)_ | `modules/notifications/adapters/email/rate-limit.ts` | worker-email |
| **`EMAIL_SANDBOX_TO`** | _(vazio)_ | `modules/notifications/adapters/email/email-config.ts` | worker-email |
| **`HOST`** | `127.0.0.1` | `shared/http/config.ts` | backend, worker-outbox, worker-projections, worker-email, worker-van*, migrate, sync-permissions, payable-view-backfill, supplier-view-backfill*, contract-count-backfill*, renumber-by-vigencia*, contracts-sweeper*, outbox-sweeper* |
| **`KEEP_ALIVE_TIMEOUT_MS`** | `72000` | `shared/http/config.ts` | backend, worker-outbox, worker-projections, worker-email, worker-van*, migrate, sync-permissions, payable-view-backfill, supplier-view-backfill*, contract-count-backfill*, renumber-by-vigencia*, contracts-sweeper*, outbox-sweeper* |
| **`LOG_LEVEL`** | `info` | `shared/http/app.ts` | backend, worker-outbox, worker-projections, worker-email, worker-van*, migrate, sync-permissions, payable-view-backfill, supplier-view-backfill*, contract-count-backfill*, renumber-by-vigencia*, contracts-sweeper*, outbox-sweeper* |
| **`NODE_ENV`** | `development` | `shared/runtime/node-env.ts` | backend, worker-outbox, worker-projections, worker-email, worker-van*, migrate, sync-permissions, payable-view-backfill, supplier-view-backfill*, contract-count-backfill*, renumber-by-vigencia*, contracts-sweeper*, outbox-sweeper* |
| **`OUTBOX_BATCH_SIZE`** | `50` | `modules/contracts/worker/config.ts` | worker-outbox, worker-projections |
| **`OUTBOX_CONSUMER_ID`** | `worker-outbox-local` | `shared/outbox/registered-consumers.ts` | worker-outbox, worker-projections, outbox-sweeper* |
| **`OUTBOX_IDLE_SLEEP_MS`** | `1000` | `modules/contracts/worker/config.ts` | worker-outbox, worker-projections |
| **`OUTBOX_LOG_FILE`** | _(vazio)_ | `modules/contracts/worker/config.ts` | worker-outbox, worker-projections |
| **`OUTBOX_MAX_ATTEMPTS`** | `5` | `modules/contracts/worker/config.ts` | worker-outbox, worker-projections |
| **`OUTBOX_POLL_MS`** | `500` | `modules/contracts/worker/config.ts` | worker-outbox, worker-projections |
| **`PARTNERS_READER_URL`** | _(vazio)_ | `server.ts` | backend |
| **`PORT`** | `3000` | `shared/http/config.ts` | backend, worker-outbox, worker-projections, worker-email, worker-van*, migrate, sync-permissions, payable-view-backfill, supplier-view-backfill*, contract-count-backfill*, renumber-by-vigencia*, contracts-sweeper*, outbox-sweeper* |
| **`PROGRAMS_LOGO_S3_ACCESS_KEY_ID`** | `dev` | `modules/programs/adapters/http/logo-storage-config.ts` | backend |
| **`PROGRAMS_LOGO_S3_FORCE_PATH_STYLE`** | `true` | `modules/programs/adapters/http/logo-storage-config.ts` | backend |
| **`PROGRAMS_LOGO_S3_REGION`** | `us-east-1` | `modules/programs/adapters/http/logo-storage-config.ts` | backend |
| **`PROGRAMS_LOGO_S3_SECRET_ACCESS_KEY`** | `devpassword` | `modules/programs/adapters/http/logo-storage-config.ts` | backend |
| **`RATE_LIMIT_MAX`** | `100` | `shared/http/config.ts` | backend, worker-outbox, worker-projections, worker-email, worker-van*, migrate, sync-permissions, payable-view-backfill, supplier-view-backfill*, contract-count-backfill*, renumber-by-vigencia*, contracts-sweeper*, outbox-sweeper* |
| **`RATE_LIMIT_WINDOW`** | `1 minute` | `shared/http/config.ts` | backend, worker-outbox, worker-projections, worker-email, worker-van*, migrate, sync-permissions, payable-view-backfill, supplier-view-backfill*, contract-count-backfill*, renumber-by-vigencia*, contracts-sweeper*, outbox-sweeper* |
| **`REPORTS_BUDGET_PLANS_DATABASE_URL`** | _(vazio)_ | `shared/persistence/module-driver-config.ts` | backend |
| **`REPORTS_CONTRACTS_DATABASE_URL`** | _(vazio)_ | `shared/persistence/module-driver-config.ts` | backend |
| **`REPORTS_DATABASE_URL`** | _(vazio)_ | `shared/persistence/module-driver-config.ts` | backend |
| **`REPORTS_FINANCIAL_DATABASE_URL`** | _(vazio)_ | `shared/persistence/module-driver-config.ts` | backend |
| **`REQUEST_TIMEOUT_MS`** | `30000` | `shared/http/config.ts` | backend, worker-outbox, worker-projections, worker-email, worker-van*, migrate, sync-permissions, payable-view-backfill, supplier-view-backfill*, contract-count-backfill*, renumber-by-vigencia*, contracts-sweeper*, outbox-sweeper* |
| **`S3_ACCESS_KEY_ID`** | `dev` | `modules/contracts/adapters/storage/s3-config-aws.ts` | backend |
| **`S3_ENDPOINT`** | `http://localhost:9000` | `modules/contracts/adapters/storage/s3-config-aws.ts` | backend |
| **`S3_FORCE_PATH_STYLE`** | `true` | `modules/contracts/adapters/storage/s3-config-aws.ts` | backend |
| **`S3_SECRET_ACCESS_KEY`** | `devpassword` | `modules/contracts/adapters/storage/s3-config-aws.ts` | backend |
| **`SWEEP_BATCH_SIZE`** | _(vazio)_ | `jobs/contracts/sweeper/config.ts` | contracts-sweeper* |
| **`TRUST_PROXY`** | `false` | `shared/http/config.ts` | backend, worker-outbox, worker-projections, worker-email, worker-van*, migrate, sync-permissions, payable-view-backfill, supplier-view-backfill*, contract-count-backfill*, renumber-by-vigencia*, contracts-sweeper*, outbox-sweeper* |
| **`VAN_S3_ACCESS_KEY_ID`** | `dev` | `modules/financial/adapters/van/van-s3-config.ts` | backend, worker-van* |
| **`VAN_S3_ENDPOINT`** | `http://localhost:9000` | `modules/financial/adapters/van/van-s3-config.ts` | backend, worker-van* |
| **`VAN_S3_FORCE_PATH_STYLE`** | `true` | `modules/financial/adapters/van/van-s3-config.ts` | backend, worker-van* |
| **`VAN_S3_PREFIX_FAILED`** | `falhas/` | `modules/financial/adapters/van/van-s3-config.ts` | backend, worker-van* |
| **`VAN_S3_PREFIX_OUTBOUND`** | `saida/` | `modules/financial/adapters/van/van-s3-config.ts` | backend, worker-van* |
| **`VAN_S3_PREFIX_PROCESSED`** | `processados/` | `modules/financial/adapters/van/van-s3-config.ts` | backend, worker-van* |
| **`VAN_S3_PREFIX_RETURNS`** | `retorno/` | `modules/financial/adapters/van/van-s3-config.ts` | backend, worker-van* |
| **`VAN_S3_PREFIX_SANDBOX`** | `sandbox/` | `modules/financial/adapters/van/van-s3-config.ts` | backend, worker-van* |
| **`VAN_S3_PREFIX_STATUS`** | `status/` | `modules/financial/adapters/van/van-s3-config.ts` | backend, worker-van* |
| **`VAN_S3_SECRET_ACCESS_KEY`** | `devpassword` | `modules/financial/adapters/van/van-s3-config.ts` | backend, worker-van* |
| **`VAN_SANDBOX_S3_ACCESS_KEY_ID`** | _(vazio)_ | `modules/financial/adapters/http/van-sandbox-composition.ts` | backend |
| **`VAN_SANDBOX_S3_BUCKET`** | _(vazio)_ | `modules/financial/adapters/http/van-sandbox-composition.ts` | backend |
| **`VAN_SANDBOX_S3_ENDPOINT`** | _(vazio)_ | `modules/financial/adapters/http/van-sandbox-composition.ts` | backend |
| **`VAN_SANDBOX_S3_FORCE_PATH_STYLE`** | _(vazio)_ | `modules/financial/adapters/http/van-sandbox-composition.ts` | backend |
| **`VAN_SANDBOX_S3_PREFIX`** | _(vazio)_ | `modules/financial/adapters/http/van-sandbox-composition.ts` | backend |
| **`VAN_SANDBOX_S3_REGION`** | `us-east-1` | `modules/financial/adapters/http/van-sandbox-composition.ts` | backend |
| **`VAN_SANDBOX_S3_SECRET_ACCESS_KEY`** | _(vazio)_ | `modules/financial/adapters/http/van-sandbox-composition.ts` | backend |
| **`VAN_SANDBOX_TOKEN`** | _(vazio)_ | `modules/financial/adapters/http/van-sandbox-auth.ts` | backend |

**`AUTH_LOGIN_RATE_LIMIT_MAX`** — Tentativas de login por janela. Separado do limite geral porque é defesa contra força bruta, não contra abuso de uso.

**`AUTH_LOGIN_RATE_LIMIT_WINDOW`** — Janela do rate limit de login.

**`AUTH_RBAC_MODE`** — `enforced` ou `bypass`. ⚠️ Hoje NÃO é lida: o modo está fixado em `bypass` por código (`server.ts`, duas linhas marcadas `← religar`), e sob bypass todo autenticado aprova qualquer valor. Religar é a #634; o boot emite banner quando esta variável e o modo fixo divergem.
<br>Default no código: `enforced`.

**`AUTH_SEED_JSON`** — Semente de usuários para a suíte E2E, em JSON. Só tem efeito com `CORE_API_E2E` ligada.

**`CONTRACTS_READER_URL`** — Réplica de leitura do `contracts` (ADR-0026). Ausente, o reader reusa o writer — single-node. Só `contracts` e `partners` têm split.

**`CORE_API_E2E`** — Liga as rotas de semente usadas pela suíte E2E. ⚠️ Nunca ligar em ambiente com dado real: elas escrevem direto no banco, sem passar pelas regras de domínio.

**`CORS_ORIGINS`** — Origens aceitas pelo CORS, separadas por vírgula.

**`EMAIL_FROM_ALLOWED_DOMAINS`** — Domínios aceitos como remetente, separados por vírgula. Recusa envio de domínio não autorizado antes de tentar o provedor.

**`EMAIL_FROM_NOTIFICATION`** — Remetente das notificações gerais.

**`EMAIL_PROVIDER`** — Provedor de envio: `smtp`, `resend` ou `memory`. ⚠️ Ausente, o worker cai em `memory` e DESCARTA todo e-mail de reset e convite, com boot verde (#1047). ⚠️ E o valor escolhido torna outras variáveis OBRIGATÓRIAS: `smtp` exige `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER` e `SMTP_PASS` não-vazios; `resend` exige `RESEND_API_KEY`. Nenhuma dessas aparece em `env` no manifesto, porque a obrigação depende DESTE valor — e o `worker-email` sai com 78 quando falta alguma.

**`EMAIL_RATE_LIMIT_MAX`** — E-mails por janela, para não estourar a cota do provedor.

**`EMAIL_RATE_LIMIT_WINDOW_MS`** — Janela do rate limit de e-mail.

**`EMAIL_SANDBOX_TO`** — Redireciona TODO e-mail para este destinatário, qualquer que seja o original. Comportamento de decorator, aplicado num ponto só (ADR-0010).

**`HOST`** — Interface em que a borda HTTP escuta.
<br>Default no código: `0.0.0.0`.

**`KEEP_ALIVE_TIMEOUT_MS`** — Tempo que uma conexão ociosa sobrevive. Deve ser maior que o do load balancer à frente, senão o balanceador reusa conexão que o servidor já fechou.

**`LOG_LEVEL`** — Nível do logger Pino da borda e dos workers.
<br>Default no código: `info`.

**`NODE_ENV`** — Ambiente de execução. `production` ativa as exigências de `envProductionOnly` e desliga toda degradação graciosa (ADR-0068).
<br>Default no código: `development`.

**`OUTBOX_BATCH_SIZE`** — Quantos eventos cada claim reivindica por rodada.

**`OUTBOX_CONSUMER_ID`** — Identidade do consumidor no par `(consumidor, evento)`. ⚠️ A pendência é por consumidor, não da linha: o mesmo evento é entregue a N consumidores (fanout), e usar um id compartilhado faz dois consumidores dividirem os eventos em vez de cada um receber todos.

**`OUTBOX_IDLE_SLEEP_MS`** — Pausa quando o claim não encontra evento pendente.

**`OUTBOX_LOG_FILE`** — Arquivo de log do relay, quando se quer a saída fora do stdout.

**`OUTBOX_MAX_ATTEMPTS`** — Tentativas antes de o evento ir para dead-letter. ⚠️ O dead-letter é por CONSUMIDOR e terminal, e nunca apaga a linha de origem (ADR-0064).

**`OUTBOX_POLL_MS`** — Intervalo de polling do outbox. MySQL não tem `LISTEN/NOTIFY`, então a leitura é sempre polling (ADR-0015).

**`PARTNERS_READER_URL`** — Réplica de leitura do `partners`. Ver `CONTRACTS_READER_URL`.

**`PORT`** — Porta da borda HTTP. **Declarada aqui, é ela que vale** — medido em 14/10/2026: com `PORT=3000` no `.env`, `overmind start` subiu a borda em `127.0.0.1:3000`. O overmind atribui uma porta por processo quando a variável NÃO está declarada (base 5000, passo 100, no fonte dele), e esse caminho não foi exercitado aqui.
<br>Default no código: `3000`.

**`PROGRAMS_LOGO_S3_ACCESS_KEY_ID`** — Chave de acesso ao bucket de logo.

**`PROGRAMS_LOGO_S3_FORCE_PATH_STYLE`** — Endereçamento por path no bucket de logo. Ver `S3_FORCE_PATH_STYLE`.

**`PROGRAMS_LOGO_S3_REGION`** — Região do bucket de logo.

**`PROGRAMS_LOGO_S3_SECRET_ACCESS_KEY`** — Segredo da chave do bucket de logo.

**`RATE_LIMIT_MAX`** — Requisições permitidas por janela, por cliente, nas rotas gerais.

**`RATE_LIMIT_WINDOW`** — Duração da janela do rate limit geral.

**`REPORTS_BUDGET_PLANS_DATABASE_URL`** — Sobrescreve a origem de planos nas leituras do `reports`.

**`REPORTS_CONTRACTS_DATABASE_URL`** — Sobrescreve a origem de contratos nas leituras do `reports`.

**`REPORTS_DATABASE_URL`** — Conexão do `reports`. Primeiro elo da cascata `REPORTS_* ?? <módulo-fonte>_*`: o `reports` é read-only e não tem base própria.

**`REPORTS_FINANCIAL_DATABASE_URL`** — Sobrescreve a origem financeira nas leituras do `reports`.

**`REQUEST_TIMEOUT_MS`** — Teto de duração de uma requisição na borda.

**`S3_ACCESS_KEY_ID`** — Chave de acesso ao bucket de documentos. ⚠️ Vai JUNTO com `S3_SECRET_ACCESS_KEY`; ausentes as duas, o SDK cai na provider chain do IAM — que é o caminho de produção.

**`S3_ENDPOINT`** — Endpoint S3. Preenchido aponta para o S3 local; vazio usa o endpoint padrão da AWS.

**`S3_FORCE_PATH_STYLE`** — Endereçamento por path em vez de subdomínio. Obrigatório contra S3 local; desnecessário na AWS.

**`S3_SECRET_ACCESS_KEY`** — Segredo da chave de acesso. Ver `S3_ACCESS_KEY_ID`.

**`SWEEP_BATCH_SIZE`** — Contratos processados por rodada na varredura de ciclo de vida.

**`TRUST_PROXY`** — Se o Fastify confia nos headers `X-Forwarded-*`. Ligar atrás de load balancer; desligado, o IP do cliente é o do proxy e o rate limit passa a contar o balanceador inteiro como um só.

**`VAN_S3_ACCESS_KEY_ID`** — Chave de acesso ao bucket da VAN. ⚠️ Vai JUNTO com `VAN_S3_SECRET_ACCESS_KEY`. Em produção o agente usa role da própria instância, sem chave estática (ADR-0061).

**`VAN_S3_ENDPOINT`** — Endpoint S3 do bucket da VAN.

**`VAN_S3_FORCE_PATH_STYLE`** — Endereçamento por path no bucket da VAN. Ver `S3_FORCE_PATH_STYLE`.

**`VAN_S3_PREFIX_FAILED`** — Prefixo do que ficou sem confirmação e aguarda revisão humana — nunca retransmitido automaticamente. ⚠️ Objeto aqui NÃO prova que o banco não recebeu.

**`VAN_S3_PREFIX_OUTBOUND`** — Prefixo da fila de saída — remessa depositada e ainda não transmitida. ⚠️ Escrever aqui É enfileirar pagamento.

**`VAN_S3_PREFIX_PROCESSED`** — Prefixo do que foi transmitido COM confirmação. Somente leitura para a aplicação.

**`VAN_S3_PREFIX_RETURNS`** — Prefixo dos arquivos recebidos do banco. ⚠️ A caixa é do CONVÊNIO: chegam retornos sem correspondência com remessa nossa, e o processamento não deve falhar o lote por referência desconhecida.

**`VAN_S3_PREFIX_SANDBOX`** — Prefixo de ensaio. ⚠️ Existe APENAS no bucket de homologação: no de produção não há sandbox, e errar o destino exige trocar o nome do bucket, não o prefixo.

**`VAN_S3_PREFIX_STATUS`** — Prefixo do envelope de status por execução — a única janela sobre o que o agente fez. A ausência de um envelope de recepção significa "rodou e não havia nada", não "não rodou".

**`VAN_S3_SECRET_ACCESS_KEY`** — Segredo da chave do bucket da VAN. Ver `VAN_S3_ACCESS_KEY_ID`.

**`VAN_SANDBOX_S3_ACCESS_KEY_ID`** — Chave de acesso ao sandbox da VAN.

**`VAN_SANDBOX_S3_BUCKET`** — Bucket de sandbox da VAN. Separado do de produção por desenho.

**`VAN_SANDBOX_S3_ENDPOINT`** — Endpoint S3 do sandbox da VAN.

**`VAN_SANDBOX_S3_FORCE_PATH_STYLE`** — Endereçamento por path no sandbox da VAN.

**`VAN_SANDBOX_S3_PREFIX`** — Prefixo usado dentro do bucket de sandbox.

**`VAN_SANDBOX_S3_REGION`** — Região do bucket de sandbox da VAN, usado para exercitar o nosso lado do contrato.

**`VAN_SANDBOX_S3_SECRET_ACCESS_KEY`** — Segredo da chave do sandbox da VAN.

**`VAN_SANDBOX_TOKEN`** — Token que autoriza as rotas de sandbox da VAN.

## Obrigatórias só em produção

Exigidas apenas sob `NODE_ENV=production`. Em desenvolvimento o boot não cai sem elas.

| Variável | Exemplo | Lida em | Unidades |
| :--- | :--- | :--- | :--- |
| **`AUTH_ACTIVATION_BASE_URL`** | _(vazio)_ | `shared/http/email-link-base-urls.ts` | backend |
| **`AUTH_JWT_PRIVATE_KEY`** | _(vazio)_ | `modules/auth/adapters/http/jwt-key-config.ts` | backend |
| **`AUTH_JWT_PUBLIC_KEY`** | _(vazio)_ | `modules/auth/adapters/http/jwt-key-config.ts` | backend |
| **`AUTH_RESET_BASE_URL`** | _(vazio)_ | `shared/http/email-link-base-urls.ts` | backend |
| **`PARTNERS_SELF_REGISTRATION_BASE_URL`** | _(vazio)_ | `shared/http/email-link-base-urls.ts` | backend |

**`AUTH_ACTIVATION_BASE_URL`** — Base do link de ativação de conta. Ver `AUTH_RESET_BASE_URL`.

**`AUTH_JWT_PRIVATE_KEY`** — Chave privada ES256 que assina o token. ⚠️ Classificada como só-produção pelo manifesto, mas sem ela o login local não emite token — gerar um par local e mantê-lo FORA do versionamento.

**`AUTH_JWT_PUBLIC_KEY`** — Chave pública ES256 que verifica o token. Ver `AUTH_JWT_PRIVATE_KEY`.

**`AUTH_RESET_BASE_URL`** — Base do link de redefinição de senha. Exige URL absoluta `http(s)`; relativa o SPA descarta, e o boot falha em produção em vez de enviar e-mail com link quebrado.

**`PARTNERS_SELF_REGISTRATION_BASE_URL`** — Base do link de autocadastro de parceiro. Ver `AUTH_RESET_BASE_URL`.

## Sem unidade que a declare

Existe código que as lê, e esse código não está no caminho de boot de unidade alguma. Ficam aqui para a lacuna permanecer visível.

| Variável | Exemplo | Lida em | Unidades |
| :--- | :--- | :--- | :--- |
| **`BUDGET_PLANS_SEED_JSON`** | _(vazio)_ | `modules/budget-plans/adapters/http/e2e-seed.ts` | — |

**`BUDGET_PLANS_SEED_JSON`** — Semente de planos orçamentários para a suíte E2E, em JSON. Só tem efeito com `CORE_API_E2E` ligada.
<br>⚠️ Nenhuma unidade a declara: `parseE2eBudgetPlansSeed` ficou órfã quando o ramo `memory` saiu do `server.ts` — o próprio arquivo registra isso em `server.ts:65`. O `public-api/http.ts` ainda a exporta, e ninguém a chama.

## Por adapter de capacidade

A unidade declara que precisa de uma **capacidade** (`requires: [{ kind: … }]`), nunca de um
fornecedor. Quem a atende é um adapter, e as variáveis são **dele** — exigidas só quando ele é
o escolhido. Entre os adapters de uma mesma capacidade, o código avalia **um ramo só**.

Declaração em [`src/deploy/capability-adapters.ts`](../../src/deploy/capability-adapters.ts).

### Capacidade `smtp`

**`nodemailer-smtp`** — selecionado por `EMAIL_PROVIDER=smtp`. Validado em `modules/notifications/adapters/email/nodemailer-config.ts`.

| Variável | Exigência | Exemplo |
| :--- | :--- | :--- |
| `SMTP_HOST` | **obrigatória, não-vazia** | `localhost` |
| `SMTP_PORT` | **obrigatória, não-vazia** | `1025` |
| `SMTP_SECURE` | **obrigatória, não-vazia** | `false` |
| `SMTP_USER` | **obrigatória, não-vazia** | `dev` |
| `SMTP_PASS` | **obrigatória, não-vazia** | `dev` |
| `SMTP_POOL` | tem default | _(vazio)_ |
| `SMTP_MAX_CONNS` | tem default | _(vazio)_ |
| `SMTP_REQUIRE_TLS` | tem default | `false` |

**`SMTP_HOST`** — Host SMTP. A `~/.infra` sobe o Mailpit, com UI em `http://localhost:8025`.

**`SMTP_PORT`** — Porta SMTP.

**`SMTP_SECURE`** — TLS desde a conexão (porta 465). Falso usa STARTTLS quando disponível.

**`SMTP_USER`** — Usuário SMTP. ⚠️ **Obrigatório e não-vazio sob `EMAIL_PROVIDER=smtp`** — está em `REQUIRED_FIELDS` (`nodemailer-config.ts:40-46`), e a validação recusa `undefined` E string vazia. Declarar vazio derruba o `worker-email` com exit 78, que sob o overmind leva os outros quatro processos. O Mailpit local não autentica, então qualquer valor serve.

**`SMTP_PASS`** — Senha SMTP. ⚠️ **Obrigatória e não-vazia sob `EMAIL_PROVIDER=smtp`** — ver `SMTP_USER`. O Mailpit local não autentica, então qualquer valor serve.

**`SMTP_POOL`** — Reaproveita conexões SMTP em vez de abrir uma por envio.

**`SMTP_MAX_CONNS`** — Teto de conexões simultâneas no pool SMTP.

**`SMTP_REQUIRE_TLS`** — Exige STARTTLS e recusa a conexão sem ele.

**`resend-http`** — selecionado por `EMAIL_PROVIDER=resend`. Validado em `modules/notifications/adapters/email/resend-config.ts`.

| Variável | Exigência | Exemplo |
| :--- | :--- | :--- |
| `RESEND_API_KEY` | **obrigatória, não-vazia** | _(vazio)_ |

**`RESEND_API_KEY`** — Credencial do provedor Resend. Só usada com `EMAIL_PROVIDER=resend`.

**`email-in-memory`** — selecionado por `EMAIL_PROVIDER=memory`. Validado em `modules/notifications/adapters/email/email-config.ts`.

Não exige variável nenhuma.

### Capacidade `s3-compat`

**`magalu-object-storage`** — **sem seletor** — não há variável que o escolha. Validado em `modules/contracts/adapters/storage/magalu-cloud-config.ts`.
<br>⚠️ **Não composto:** O adapter existe e é exportado pelo `public-api` do `contracts`, mas nenhum composition root o instancia — o comentário em `public-api/index.ts:36` ainda o anuncia como trabalho futuro, com o export já feito na linha 58. ⚠️ O ambiente da Magalu não recebe dado real nem pessoal (ADR-0021).

| Variável | Exigência | Exemplo |
| :--- | :--- | :--- |
| `MAGALU_REGION` | **obrigatória, não-vazia** | _(vazio)_ |
| `MAGALU_BUCKET` | **obrigatória, não-vazia** | _(vazio)_ |
| `MAGALU_ACCESS_KEY_ID` | **obrigatória, não-vazia** | _(vazio)_ |
| `MAGALU_SECRET_ACCESS_KEY` | **obrigatória, não-vazia** | _(vazio)_ |

**`MAGALU_REGION`** — Região do object storage da Magalu Cloud. Exigida pelo adapter `magalu-object-storage` da capacidade `s3-compat` — ver `capability-adapters.ts`. ⚠️ O ambiente da Magalu não recebe dado real nem pessoal (ADR-0021): produção e dado pessoal vivem na AWS, com residência no Brasil.

**`MAGALU_BUCKET`** — Bucket na Magalu Cloud. Ver `MAGALU_REGION`.

**`MAGALU_ACCESS_KEY_ID`** — Chave de acesso à Magalu Cloud. Ver `MAGALU_REGION`.

**`MAGALU_SECRET_ACCESS_KEY`** — Segredo da chave da Magalu Cloud. Ver `MAGALU_REGION`.

## Relações entre variáveis

O que as listas por categoria não expressam.

| Regra | Variáveis | Por quê | Unidade |
| :--- | :--- | :--- | :--- |
| `all-or-none` | `S3_ACCESS_KEY_ID` + `S3_SECRET_ACCESS_KEY` | uma sem a outra é config pela metade; ausentes caem na provider chain do IAM | `backend` |
| `all-or-none` | `VAN_S3_ACCESS_KEY_ID` + `VAN_S3_SECRET_ACCESS_KEY` | mesmo XOR do bloco S3, aplicado ao bucket da VAN | `backend` |
| `at-least-one` | `EMAIL_FROM` + `EMAIL_FROM_RESET` + `AUTH_RESET_FROM` + `EMAIL_FROM_INVITE` + `AUTH_INVITE_FROM` | sem nenhum remetente configurado a spec de e-mail não monta | `worker-email` |
| `all-or-none` | `VAN_S3_ACCESS_KEY_ID` + `VAN_S3_SECRET_ACCESS_KEY` | XOR de credenciais; ausentes caem na provider chain do IAM | `worker-van` |
| `xor` | `CONTRACTS_DATABASE_URL` + `CONTRACTS_DATABASE_URL_FILE` | as duas juntas devolvem sweeper-ambiguous-connection-config | `contracts-sweeper` |
