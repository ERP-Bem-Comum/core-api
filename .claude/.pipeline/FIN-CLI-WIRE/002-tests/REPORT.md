# W0 — Testes RED (FIN-CLI-WIRE)

> **Wave:** W0 · **Outcome:** RED · **Agent:** `tdd-strategist` (via main-session, ticket XS)
> **Início:** wave-start em STATE.json · **Fim:** este REPORT.md
> **Artefatos criados:**
>
> - `tests/cli/helpers/run-financial-cli.ts` (39 linhas) — helper de spawning
> - `tests/modules/financial/cli/main.test.ts` (62 linhas) — 4 testes

---

## 1. Estratégia de teste

CLI é boundary do sistema — testar via interface real (subprocess) captura mais bugs que testar `main()` exportado. Padrão consistente com `tests/cli/contracts.cli.mysql.test.ts` que usa o helper `runCli` análogo (`tests/cli/helpers/run-cli.ts`).

**Decisão de design:** criar helper paralelo `run-financial-cli.ts` (espelho da estrutura do `run-cli.ts` com CLI_ENTRY adaptado) em vez de generalizar o existente. Justificativa:

- Generalização do helper força mudanças em testes do `contracts` (escopo creep do ticket XS).
- 39 linhas de cópia <<< risco de regressão dos 23 tickets fechados que usam `runCli`.
- Quando houver 3+ módulos com CLI, abrir ticket transversal `CTR-CLI-HELPER-GENERALIZE` para deduplicar — registrar como dívida técnica no REPORT do **próximo** ticket que adicionar comando real.

## 2. Cobertura de CAs

| CA do 000-request | Teste correspondente |
| :--- | :--- |
| CA-3 `--help` → stdout exit 0 + sinaliza estado embrionário (CA-11) | `it('CA-3: --help imprime ajuda em stdout e sai com exit 0')` |
| CA-6 `-h` alias idêntico | `it('CA-6: -h (alias curto) comporta-se idêntico a --help')` |
| CA-4 vazio → stderr exit 64 | `it('CA-4: sem argumentos imprime uso em stderr e sai com exit 64 (EX_USAGE)')` |
| CA-5 subcomando desconhecido → stderr exit 64 + nome literal | `it('CA-5: subcomando desconhecido imprime erro em stderr e sai com exit 64')` |
| CA-1 (script `cli:financial` em package.json) | indireto — script não é invocado pelos testes (rodam `node` direto), mas CA-1 é verificável via `jq` no W3 |
| CA-2 (arquivo existe + não throw) | indireto — spawn falha com ENOENT se ausente; ENOENT comprova ausência |
| CA-11 (mensagem cita "nenhum ainda") | CA-3 valida via `assert.match(stdout, /nenhum ainda/i)` |

## 3. Comando rodado

```bash
node --test --experimental-strip-types --no-warnings \
  tests/modules/financial/cli/main.test.ts
```

## 4. Saída (esperada RED)

```
▶ financial/cli main entrypoint
  ✖ CA-3: --help imprime ajuda em stdout e sai com exit 0
  ✖ CA-6: -h (alias curto) comporta-se idêntico a --help
  ✖ CA-4: sem argumentos imprime uso em stderr e sai com exit 64 (EX_USAGE)
  ✖ CA-5: subcomando desconhecido imprime erro em stderr e sai com exit 64
✖ financial/cli main entrypoint (124.721625ms)
ℹ tests 4  pass 0  fail 4
```

### 4.1. Causa raiz das 4 falhas

```
Error: Cannot find module
  '.../src/modules/financial/cli/main.ts'
```

O Node retorna **exit code 1** ao falhar resolução do entrypoint, então:

- CA-3 e CA-6 falham na asserção `exitCode === 0` (recebem 1).
- CA-4 e CA-5 falham na asserção `exitCode === 64` (recebem 1).

Causa única, idêntica em todos: arquivo `src/modules/financial/cli/main.ts` não existe. Não é bug do teste, não é ambiguidade de assertion. W1 trivialmente vira GREEN criando o arquivo.

## 5. Diagnóstico RED — checklist

| Aspecto | OK? | Nota |
| :--- | :---: | :--- |
| Falhas têm causa única | ✅ | ENOENT do `node` em todos os 4 |
| Falhas independem de ordem de execução | ✅ | Cada `it` faz spawn isolado |
| Sem mocks, sem fakes, sem fake-ids | ✅ | Tudo via subprocess real |
| Tempo de execução razoável | ✅ | 191ms para 4 spawns (~50ms cada) |
| Asserções específicas (não só "não lança") | ✅ | Verificam exitCode, stdout, stderr, conteúdo da mensagem |

## 6. Lista pronta para W1

Implementer (main-session) deve:

1. Criar `src/modules/financial/cli/main.ts` (~30 linhas):
   - `printUsage(stream)` com comentário ESLint local justificativo (referência: `contracts/cli/main.ts:7-10`).
   - `EXIT_USAGE = 64` constante.
   - `main()` async retornando `Promise<number>`, despachando entre `--help`/vazio/desconhecido.
   - `main().then(code => process.exit(code), e => stderr + exit 1)` no bottom (não top-level await — `cli:contracts` usa o mesmo padrão).
   - Mensagem de uso explicitamente inclui "**nenhum ainda — virão com tickets FIN-USECASE-***" para CA-11.
2. Adicionar script em `package.json` entre `cli:contracts` e `db:generate`:
   ```json
   "cli:financial": "node --experimental-strip-types --no-warnings src/modules/financial/cli/main.ts"
   ```
3. Rodar `node --test --experimental-strip-types --no-warnings tests/modules/financial/cli/main.test.ts` — esperar `pass 4 fail 0`.
4. Rodar `pnpm test` completo — confirmar 4 novos testes verdes + zero regressão.
