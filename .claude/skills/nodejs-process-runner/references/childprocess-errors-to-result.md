# Erros de `child_process` → `Result<T, E>` / Exit Codes

> 📖 **Fonte:** [`handbook/reference/nodejs/Child processes.md`](../../../../handbook/reference/nodejs/Child processes.md) §"Class: ChildProcess" — eventos `'error'`, `'exit'`, `'close'` — e §"`maxBuffer` and Unicode".

---

## Os 3 modos de falha de um subprocesso

Toda invocação de `child_process` pode falhar em três pontos distintos:

| Quando | Sintoma | Causas típicas |
| :--- | :--- | :--- |
| **Spawn** | Evento `'error'` antes (ou em vez de) `'spawn'`. Promise de `promisify(execFile)` rejeita com `e.code === 'ENOENT' \| 'EACCES' \| 'EMFILE'` | Binário não está no PATH; arquivo sem permissão de execução; limite de file descriptors |
| **Exit** | `'exit'`/`'close'` com `exitCode` != 0, `signal === null` | Comando rodou e decidiu falhar (validação, erro interno) |
| **Signal** | `'exit'`/`'close'` com `exitCode === null`, `signal === 'SIGKILL' \| 'SIGTERM' \| ...` | Pai matou; OOM killer; timeout do `AbortSignal` |

Mais dois modos específicos de `exec`/`execFile`:

| Quando | Sintoma | Causa |
| :--- | :--- | :--- |
| **Timeout** | `e.code === 'ETIMEDOUT'` ou `e.signal === killSignal` (`'SIGTERM'` por default) com `e.killed === true` | `timeout` da opção estourou |
| **maxBuffer** | `e.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER'` | stdout/stderr passou de `maxBuffer` (default 1 MiB) |

---

## Anatomia do `ExecFileException`

Quando `promisify(execFile)` rejeita, o erro tem essa forma (composta):

```ts
interface ExecFileException extends Error {
  code?: number | string;   // exit code (number) OU errno (string como 'ENOENT')
  signal?: NodeJS.Signals;  // signal name se foi morto por sinal
  killed?: boolean;         // true se Node matou via timeout/abort
  cmd?: string;             // string de comando reconstruída
  stdout?: string | Buffer; // saída parcial antes do erro
  stderr?: string | Buffer; // idem
}
```

Com `useUnknownInCatchVariables: true`, narrowing canônico:

```ts
type ExecFileExceptionLike = Error & Readonly<{
  code?: number | string;
  signal?: NodeJS.Signals;
  killed?: boolean;
  stdout?: string | Buffer;
  stderr?: string | Buffer;
}>;

const isExecFileException = (e: unknown): e is ExecFileExceptionLike =>
  e instanceof Error && ('code' in e || 'signal' in e || 'killed' in e);
```

---

## Discriminated union `RunError` (a versão completa)

```ts
export type RunError =
  | { kind: 'binary-not-found';     file: string }
  | { kind: 'permission-denied';    file: string }
  | { kind: 'spawn-failed';         message: string }
  | { kind: 'non-zero-exit';        code: number; stdout: string; stderr: string }
  | { kind: 'killed-by-signal';     signal: NodeJS.Signals; stdout: string; stderr: string }
  | { kind: 'timeout';              stdout: string; stderr: string }
  | { kind: 'buffer-overflow';      stdout: string; stderr: string };
```

Classificador completo (substitui o esboço do `SKILL.md`):

```ts
const classifyExecError = (e: unknown, file: string): RunError => {
  if (!isExecFileException(e)) {
    return { kind: 'spawn-failed', message: e instanceof Error ? e.message : String(e) };
  }
  const stdout = typeof e.stdout === 'string' ? e.stdout : e.stdout?.toString('utf8') ?? '';
  const stderr = typeof e.stderr === 'string' ? e.stderr : e.stderr?.toString('utf8') ?? '';

  // Spawn-time errors (errno como string)
  if (typeof e.code === 'string') {
    switch (e.code) {
      case 'ENOENT':  return { kind: 'binary-not-found', file };
      case 'EACCES':
      case 'EPERM':   return { kind: 'permission-denied', file };
      case 'ETIMEDOUT': return { kind: 'timeout', stdout, stderr };
      case 'ABORT_ERR': return { kind: 'timeout', stdout, stderr };
      case 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER':
        return { kind: 'buffer-overflow', stdout, stderr };
      default:
        return { kind: 'spawn-failed', message: e.message };
    }
  }

  // Killed by signal (timeout do execFile também cai aqui se killed=true)
  if (typeof e.signal === 'string') {
    if (e.killed === true) return { kind: 'timeout', stdout, stderr };
    return { kind: 'killed-by-signal', signal: e.signal, stdout, stderr };
  }

  // Exit code numérico
  if (typeof e.code === 'number') {
    return { kind: 'non-zero-exit', code: e.code, stdout, stderr };
  }

  return { kind: 'spawn-failed', message: e.message };
};
```

---

## Wrapper para `spawn` (quando precisa de stream)

`spawn` não rejeita Promise — usa eventos. Padrão para Promise-ificar:

```ts
import type { ChildProcess } from 'node:child_process';

export type SpawnExit = Readonly<{
  exitCode: number | null;
  signal: NodeJS.Signals | null;
}>;

export const waitForExit = (cp: ChildProcess): Promise<SpawnExit> =>
  new Promise((resolve, reject) => {
    let settled = false;
    cp.once('error', (err) => {
      if (settled) return;
      settled = true;
      reject(err);
    });
    cp.once('close', (code, signal) => {
      if (settled) return;
      settled = true;
      resolve({ exitCode: code, signal });
    });
  });
```

Uso:

```ts
const child = spawn('long-running', ['--foo'], { stdio: 'inherit' });
let exitInfo: SpawnExit;
try {
  exitInfo = await waitForExit(child);
} catch (e) {
  // erro de spawn (ENOENT, EACCES, ...)
  return { ok: false, error: classifySpawnError(e) };
}

if (exitInfo.signal !== null) {
  return { ok: false, error: { kind: 'killed-by-signal', signal: exitInfo.signal, stdout: '', stderr: '' } };
}
if (exitInfo.exitCode !== 0) {
  return { ok: false, error: { kind: 'non-zero-exit', code: exitInfo.exitCode ?? -1, stdout: '', stderr: '' } };
}
return { ok: true, value: undefined };
```

---

## Convenções de exit codes para o script Node em si

| Cenário do filho | Exit code do script pai |
| :--- | :--- |
| Filho saiu 0 → seu script tem o resultado | `0` |
| Filho saiu != 0 (`non-zero-exit`) | `1` (erro de regra) ou propague `r.error.code` se faz sentido |
| Filho não foi encontrado (`binary-not-found`) | `127` (convenção UNIX: command not found) |
| Filho sem permissão (`permission-denied`) | `126` (convenção UNIX: command found but not executable) |
| Filho morto por timeout do seu script | `124` (convenção do `timeout` do GNU coreutils) |
| Filho estourou maxBuffer | `74` (`EX_IOERR`) |
| Filho morto por sinal (`killed-by-signal`) | `128 + N`, onde N é o número do sinal: `SIGTERM=143`, `SIGINT=130`, `SIGKILL=137`, `SIGSEGV=139` |
| Erro de spawn genérico | `70` (`EX_SOFTWARE`) |

Helper:

```ts
const SIGNAL_TO_NUMBER: Readonly<Record<string, number>> = {
  SIGHUP: 1, SIGINT: 2, SIGQUIT: 3, SIGILL: 4, SIGTRAP: 5,
  SIGABRT: 6, SIGBUS: 7, SIGFPE: 8, SIGKILL: 9, SIGUSR1: 10,
  SIGSEGV: 11, SIGUSR2: 12, SIGPIPE: 13, SIGALRM: 14, SIGTERM: 15,
};

const exitCodeFromRunError = (e: RunError): number => {
  switch (e.kind) {
    case 'binary-not-found':   return 127;
    case 'permission-denied':  return 126;
    case 'timeout':            return 124;
    case 'buffer-overflow':    return 74;
    case 'killed-by-signal':   return 128 + (SIGNAL_TO_NUMBER[e.signal] ?? 0);
    case 'non-zero-exit':      return 1;
    case 'spawn-failed':       return 70;
    default: {
      const _: never = e;
      return _;
    }
  }
};
```

---

## Mensagens humanas (para CLI da P.O. / scripts de devops)

```ts
const formatRunError = (file: string, e: RunError): string => {
  switch (e.kind) {
    case 'binary-not-found':
      return `Comando '${file}' não encontrado no PATH. Instale-o ou ajuste o PATH.`;
    case 'permission-denied':
      return `Sem permissão de execução para '${file}'. Confira chmod e ownership.`;
    case 'non-zero-exit':
      return `'${file}' falhou (exit ${e.code}).\n${e.stderr.trim()}`;
    case 'killed-by-signal':
      return `'${file}' foi morto por ${e.signal}. Possíveis causas: OOM, kill manual, timeout do orquestrador.`;
    case 'timeout':
      return `'${file}' excedeu o tempo limite. Saída parcial: ${e.stderr.trim().slice(0, 200)}`;
    case 'buffer-overflow':
      return `'${file}' produziu mais saída que maxBuffer. Use spawn + stream ou aumente maxBuffer.`;
    case 'spawn-failed':
      return `Falha ao iniciar '${file}': ${e.message}`;
    default: {
      const _: never = e;
      return _;
    }
  }
};
```

---

## Caveats que vão te morder

### 1. `'exit'` vs `'close'` — quase iguais, mas não exatamente

- `'exit'` dispara assim que o filho sai, **mas streams stdin/stdout/stderr podem ainda estar abertos** (com saída buffered).
- `'close'` dispara **depois** que todos os stdio fecharam.

> Use `'close'` quando você precisa da saída completa. Use `'exit'` se só quer saber se o filho terminou.

### 2. `exitCode === null` é normal — significa "morto por sinal"

```ts
cp.on('close', (code, signal) => {
  if (signal !== null) {
    // morto por sinal — code é null
  } else if (code === 0) {
    // sucesso
  } else {
    // saída com erro
  }
});
```

### 3. `'error'` pode disparar **antes** ou **em vez de** `'spawn'`

```ts
cp.on('error', (err) => {
  // binário não encontrado, EACCES, EMFILE — filho nunca rodou
});
cp.on('spawn', () => {
  // confirmado: filho começou a rodar
});
```

**Sempre registre o handler `'error'`.** Sem ele, erro de spawn vira `uncaughtException`.

### 4. `maxBuffer` corta silenciosamente em `exec`

Default `maxBuffer = 1 MiB`. Quando estoura: filho é morto, callback recebe erro com `code: 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER'`, **mas `stdout` contém a saída até o corte**, não a saída completa.

> Solução estrutural: use `spawn` + stream sempre que a saída puder crescer.

### 5. `signal: AbortSignal` mata com `SIGTERM`, não retorna `AbortError`

```ts
try {
  await exec('long-task', [], { signal: AbortSignal.timeout(1000) });
} catch (e: unknown) {
  // e.code === 'ABORT_ERR' (string) OU e.signal === 'SIGTERM' (depende da versão Node)
}
```

Trate **ambos** os casos no classifier.

### 6. `subprocess.stdin.end()` é obrigatório quando você escreve em stdin

Sem `.end()`, o filho fica esperando mais input → trava o `'close'`.

```ts
child.stdin!.write('input\n');
child.stdin!.end(); // <-- crítico
```

### 7. `unref()` para "fire and forget" — mas o filho sobrevive ao pai

```ts
const child = spawn('cmd', [], { stdio: 'ignore', detached: true });
child.unref();
// pai pode sair; filho continua
```

> Útil para nohup-style. Cuidado: se você esperava o filho terminar, isso quebra a expectativa.

### 8. `pipe.on('data')` em modo flowing perde dados se você adicionar listener tarde

```ts
// ❌ Errado: registrar 'data' depois de já ter feito await
const child = spawn('cmd', []);
await algo();
child.stdout!.on('data', d => /* pode perder chunks iniciais */);

// ✅ Certo: pause/resume ou usar async iterator
for await (const chunk of child.stdout!) {
  // ...
}
```

### 9. Windows: `.bat`/`.cmd` exigem `shell: true` — e isso reabre injeção

Ver `Child processes.md` §"Spawning `.bat` and `.cmd` files on Windows". Em CI cross-platform, prefira chamar o `.exe` final ou outra ferramenta.

### 10. `signal === 'SIGPIPE'` é normal em pipelines

Quando o consumidor fecha cedo (`cmd | head -n 1`), o produtor recebe `SIGPIPE`. Em alguns programas isso vira exit 141. Trate como sucesso se a saída parcial já bastou.

---

## Tabela rápida: errno (string) em `e.code`

| `e.code` (string) | Significa |
| :--- | :--- |
| `'ENOENT'` | Binário não encontrado |
| `'EACCES'` / `'EPERM'` | Sem permissão de execução |
| `'EMFILE'` / `'ENFILE'` | Limite de FDs |
| `'EAGAIN'` | Recurso temporariamente indisponível |
| `'ETIMEDOUT'` | Estourou timeout |
| `'ABORT_ERR'` | `AbortSignal` cancelou |
| `'ERR_CHILD_PROCESS_STDIO_MAXBUFFER'` | Saída > maxBuffer |
| `'ERR_INVALID_ARG_VALUE'` | Argumento inválido na chamada |
| (numérico) | Exit code real do filho |

---

## Tabela rápida: signals comuns

| Signal | Número | Origem típica |
| :--- | :--- | :--- |
| `SIGINT` | 2 | Ctrl-C |
| `SIGTERM` | 15 | `kill PID` default; orquestrador (k8s) pedindo shutdown |
| `SIGKILL` | 9 | `kill -9`; OOM killer; force-kill |
| `SIGHUP` | 1 | Terminal desconectou |
| `SIGPIPE` | 13 | Consumidor do pipe fechou |
| `SIGSEGV` | 11 | Segfault — bug no binário |
| `SIGABRT` | 6 | `abort()`, asserção falhou |
| `SIGUSR1`/`SIGUSR2` | 10/12 | Definido pela aplicação |
