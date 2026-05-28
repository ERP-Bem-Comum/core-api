# W1 — GREEN · FIN-TEST-INFRA-SKIP-GUARD

> **Skill:** tdd-strategist (aplicação) · **Data:** 2026-05-25 · **Outcome:** GREEN

## Arquivo modificado

`tests/infra/mysql-compose.test.ts` (único). Sem `src/` tocado.

## O que mudou (mínimo para GREEN — YAGNI)

### 1. Guard de dois níveis (substitui `dockerAvailable`)

```ts
const dockerCliAvailable = (): boolean => sh('docker compose version').code === 0;
const dockerDaemonAvailable = (): boolean =>
  dockerCliAvailable() && sh('docker info', { timeoutMs: 5_000 }).code === 0;

const skipSyntax = dockerCliAvailable() ? false : 'Docker CLI (plugin compose) ausente no PATH';
const skipBootstrap = dockerDaemonAvailable()
  ? false
  : 'Docker daemon offline (ou plugin compose ausente)';
```

Avaliados **uma vez** no carregamento do módulo. `docker info` ganhou `timeoutMs: 5_000` para falhar rápido com daemon parado (Risco 1 do request).

### 2. Skip nativo do `node:test` nos 3 `describe`

- `CA-1 sintaxe` → `{ skip: skipSyntax }` (só exige o binário; `docker compose config` não toca o daemon).
- `CA-2 falha sem secrets` → `{ skip: skipBootstrap }`.
- `bootstrap (CA-3..19)` → `{ skip: skipBootstrap }`.

### 3. Remoção dos guards redundantes

- ~20 linhas `if (!dockerAvailable()) assert.fail('docker compose não disponível')` removidas dos `it`.
- 1 linha variante `'...no PATH'` (CA-1a) removida.
- 3 early-returns `if (!dockerAvailable()) return;` dos `before`/`after` removidos (suite skipada não executa hooks).

### 4. Cabeçalho atualizado

Comentário do topo agora descreve o skip-guard (antes dizia "falha com mensagem clara em cada teste"). Trocado `npm test` → `pnpm test` no comentário (ADR-0012).

## Verificação GREEN

### Suite isolada (mesmo ambiente: CLI presente, daemon offline)

```
▶ CTR-DB-COMPOSE-MYSQL — CA-1: sintaxe compose
  ✔ CA-1a / CA-1b / CA-1c
✔ CTR-DB-COMPOSE-MYSQL — CA-1: sintaxe compose
﹣ CTR-DB-COMPOSE-MYSQL — CA-2: falha sem secrets        # Docker daemon offline (ou plugin compose ausente)
﹣ CTR-DB-COMPOSE-MYSQL — bootstrap completo (CA-3..CA-19) # Docker daemon offline (ou plugin compose ausente)
EXIT=0
```

Comportamento de dois níveis confirmado: tier de **sintaxe roda** (CLI presente), tier de **bootstrap pula** (daemon offline). Nunca `failed`.

### Suíte completa (`pnpm test`) — o gate que importa

```
ℹ tests 1106
ℹ pass 1090
ℹ fail 0
ℹ skipped 16
EXIT=0
```

**Antes (W0):** `pnpm test` vermelho (21 fail nesta suite). **Depois:** exit 0. Bloqueio ambiental do `FIN-CLI-MOSTRAR-TITULO` resolvido.

## Notas

- **Determinismo do probe:** o `exit=1` observado no W0 para `docker compose version` foi cold-start do docker; após aquecido, retorna `0` consistentemente (3/3 probes). Irrelevante para a correção: CLI indisponível → skip; CLI disponível mas daemon offline → bootstrap skip. **Em nenhum cenário sem Docker a suite falha** — só alterna run-vs-skip, sempre exit 0.
- **`ℹ skipped` no sumário:** skip em nível de *suite* aparece como `﹣ … # reason` e **não** incrementa o contador `skipped` de leaf-tests do `node:test`. Não é bug; o sinal de skip é a linha `﹣`.
- **CA-7 (daemon online → 19 CAs executam e passam):** NÃO verificável nesta máquina (daemon offline). Fica pendente de ambiente com daemon — registrado para o W3.

## Mapa CA → status

| CA | Status |
| :--- | :--- |
| CA-1 (guards dois níveis) | ✅ |
| CA-2 (avaliação única + derivação) | ✅ |
| CA-3 (skip CA-1 sintaxe) | ✅ |
| CA-4 (skip CA-2 + bootstrap) | ✅ |
| CA-5 (zero `assert.fail` docker) | ✅ grep vazio |
| CA-6 (daemon offline → pnpm test exit 0, skipped) | ✅ verificado |
| CA-7 (daemon online → 19 rodam) | ⏳ pendente de ambiente |
| CA-8..10 (typecheck/format/lint) | → W3 |
