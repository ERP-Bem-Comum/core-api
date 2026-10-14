/**
 * Catálogo de variáveis de ambiente — o que cada uma faz, onde é lida e um valor de exemplo.
 *
 * @remarks
 * Complementa `workloads.ts`, que declara QUAIS variáveis cada unidade exige e em que categoria
 * (obrigatória, com default, só produção). O que ele não diz é o que a variável significa — e foi
 * essa lacuna que deixou o `.env.example` incompleto sem nada acusar: ele era escrito à mão,
 * enquanto a lista real vivia no manifesto (#1059).
 *
 * A separação é deliberada. O manifesto é indexado por UNIDADE, e a mesma variável aparece em
 * várias: `LOG_LEVEL` e `CORS_ORIGINS` estão em todas as treze. Pôr a descrição ali obrigaria a
 * repeti-la treze vezes, e divergência entre as cópias seria questão de tempo — é o mesmo motivo
 * pelo qual o repositório proíbe duplicar regra entre rules (anti-padrão 8 do CLAUDE.md). Aqui a
 * chave é a VARIÁVEL, e cada uma é descrita uma vez.
 *
 * `tests/cleanup/env-catalog.test.ts` cobra a bijeção: variável no manifesto sem entrada aqui é
 * vermelho, e entrada aqui que o manifesto não declara também.
 *
 * ⚠️ **`example` vai para arquivo versionado, e os repositórios são públicos.** Só valor de
 * desenvolvimento (`localhost`, `dev`) ou placeholder descritivo. Nunca credencial, endpoint de
 * produção, nome real de bucket, convênio, agência, conta ou documento de parceiro — o mesmo
 * cuidado que `tests/cleanup/bank-fixture-masking.test.ts` cobra para fixture de CNAB.
 */

/** O que uma variável de ambiente é, onde entra e com que valor se parece. */
export type EnvDoc = Readonly<{
  /** O que a variável controla, em uma frase — e a consequência de errá-la, quando é cara. */
  description: string;
  /** Arquivo que a lê, relativo a `src/`. É o "onde entra", e o que torna a descrição conferível. */
  readBy: string;
  /** Valor de DESENVOLVIMENTO para o `.env.example`. Nunca segredo nem dado real. */
  example: string;
  /** O default concreto do código, quando existe. Ausente significa "sem substituto". */
  defaultValue?: string;
  /**
   * Por que nenhuma unidade do manifesto declara esta variável.
   *
   * @remarks
   * Preenchido significa: existe código que a LÊ, e esse código não está no caminho de boot de
   * unidade alguma nem pertence a um adapter de capacidade — export sem consumidor. Não é o mesmo
   * que variável opcional: opcional é declarada em `envWithDefault`; isto aqui não é declarado
   * porque afirmar que a unidade a exige seria falso.
   *
   * ⚠️ **Não use isto para variável de adapter.** Se a variável é exigida por um adapter concreto
   * de uma `Capability` — transporte de e-mail, object storage —, o lugar dela é
   * `capability-adapters.ts`, e é lá que mora o `notComposed` do ADAPTER quando nada o seleciona.
   * A distinção importa: adapter não composto é uma peça inteira à espera de ligação; variável com
   * `notComposed` aqui é resíduo de código que perdeu o chamador.
   *
   * A presença deste campo mantém a lacuna VISÍVEL em vez de esquecida, e sai no dia em que o
   * código for composto — ou sai junto com o código.
   */
  notComposed?: string;
  /**
   * Por que a variável não pertence a um arquivo `.env` compartilhado.
   *
   * @remarks
   * Preenchido significa: o valor difere por PROCESSO, não por ambiente. Pôr no `.env` daria o
   * mesmo valor a todos os processos, que é justamente o erro — `WORKER_GROUP=outbox` no arquivo
   * faria os quatro workers rodarem o grupo do outbox. O gerador a emite comentada, com o motivo.
   */
  inlinePerProcess?: string;
}>;

/** Conexão MySQL local da `~/.infra` — mesmo database para todos os módulos em desenvolvimento. */
const LOCAL_MYSQL = 'mysql://dev:dev@localhost:3306/core';

/** Endpoint do S3 local (Silo/MinIO) servido pela `~/.infra`. */
const LOCAL_S3 = 'http://localhost:9000';

/**
 * Tipado pelo contrato, não por `as const satisfies`.
 *
 * @remarks
 * `as const satisfies` infere a união literal de cada entrada, e aí os campos OPCIONAIS deixam de
 * existir no tipo das entradas que não os têm: `ENV_CATALOG[name].notComposed` passa a ser erro de
 * compilação em vez de `undefined`. Anotar com o `Record` mantém `EnvDoc` como a forma de toda
 * entrada, que é o que os consumidores precisam. A verificação dos campos obrigatórios não se
 * perde — é o `Record<string, EnvDoc>` que a faz.
 */
export const ENV_CATALOG: Readonly<Record<string, EnvDoc>> = {
  // ── Processo e runtime ──────────────────────────────────────────────────────────────────────
  NODE_ENV: {
    description:
      'Ambiente de execução. `production` ativa as exigências de `envProductionOnly` e desliga toda degradação graciosa (ADR-0068).',
    readBy: 'shared/runtime/node-env.ts',
    example: 'development',
    defaultValue: 'development',
  },
  LOG_LEVEL: {
    description: 'Nível do logger Pino da borda e dos workers.',
    readBy: 'shared/http/app.ts',
    example: 'info',
    defaultValue: 'info',
  },
  WORKER_GROUP: {
    description:
      'Qual grupo de workers o processo executa: `outbox`, `projections`, `email` ou `van`. Um processo por grupo, não um por worker (consolidação #407). Valor inválido faz o runner recusar o boot.',
    readBy: 'workers/runner/run.ts',
    example: 'outbox',
    inlinePerProcess:
      'o valor é o grupo DAQUELE processo. No `.env` ele valeria para os quatro, e os quatro rodariam o mesmo grupo — o `Procfile` e o `compose.yaml` o passam inline, um por serviço.',
  },

  // ── Borda HTTP ─────────────────────────────────────────────────────────────────────────────
  HOST: {
    description: 'Interface em que a borda HTTP escuta.',
    readBy: 'shared/http/config.ts',
    example: '127.0.0.1',
    defaultValue: '0.0.0.0',
  },
  PORT: {
    description:
      'Porta da borda HTTP. ⚠️ Sob `pnpm run dev` o overmind define `PORT` por processo, então a porta efetiva não é esta — conferir com `overmind status`.',
    readBy: 'shared/http/config.ts',
    example: '3000',
    defaultValue: '3000',
  },
  CORS_ORIGINS: {
    description: 'Origens aceitas pelo CORS, separadas por vírgula.',
    readBy: 'shared/http/config.ts',
    example: 'http://localhost:5173',
  },
  TRUST_PROXY: {
    description:
      'Se o Fastify confia nos headers `X-Forwarded-*`. Ligar atrás de load balancer; desligado, o IP do cliente é o do proxy e o rate limit passa a contar o balanceador inteiro como um só.',
    readBy: 'shared/http/config.ts',
    example: 'false',
  },
  KEEP_ALIVE_TIMEOUT_MS: {
    description:
      'Tempo que uma conexão ociosa sobrevive. Deve ser maior que o do load balancer à frente, senão o balanceador reusa conexão que o servidor já fechou.',
    readBy: 'shared/http/config.ts',
    example: '72000',
  },
  REQUEST_TIMEOUT_MS: {
    description: 'Teto de duração de uma requisição na borda.',
    readBy: 'shared/http/config.ts',
    example: '30000',
  },
  RATE_LIMIT_MAX: {
    description: 'Requisições permitidas por janela, por cliente, nas rotas gerais.',
    readBy: 'shared/http/config.ts',
    example: '100',
  },
  RATE_LIMIT_WINDOW: {
    description: 'Duração da janela do rate limit geral.',
    readBy: 'shared/http/config.ts',
    example: '1 minute',
  },
  AUTH_LOGIN_RATE_LIMIT_MAX: {
    description:
      'Tentativas de login por janela. Separado do limite geral porque é defesa contra força bruta, não contra abuso de uso.',
    readBy: 'server.ts',
    example: '5',
  },
  AUTH_LOGIN_RATE_LIMIT_WINDOW: {
    description: 'Janela do rate limit de login.',
    readBy: 'server.ts',
    example: '15 minutes',
  },

  // ── Drivers de persistência ────────────────────────────────────────────────────────────────
  AUTH_DRIVER: {
    description:
      '`mysql` ou `memory`. ⚠️ `memory` só vale em desenvolvimento — o ADR-0068 revoga o FR-007, e driver em memória declarado não sobe em homologação nem produção.',
    readBy: 'shared/persistence/module-driver-config.ts',
    example: 'mysql',
  },
  CONTRACTS_DRIVER: {
    description: 'Driver de persistência do `contracts`. Ver `AUTH_DRIVER`.',
    readBy: 'shared/persistence/module-driver-config.ts',
    example: 'mysql',
  },
  FINANCIAL_DRIVER: {
    description: 'Driver de persistência do `financial`. Ver `AUTH_DRIVER`.',
    readBy: 'shared/persistence/module-driver-config.ts',
    example: 'mysql',
  },
  PARTNERS_DRIVER: {
    description: 'Driver de persistência do `partners`. Ver `AUTH_DRIVER`.',
    readBy: 'shared/persistence/module-driver-config.ts',
    example: 'mysql',
  },
  PROGRAMS_DRIVER: {
    description: 'Driver de persistência do `programs`. Ver `AUTH_DRIVER`.',
    readBy: 'shared/persistence/module-driver-config.ts',
    example: 'mysql',
  },
  BUDGET_PLANS_DRIVER: {
    description: 'Driver de persistência do `budget-plans`. Ver `AUTH_DRIVER`.',
    readBy: 'shared/persistence/module-driver-config.ts',
    example: 'mysql',
  },
  REPORTS_DRIVER: {
    description:
      'Driver do `reports`. ⚠️ Ausente, a degradação silenciosa para `memory` devolvia HTTP 200 com lista vazia — foi o que os incidentes #374 e #444 sofreram, e a razão do fail-fast do #456.',
    readBy: 'shared/persistence/module-driver-config.ts',
    example: 'mysql',
  },

  // ── Connection strings ─────────────────────────────────────────────────────────────────────
  AUTH_DATABASE_URL: {
    description: 'Conexão de escrita do `auth`.',
    readBy: 'shared/persistence/module-driver-config.ts',
    example: LOCAL_MYSQL,
  },
  CONTRACTS_DATABASE_URL: {
    description: 'Conexão de escrita do `contracts`.',
    readBy: 'shared/persistence/module-driver-config.ts',
    example: LOCAL_MYSQL,
  },
  FINANCIAL_DATABASE_URL: {
    description: 'Conexão de escrita do `financial`.',
    readBy: 'shared/persistence/module-driver-config.ts',
    example: LOCAL_MYSQL,
  },
  PARTNERS_DATABASE_URL: {
    description: 'Conexão de escrita do `partners`.',
    readBy: 'shared/persistence/module-driver-config.ts',
    example: LOCAL_MYSQL,
  },
  PROGRAMS_DATABASE_URL: {
    description: 'Conexão de escrita do `programs`.',
    readBy: 'shared/persistence/module-driver-config.ts',
    example: LOCAL_MYSQL,
  },
  BUDGET_PLANS_DATABASE_URL: {
    description: 'Conexão de escrita do `budget-plans`.',
    readBy: 'shared/persistence/module-driver-config.ts',
    example: LOCAL_MYSQL,
  },
  MIGRATE_DATABASE_URL: {
    description:
      'Conexão usada pelo job `migrate`. Separada porque o boot NÃO migra: o schema é provisionado antes do deploy, para evitar corrida entre instâncias.',
    readBy: 'jobs/migrate/config.ts',
    example: LOCAL_MYSQL,
  },
  CONTRACTS_DATABASE_URL_FILE: {
    description:
      'Caminho de arquivo com a conexão do `contracts`, para secret montado como volume. ⚠️ Mutuamente exclusiva com `CONTRACTS_DATABASE_URL` — as duas juntas devolvem `sweeper-ambiguous-connection-config`.',
    readBy: 'jobs/contracts/sweeper/config.ts',
    example: '',
  },
  CONTRACTS_READER_URL: {
    description:
      'Réplica de leitura do `contracts` (ADR-0026). Ausente, o reader reusa o writer — single-node. Só `contracts` e `partners` têm split.',
    readBy: 'server.ts',
    example: '',
  },
  PARTNERS_READER_URL: {
    description: 'Réplica de leitura do `partners`. Ver `CONTRACTS_READER_URL`.',
    readBy: 'server.ts',
    example: '',
  },
  REPORTS_DATABASE_URL: {
    description:
      'Conexão do `reports`. Primeiro elo da cascata `REPORTS_* ?? <módulo-fonte>_*`: o `reports` é read-only e não tem base própria.',
    readBy: 'shared/persistence/module-driver-config.ts',
    example: '',
  },
  REPORTS_CONTRACTS_DATABASE_URL: {
    description: 'Sobrescreve a origem de contratos nas leituras do `reports`.',
    readBy: 'shared/persistence/module-driver-config.ts',
    example: '',
  },
  REPORTS_FINANCIAL_DATABASE_URL: {
    description: 'Sobrescreve a origem financeira nas leituras do `reports`.',
    readBy: 'shared/persistence/module-driver-config.ts',
    example: '',
  },
  REPORTS_BUDGET_PLANS_DATABASE_URL: {
    description: 'Sobrescreve a origem de planos nas leituras do `reports`.',
    readBy: 'shared/persistence/module-driver-config.ts',
    example: '',
  },

  // ── Autenticação ───────────────────────────────────────────────────────────────────────────
  AUTH_RBAC_MODE: {
    description:
      '`enforced` ou `bypass`. ⚠️ Hoje NÃO é lida: o modo está fixado em `bypass` por código (`server.ts`, duas linhas marcadas `← religar`), e sob bypass todo autenticado aprova qualquer valor. Religar é a #634; o boot emite banner quando esta variável e o modo fixo divergem.',
    readBy: 'modules/auth/adapters/http/rbac-mode.ts',
    example: 'enforced',
    defaultValue: 'enforced',
  },
  AUTH_JWT_PRIVATE_KEY: {
    description:
      'Chave privada ES256 que assina o token. ⚠️ Classificada como só-produção pelo manifesto, mas sem ela o login local não emite token — gerar um par local e mantê-lo FORA do versionamento.',
    readBy: 'modules/auth/adapters/http/jwt-key-config.ts',
    example: '',
  },
  AUTH_JWT_PUBLIC_KEY: {
    description: 'Chave pública ES256 que verifica o token. Ver `AUTH_JWT_PRIVATE_KEY`.',
    readBy: 'modules/auth/adapters/http/jwt-key-config.ts',
    example: '',
  },
  AUTH_RESET_BASE_URL: {
    description:
      'Base do link de redefinição de senha. Exige URL absoluta `http(s)`; relativa o SPA descarta, e o boot falha em produção em vez de enviar e-mail com link quebrado.',
    readBy: 'shared/http/email-link-base-urls.ts',
    example: '',
  },
  AUTH_ACTIVATION_BASE_URL: {
    description: 'Base do link de ativação de conta. Ver `AUTH_RESET_BASE_URL`.',
    readBy: 'shared/http/email-link-base-urls.ts',
    example: '',
  },
  PARTNERS_SELF_REGISTRATION_BASE_URL: {
    description: 'Base do link de autocadastro de parceiro. Ver `AUTH_RESET_BASE_URL`.',
    readBy: 'shared/http/email-link-base-urls.ts',
    example: '',
  },
  AUTH_SEED_JSON: {
    description:
      'Semente de usuários para a suíte E2E, em JSON. Só tem efeito com `CORE_API_E2E` ligada.',
    readBy: 'modules/auth/adapters/http/e2e-seed.ts',
    example: '',
  },
  BUDGET_PLANS_SEED_JSON: {
    description:
      'Semente de planos orçamentários para a suíte E2E, em JSON. Só tem efeito com `CORE_API_E2E` ligada.',
    readBy: 'modules/budget-plans/adapters/http/e2e-seed.ts',
    example: '',
    notComposed:
      '`parseE2eBudgetPlansSeed` ficou órfã quando o ramo `memory` saiu do `server.ts` — o próprio arquivo registra isso em `server.ts:65`. O `public-api/http.ts` ainda a exporta, e ninguém a chama.',
  },
  CORE_API_E2E: {
    description:
      'Liga as rotas de semente usadas pela suíte E2E. ⚠️ Nunca ligar em ambiente com dado real: elas escrevem direto no banco, sem passar pelas regras de domínio.',
    readBy: 'modules/auth/adapters/http/e2e-seed.ts',
    example: 'false',
  },

  // ── Storage S3 — documentos e foto ─────────────────────────────────────────────────────────
  S3_REGION: {
    description: 'Região do bucket de documentos (fiscal do `financial`, foto do colaborador).',
    readBy: 'modules/contracts/adapters/storage/s3-config-aws.ts',
    example: 'us-east-1',
  },
  S3_BUCKET: {
    description: 'Bucket de documentos.',
    readBy: 'modules/contracts/adapters/storage/s3-config-aws.ts',
    example: 'contracts-documents',
  },
  S3_ENDPOINT: {
    description:
      'Endpoint S3. Preenchido aponta para o S3 local; vazio usa o endpoint padrão da AWS.',
    readBy: 'modules/contracts/adapters/storage/s3-config-aws.ts',
    example: LOCAL_S3,
  },
  S3_FORCE_PATH_STYLE: {
    description:
      'Endereçamento por path em vez de subdomínio. Obrigatório contra S3 local; desnecessário na AWS.',
    readBy: 'modules/contracts/adapters/storage/s3-config-aws.ts',
    example: 'true',
  },
  S3_ACCESS_KEY_ID: {
    description:
      'Chave de acesso ao bucket de documentos. ⚠️ Vai JUNTO com `S3_SECRET_ACCESS_KEY`; ausentes as duas, o SDK cai na provider chain do IAM — que é o caminho de produção.',
    readBy: 'modules/contracts/adapters/storage/s3-config-aws.ts',
    example: 'dev',
  },
  S3_SECRET_ACCESS_KEY: {
    description: 'Segredo da chave de acesso. Ver `S3_ACCESS_KEY_ID`.',
    readBy: 'modules/contracts/adapters/storage/s3-config-aws.ts',
    example: 'devpassword',
  },

  // ── Storage S3 — logo de programa ──────────────────────────────────────────────────────────
  PROGRAMS_LOGO_S3_BUCKET: {
    description:
      'Bucket do logo de programa. ⚠️ A ausência deste bloco derrubou o ambiente de homologação por 4h20 em 24/08/2026 (#842): o fail-fast é deliberado, e o que faltava era a declaração.',
    readBy: 'modules/programs/adapters/http/logo-storage-config.ts',
    example: 'core-api-programs-logo',
  },
  PROGRAMS_LOGO_S3_ENDPOINT: {
    description: 'Endpoint S3 do logo de programa.',
    readBy: 'modules/programs/adapters/http/logo-storage-config.ts',
    example: LOCAL_S3,
  },
  PROGRAMS_LOGO_S3_REGION: {
    description: 'Região do bucket de logo.',
    readBy: 'modules/programs/adapters/http/logo-storage-config.ts',
    example: 'us-east-1',
  },
  PROGRAMS_LOGO_S3_FORCE_PATH_STYLE: {
    description: 'Endereçamento por path no bucket de logo. Ver `S3_FORCE_PATH_STYLE`.',
    readBy: 'modules/programs/adapters/http/logo-storage-config.ts',
    example: 'true',
  },
  PROGRAMS_LOGO_S3_ACCESS_KEY_ID: {
    description: 'Chave de acesso ao bucket de logo.',
    readBy: 'modules/programs/adapters/http/logo-storage-config.ts',
    example: 'dev',
  },
  PROGRAMS_LOGO_S3_SECRET_ACCESS_KEY: {
    description: 'Segredo da chave do bucket de logo.',
    readBy: 'modules/programs/adapters/http/logo-storage-config.ts',
    example: 'devpassword',
  },

  // ── Storage S3 — VAN (transporte da remessa bancária) ──────────────────────────────────────
  VAN_S3_REGION: {
    description:
      'Região do bucket da VAN. ⚠️ Obrigatória para o processo `http`, não só para o grupo `van`: `buildVanStorage` lança no boot e é chamado de forma eager na composição do `financial` sob `FINANCIAL_DRIVER=mysql`. Foi a ausência desta e de `VAN_S3_BUCKET` no `.env.example` que impedia um clone novo de subir (#1059).',
    readBy: 'modules/financial/adapters/van/van-s3-config.ts',
    example: 'us-east-1',
  },
  VAN_S3_BUCKET: {
    description:
      'Bucket da VAN. ⚠️ Gravar objeto no prefixo de saída deste bucket É enfileirar pagamento (ADR-0060) — em produção, errar o nome do bucket é a diferença entre ensaio e dinheiro.',
    readBy: 'modules/financial/adapters/van/van-s3-config.ts',
    example: 'core-api-van',
  },
  VAN_S3_ENDPOINT: {
    description: 'Endpoint S3 do bucket da VAN.',
    readBy: 'modules/financial/adapters/van/van-s3-config.ts',
    example: LOCAL_S3,
  },
  VAN_S3_FORCE_PATH_STYLE: {
    description: 'Endereçamento por path no bucket da VAN. Ver `S3_FORCE_PATH_STYLE`.',
    readBy: 'modules/financial/adapters/van/van-s3-config.ts',
    example: 'true',
  },
  VAN_S3_ACCESS_KEY_ID: {
    description:
      'Chave de acesso ao bucket da VAN. ⚠️ Vai JUNTO com `VAN_S3_SECRET_ACCESS_KEY`. Em produção o agente usa role da própria instância, sem chave estática (ADR-0061).',
    readBy: 'modules/financial/adapters/van/van-s3-config.ts',
    example: 'dev',
  },
  VAN_S3_SECRET_ACCESS_KEY: {
    description: 'Segredo da chave do bucket da VAN. Ver `VAN_S3_ACCESS_KEY_ID`.',
    readBy: 'modules/financial/adapters/van/van-s3-config.ts',
    example: 'devpassword',
  },
  VAN_S3_PREFIX_OUTBOUND: {
    description:
      'Prefixo da fila de saída — remessa depositada e ainda não transmitida. ⚠️ Escrever aqui É enfileirar pagamento.',
    readBy: 'modules/financial/adapters/van/van-s3-config.ts',
    example: 'saida/',
  },
  VAN_S3_PREFIX_PROCESSED: {
    description:
      'Prefixo do que foi transmitido COM confirmação. Somente leitura para a aplicação.',
    readBy: 'modules/financial/adapters/van/van-s3-config.ts',
    example: 'processados/',
  },
  VAN_S3_PREFIX_FAILED: {
    description:
      'Prefixo do que ficou sem confirmação e aguarda revisão humana — nunca retransmitido automaticamente. ⚠️ Objeto aqui NÃO prova que o banco não recebeu.',
    readBy: 'modules/financial/adapters/van/van-s3-config.ts',
    example: 'falhas/',
  },
  VAN_S3_PREFIX_RETURNS: {
    description:
      'Prefixo dos arquivos recebidos do banco. ⚠️ A caixa é do CONVÊNIO: chegam retornos sem correspondência com remessa nossa, e o processamento não deve falhar o lote por referência desconhecida.',
    readBy: 'modules/financial/adapters/van/van-s3-config.ts',
    example: 'retorno/',
  },
  VAN_S3_PREFIX_STATUS: {
    description:
      'Prefixo do envelope de status por execução — a única janela sobre o que o agente fez. A ausência de um envelope de recepção significa "rodou e não havia nada", não "não rodou".',
    readBy: 'modules/financial/adapters/van/van-s3-config.ts',
    example: 'status/',
  },
  VAN_S3_PREFIX_SANDBOX: {
    description:
      'Prefixo de ensaio. ⚠️ Existe APENAS no bucket de homologação: no de produção não há sandbox, e errar o destino exige trocar o nome do bucket, não o prefixo.',
    readBy: 'modules/financial/adapters/van/van-s3-config.ts',
    example: 'sandbox/',
  },

  // ── Sandbox da VAN (bucket separado, exercício do nosso lado) ──────────────────────────────
  VAN_SANDBOX_S3_REGION: {
    description:
      'Região do bucket de sandbox da VAN, usado para exercitar o nosso lado do contrato.',
    readBy: 'modules/financial/adapters/http/van-sandbox-composition.ts',
    example: 'us-east-1',
  },
  VAN_SANDBOX_S3_BUCKET: {
    description: 'Bucket de sandbox da VAN. Separado do de produção por desenho.',
    readBy: 'modules/financial/adapters/http/van-sandbox-composition.ts',
    example: '',
  },
  VAN_SANDBOX_S3_ENDPOINT: {
    description: 'Endpoint S3 do sandbox da VAN.',
    readBy: 'modules/financial/adapters/http/van-sandbox-composition.ts',
    example: '',
  },
  VAN_SANDBOX_S3_FORCE_PATH_STYLE: {
    description: 'Endereçamento por path no sandbox da VAN.',
    readBy: 'modules/financial/adapters/http/van-sandbox-composition.ts',
    example: '',
  },
  VAN_SANDBOX_S3_ACCESS_KEY_ID: {
    description: 'Chave de acesso ao sandbox da VAN.',
    readBy: 'modules/financial/adapters/http/van-sandbox-composition.ts',
    example: '',
  },
  VAN_SANDBOX_S3_SECRET_ACCESS_KEY: {
    description: 'Segredo da chave do sandbox da VAN.',
    readBy: 'modules/financial/adapters/http/van-sandbox-composition.ts',
    example: '',
  },
  VAN_SANDBOX_S3_PREFIX: {
    description: 'Prefixo usado dentro do bucket de sandbox.',
    readBy: 'modules/financial/adapters/http/van-sandbox-composition.ts',
    example: '',
  },
  VAN_SANDBOX_TOKEN: {
    description: 'Token que autoriza as rotas de sandbox da VAN.',
    readBy: 'modules/financial/adapters/http/van-sandbox-auth.ts',
    example: '',
  },

  // ── Storage Magalu Cloud (object storage alternativo, ADR-0021) ────────────────────────────
  MAGALU_REGION: {
    description:
      'Região do object storage da Magalu Cloud. Exigida pelo adapter `magalu-object-storage` da capacidade `s3-compat` — ver `capability-adapters.ts`. ⚠️ O ambiente da Magalu não recebe dado real nem pessoal (ADR-0021): produção e dado pessoal vivem na AWS, com residência no Brasil.',
    readBy: 'modules/contracts/adapters/storage/magalu-cloud-config.ts',
    example: '',
  },
  MAGALU_BUCKET: {
    description: 'Bucket na Magalu Cloud. Ver `MAGALU_REGION`.',
    readBy: 'modules/contracts/adapters/storage/magalu-cloud-config.ts',
    example: '',
  },
  MAGALU_ACCESS_KEY_ID: {
    description: 'Chave de acesso à Magalu Cloud. Ver `MAGALU_REGION`.',
    readBy: 'modules/contracts/adapters/storage/magalu-cloud-config.ts',
    example: '',
  },
  MAGALU_SECRET_ACCESS_KEY: {
    description: 'Segredo da chave da Magalu Cloud. Ver `MAGALU_REGION`.',
    readBy: 'modules/contracts/adapters/storage/magalu-cloud-config.ts',
    example: '',
  },

  // ── Outbox (relay e projeções) ─────────────────────────────────────────────────────────────
  OUTBOX_POLL_MS: {
    description:
      'Intervalo de polling do outbox. MySQL não tem `LISTEN/NOTIFY`, então a leitura é sempre polling (ADR-0015).',
    readBy: 'modules/contracts/worker/config.ts',
    example: '500',
  },
  OUTBOX_IDLE_SLEEP_MS: {
    description: 'Pausa quando o claim não encontra evento pendente.',
    readBy: 'modules/contracts/worker/config.ts',
    example: '1000',
  },
  OUTBOX_BATCH_SIZE: {
    description: 'Quantos eventos cada claim reivindica por rodada.',
    readBy: 'modules/contracts/worker/config.ts',
    example: '50',
  },
  OUTBOX_MAX_ATTEMPTS: {
    description:
      'Tentativas antes de o evento ir para dead-letter. ⚠️ O dead-letter é por CONSUMIDOR e terminal, e nunca apaga a linha de origem (ADR-0064).',
    readBy: 'modules/contracts/worker/config.ts',
    example: '5',
  },
  OUTBOX_CONSUMER_ID: {
    description:
      'Identidade do consumidor no par `(consumidor, evento)`. ⚠️ A pendência é por consumidor, não da linha: o mesmo evento é entregue a N consumidores (fanout), e usar um id compartilhado faz dois consumidores dividirem os eventos em vez de cada um receber todos.',
    readBy: 'shared/outbox/registered-consumers.ts',
    example: 'worker-outbox-local',
  },
  OUTBOX_LOG_FILE: {
    description: 'Arquivo de log do relay, quando se quer a saída fora do stdout.',
    readBy: 'modules/contracts/worker/config.ts',
    example: '',
  },

  // ── E-mail ─────────────────────────────────────────────────────────────────────────────────
  EMAIL_PROVIDER: {
    description:
      'Provedor de envio: `smtp`, `resend` ou `memory`. ⚠️ Ausente, o worker cai em `memory` e DESCARTA todo e-mail de reset e convite, com boot verde (#1047). ⚠️ E o valor escolhido torna outras variáveis OBRIGATÓRIAS: `smtp` exige `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER` e `SMTP_PASS` não-vazios; `resend` exige `RESEND_API_KEY`. Nenhuma dessas aparece em `env` no manifesto, porque a obrigação depende DESTE valor — e o `worker-email` sai com 78 quando falta alguma.',
    readBy: 'modules/notifications/adapters/email/email-config.ts',
    example: 'smtp',
  },
  EMAIL_FROM: {
    description:
      'Remetente padrão. ⚠️ Pelo menos UM dos remetentes precisa existir, senão a spec de e-mail não monta.',
    readBy: 'modules/notifications/adapters/email/email-config.ts',
    example: 'nao-responda@example.test',
  },
  EMAIL_FROM_RESET: {
    description: 'Remetente específico da redefinição de senha. Ver `EMAIL_FROM`.',
    readBy: 'modules/notifications/adapters/email/email-config.ts',
    example: '',
  },
  AUTH_RESET_FROM: {
    description: 'Alias legado do remetente de redefinição. Ver `EMAIL_FROM`.',
    readBy: 'modules/notifications/adapters/email/email-config.ts',
    example: '',
  },
  EMAIL_FROM_INVITE: {
    description: 'Remetente específico do convite. Ver `EMAIL_FROM`.',
    readBy: 'modules/notifications/adapters/email/email-config.ts',
    example: '',
  },
  AUTH_INVITE_FROM: {
    description: 'Alias legado do remetente de convite. Ver `EMAIL_FROM`.',
    readBy: 'modules/notifications/adapters/email/email-config.ts',
    example: '',
  },
  EMAIL_FROM_NOTIFICATION: {
    description: 'Remetente das notificações gerais.',
    readBy: 'modules/notifications/adapters/email/email-config.ts',
    example: '',
  },
  EMAIL_FROM_ALLOWED_DOMAINS: {
    description:
      'Domínios aceitos como remetente, separados por vírgula. Recusa envio de domínio não autorizado antes de tentar o provedor.',
    readBy: 'modules/notifications/adapters/email/email-config.ts',
    example: 'example.test',
  },
  EMAIL_SANDBOX_TO: {
    description:
      'Redireciona TODO e-mail para este destinatário, qualquer que seja o original. Comportamento de decorator, aplicado num ponto só (ADR-0010).',
    readBy: 'modules/notifications/adapters/email/email-config.ts',
    example: '',
  },
  EMAIL_RATE_LIMIT_MAX: {
    description: 'E-mails por janela, para não estourar a cota do provedor.',
    readBy: 'modules/notifications/adapters/email/rate-limit.ts',
    example: '',
  },
  EMAIL_RATE_LIMIT_WINDOW_MS: {
    description: 'Janela do rate limit de e-mail.',
    readBy: 'modules/notifications/adapters/email/rate-limit.ts',
    example: '',
  },
  SMTP_HOST: {
    description: 'Host SMTP. A `~/.infra` sobe o Mailpit, com UI em `http://localhost:8025`.',
    readBy: 'modules/notifications/adapters/email/nodemailer-config.ts',
    example: 'localhost',
  },
  SMTP_PORT: {
    description: 'Porta SMTP.',
    readBy: 'modules/notifications/adapters/email/nodemailer-config.ts',
    example: '1025',
  },
  SMTP_SECURE: {
    description: 'TLS desde a conexão (porta 465). Falso usa STARTTLS quando disponível.',
    readBy: 'modules/notifications/adapters/email/nodemailer-config.ts',
    example: 'false',
  },
  SMTP_REQUIRE_TLS: {
    description: 'Exige STARTTLS e recusa a conexão sem ele.',
    readBy: 'modules/notifications/adapters/email/nodemailer-config.ts',
    example: 'false',
  },
  SMTP_USER: {
    description:
      'Usuário SMTP. ⚠️ **Obrigatório e não-vazio sob `EMAIL_PROVIDER=smtp`** — está em `REQUIRED_FIELDS` (`nodemailer-config.ts:40-46`), e a validação recusa `undefined` E string vazia. Declarar vazio derruba o `worker-email` com exit 78, que sob o overmind leva os outros quatro processos. O Mailpit local não autentica, então qualquer valor serve.',
    readBy: 'modules/notifications/adapters/email/nodemailer-config.ts',
    example: 'dev',
  },
  SMTP_PASS: {
    description:
      'Senha SMTP. ⚠️ **Obrigatória e não-vazia sob `EMAIL_PROVIDER=smtp`** — ver `SMTP_USER`. O Mailpit local não autentica, então qualquer valor serve.',
    readBy: 'modules/notifications/adapters/email/nodemailer-config.ts',
    example: 'dev',
  },
  SMTP_POOL: {
    description: 'Reaproveita conexões SMTP em vez de abrir uma por envio.',
    readBy: 'modules/notifications/adapters/email/nodemailer-config.ts',
    example: '',
  },
  SMTP_MAX_CONNS: {
    description: 'Teto de conexões simultâneas no pool SMTP.',
    readBy: 'modules/notifications/adapters/email/nodemailer-config.ts',
    example: '',
  },
  RESEND_API_KEY: {
    description: 'Credencial do provedor Resend. Só usada com `EMAIL_PROVIDER=resend`.',
    readBy: 'modules/notifications/adapters/email/resend-config.ts',
    example: '',
  },

  // ── Jobs agendados ─────────────────────────────────────────────────────────────────────────
  SWEEP_BATCH_SIZE: {
    description: 'Contratos processados por rodada na varredura de ciclo de vida.',
    readBy: 'jobs/contracts/sweeper/config.ts',
    example: '',
  },
};

/** Os nomes catalogados, para as varreduras e o gerador. */
export const CATALOGUED_ENVS: readonly string[] = Object.keys(ENV_CATALOG).sort();

/**
 * A entrada de uma variável, ou `undefined` se ela não está catalogada.
 *
 * @remarks
 * Existe para que consumidor nenhum precise de cast: sob `noUncheckedIndexedAccess` o acesso
 * indexado a um `Record` devolve `T | undefined`, e espalhar `as` pelos chamadores troca um
 * `undefined` honesto por um erro em runtime no dia em que o nome não existir.
 */
export const envDoc = (name: string): EnvDoc | undefined => ENV_CATALOG[name];
