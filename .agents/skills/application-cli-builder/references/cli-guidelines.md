# 10 Pilares de uma Boa CLI

> 📖 **Fonte:** Adaptado de `https://clig.dev/` (Command Line Interface Guidelines) + experiência do `cli-craftsman` do ACDG/frontend.

---

## Filosofia

> A CLI **é uma conversa**. Quando o usuário digita um comando, inicia diálogo com seu programa. Trate-a como UI — humano-primeiro — mas que **nunca quebra componibilidade UNIX**.

---

## P1 — Argument parser de verdade

- Use parsing **previsível** (POSIX-like): `-v`, `--verbose`, `-rf`, `--`.
- Cada subcomando tem help auto-gerado.
- Para Fase 1: parser feito à mão é OK (mantém zero dependência). Em CLIs com 20+ flags, considerar `commander` ou `yargs`.
- **Flags longas legíveis** para a P.O.: `--contrato-id`, não `-c`.

---

## P2 — Exit codes honestos

| Code  | Significado                                               |
| :---- | :-------------------------------------------------------- |
| `0`   | Sucesso                                                   |
| `1`   | Erro genérico (regra de negócio falhou, validation, etc.) |
| `2`   | Erro de uso (mas geralmente preferimos 64)                |
| `64`  | EX_USAGE — flag/arg inválido                              |
| `65`  | EX_DATAERR — input mal formado                            |
| `74`  | EX_IOERR — I/O falhou                                     |
| `130` | Terminado por SIGINT (Ctrl-C) — sempre `128 + sinal`      |

Sempre **`process.exit(code)`** explícito ao fim de cada handler de subcomando.

---

## P3 — Stdout para dados, Stderr para mensagens

| Saída                              | Vai para |
| :--------------------------------- | :------- |
| Resultado consumível (JSON, lista) | `stdout` |
| Erros, warnings                    | `stderr` |
| Progresso, prompts interativos     | `stderr` |
| Help, usage                        | `stderr` |

Por quê: permite `contratos-cli listar > arquivo.json` capturar **só os dados**, mantendo logs visíveis no terminal.

---

## P4 — Output legível em humano e em máquina

Padrão:

- **Por default:** texto formatado para humano (com cores se TTY, sem se piped).
- **Flag `--json`:** output puro JSON, sem decorações.

```ts
const isTTY = process.stdout.isTTY;
const json = flags.json;

if (json) {
  process.stdout.write(JSON.stringify(data) + '\n');
} else {
  process.stdout.write(humanizar(data, { cor: isTTY }));
}
```

---

## P5 — Help generoso

- `--help` ou `-h` em todo subcomando.
- Saída inclui: descrição curta, sintaxe, flags (uma por linha), exemplos.
- Erros direcionam o usuário: "veja `contratos-cli criar-contrato --help` para detalhes".

---

## P6 — Erros que ajudam

```
❌ Erro: Contrato não encontrado.

Verifique:
  • O ID foi digitado corretamente?
  • Já criou o contrato? Tente: contratos-cli listar-contratos
  • O estado da sessão pode ter sumido (CLI in-memory). Use --state para persistir.

(código interno: contrato-nao-encontrado)
```

Erro inclui:

1. **O que aconteceu** (frase clara em PT-BR).
2. **Como o usuário pode resolver** (lista de checagens).
3. **Código técnico** entre parênteses (para dev triar bug).

---

## P7 — Progresso para operações longas

Operações > 2s mostram indicador em `stderr`:

```ts
process.stderr.write('Carregando contratos...');
const r = await op();
process.stderr.write(' OK\n');
```

Se for piped (não-TTY), suprima o spinner para não poluir.

---

## P8 — Confirmação para ações destrutivas

```
Encerrar contrato 001/2026?
Isso impede futuros aditivos de valor.

  [y/N] >
```

Default `N`. Flag `--yes` bypass para uso em script.

---

## P9 — Componibilidade UNIX

- Aceitar `-` como `/dev/stdin`: `contratos-cli importar - < contratos.json`.
- `--json` permite pipe para `jq`: `contratos-cli listar --json | jq '.[] | .titulo'`.
- Sem prompts em modo não-TTY (auto-confirm ou erro com instrução).

---

## P10 — Robustez sob fogo amigo

- Validar todos os inputs **antes** de mutar estado.
- Operação atômica: se falhou no meio, estado intacto (InMemory já garante por imutabilidade).
- Sinais (SIGINT, SIGTERM) tratados — flush stderr e exit `130`.
- Sem stack traces vazadas para o usuário — esses vão para `stderr` apenas com `--debug`.

---

## Exit codes em uma página

```ts
// src/modules/contratos/cli/exit-codes.ts
export const EXIT = {
  OK: 0,
  GENERIC_ERROR: 1,
  USAGE: 64,
  DATAERR: 65,
  NOINPUT: 66,
  IOERR: 74,
  SIGINT: 130,
} as const;
```

---

## Anti-padrões

| ❌ Errado                              | ✅ Certo                                          |
| :------------------------------------- | :------------------------------------------------ |
| Mistura output e progresso no stdout   | Progresso vai pro stderr                          |
| Exit code 0 sempre                     | Reflete o resultado real                          |
| Stack trace vazada                     | Mensagem + código interno; stack só com `--debug` |
| Cores em piped                         | TTY check antes de colorir                        |
| Prompt interativo sem fallback `--yes` | Sempre flag de bypass para scripts                |
| Help só na raiz                        | Toda subcomando tem `--help`                      |

---

## Referências externas

- [`clig.dev`](https://clig.dev/) — Command Line Interface Guidelines (canon moderno).
- [`sysexits.h`](https://man.freebsd.org/cgi/man.cgi?query=sysexits) — Exit codes padrão UNIX.
- [`https://no-color.org/`](https://no-color.org/) — Respeitar `NO_COLOR` env var.
