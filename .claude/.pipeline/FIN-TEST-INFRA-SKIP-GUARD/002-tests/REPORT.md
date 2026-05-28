# W0 — RED · FIN-TEST-INFRA-SKIP-GUARD

> **Skill:** tdd-strategist · **Data:** 2026-05-25 · **Outcome:** RED (defect-driven)

## Natureza deste W0

Ticket de **tech-debt de test infra**: o entregável é uma alteração no próprio arquivo de teste (`tests/infra/mysql-compose.test.ts`), não uma nova feature de produção. Logo o RED não é "teste novo que falha por API inexistente", e sim a **demonstração do defeito atual** — a suite reporta `failed` em vez de `skipped` quando o ambiente não tem Docker. É um RED dirigido por defeito (defect-driven), análogo a `tests/regression/reports-2026-05-15.test.ts`.

## Ambiente desta sessão (relevante para o RED)

```
docker --version          → Docker version 29.1.3        (exit 0  — binário presente)
docker compose version    → "unknown command: ..."        (exit 1  — plugin compose AUSENTE)
docker info               → (daemon)                       (exit 1  — daemon OFFLINE)
```

Cenário ideal para reproduzir o bug: sem plugin `compose` **e** sem daemon. O guard atual `dockerAvailable()` (`docker compose version === 0`) retorna `false` → todo `it` cai em `assert.fail('docker compose não disponível')`.

## Evidência RED

Comando:

```bash
node --experimental-strip-types --no-warnings --test tests/infra/mysql-compose.test.ts
```

Sumário:

```
ℹ tests 21
ℹ suites 3
ℹ pass 0
ℹ fail 21
ℹ skipped 0
ℹ duration_ms ~332
EXIT=1
```

Amostra (idêntica nos 21):

```
✖ CA-19: down -v apaga o volume e força init scripts na próxima subida
  AssertionError [ERR_ASSERTION]: docker compose não disponível
      at tests/infra/mysql-compose.test.ts:327:36
  operator: 'fail'
```

**Conclusão RED:** `21 fail / 0 skipped / exit 1`. Qualquer `pnpm test` nesta máquina (e na de viagem) fica vermelho por ambiente, contaminando tickets sem relação com Docker — foi o que travou o W3 de `FIN-CLI-MOSTRAR-TITULO`.

## Contrato GREEN (alvo do W1)

Rodando o **mesmo comando** no **mesmo ambiente** (sem plugin compose / sem daemon), o esperado após o W1 é:

```
ℹ pass 0
ℹ fail 0
ℹ skipped 21          ← antes era 0
EXIT=0                ← antes era 1
```

E `pnpm test` (suíte inteira) deve sair `0`, com a suíte `CTR-DB-COMPOSE-MYSQL` marcada `skipped` e reason visível.

### Mapa CA → comportamento esperado

| CA | Verificação GREEN |
| :--- | :--- |
| CA-1 (guards) | Existem `dockerCliAvailable()` (checa `docker compose version`) e `dockerDaemonAvailable()` (checa `docker compose version` **e** `docker info`). `dockerAvailable` antigo não fica órfão. |
| CA-2 | `HAS_CLI` / `HAS_DAEMON` avaliados 1× no módulo; `skipSyntax` / `skipBootstrap` derivados. |
| CA-3 | `describe(CA-1 sintaxe, { skip: skipSyntax }, …)`. |
| CA-4 | `describe(CA-2 secrets, { skip: skipBootstrap })` e `describe(bootstrap CA-3..19, { skip: skipBootstrap })`. |
| CA-5 | Zero `assert.fail('docker compose não disponível')` remanescente (grep deve retornar vazio). |
| CA-6 | Daemon offline → `pnpm test` exit 0, suíte `skipped`, reason no output. **Verificável nesta máquina.** |
| CA-7 | Daemon online → 19 CAs executam e passam. **NÃO verificável aqui** (sem plugin compose nem daemon) — registrar pendência honesta no W3. |
| CA-8..10 | `typecheck` / `format:check` / `lint` exit 0. |

### Nota sobre o RED ser "forte"

Este RED não é fraco: ele falha **por ausência do guard correto**, não por API inexistente. A prova de que o teste do contrato é significativo: hoje `skipped=0`; o W1 só fecha quando `skipped=21, fail=0, exit=0` no mesmo ambiente. A diferença `0 → 21 skipped` é o sinal observável que separa RED de GREEN.

## Arquivos

- Nenhum arquivo de teste novo criado (RED é defect-driven sobre arquivo existente).
- Alvo do W1: `tests/infra/mysql-compose.test.ts` (modificação).
