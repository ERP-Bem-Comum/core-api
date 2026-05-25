# FIN-CLI-WIRE — Wire-up do binário `cli:financial`

> **Size:** XS · **Status:** open · **Criado por:** main-session (Opus 4.7)
> **Predecessor:** [`FIN-MODULE-SCAFFOLD`](../FIN-MODULE-SCAFFOLD/STATE.md) (closed-green, ALL-GREEN)
> **Sucessor previsto:** `FIN-VO-FITID` (XS) ou `FIN-IDS-PAYABLE` (XS) — primeiros VOs do domínio

---

## 1. Contexto

`FIN-MODULE-SCAFFOLD` ancorou o módulo em `src/modules/financial/public-api/index.ts`. Este ticket adiciona o **canal de UX primária** — a CLI — vazia, pronta para receber comandos nos próximos tickets.

Refresh do CLAUDE.md: a stack do core-api **não tem servidor HTTP ainda** (Fastify reservado para Fase 2+ via ADR futuro). Toda interação com a P.O. acontece via CLI por módulo (`pnpm run cli:contracts`, `pnpm run cli:financial`). Cada módulo tem seu próprio binário, registry e drivers.

**Referência viva:** [`src/modules/contracts/cli/main.ts`](../../../src/modules/contracts/cli/main.ts) (127 linhas — REGISTRY, drivers, context, exit codes). O `main.ts` deste ticket é o **embrião** dessa estrutura — convenções GNU/POSIX (stdout p/ `--help`, stderr p/ uso inválido) e exit codes `sysexits.h` desde o primeiro byte.

---

## 2. Escopo (o que entra)

### 2.1. Arquivo de produção 1 — `src/modules/financial/cli/main.ts`

Entrypoint executável da CLI do módulo Financial. Estado atual: **sem subcomandos**. Comportamento esperado:

| Invocação | Saída | Exit code | Convenção |
| :--- | :--- | :--- | :--- |
| `pnpm run cli:financial -- --help` (ou `-h`) | Mensagem de ajuda em **stdout** listando 0 subcomandos + flags globais previstas | `0` | GNU/POSIX — `--help` é stream legítimo |
| `pnpm run cli:financial` (sem args) | Mensagem de uso em **stderr** | `64` (`EX_USAGE` de `sysexits.h`) | Sem subcomando = uso inválido |
| `pnpm run cli:financial -- foo` (subcomando inexistente) | `Subcomando desconhecido: foo` em **stderr** + mensagem de uso em **stderr** | `64` | Subcomando desconhecido = uso inválido |

Conteúdo esperado (estrutura, não literal):

```ts
const printUsage = (stream: NodeJS.WriteStream): void => {
  stream.write('Uso: financial-cli <subcomando> [flags]\n\n');
  stream.write('Subcomandos disponíveis:\n');
  stream.write('  (nenhum ainda — virão com tickets FIN-USECASE-*)\n\n');
  stream.write('Flags globais:\n');
  stream.write('  --help, -h                mostra esta ajuda\n');
};

const EXIT_USAGE = 64;

const main = async (): Promise<number> => {
  const argv = process.argv.slice(2);
  if (argv.includes('--help') || argv.includes('-h')) {
    printUsage(process.stdout);
    return 0;
  }
  if (argv.length === 0) {
    printUsage(process.stderr);
    return EXIT_USAGE;
  }
  const [subcommand] = argv;
  process.stderr.write(`❌ Subcomando desconhecido: ${subcommand}\n\n`);
  printUsage(process.stderr);
  return EXIT_USAGE;
};

main().then(
  (code) => {
    process.exit(code);
  },
  (e: unknown) => {
    process.stderr.write(`❌ Erro inesperado: ${String(e)}\n`);
    process.exit(1);
  },
);
```

> ⚠️ Padrão GNU/POSIX: este ticket **fixa a convenção** para todos os comandos futuros. Quem violar a regra `--help → stdout` ou usar exit code arbitrário em vez de `sysexits.h` será REJECTED em W2.

### 2.2. Arquivo de produção 2 — `package.json`

Adicionar script:

```json
"cli:financial": "node --experimental-strip-types --no-warnings src/modules/financial/cli/main.ts"
```

Posicionado em ordem alfabética em `"scripts"` (entre `cli:contracts` e `db:generate`).

---

## 3. Fora de escopo

- `REGISTRY`, `context`, `parseDriverFlags`, `formatters/error.ts` — virão quando o primeiro subcomando for criado (`FIN-USECASE-*` → `FIN-CLI-*`).
- Drivers (`memory.ts`, `mysql.ts`) — só fazem sentido quando houver `Payable` no domínio + repository implementado.
- `cli/state.ts` (persistência de estado da CLI) — virá com primeiro caso de uso que precise.
- Subpastas `cli/commands/`, `cli/drivers/`, `cli/formatters/` — vazias agora, sem `.gitkeep`. Cada uma nasce com seu primeiro arquivo.
- Pre-commit hook ou CI check para o novo script — `pnpm run lint` já cobre.

---

## 4. Critérios de aceitação

| # | Critério | Como verificar |
| :--- | :--- | :--- |
| **CA-1** | `package.json` contém script `cli:financial` com comando idêntico ao padrão (`node --experimental-strip-types --no-warnings src/modules/financial/cli/main.ts`). | `jq '.scripts."cli:financial"' package.json` |
| **CA-2** | Arquivo `src/modules/financial/cli/main.ts` existe e roda sem `throw`. | `pnpm run cli:financial -- --help` exit 0 |
| **CA-3** | `pnpm run cli:financial -- --help` imprime ajuda em **stdout**, exit `0`. | Teste captura stdout não vazio + exit 0 |
| **CA-4** | `pnpm run cli:financial` (sem args) imprime uso em **stderr**, exit `64`. | Teste captura stderr não vazio + exit 64 |
| **CA-5** | `pnpm run cli:financial -- foo` imprime "Subcomando desconhecido" em **stderr**, exit `64`. | Teste captura stderr contém `Subcomando desconhecido: foo` + exit 64 |
| **CA-6** | `pnpm run cli:financial -- -h` (alias curto) comporta-se idêntico a `--help`. | Teste paralelo a CA-3 |
| **CA-7** | `pnpm run typecheck` verde. | comando direto |
| **CA-8** | `pnpm run format:check` verde. | comando direto |
| **CA-9** | `pnpm test` verde — novos testes incluem-se. | comando direto |
| **CA-10** | `pnpm run lint` verde. | comando direto |
| **CA-11** | Mensagem de ajuda menciona explicitamente "**nenhum ainda — virão com tickets FIN-USECASE-***" — sinaliza estado embrionário. | code-reviewer confirma em W2 |

---

## 5. Padronizações invariantes (lembretes — válidas para tudo `FIN-*`)

### 5.1. Idioma da CLI

- **Subcomandos:** PT-BR kebab-case — `listar-titulos`, `aprovar-titulo`, `registrar-pagamento-manual`. Convenção herdada de `cli:contracts`.
- **Mensagens ao humano:** PT-BR completo com acentuação. Símbolos `❌`, `✅` permitidos (já usados em `cli:contracts`).
- **Flags:** EN — `--driver`, `--connection-string`, `--state`, `--help`/`-h`. Sigla de exit code (`EXIT_USAGE`) em EN.
- **Identifiers internos do `main.ts`:** EN — `printUsage`, `main`, `argv`, `EXIT_USAGE`.

### 5.2. Exit codes (`sysexits.h`)

A convenção do módulo `contracts` já está fixada:

| Constante | Valor | Quando |
| :--- | ---: | :--- |
| `0` | `EX_OK` | sucesso (`--help` é sucesso) |
| `EXIT_USAGE = 64` | `EX_USAGE` | uso inválido — sem subcomando, subcomando desconhecido, flag mal formada |
| `EXIT_IOERR = 74` | `EX_IOERR` | falha de I/O (state file, mysql connect) — N/A neste ticket, virá depois |

### 5.3. Streams

`process.stdout` para sucesso e ajuda (suporta pipe — `cli --help | less`).
`process.stderr` para erros e uso inválido.

Não usar `console.log` / `console.error` — usar `process.stdout.write` / `process.stderr.write` diretamente (padrão do `cli:contracts`).

### 5.4. ESLint — supressões locais aceitáveis

`process.stdout`/`stderr` são streams mutáveis nativos do Node. A regra `@typescript-eslint/prefer-readonly-parameter-types` reclama legitimamente — suprimir **localmente** com comentário justificativo, exatamente como `contracts/cli/main.ts:8` faz. Não desabilitar globalmente.

---

## 6. Pipeline previsto

| Wave | Skill / agent | Outcome esperado | REPORT |
| :--- | :--- | :--- | :--- |
| **W0** | `tdd-strategist` | RED — 4 testes em `tests/modules/financial/cli/main.test.ts` (CA-3, CA-4, CA-5, CA-6) falham porque script `cli:financial` não existe + arquivo `main.ts` ausente. | `002-tests/REPORT.md` |
| **W1** | `main-session` | GREEN — cria `main.ts` (≈30 linhas) + entrada no `package.json`. | `003-impl/REPORT.md` |
| **W2** | `code-reviewer` | APPROVED — convenção GNU/POSIX respeitada, comentário ESLint local justificativo, mensagem placeholder explícita. | `004-code-review/REVIEW.md` |
| **W3** | `ts-quality-checker` | ALL-GREEN — `typecheck` + `format:check` + `test` + `lint`. | `005-quality/REPORT.md` |

---

## 7. Estratégia de teste (W0)

Testes em `tests/modules/financial/cli/main.test.ts` usam `node:child_process` (`execFile`) para spawn do subprocesso, capturar `stdout`/`stderr`/`exitCode` e validar comportamento end-to-end. Justificativa:

1. CLI é **boundary** do sistema — testar via interface real (subprocess) pega mais bugs que testar `main()` exportado.
2. `tests/modules/contracts/cli/` já usa esse padrão (referência viva).
3. Spawn de subprocess é rápido (~80ms por teste) — overhead aceitável para 4 testes.

Cada teste roda `node --experimental-strip-types --no-warnings src/modules/financial/cli/main.ts <args>` (não `pnpm run cli:financial` — pnpm adiciona ~500ms de overhead a cada chamada; chama direto o `node` é equivalente e mais rápido).

---

## 8. Riscos e mitigações

| Risco | Mitigação |
| :--- | :--- |
| Spawn de subprocesso em teste introduz flakiness ambiental. | Usar `execFile` com timeout 5s. Sem stdin. Tests headless. Referência: `tests/modules/contracts/cli/main.test.ts` rodou 100% green em todos os 23 tickets. |
| Discrepância de path entre macOS/Linux na CI. | Caminho absoluto via `path.join(import.meta.dirname, '..', '..', '..', '..', 'src', 'modules', 'financial', 'cli', 'main.ts')`. Sem hardcoded `/Users/`. |
| Lint reclamar de `process.stdout` em parâmetro de função. | Comentário `// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types` LOCAL — não desabilitar global. |
| Ordem alfabética de `package.json#scripts` quebrar. | Inserir `cli:financial` **entre** `cli:contracts` e `db:generate`. Verificar com `jq 'keys'` antes do commit. |

---

## 9. Próximos tickets da fatia

```
FIN-MODULE-SCAFFOLD     (XS) ✅ closed-green
FIN-CLI-WIRE            (XS) ← este
  └─ FIN-VO-FITID        (XS) — branded type FITID + anti-duplicidade
  └─ FIN-IDS-PAYABLE     (XS) — PayableId, RemittanceId branded
      └─ FIN-VO-BENEFICIARY-BANK-DATA (S)
          └─ FIN-AGG-PAYABLE-CORE (M) — Open + Approved + Approve
              └─ ... resto da máquina de estados (3 tickets M)
                  └─ FIN-PORT-PAYABLE-REPO (S)
                      └─ FIN-USECASE-APPROVE-PAYABLE (S)
                          └─ FIN-CLI-APROVAR-TITULO (S) — primeiro comando real
```

`FIN-CLI-APROVAR-TITULO` será o ticket que adiciona o primeiro entry ao REGISTRY — momento em que `cli/main.ts` cresce da forma embrionária deste ticket para a estrutura completa vista em `contracts/cli/main.ts`.
