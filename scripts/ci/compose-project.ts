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
