# W1 — Implementação GREEN (FIN-CLI-WIRE)

> **Wave:** W1 · **Outcome:** GREEN · **Agent:** `main-session`
> **Predecessor:** [`../002-tests/REPORT.md`](../002-tests/REPORT.md) (W0 RED)
> **Artefatos:**
>
> - `src/modules/financial/cli/main.ts` (criado, 53 linhas)
> - `package.json` (1 linha adicionada)

---

## 1. Mudanças

| Arquivo | Operação | Linhas | Conteúdo |
| :--- | :--- | :--- | :--- |
| `src/modules/financial/cli/main.ts` | **created** | 53 | `printUsage` + `EXIT_USAGE = 64` + `main()` + handler `then(code, e)` |
| `package.json` | **edited** | +1 | `"cli:financial": "node --experimental-strip-types --no-warnings src/modules/financial/cli/main.ts"` inserido **logo após** `cli:contracts` (ordem semântica do bloco, não alfabética rigorosa — o `package.json` agrupa `cli:*` consecutivamente) |

### 1.1. `main.ts` — decisões deliberadas

- **Comentário ESLint local** na linha que precede `printUsage`: `// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types`. Justificativa documentada nas 3 linhas acima — `NodeJS.WriteStream` é mutável por design da API, não há variante readonly. Espelha `contracts/cli/main.ts:8`.
- **`EXIT_USAGE = 64` como constante nomeada**, não literal mágico. Comentário cita `sysexits.h` para futuros leitores.
- **`main().then(code, e)` no bottom**, não top-level `await` — consistente com `contracts/cli/main.ts:117` e mais portável.
- **Handler de rejection** captura `e: unknown` (regra `useUnknownInCatchVariables` do tsconfig) e formata com `String(e)`. Exit code 1 reservado para "erro inesperado" (não-`sysexits.h`).
- **Símbolo `❌`** no prefixo da mensagem de erro — consistente com `contracts/cli/main.ts:104,109` (CLAUDE.md §"Output Style" permite emoji em strings de CLI).

### 1.2. Posicionamento no `package.json`

Diff aplicado:

```diff
     "cli:contracts": "node --experimental-strip-types --no-warnings src/modules/contracts/cli/main.ts",
+    "cli:financial": "node --experimental-strip-types --no-warnings src/modules/financial/cli/main.ts",
     "secrets:setup": "node --experimental-strip-types --no-warnings ./scripts/setup-secrets.ts",
```

Verificação:

```
$ jq -r '.scripts."cli:financial"' package.json
node --experimental-strip-types --no-warnings src/modules/financial/cli/main.ts
```

---

## 2. Verificação

### 2.1. Testes específicos do ticket

```bash
node --test --experimental-strip-types --no-warnings \
  tests/modules/financial/cli/main.test.ts
```

```
▶ financial/cli main entrypoint
  ✔ CA-3: --help imprime ajuda em stdout e sai com exit 0 (54.5ms)
  ✔ CA-6: -h (alias curto) comporta-se idêntico a --help (52.1ms)
  ✔ CA-4: sem argumentos imprime uso em stderr e sai com exit 64 (EX_USAGE) (55.7ms)
  ✔ CA-5: subcomando desconhecido imprime erro em stderr e sai com exit 64 (53.7ms)
✔ financial/cli main entrypoint (217ms)
ℹ tests 4  pass 4  fail 0  duration_ms 304
```

Os 4 RED de W0 viraram GREEN.

### 2.2. Suite completa

```
ℹ tests 852  pass 836  fail 0  skipped 16  duration_ms 38037
```

| Métrica | W3 do scaffold anterior | W1 deste ticket | Delta |
| :--- | ---: | ---: | ---: |
| tests | 848 | 852 | +4 |
| pass | 832 | 836 | +4 |
| fail | 0 | 0 | 0 |
| skipped | 16 | 16 | 0 |

**+4 novos testes (CA-3/4/5/6), zero regressão** dos 832 pré-existentes.

### 2.3. Invocação manual via script `pnpm`

```bash
$ pnpm run cli:financial -- --help

Uso: financial-cli <subcomando> [flags]

Subcomandos disponíveis:
  (nenhum ainda — virão com tickets FIN-USECASE-*)

Flags globais:
  --help, -h                mostra esta ajuda
```

Exit code do pnpm: 0. Comportamento alinhado a CA-3 / CA-11.

---

## 3. Critérios de aceitação (000-request §4)

| # | Critério | Status | Evidência |
| :--- | :--- | :--- | :--- |
| CA-1 | Script `cli:financial` em `package.json` | ✅ | `jq` em §1.2 |
| CA-2 | `main.ts` existe e roda sem `throw` | ✅ | §2.3 (exit 0) |
| CA-3 | `--help` → stdout exit 0 | ✅ | W0/W1 GREEN |
| CA-4 | vazio → stderr exit 64 | ✅ | W0/W1 GREEN |
| CA-5 | subcomando desconhecido → stderr exit 64 | ✅ | W0/W1 GREEN |
| CA-6 | `-h` alias idêntico a `--help` | ✅ | W0/W1 GREEN |
| CA-7 | `pnpm run typecheck` verde | ⏳ | W3 verifica |
| CA-8 | `pnpm run format:check` verde | ⏳ | W3 verifica |
| CA-9 | `pnpm test` verde | ✅ | §2.2 |
| CA-10 | `pnpm run lint` verde | ⏳ | W3 verifica |
| CA-11 | Mensagem cita "nenhum ainda — virão com tickets FIN-USECASE-*" | ✅ | §2.3 + CA-3 valida via `assert.match(/nenhum ainda/i)` |

CAs operacionais (7, 8, 10) deliberadamente postergados para W3.

---

## 4. Decisões tomadas em W1

- **Posicionamento `cli:financial` no bloco `cli:*`** (após `cli:contracts`, não em ordem alfabética estrita) — `package.json` atual agrupa scripts por afinidade semântica (`cli:`, `test:`, `pipeline:`, etc.). Inserir em ordem alfabética rigorosa quebraria essa convenção implícita. Code-reviewer pode flagear como 🔵 se discordar.
- **Sem subpastas `commands/`, `drivers/`, `formatters/` ainda** — consistente com decisão do `FIN-MODULE-SCAFFOLD`. Cada subpasta nasce com seu primeiro arquivo no ticket que adicionar o primeiro comando.
- **`main().then(code, e)` em vez de top-level `await`** — Node 24 LTS suporta top-level await em ESM, mas o pattern `.then(code, e)` é o que `contracts/cli/main.ts` usa há 23 tickets. Consistência > novidade neste ticket XS.
- **Exit code 1 para erro inesperado** (não 70 `EX_SOFTWARE` de `sysexits.h`) — alinhado com `contracts/cli/main.ts:125`. Reservar `EX_SOFTWARE` quando houver erro interno determinístico que valha distinguir.

---

## 5. Pronto para W2

`code-reviewer` deve validar:

1. Convenção GNU/POSIX respeitada — `--help` em stdout, uso inválido em stderr.
2. Comentário ESLint local justificativo para `prefer-readonly-parameter-types` (não desabilitar globalmente).
3. Constante `EXIT_USAGE = 64` com comentário citando `sysexits.h`.
4. Mensagem placeholder cita literalmente "nenhum ainda — virão com tickets FIN-USECASE-*" (CA-11).
5. `package.json` mantém estrutura JSON válida e ordem semântica do bloco `cli:*`.
6. Header doc do `main.ts` cita módulo análogo (`contracts/cli/main.ts`) como referência.

Tudo dentro do envelope XS — review esperada em 1 round.
