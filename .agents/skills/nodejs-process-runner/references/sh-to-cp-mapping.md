# Shell → `node:child_process` — Catálogo de Operações

> 📖 **Fonte canônica:** [`handbook/reference/nodejs/Child processes.md`](../../../../handbook/reference/nodejs/Child processes.md). Esta página é índice operacional — para signature/edge-cases sempre vá ao doc oficial.

Convenção dos exemplos:

```ts
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { pipeline } from 'node:stream/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import { run } from '../scripts/lib/run-result.ts'; // wrapper do SKILL.md

const exec = promisify(execFile);
```

---

## Invocação básica

### `cmd arg1 arg2`

```ts
await exec('cmd', ['arg1', 'arg2']);
```

### `cmd "arg com espaço"`

```ts
await exec('cmd', ['arg com espaço']); // espaços preservados automaticamente
```

### `cmd $VAR`

```ts
const valor = process.env.VAR ?? '';
await exec('cmd', [valor]);
```

> Nunca `await exec(`cmd ${valor}`)` — vira `exec` com shell e RCE potencial.

---

## Captura de saída

### `out=$(cmd)`

```ts
const { stdout: out } = await exec('cmd', []);
```

### `out=$(cmd | tail -1)` (pega só última linha)

```ts
const { stdout } = await exec('cmd', []);
const ultimaLinha = stdout.trimEnd().split('\n').pop() ?? '';
```

### `cmd > /dev/null` (descarta saída)

```ts
await exec('cmd', []); // já é capturado; só não use `stdout`
```

Ou em `spawn`:

```ts
spawn('cmd', [], { stdio: ['ignore', 'ignore', 'ignore'] });
```

### `cmd 2>&1` (mescla stderr no stdout)

```ts
import { spawn } from 'node:child_process';

const child = spawn('cmd', []);
let combined = '';
const readChunks = async (s: NodeJS.ReadableStream): Promise<void> => {
  s.setEncoding('utf8');
  for await (const c of s) combined += c;
};
await Promise.all([readChunks(child.stdout!), readChunks(child.stderr!)]);
```

### `cmd 2>/dev/null` (descarta stderr)

```ts
spawn('cmd', [], { stdio: ['inherit', 'inherit', 'ignore'] });
```

---

## Pipes

### `cmd1 | cmd2`

```ts
const c1 = spawn('cmd1', [], { stdio: ['ignore', 'pipe', 'inherit'] });
const c2 = spawn('cmd2', [], { stdio: ['pipe', 'pipe', 'inherit'] });
await pipeline(c1.stdout!, c2.stdin!);
// c2.stdout é o resultado final
```

### `cmd1 | cmd2 | cmd3`

```ts
const c1 = spawn('cmd1', [], { stdio: ['ignore', 'pipe', 'inherit'] });
const c2 = spawn('cmd2', [], { stdio: ['pipe', 'pipe', 'inherit'] });
const c3 = spawn('cmd3', [], { stdio: ['pipe', 'pipe', 'inherit'] });

await Promise.all([pipeline(c1.stdout!, c2.stdin!), pipeline(c2.stdout!, c3.stdin!)]);
```

> Quando possível, faça o "do meio" em Node (Transform stream) e elimine binários extras.

### `cmd1 | tee arquivo | cmd2` (tee — duplica)

```ts
import { PassThrough } from 'node:stream';

const c1 = spawn('cmd1', [], { stdio: ['ignore', 'pipe', 'inherit'] });
const c2 = spawn('cmd2', [], { stdio: ['pipe', 'pipe', 'inherit'] });
const file = createWriteStream('arquivo');
const tee = new PassThrough();

c1.stdout!.pipe(tee);
tee.pipe(file);
tee.pipe(c2.stdin!);
```

---

## Redirecionamento

### `cmd > arquivo`

```ts
const child = spawn('cmd', [], { stdio: ['ignore', 'pipe', 'inherit'] });
await pipeline(child.stdout!, createWriteStream('arquivo'));
```

### `cmd >> arquivo` (append)

```ts
await pipeline(child.stdout!, createWriteStream('arquivo', { flags: 'a' }));
```

### `cmd < arquivo`

```ts
const child = spawn('cmd', [], { stdio: ['pipe', 'pipe', 'inherit'] });
createReadStream('arquivo').pipe(child.stdin!);
```

Ou via `stdio` array:

```ts
import { open } from 'node:fs/promises';

const fh = await open('arquivo', 'r');
const child = spawn('cmd', [], { stdio: [fh.fd, 'pipe', 'inherit'] });
// fh será fechado quando o filho terminar (cuidado: o handle não fecha automaticamente em alguns casos)
```

### Here-doc: `cmd <<EOF\nlinha 1\nEOF`

```ts
const child = spawn('cmd', [], { stdio: ['pipe', 'pipe', 'inherit'] });
child.stdin!.end('linha 1\n');
```

### Here-string: `cmd <<<"linha"`

```ts
child.stdin!.end('linha\n');
```

---

## Background & paralelismo

### `cmd1 & cmd2 & wait`

```ts
await Promise.all([run('cmd1', []), run('cmd2', [])]);
```

### `cmd &` (fire & forget)

```ts
const child = spawn('cmd', [], {
  stdio: 'ignore',
  detached: true,
});
child.unref(); // pai pode sair sem esperar
```

> `detached: true` + `unref()` é o equivalente do `nohup cmd &`.

### `for arg in *.txt; do cmd "$arg"; done`

```ts
import { glob } from 'node:fs/promises';

for await (const f of glob('*.txt')) {
  await run('cmd', [f]);
}
```

Em paralelo limitado (substitui `xargs -P`):

```ts
const arquivos: string[] = [];
for await (const f of glob('*.txt')) arquivos.push(f);

const concurrencia = 4;
const queue = [...arquivos];
const workers = Array.from({ length: concurrencia }, async () => {
  while (true) {
    const f = queue.shift();
    if (f === undefined) return;
    await run('cmd', [f]);
  }
});
await Promise.all(workers);
```

---

## Variáveis de ambiente

### `FOO=bar cmd`

```ts
await run('cmd', [], {
  env: { ...process.env, FOO: 'bar' },
});
```

### `export FOO=bar; cmd`

```ts
process.env.FOO = 'bar'; // afeta este processo Node e filhos lançados depois
await run('cmd', []);
```

### `cmd FOO=bar baz` (definição inline antes do exec — não é env, é arg)

```ts
await run('cmd', ['FOO=bar', 'baz']);
```

> `cmd FOO=bar baz` no bash define `FOO` no env do filho apenas. Em Node, isso vira a opção `env` (acima).

### `PATH=/opt/bin:$PATH cmd`

```ts
await run('cmd', [], {
  env: { ...process.env, PATH: `/opt/bin:${process.env.PATH ?? ''}` },
});
```

---

## Diretório de trabalho

### `(cd dir && cmd)`

```ts
await run('cmd', [], { cwd: 'dir' });
```

> Evite `process.chdir()` em script async — afeta o processo inteiro, conflita com chamadas paralelas.

---

## Substituição de comando em string

### `echo "branch atual: $(git rev-parse --abbrev-ref HEAD)"`

```ts
const r = await run('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
if (!r.ok) return 1;
const branch = r.value.stdout.trim();
stdout.write(`branch atual: ${branch}\n`);
```

### Aritmética `i=$((i + 1))`

```ts
let i = 0;
i = i + 1;
```

---

## Controle de fluxo

### `set -e` (falha no primeiro erro)

Em Node é explícito — todo retorno checa o `Result`:

```ts
const a = await run('cmd1', []);
if (!a.ok) return falhar(a.error);
const b = await run('cmd2', []);
if (!b.ok) return falhar(b.error);
```

### `set -o pipefail`

`pipeline()` já propaga erro do meio do pipe. Se qualquer subprocesso do pipe falhar, `pipeline()` rejeita.

### `if cmd; then ...; fi`

```ts
const r = await run('cmd', []);
if (r.ok) {
  // ...
}
```

### `if ! cmd; then ...; fi`

```ts
if (!r.ok) {
  // ...
}
```

### `until cmd; do sleep 1; done`

```ts
while (true) {
  const r = await run('cmd', [], { timeoutMs: 2000 });
  if (r.ok) break;
  await new Promise((r) => setTimeout(r, 1000));
}
```

---

## Sinais

### `kill -TERM $PID`

```ts
child.kill('SIGTERM');
```

### `kill -9 $PID`

```ts
child.kill('SIGKILL');
```

### Pattern: TERM, depois KILL após grace period

```ts
const matar = (cp: ChildProcess, gracePeriodMs = 5000): Promise<void> =>
  new Promise((resolve) => {
    if (cp.exitCode !== null) return resolve();
    cp.kill('SIGTERM');
    const timer = setTimeout(() => cp.kill('SIGKILL'), gracePeriodMs);
    cp.on('exit', () => {
      clearTimeout(timer);
      resolve();
    });
  });
```

### `trap 'cleanup' EXIT INT TERM`

```ts
const cleanup = async (): Promise<void> => {
  /* ... */
};
process.on('exit', () => {
  /* ações síncronas */
});
process.on('SIGINT', async () => {
  await cleanup();
  process.exit(130);
});
process.on('SIGTERM', async () => {
  await cleanup();
  process.exit(143);
});
```

---

## Casos específicos

### `git rev-parse HEAD` (sha atual)

```ts
const r = await run('git', ['rev-parse', 'HEAD']);
const sha = r.ok ? r.value.stdout.trim() : null;
```

### `git diff --name-only HEAD~1`

```ts
const r = await run('git', ['diff', '--name-only', 'HEAD~1']);
const arquivos = r.ok ? r.value.stdout.split('\n').filter(Boolean) : [];
```

### `docker compose up -d`

```ts
const r = await run('docker', ['compose', 'up', '-d'], {
  timeoutMs: 120_000,
  cwd: 'infra',
});
```

### `mysqldump db > backup.sql`

```ts
import { spawn } from 'node:child_process';

const dump = spawn('mysqldump', ['--single-transaction', '--routines', '--triggers', 'mydb'], {
  stdio: ['ignore', 'pipe', 'inherit'],
  env: { ...process.env, MYSQL_PWD: secret },
});

await pipeline(dump.stdout!, createWriteStream('backup.sql'));
const { code } = await new Promise<{ code: number | null }>((res) =>
  dump.on('close', (code) => res({ code })),
);
if (code !== 0) throw new Error(`mysqldump exit ${code}`);
```

### `pnpm install --frozen-lockfile`

```ts
const r = await run('pnpm', ['install', '--frozen-lockfile'], {
  timeoutMs: 300_000, // 5 min
});
```

Mostrando progresso:

```ts
import { spawn } from 'node:child_process';

const child = spawn('pnpm', ['install', '--frozen-lockfile'], {
  stdio: 'inherit',
});
const { code } = await new Promise<{ code: number | null }>((res) =>
  child.on('close', (code) => res({ code })),
);
```

### `curl -sf https://api/health` (com timeout)

```ts
const r = await run('curl', ['-sfS', 'https://api/health'], {
  timeoutMs: 5000,
});
```

> Ainda melhor: `fetch('https://api/health', { signal: AbortSignal.timeout(5000) })`. Uma dependência a menos.

### `find . -name '*.ts' -exec eslint {} \;`

```ts
import { glob } from 'node:fs/promises';

for await (const f of glob('**/*.ts', { exclude: ['**/node_modules/**'] })) {
  await run('eslint', [f]);
}
```

Em batch (mais rápido que -exec por arquivo):

```ts
const arquivos: string[] = [];
for await (const f of glob('**/*.ts', { exclude: ['**/node_modules/**'] })) {
  arquivos.push(f);
}
await run('eslint', arquivos);
```

---

## Sem equivalência direta — repense em Node

| Bash idiom                  | Alternativa em Node                                         |
| :-------------------------- | :---------------------------------------------------------- |
| `cmd \| awk '{ print $2 }'` | Capture stdout, `.split(/\s+/)[1]`                          |
| `cmd \| sed 's/foo/bar/g'`  | `stdout.replaceAll('foo', 'bar')`                           |
| `cmd \| grep -v '^#'`       | `stdout.split('\n').filter(l => !l.startsWith('#'))`        |
| `cmd \| jq '.field'`        | `JSON.parse(stdout).field`                                  |
| `cmd \| sort \| uniq`       | `Array.from(new Set(stdout.split('\n'))).sort()`            |
| `cmd \| head -n 5`          | `stdout.split('\n').slice(0, 5)`                            |
| `cmd \| wc -l`              | `stdout.split('\n').length - 1` (cuidado com newline final) |
| `cmd \| xargs -I{} foo {}`  | `for (const x of out.split('\n')) await run('foo', [x])`    |

> Cada binário externo a menos é uma dependência a menos no `Dockerfile`, no CI runner, na máquina de dev — e um vetor de erro a menos.
