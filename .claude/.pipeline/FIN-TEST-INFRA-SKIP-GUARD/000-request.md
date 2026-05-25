# FIN-TEST-INFRA-SKIP-GUARD — Skip-guard de Docker em `tests/infra/mysql-compose.test.ts`

> **Size:** XS · **Tipo:** Tech-debt de test infra (test-only, zero `src/`)
> **Origem:** [`FIN-CLI-MOSTRAR-TITULO/005-quality/REPORT.md`](../FIN-CLI-MOSTRAR-TITULO/005-quality/REPORT.md) §Veredito — gate de código ALL-GREEN, mas `pnpm test` bloqueado por ambiente sem Docker.
> **Desbloqueia:** fechar `FIN-CLI-MOSTRAR-TITULO` (e qualquer ticket futuro) com `pnpm test` verde em máquina sem daemon Docker.
> **Arquivo único afetado:** [`tests/infra/mysql-compose.test.ts`](../../../tests/infra/mysql-compose.test.ts)

---

## 1. Motivação

`tests/infra/mysql-compose.test.ts` (suite `CTR-DB-COMPOSE-MYSQL`, 19 CAs) é descoberto por `pnpm test` via pattern `tests/**/*.test.ts`. Quando o **daemon** Docker está offline, ~30 testes falham com:

```
Cannot connect to the Docker daemon at unix:///.../docker.sock. Is the docker daemon running?
```

Isso contamina `pnpm test` inteiro com vermelho, mesmo quando o delta de código de um ticket nada tem a ver com Docker — foi exatamente o que travou o W3 de `FIN-CLI-MOSTRAR-TITULO`. Diferente de `pnpm run test:integration`, que gateia com `MYSQL_INTEGRATION=1`, esta suite **não tem skip-guard**: ela assume daemon presente e usa `assert.fail(...)` quando ausente.

## 2. Causa-raiz

O helper atual (linha 64) só verifica a **presença do binário**, não a conectividade com o daemon:

```ts
const dockerAvailable = (): boolean => sh('docker compose version').code === 0;
```

`docker compose version` retorna `0` mesmo com o daemon parado (é metadado do CLI, não contata o socket). Logo, em máquina com Docker instalado mas daemon offline, `dockerAvailable()` retorna `true`, a suite prossegue, e quebra adiante em `composeUp()` / `docker exec`.

Além disso, cada teste reage à ausência com `assert.fail('docker compose não disponível')` — convertendo "ambiente sem Docker" em **falha**, quando o correto seria **skip**.

## 3. Decisões arquiteturais

### 3.1. Guard em dois níveis (binário vs daemon)

Os testes de **sintaxe** (CA-1: `docker compose config`) só parseiam YAML e **não contatam o daemon** — devem rodar sempre que o binário existir. Os testes de **bootstrap** (CA-2..CA-19) sobem containers e **exigem o daemon vivo**. Daí dois predicados:

```ts
const dockerCliAvailable = (): boolean => sh('docker compose version').code === 0;
const dockerDaemonAvailable = (): boolean => dockerCliAvailable() && sh('docker info').code === 0;
```

`docker info` contata o socket e retorna ≠ 0 com daemon parado — é o sinal correto.

### 3.2. `skip` nativo do `node:test`, não `assert.fail`

Usar a opção `{ skip: <reason | false> }` do `describe`/`it` do `node:test` (Node 24), avaliada **uma vez** no carregamento do módulo. Substitui os ~30 `if (!dockerAvailable()) assert.fail(...)` inline. Resultado: suite aparece como `skipped` (não `failed`) e `pnpm test` sai `0`.

### 3.3. Avaliar os predicados uma única vez no topo do módulo

```ts
const HAS_CLI = dockerCliAvailable();
const HAS_DAEMON = dockerDaemonAvailable();
const skipSyntax = HAS_CLI ? false : 'Docker CLI ausente no PATH';
const skipBootstrap = HAS_DAEMON ? false : 'Docker daemon offline (ou CLI ausente)';
```

Evita ~30 `spawnSync` repetidos (um por teste) e centraliza a mensagem.

### 3.4. Comportamento em CI permanece inalterado

Em CI (daemon presente), `HAS_DAEMON === true` → `skip === false` → todos os testes rodam exatamente como hoje. O skip só dispara em ambiente sem daemon. Zero regressão de cobertura onde Docker existe.

### 3.5. Nenhuma mudança de asserção ou de CAs do `CTR-DB-COMPOSE-MYSQL`

A semântica de cada teste (o que ele valida quando roda) é preservada. Só muda o **gating** (rodar vs pular), nunca o corpo da asserção.

## 4. Critérios de Aceitação (CAs)

- **CA-1:** Introduzir `dockerCliAvailable()` e `dockerDaemonAvailable()`; o segundo combina `docker compose version` **e** `docker info`. Remover/renomear o atual `dockerAvailable()` (sem deixar morto).
- **CA-2:** Avaliar os predicados **uma vez** no escopo do módulo (`HAS_CLI`, `HAS_DAEMON`) e derivar `skipSyntax` / `skipBootstrap`.
- **CA-3:** `describe('…CA-1: sintaxe compose…')` recebe `{ skip: skipSyntax }` (roda só com binário).
- **CA-4:** `describe('…CA-2: falha sem secrets…')` e `describe('…bootstrap completo (CA-3..CA-19)…')` recebem `{ skip: skipBootstrap }`.
- **CA-5:** Remover **todos** os `if (!dockerAvailable()) assert.fail('docker compose não disponível')` inline dos `it`/`before`/`after` (tornam-se redundantes com o skip no `describe`).
- **CA-6:** Com daemon **offline**: `pnpm test` sai `0`; a suite `CTR-DB-COMPOSE-MYSQL` aparece como `skipped`, não `failed`; reason visível no output.
- **CA-7:** Com daemon **online**: comportamento idêntico ao atual (todos os 19 CAs executam de fato e passam). Validar localmente se houver Docker; senão, documentar no W3 que CA-7 fica pendente de ambiente com daemon.
- **CA-8:** `pnpm run typecheck` exit 0.
- **CA-9:** `pnpm run format:check` exit 0.
- **CA-10:** `pnpm run lint` exit 0 (zero warnings).

## 5. Estrutura de arquivos esperada

```
tests/infra/
└── mysql-compose.test.ts        ← MODIFICADO (helpers + skip nos 3 describe; −~30 linhas de assert.fail)
```

**Total estimado:** −~30 linhas / +~8 linhas líquidas. Apenas test infra. **Envelope XS.**

## 6. Fora do escopo

| Item | Onde tratar |
| :--- | :--- |
| Migrar `tests/infra/` para um diretório que `pnpm test` não varre (ex.: rodar só via `test:integration`) | Decisão de estratégia de testes — ticket próprio se desejado |
| Aplicar o mesmo skip-guard a outros testes que toquem Docker | Só `mysql-compose.test.ts` o faz hoje; reabrir se surgir outro |
| Healthcheck/tuning do MySQL no compose | `CTR-INFRA-MYSQL-HEALTHCHECK-TCP` / `CTR-DB-DRIVER-POOL-TUNING` (já fechados) |
| Fechar `FIN-CLI-MOSTRAR-TITULO` | Consequência deste ticket; `pnpm run pipeline:state close` após `pnpm test` verde |

## 7. Regras invariantes aplicáveis

- `.claude/rules/testing.md` — `node:test` + `--experimental-strip-types`; skip é a forma canônica de gatear teste dependente de ambiente.
- ADR-0020 — a suite valida a config MySQL canônica; este ticket **não altera** o que ela valida, só quando roda.
- CLAUDE.md §"Nunca `npm`" — toda invocação via `pnpm`.

## 8. Riscos / pontos de atenção (para W2)

### Risco 1 — `docker info` pode ter latência alta com daemon parado
Em alguns setups, `docker info` com daemon down demora (timeout de conexão ao socket). **Mitigação:** o helper `sh()` já impõe `timeoutMs` (default 30s); considerar `timeoutMs: 5_000` no `docker info` para falhar rápido no gate.

### Risco 2 — Node `{ skip }` em `describe` precisa de assinatura `(name, options, fn)`
Confirmar que a versão de `node:test` no Node 24 aceita `describe(name, { skip }, fn)`. Caso a opção não propague para subtests, usar `describe.skip` condicional (`(skipBootstrap ? describe.skip : describe)(...)`). Decidir no W1.

### Risco 3 — Não deixar `dockerAvailable` órfão
Se renomeado, garantir que nenhuma referência remanescente quebre o lint (`no-unused-vars`).

### Risco 4 — CA-7 não verificável sem daemon nesta sessão
Se a sessão de W3 rodar sem Docker, CA-7 (comportamento com daemon online) fica pendente. Registrar honestamente no `005-quality/REPORT.md` em vez de marcar como verde.
