/**
 * WORKLOADS — o que este repositório sabe executar, e o que exige do ambiente para executá-lo.
 *
 * @remarks
 * Fonte única e auto-contida: descreve **apenas** o que o core-api sabe sobre si mesmo. Não há aqui
 * ARN, subnet, cluster, conta, tamanho de instância nem nome de fornecedor — isso pertence a quem
 * opera a infraestrutura, e declará-lo aqui criaria uma segunda verdade a divergir da primeira.
 *
 * O modelo espelha os três regimes de execução do Amazon ECS, porque é neles que estas unidades
 * rodam hoje: `service` (long-running, `desiredCount`), `task` (avulsa, via `RunTask`) e
 * `scheduled` (`EventBridge Scheduler` disparando `RunTask`). A escolha não amarra o repositório à
 * AWS — os três regimes existem em qualquer orquestrador —, mas torna a tradução mecânica.
 *
 * **Uma imagem, N unidades.** Todas as unidades rodam a MESMA imagem e diferem apenas por
 * `command` e ambiente. É o que garante que `backend` e `worker-outbox` estejam sempre no mesmo
 * commit: mesmo digest, mesmo código. Um `Dockerfile` por unidade traria de volta a divergência
 * que este desenho existe para impedir.
 *
 * **`name` é o nome real da unidade no ambiente**, e casa com o grupo de log
 * `/ecs/erp-bem-comum-<name>-<env>`. Isso torna o manifesto verificável contra a realidade
 * observada, em vez de verificável apenas contra si mesmo.
 *
 * @see {@link WORKLOADS} para o catálogo completo.
 */

/**
 * Capacidade externa que o ambiente precisa fornecer para a unidade funcionar.
 *
 * @remarks
 * Descreve o **tipo** de serviço esperado, nunca o fornecedor nem o endereço. `s3-compat` cobre
 * S3, MinIO e Magalu Cloud indistintamente — o adapter é o mesmo SDK, mudando `forcePathStyle`
 * (ADR-0019). Quem escolhe qual provedor atende a capacidade é a infraestrutura.
 */
export type Capability =
  | Readonly<{ kind: 'mysql'; version: '8.4' }>
  | Readonly<{ kind: 's3-compat' }>
  | Readonly<{ kind: 'smtp' }>
  | Readonly<{ kind: 'filesystem' }>;

/**
 * Relação entre variáveis que nenhuma lista sozinha expressa.
 *
 * @remarks
 * Existe porque o código já cobra essas relações em runtime e falha de formas específicas:
 * `all-or-none` é o XOR de credenciais S3 (uma sem a outra devolve `missing-env`), `xor` é a
 * escolha entre URL literal e URL em arquivo no sweeper, e `at-least-one` é o remetente de e-mail,
 * que aceita cinco nomes diferentes. Sem declarar a relação, o manifesto listaria as cinco como
 * opcionais e descreveria errado uma unidade que não sobe sem nenhuma delas.
 */
export type EnvConstraint =
  | Readonly<{ rule: 'all-or-none'; envs: readonly string[]; because: string }>
  | Readonly<{ rule: 'xor'; envs: readonly string[]; because: string }>
  | Readonly<{ rule: 'at-least-one'; envs: readonly string[]; because: string }>;

/**
 * Se a unidade tem execução observada no ambiente ou existe apenas declarada aqui.
 *
 * @remarks
 * `declared-only` não é rascunho: é unidade que o repositório sabe executar e que ninguém
 * provisionou. Declará-la torna a lacuna visível — o alternativo é ela ser esquecida, que foi o
 * que aconteceu com o grupo `van` e com dois dos três backfills.
 */
export type Provisioning = 'provisioned' | 'declared-only';

/**
 * Campos comuns a todo regime de execução.
 *
 * @remarks
 * A separação entre `env`, `envWithDefault` e `envProductionOnly` **é** a política de fail-fast do
 * ADR-0068 tornada estrutura. Um booleano `failFast: true` repetido em toda unidade não diria
 * nada; três listas dizem exatamente qual variável derruba o boot, qual tem substituto no código e
 * qual só é exigida sob `NODE_ENV=production`.
 */
type Common = Readonly<{
  /** Nome da unidade; casa com `/ecs/erp-bem-comum-<name>-<env>`. */
  name: string;
  /** Argumentos do processo. O primeiro elemento é sempre `node`. */
  command: readonly string[];
  /** O que o ambiente precisa fornecer. */
  requires: readonly Capability[];
  /** Obrigatórias — ausência derruba o boot (ADR-0068). */
  env: readonly string[];
  /** Têm substituto no código; ausência não derruba. */
  envWithDefault: readonly string[];
  /** Obrigatórias apenas sob `NODE_ENV=production`. */
  envProductionOnly: readonly string[];
  /** Relações entre variáveis que as listas acima não expressam. */
  constraints: readonly EnvConstraint[];
  /**
   * Unidades que precisam ter concluído com sucesso antes desta começar.
   *
   * @remarks
   * É a ordem de **produção**, não o `depends_on` de nenhum orquestrador: `migrate` aplica o
   * schema, `sync-permissions` semeia o catálogo de RBAC, e só então a porta abre. Sem essa cadeia
   * a permissão nova não chega ao ambiente e o sintoma é um 403 mudo, não um erro de boot — foi a
   * #462. Declarar aqui é o que mantém a invariante quando o artefato que a expressava sai de cena.
   *
   * Não descreve espera entre processos long-running: worker não aguarda a borda HTTP subir, e
   * declarar que aguarda foi o que tornou impossível levantar os workers isoladamente.
   */
  dependsOn: readonly string[];
  /** Se há execução observada no ambiente. */
  provisioning: Provisioning;
  /** Motivo da aposentadoria, quando a unidade não deve mais ser executada. */
  retired?: string;
}>;

/**
 * Unidade executável deste repositório, discriminada pelo regime de execução.
 *
 * @remarks
 * A união é discriminada por `kind` de propósito: `stopTimeoutSeconds` só faz sentido em processo
 * que recebe `SIGTERM` e precisa drenar, e `cron`/`timezone` só em unidade agendada. Com
 * `exactOptionalPropertyTypes` ligado, campo opcional em todos os regimes permitiria declarar
 * `cron` numa unidade que nunca será agendada — a união impede isso na compilação.
 */
export type Workload =
  | (Common &
      Readonly<{
        kind: 'service';
        /**
         * Segundos entre o `SIGTERM` e o `SIGKILL`.
         *
         * @remarks
         * Precisa ser maior que o tempo de drenagem do `PoolRegistry`: o runner aborta os loops e
         * fecha os pools em sequência, e um `SIGKILL` no meio deixa conexão pendurada até o
         * `wait_timeout` do MySQL — o modo de falha do Incident-0001.
         */
        stopTimeoutSeconds: number;
      }>)
  | (Common & Readonly<{ kind: 'task' }>)
  | (Common &
      Readonly<{
        kind: 'scheduled';
        /** Expressão cron, no dialeto de 6 campos do EventBridge Scheduler. */
        cron: string;
        /** Fuso em que o cron é avaliado. Explícito sempre — o cutoff de negócio depende dele. */
        timezone: string;
      }>);

// ── blocos reaproveitados ────────────────────────────────────────────────────

/** MySQL 8.4 — o único dialeto do projeto (ADR-0020). */
const MYSQL: Capability = { kind: 'mysql', version: '8.4' };

/** Ajuste fino da borda HTTP; todos com default em `shared/http/config.ts`. */
const HTTP_TUNING = [
  'PORT',
  'HOST',
  'CORS_ORIGINS',
  'RATE_LIMIT_MAX',
  'RATE_LIMIT_WINDOW',
  'TRUST_PROXY',
  'REQUEST_TIMEOUT_MS',
  'KEEP_ALIVE_TIMEOUT_MS',
  'LOG_LEVEL',
  'NODE_ENV',
] as const;

/** Prefixos do bucket da VAN; cada um tem default em `van-s3-config.ts`. */
const VAN_S3_PREFIXES = [
  'VAN_S3_PREFIX_OUTBOUND',
  'VAN_S3_PREFIX_PROCESSED',
  'VAN_S3_PREFIX_FAILED',
  'VAN_S3_PREFIX_RETURNS',
  'VAN_S3_PREFIX_STATUS',
  'VAN_S3_PREFIX_SANDBOX',
] as const;

/**
 * Rota de sandbox da VAN.
 *
 * @remarks
 * Todas opcionais, e a ausência **desliga a rota inteira** em vez de falhar — degradação
 * silenciosa que só é visível se estiver declarada.
 */
const VAN_SANDBOX = [
  'VAN_SANDBOX_TOKEN',
  'VAN_SANDBOX_S3_REGION',
  'VAN_SANDBOX_S3_BUCKET',
  'VAN_SANDBOX_S3_ENDPOINT',
  'VAN_SANDBOX_S3_ACCESS_KEY_ID',
  'VAN_SANDBOX_S3_SECRET_ACCESS_KEY',
  'VAN_SANDBOX_S3_FORCE_PATH_STYLE',
  'VAN_SANDBOX_S3_PREFIX',
] as const;

/** Cadência do consumidor de outbox; todas com default em `<módulo>/worker/config.ts`. */
const OUTBOX_TUNING = [
  'OUTBOX_BATCH_SIZE',
  'OUTBOX_MAX_ATTEMPTS',
  'OUTBOX_POLL_MS',
  'OUTBOX_IDLE_SLEEP_MS',
  'OUTBOX_CONSUMER_ID',
  'OUTBOX_LOG_FILE',
] as const;

/**
 * Catálogo das unidades executáveis do core-api.
 *
 * @remarks
 * Inclui deliberadamente o que **não** está provisionado (`worker-van`, os sweepers, dois dos três
 * backfills): o manifesto é o que este repositório sabe executar, e a diferença entre isso e o que
 * roda é informação, não sujeira. `satisfies` valida cada entrada contra {@link Workload} sem
 * apagar os literais, para que os gates possam varrer os valores exatos.
 */
export const WORKLOADS = [
  {
    kind: 'service',
    name: 'backend',
    dependsOn: ['migrate', 'sync-permissions'],
    command: ['node', 'src/server.ts'],
    requires: [MYSQL, { kind: 's3-compat' }],
    stopTimeoutSeconds: 30,
    provisioning: 'provisioned',
    env: [
      'AUTH_DRIVER',
      'CONTRACTS_DRIVER',
      'PARTNERS_DRIVER',
      'PROGRAMS_DRIVER',
      'FINANCIAL_DRIVER',
      'BUDGET_PLANS_DRIVER',
      'REPORTS_DRIVER',
      'AUTH_DATABASE_URL',
      'CONTRACTS_DATABASE_URL',
      'PARTNERS_DATABASE_URL',
      'PROGRAMS_DATABASE_URL',
      'FINANCIAL_DATABASE_URL',
      'BUDGET_PLANS_DATABASE_URL',
      'S3_REGION',
      'S3_BUCKET',
      'VAN_S3_REGION',
      'VAN_S3_BUCKET',
      'PROGRAMS_LOGO_S3_ENDPOINT',
      'PROGRAMS_LOGO_S3_BUCKET',
    ],
    envProductionOnly: [
      'AUTH_JWT_PRIVATE_KEY',
      'AUTH_JWT_PUBLIC_KEY',
      'AUTH_RESET_BASE_URL',
      'AUTH_ACTIVATION_BASE_URL',
      'PARTNERS_SELF_REGISTRATION_BASE_URL',
    ],
    envWithDefault: [
      ...HTTP_TUNING,
      ...VAN_S3_PREFIXES,
      ...VAN_SANDBOX,
      'REPORTS_DATABASE_URL',
      'REPORTS_FINANCIAL_DATABASE_URL',
      'REPORTS_CONTRACTS_DATABASE_URL',
      'REPORTS_BUDGET_PLANS_DATABASE_URL',
      'S3_ENDPOINT',
      'S3_ACCESS_KEY_ID',
      'S3_SECRET_ACCESS_KEY',
      'S3_FORCE_PATH_STYLE',
      'VAN_S3_ENDPOINT',
      'VAN_S3_ACCESS_KEY_ID',
      'VAN_S3_SECRET_ACCESS_KEY',
      'VAN_S3_FORCE_PATH_STYLE',
      'PROGRAMS_LOGO_S3_REGION',
      'PROGRAMS_LOGO_S3_ACCESS_KEY_ID',
      'PROGRAMS_LOGO_S3_SECRET_ACCESS_KEY',
      'PROGRAMS_LOGO_S3_FORCE_PATH_STYLE',
      'AUTH_RBAC_MODE',
      'AUTH_SEED_JSON',
      'CORE_API_E2E',
      'AUTH_LOGIN_RATE_LIMIT_MAX',
      'AUTH_LOGIN_RATE_LIMIT_WINDOW',
      'CONTRACTS_READER_URL',
      'PARTNERS_READER_URL',
    ],
    constraints: [
      {
        rule: 'all-or-none',
        envs: ['S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY'],
        because: 'uma sem a outra é config pela metade; ausentes caem na provider chain do IAM',
      },
      {
        rule: 'all-or-none',
        envs: ['VAN_S3_ACCESS_KEY_ID', 'VAN_S3_SECRET_ACCESS_KEY'],
        because: 'mesmo XOR do bloco S3, aplicado ao bucket da VAN',
      },
    ],
  },
  {
    kind: 'service',
    name: 'worker-outbox',
    dependsOn: ['migrate'],
    command: ['node', 'src/workers/runner/run.ts'],
    requires: [MYSQL],
    stopTimeoutSeconds: 30,
    provisioning: 'provisioned',
    env: ['WORKER_GROUP', 'CONTRACTS_DATABASE_URL', 'PARTNERS_DATABASE_URL'],
    envProductionOnly: [],
    envWithDefault: [...OUTBOX_TUNING, ...HTTP_TUNING],
    constraints: [],
  },
  {
    kind: 'service',
    name: 'worker-projections',
    dependsOn: ['migrate'],
    command: ['node', 'src/workers/runner/run.ts'],
    requires: [MYSQL],
    stopTimeoutSeconds: 30,
    provisioning: 'provisioned',
    env: [
      'WORKER_GROUP',
      'CONTRACTS_DATABASE_URL',
      'PARTNERS_DATABASE_URL',
      'FINANCIAL_DATABASE_URL',
    ],
    envProductionOnly: [],
    envWithDefault: [...OUTBOX_TUNING, ...HTTP_TUNING],
    constraints: [],
  },
  {
    kind: 'service',
    name: 'worker-email',
    dependsOn: ['migrate'],
    command: ['node', 'src/workers/runner/run.ts'],
    requires: [MYSQL, { kind: 'smtp' }],
    stopTimeoutSeconds: 30,
    provisioning: 'provisioned',
    env: ['WORKER_GROUP', 'AUTH_DATABASE_URL'],
    envProductionOnly: [],
    envWithDefault: [
      ...HTTP_TUNING,
      'EMAIL_PROVIDER',
      'PARTNERS_DATABASE_URL',
      'EMAIL_RATE_LIMIT_MAX',
      'EMAIL_RATE_LIMIT_WINDOW_MS',
      'EMAIL_FROM_ALLOWED_DOMAINS',
      'EMAIL_FROM_NOTIFICATION',
      'EMAIL_SANDBOX_TO',
      'SMTP_HOST',
      'SMTP_PORT',
      'SMTP_SECURE',
      'SMTP_USER',
      'SMTP_PASS',
      'SMTP_MAX_CONNS',
      'SMTP_POOL',
      'SMTP_REQUIRE_TLS',
      'RESEND_API_KEY',
    ],
    constraints: [
      {
        rule: 'at-least-one',
        envs: [
          'EMAIL_FROM',
          'EMAIL_FROM_RESET',
          'AUTH_RESET_FROM',
          'EMAIL_FROM_INVITE',
          'AUTH_INVITE_FROM',
        ],
        because: 'sem nenhum remetente configurado a spec de e-mail não monta',
      },
    ],
  },
  {
    kind: 'service',
    name: 'worker-van',
    dependsOn: ['migrate'],
    command: ['node', 'src/workers/runner/run.ts'],
    requires: [MYSQL, { kind: 's3-compat' }],
    stopTimeoutSeconds: 30,
    provisioning: 'declared-only',
    env: ['WORKER_GROUP', 'FINANCIAL_DATABASE_URL', 'VAN_S3_REGION', 'VAN_S3_BUCKET'],
    envProductionOnly: [],
    envWithDefault: [
      ...HTTP_TUNING,
      ...VAN_S3_PREFIXES,
      'VAN_S3_ENDPOINT',
      'VAN_S3_FORCE_PATH_STYLE',
    ],
    constraints: [
      {
        rule: 'all-or-none',
        envs: ['VAN_S3_ACCESS_KEY_ID', 'VAN_S3_SECRET_ACCESS_KEY'],
        because: 'XOR de credenciais; ausentes caem na provider chain do IAM',
      },
    ],
  },
  {
    kind: 'task',
    name: 'migrate',
    dependsOn: [],
    command: ['node', 'src/jobs/migrate/run.ts'],
    requires: [MYSQL],
    provisioning: 'provisioned',
    env: ['MIGRATE_DATABASE_URL'],
    envProductionOnly: [],
    envWithDefault: [...HTTP_TUNING],
    constraints: [],
  },
  {
    kind: 'task',
    name: 'sync-permissions',
    dependsOn: ['migrate'],
    command: ['node', 'src/jobs/auth/sync-permissions/run.ts'],
    requires: [MYSQL],
    provisioning: 'provisioned',
    env: ['AUTH_DATABASE_URL'],
    envProductionOnly: [],
    envWithDefault: [...HTTP_TUNING],
    constraints: [],
  },
  {
    kind: 'task',
    name: 'payable-view-backfill',
    dependsOn: ['migrate'],
    command: ['node', 'src/jobs/financial/payable-view-backfill/run.ts'],
    requires: [MYSQL],
    provisioning: 'provisioned',
    env: ['FINANCIAL_DATABASE_URL'],
    envProductionOnly: [],
    envWithDefault: [...HTTP_TUNING],
    constraints: [],
  },
  {
    kind: 'task',
    name: 'supplier-view-backfill',
    dependsOn: ['migrate'],
    command: ['node', 'src/jobs/financial/supplier-view-backfill/run.ts'],
    requires: [MYSQL],
    provisioning: 'declared-only',
    env: ['PARTNERS_DATABASE_URL', 'FINANCIAL_DATABASE_URL'],
    envProductionOnly: [],
    envWithDefault: [...HTTP_TUNING],
    constraints: [],
  },
  {
    kind: 'task',
    name: 'contract-count-backfill',
    dependsOn: ['migrate'],
    command: ['node', 'src/jobs/partners/contract-count-backfill/run.ts'],
    requires: [MYSQL],
    provisioning: 'declared-only',
    env: ['CONTRACTS_DATABASE_URL', 'PARTNERS_DATABASE_URL'],
    envProductionOnly: [],
    envWithDefault: [...HTTP_TUNING],
    constraints: [],
  },
  {
    kind: 'task',
    name: 'renumber-by-vigencia',
    dependsOn: ['migrate'],
    command: ['node', 'src/jobs/contracts/renumber-by-vigencia/run.ts'],
    requires: [MYSQL],
    provisioning: 'declared-only',
    retired: 'backfill pontual da #425, executado em produção em 31/07/2026; não reexecutar',
    env: ['CONTRACTS_DATABASE_URL'],
    envProductionOnly: [],
    envWithDefault: [...HTTP_TUNING],
    constraints: [],
  },
  {
    kind: 'scheduled',
    name: 'contracts-sweeper',
    dependsOn: ['migrate'],
    command: ['node', 'src/jobs/contracts/sweeper/run.ts'],
    requires: [MYSQL, { kind: 'filesystem' }],
    cron: 'cron(5 0 * * ? *)',
    timezone: 'America/Sao_Paulo',
    provisioning: 'declared-only',
    env: [],
    envProductionOnly: [],
    envWithDefault: [...HTTP_TUNING, 'SWEEP_BATCH_SIZE'],
    constraints: [
      {
        rule: 'xor',
        envs: ['CONTRACTS_DATABASE_URL', 'CONTRACTS_DATABASE_URL_FILE'],
        because: 'as duas juntas devolvem sweeper-ambiguous-connection-config',
      },
    ],
  },
  {
    kind: 'scheduled',
    name: 'outbox-sweeper',
    dependsOn: ['migrate'],
    command: ['node', 'src/jobs/shared/outbox-sweeper/run.ts'],
    requires: [MYSQL],
    cron: 'cron(0 * * * ? *)',
    timezone: 'America/Sao_Paulo',
    provisioning: 'declared-only',
    env: ['CONTRACTS_DATABASE_URL'],
    envProductionOnly: [],
    envWithDefault: [
      ...HTTP_TUNING,
      'OUTBOX_CONSUMER_ID',
      'PARTNERS_DATABASE_URL',
      'FINANCIAL_DATABASE_URL',
      'AUTH_DATABASE_URL',
    ],
    constraints: [],
  },
] as const satisfies readonly Workload[];
