# W3 — QUALITY · FIN-TEST-INFRA-SKIP-GUARD

> **Skill:** ts-quality-checker · **Data:** 2026-05-25 · **Outcome:** ALL-GREEN (código) · ambiente: CLI presente, daemon offline

## Gates

### 1. `pnpm run typecheck` (`tsc --noEmit`)

```
TYPECHECK_EXIT=0
```

✅ Zero erros. `{ skip: false | string }` compatível com `TestOptions.skip` confirmado pelo compilador.

### 2. `pnpm run format:check` (`prettier --check .`)

```
All matched files use Prettier code style!
FORMAT_EXIT=0
```

✅

### 3. `pnpm run lint` (`eslint .`)

```
LINT_EXIT=0
```

✅ Zero warnings. Sem `dockerAvailable` órfão (`no-unused-vars` limpo — Risco 3 do request resolvido).

### 4. `pnpm test` (`node:test` + `--experimental-strip-types`)

```
ℹ tests 1106
ℹ suites 374
ℹ pass 1090
ℹ fail 0
ℹ skipped 16
TEST_EXIT=0
```

✅ Suíte completa verde. **Comparação W0 → W3:** a suite `CTR-DB-COMPOSE-MYSQL` saiu de `21 fail / exit 1` para `skipped (daemon offline) / exit 0`, sem regressão nos demais 1090 testes.

## Mapa CA → resultado

| CA | Resultado |
| :--- | :--- |
| CA-1..CA-5 (guards, skip, remoção) | ✅ (verificado no W1 + diff W2) |
| CA-6 (daemon offline → pnpm test exit 0, skipped) | ✅ **verificado nesta máquina** |
| CA-7 (daemon online → 19 CAs executam e passam) | ⏳ **NÃO verificável aqui** — daemon offline |
| CA-8 (typecheck exit 0) | ✅ |
| CA-9 (format:check exit 0) | ✅ |
| CA-10 (lint exit 0) | ✅ |

## Pendência honesta — CA-7

O caminho "daemon online" (CA-1 sintaxe + CA-2 + bootstrap CA-3..19 executam de fato e passam) **não foi exercitado** nesta sessão porque o daemon Docker está offline. O risco residual é baixo: o diff **não alterou o corpo de nenhuma asserção**, apenas o gating (skip-vs-run). Quando rodar numa máquina/CI com daemon vivo, `skipBootstrap` vira `false` e os 19 CAs executam como antes do ticket. CI (com Docker) é o ambiente natural de cobertura de CA-7.

## Veredito

**ALL-GREEN** nos 4 gates de código. Ticket pode fechar. Efeito colateral pretendido: **desbloqueia `FIN-CLI-MOSTRAR-TITULO`** — `pnpm test` agora sai 0 sem Docker.
