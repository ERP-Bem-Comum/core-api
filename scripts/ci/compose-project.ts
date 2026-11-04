// CI-RUNNER-NON-DESTRUCTIVE (Parte A da #500) — projeto Docker isolado para o runner de integração.
//
// O runner de integração sobe/derruba os serviços no projeto `core-api-test`, NUNCA no projeto
// default `core-api-dev`. O `-p <projeto>` vem ANTES do subcomando (`up`/`down`) — caso contrário o
// `docker compose` o ignora. Assim o `down -v` remove só o volume `core-api-test_*` e o `mysql-data`
// do dev local fica intacto (o bug que este ticket conserta — CA5).
//
// Módulo puro (sem I/O): só monta os arrays de args passados ao `spawnSync('docker', ...)`.

export const TEST_COMPOSE_PROJECT = 'core-api-test';

export const composeUpArgs = (services: readonly string[]): readonly string[] => [
  'compose',
  '-p',
  TEST_COMPOSE_PROJECT,
  'up',
  '-d',
  ...services,
  '--wait',
];

export const composeDownArgs = (): readonly string[] => [
  'compose',
  '-p',
  TEST_COMPOSE_PROJECT,
  'down',
  '-v',
];

// #1103 — diagnóstico quando o `up --wait` falha. Sem isto o CI só mostrava `is unhealthy` +
// `exit code 1`, sem a saída das sondas nem o log do serviço, e a causa não tinha como ser medida.

/** Ids de todos os containers do projeto isolado — `-a` inclui os que já saíram. */
export const composePsIdsArgs = (): readonly string[] => [
  'compose',
  '-p',
  TEST_COMPOSE_PROJECT,
  'ps',
  '-a',
  '-q',
];

/** Nome + `State` em JSON: `State.Health.Log` guarda exit code e saída de cada sonda. */
export const inspectStateArgs = (ids: readonly string[]): readonly string[] => [
  'inspect',
  '--format',
  '{{.Name}} {{json .State}}',
  ...ids,
];

/** Cauda do log de cada serviço do projeto isolado. */
export const composeLogsArgs = (): readonly string[] => [
  'compose',
  '-p',
  TEST_COMPOSE_PROJECT,
  'logs',
  '--no-color',
  '--tail',
  '200',
];

/** CA3 da #1103: separa "a infra não subiu" de "um teste falhou" no log do CI. */
export const infraFailureMessage = (services: readonly string[], status: number): string =>
  `\n✖ INFRA NÃO SUBIU: \`docker compose up --wait\` falhou (exit ${String(status)}) para ` +
  `[${services.join(', ')}]. Nenhum teste foi executado — a falha é de infraestrutura, não da suíte.\n`;
