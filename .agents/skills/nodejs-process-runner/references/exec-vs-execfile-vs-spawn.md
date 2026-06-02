# `exec` vs `execFile` vs `spawn` vs `fork` — Quando usar cada um

> 📖 **Fonte:** [`handbook/reference/nodejs/Child processes.md`](../../../../handbook/reference/nodejs/Child processes.md) §"Asynchronous process creation".

---

## A diferença raiz

| API                    | Forma de invocação                                   | Shell interpreta? |   Onde mora o input externo é seguro?   |
| :--------------------- | :--------------------------------------------------- | :---------------: | :-------------------------------------: |
| `exec(cmd)`            | `cmd` é **string** que vira `sh -c "cmd"`            |      ✅ sim       |  ❌ **NUNCA** com input externo — RCE   |
| `execFile(file, args)` | `file` é binário, `args` é array passado como `argv` |      ❌ não       | ✅ args podem conter qualquer caractere |
| `spawn(file, args)`    | Idem `execFile`, mas API baseada em stream           |      ❌ não       |                   ✅                    |
| `fork(modulePath)`     | Lança outro Node com canal IPC                       |        n/a        |              n/a (só Node)              |

**Resumo de uma frase:** `exec` chama o shell; tudo o mais não.

---

## Decisão

```
1. Vou rodar um binário externo (git, docker, ffmpeg, mysqldump, pnpm...)?
   │
   ├── Sim, e quero capturar a saída completa (< ~10 MiB)?
   │     │
   │     ├── Sim, e a saída é texto curto (sha, version, JSON pequeno)?
   │     │   → execFile + promisify
   │     │
   │     └── Sim, mas quero streamar progresso ao usuário?
   │         → spawn com stdio: 'inherit' (ou ['pipe', 'inherit', 'inherit'])
   │
   ├── Sim, e a saída é grande/longa/contínua (logs, video, dump SQL)?
   │   → spawn + pipeline para arquivo/stream
   │
   ├── Sim, mas é um subprocesso Node específico (worker)?
   │   → fork (IPC built-in via subprocess.send)
   │
   ├── Sim, e PRECISO interpretar `|`, `>`, `*`, `$VAR`?
   │   → Reescreva em Node primeiro. Se MESMO não der, exec com string LITERAL.
   │
   └── Não, é só FS (cp, rm, mkdir...)?
       → use `nodejs-fs-scripter`, não child_process.
```

---

## `execFile` — o default

**Use quando:** comando + args fixos, saída cabe em memória, espera o filho terminar.

```ts
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const exec = promisify(execFile);

const { stdout } = await exec('git', ['log', '--oneline', '-n', '20'], {
  cwd: '/repo',
  timeout: 5000,
  maxBuffer: 5 * 1024 * 1024, // 5 MiB
  shell: false, // default, mas explícito
  windowsHide: true,
});
```

**Pontos sutis:**

- Default `maxBuffer = 1 MiB`. Se a saída passa, o filho é morto e o erro tem `code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER'`. **Sempre aumente** se houver chance de saída crescer.
- `encoding: 'utf8'` (default) entrega `string`. `encoding: 'buffer'` entrega `Buffer`.
- `timeout: 0` (default) = sem timeout. Use sempre algum valor.
- `signal: AbortSignal` cancela cedo (mata o filho com `killSignal`, default `SIGTERM`).

**Erro do `promisify(execFile)`:** quando o filho termina com `exitCode !== 0`, a Promise **rejeita** com erro decorado:

```ts
try {
  await exec('git', ['no-tal-comando']);
} catch (e: unknown) {
  if (e instanceof Error && 'code' in e && 'stderr' in e) {
    // e.code: número (exit) | string (errno como 'ENOENT')
    // e.signal: signal name | null
    // e.stdout: string (parcial)
    // e.stderr: string (mensagem real do erro)
  }
}
```

---

## `spawn` — quando saída é grande, longa ou precisa de pipe

**Use quando:**

- Saída ultrapassa ~10 MiB (logs, dumps).
- Você quer mostrar progresso em tempo real.
- Você precisa fazer pipe entre dois processos sem shell.
- O processo é de longa duração (servidor, watcher).

```ts
import { spawn } from 'node:child_process';
import { pipeline } from 'node:stream/promises';
import { createWriteStream } from 'node:fs';

const dump = spawn('mysqldump', ['--single-transaction', 'mydb'], {
  stdio: ['ignore', 'pipe', 'inherit'], // [stdin, stdout, stderr]
  env: { ...process.env, MYSQL_PWD: process.env.DB_PASSWORD },
});

await pipeline(dump.stdout!, createWriteStream('dump.sql'));

const { code, signal } = await waitForExit(dump);
if (code !== 0) throw new Error(`mysqldump falhou (exit=${code}, signal=${signal})`);
```

Helper para esperar exit:

```ts
import type { ChildProcess } from 'node:child_process';

const waitForExit = (
  cp: ChildProcess,
): Promise<{ code: number | null; signal: NodeJS.Signals | null }> =>
  new Promise((resolve, reject) => {
    cp.on('error', reject);
    cp.on('close', (code, signal) => resolve({ code, signal }));
  });
```

### `stdio` — modos importantes

| Valor                            | Significa                                                                                      |
| :------------------------------- | :--------------------------------------------------------------------------------------------- |
| `'pipe'` (default)               | Pai e filho conectados via stream; pai lê `subprocess.stdout` etc.                             |
| `'inherit'`                      | Filho usa o mesmo TTY do pai — útil para `pnpm install` mostrar progresso.                     |
| `'ignore'`                       | `/dev/null`.                                                                                   |
| `['pipe', 'inherit', 'inherit']` | Captura stdin, pai vê stdout/stderr direto. Útil para enviar input enquanto usuário acompanha. |
| `[0, 1, 2]`                      | Mesmo que `'inherit'`.                                                                         |
| `'overlapped'` (Windows)         | Para handles assíncronos no Windows.                                                           |

### Eventos do `ChildProcess`

| Evento         | Quando dispara                                       | Use para                                      |
| :------------- | :--------------------------------------------------- | :-------------------------------------------- |
| `'spawn'`      | Filho começou a rodar                                | Confirmar que o exec ok antes de pipear stdin |
| `'exit'`       | Filho saiu (mas streams podem ainda estar drenando)  | Capturar `exitCode`/`signal` cedo             |
| `'close'`      | Saiu **e** streams fecharam                          | Esperar antes de processar saída completa     |
| `'error'`      | Falhou em spawn (binário não existe, EACCES, EMFILE) | Tratar `ENOENT` como "comando não encontrado" |
| `'disconnect'` | Canal IPC desconectado (só com `fork`)               | —                                             |
| `'message'`    | Mensagem IPC recebida (só com `fork`)                | —                                             |

**Pegadinha:** sempre escute `'error'` **e** `'close'`. Se você só escuta `'close'` e o spawn falhou, o handler nunca dispara.

---

## `exec` — quando (raramente) faz sentido

**Use só quando:**

1. A string é **100% literal** no código, sem interpolação de variável.
2. Você **precisa** de algo que só o shell faz: globbing (`*`), pipe (`|`), aspas mágicas, expansão de `~`.
3. Documentou no comentário por que `execFile` não basta.

```ts
// OK: string literal, motivo documentado
// (precisamos do globbing do shell para `*.log`)
const { stdout } = await exec('ls *.log | wc -l');
```

```ts
// NÃO OK: interpolação com input externo → RCE
const { stdout } = await exec(`grep "${userQuery}" arquivo.txt`); // ❌❌❌
// userQuery = '"; rm -rf $HOME #' → boom
```

**Alternativas ao `exec`:**

| "Preciso de shell para…"              | Faça em Node                                                   |
| :------------------------------------ | :------------------------------------------------------------- |
| Glob `*.log`                          | `fsPromises.glob('*.log')`                                     |
| Pipe `cmd1 \| cmd2`                   | `spawn` ambos + `pipeline()`                                   |
| Redirect `> file`                     | `pipeline(child.stdout, createWriteStream(file))`              |
| `$VAR`                                | `process.env.VAR`                                              |
| `~/path`                              | `path.join(os.homedir(), 'path')`                              |
| Substituição `$(date)`                | `new Date().toISOString()`                                     |
| `find . -name '*.ts' -exec foo {} \;` | `for await (const f of glob('**/*.ts')) await run('foo', [f])` |

---

## `fork` — subprocesso Node com IPC

**Use quando:** você quer rodar **outro arquivo Node** num processo separado e trocar mensagens estruturadas. Não use para chamar binário externo.

```ts
// parent.ts
import { fork } from 'node:child_process';
const worker = fork('./worker.ts', [], { execArgv: ['--experimental-strip-types'] });
worker.send({
  tipo: 'processar',
  items: [
    /* ... */
  ],
});
worker.on('message', (m) => {
  /* ... */
});
worker.on('close', (code) => {
  /* ... */
});
```

```ts
// worker.ts
process.on('message', (msg) => {
  // processa
  process.send?.({ tipo: 'resultado', valor: 42 });
});
```

**Alternativas:**

- Worker threads (`node:worker_threads`) — mesmo processo, threads separadas. Melhor para CPU-bound.
- `fork` — processo separado, isolamento total (crash não derruba o pai), troca via JSON. Melhor para isolamento.

---

## Sync APIs — quando o async é impossível

`execFileSync`, `spawnSync`, `execSync`. **Bloqueiam o event loop.** Use só em:

- **Pre-commit hook** em CommonJS curto.
- **Bootstrap** antes do event loop ser usado (carregar config, descobrir versão de git).
- **CLI síncrona** declarando-se síncrona (raro no nosso projeto).

```ts
import { execFileSync } from 'node:child_process';

const sha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
```

Erros nos `*Sync` **lançam exception** — não há callback. Em sync, `try/catch` é a única opção.

---

## Tabela de equivalência com `bash`

| Bash                               | Node                                                  |
| :--------------------------------- | :---------------------------------------------------- |
| `cmd arg1 arg2`                    | `execFile('cmd', ['arg1', 'arg2'])`                   |
| `out=$(cmd)`                       | `const { stdout: out } = await exec('cmd', [])`       |
| `cmd1 \| cmd2`                     | `spawn` ambos + `pipeline` (sem shell)                |
| `cmd > file`                       | `pipeline(child.stdout, createWriteStream(file))`     |
| `cmd < file`                       | `spawn` com `stdio: [createReadStream(file), ...]`    |
| `cmd 2>&1`                         | `spawn` mesclando — capture `stderr` e concatene      |
| `cmd &` (background)               | `spawn(...)`; não `await`; chame `subprocess.unref()` |
| `wait $PID`                        | `await waitForExit(child)`                            |
| `kill -TERM $PID`                  | `child.kill('SIGTERM')`                               |
| `trap 'cleanup' EXIT`              | `process.on('exit', cleanup)`                         |
| `set -e` (falhar no primeiro erro) | `if (!r.ok) return code` — explícito em cada chamada  |
| `set -o pipefail`                  | `pipeline()` já propaga erro do meio do pipe          |
| `timeout 30 cmd`                   | `signal: AbortSignal.timeout(30_000)`                 |

---

## Custos por API (ordem de grandeza, Linux)

| API            | Overhead vs `execFile`                                |
| :------------- | :---------------------------------------------------- |
| `execFile`     | baseline                                              |
| `spawn`        | ~igual (mesma syscall por baixo)                      |
| `exec`         | +1 fork do shell (mais ~5ms)                          |
| `fork`         | +V8 startup (50–200ms)                                |
| `execFileSync` | similar a `execFile` em wall-clock, mas bloqueia tudo |

Para 1000+ chamadas em loop, considere:

- Agrupar (em vez de chamar `git` 1000x, peça `git log --pretty` uma vez e parseie).
- Worker pool (`node:worker_threads`).
- Reescrever em Node puro se a operação for trivial.

---

## Quando o binário não existe

Erro de spawn vs erro de exit:

```ts
try {
  await exec('git-nao-existe', ['status']);
} catch (e: unknown) {
  if (e instanceof Error && 'code' in e) {
    if (e.code === 'ENOENT') {
      // binário não está no PATH — erro de SPAWN, exitCode é null
    } else if (typeof e.code === 'number') {
      // binário rodou mas saiu com erro — exitCode é número
    }
  }
}
```

`ENOENT` em `child_process` significa **comando não encontrado** (não confundir com `ENOENT` de `fs` que é "arquivo não existe").
