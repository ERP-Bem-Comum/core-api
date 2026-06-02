---
name: nodejs-process-runner
description: >
  Executa processos externos (git, docker, pnpm, mysqldump, ffmpeg, scripts shell
  herdados) a partir de Node.js (TypeScript, ESM, Node 24 + --experimental-strip-types)
  usando node:child_process — sempre via execFile/spawn, nunca exec com shell. Cobre
  o equivalente moderno de `$(...)`, pipes, redirecionamento, sinais, timeouts,
  streaming de stdout/stderr e tradução de exit code → Result<T, E>. Pareada com
  nodejs-fs-scripter para tudo que não é apenas FS.
---

# Node.js Process Runner (substituto de `$(...)`, pipes e scripts shell)

## Persona

Você é a pessoa que **invoca processos externos sem invocar um shell**. Sua função: garantir que toda chamada a `git`, `docker`, `pnpm`, `mysqldump`, ou a qualquer binário do PATH, no repo `core-api`, seja feita via **`node:child_process.execFile` / `spawn`** com argumentos como **array** — eliminando injeção de comando, dependência de `bash`/`sh`, e parsing frágil de stdout.

> **Fronteira:** edita `scripts/`, `tools/`, `cli/` e `.claude/.pipeline/<TICKET>/scripts/`. **Nunca** instancia processos a partir de `src/modules/*/domain/`. Se o use case precisar disparar um binário externo (ex.: `git` para versionar contrato), aciona [`ports-and-adapters`](../ports-and-adapters/SKILL.md) primeiro: domínio fala com `GitPort`, o adapter usa esta skill.

---

## Source of Truth

Sempre a documentação oficial do Node 24 espelhada no handbook:

| Tópico                                                                                                                                                               | Onde olhar                                                                                                                     |
| :------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------- |
| **Catálogo completo** — `exec`, `execFile`, `fork`, `spawn`, sync variants, `ChildProcess` class, eventos (`close`, `exit`, `error`, `spawn`), `stdin/stdout/stderr` | [`handbook/reference/nodejs/Child processes.md`](../../../handbook/reference/nodejs/Child processes.md)                        |
| **`maxBuffer`** (limite default 1 MiB em `exec`/`execFile` — corta saída sem aviso)                                                                                  | [`Child processes.md`](../../../handbook/reference/nodejs/Child processes.md) §"`maxBuffer` and Unicode"                       |
| **Shell requirements** (PowerShell vs cmd.exe vs sh)                                                                                                                 | [`Child processes.md`](../../../handbook/reference/nodejs/Child processes.md) §"Shell requirements" + §"Default Windows shell" |
| **Spawning `.bat`/`.cmd` no Windows** (caveats de segurança CVE-2024-27980)                                                                                          | [`Child processes.md`](../../../handbook/reference/nodejs/Child processes.md) §"Spawning `.bat` and `.cmd` files on Windows"   |
| Streams (`subprocess.stdout`, `stdin.write`, `pipeline()`)                                                                                                           | [`handbook/reference/nodejs/Iterable Streams API.md`](../../../handbook/reference/nodejs/Iterable Streams API.md)              |
| `AbortController`, `AbortSignal` (para timeout/cancelamento)                                                                                                         | [`handbook/reference/nodejs/Globals.md`](../../../handbook/reference/nodejs/Globals.md) §"AbortController"                     |
| `process.env`, `process.kill`, `process.exit` (no parent)                                                                                                            | [`handbook/reference/nodejs/Process.md`](../../../handbook/reference/nodejs/Process.md)                                        |
| Quoting / escaping de path no contexto de FS (combinado com esta skill)                                                                                              | [`../nodejs-fs-scripter/SKILL.md`](../nodejs-fs-scripter/SKILL.md)                                                             |

> **Regra de ouro:** antes de juntar argumento em string e passar para `exec`, abra `Child processes.md` e leia o aviso em negrito de `exec`: _"Never pass unsanitized user input to this function. Any input containing shell metacharacters may be used to trigger arbitrary command execution."_ — depois feche o doc e vá direto pra `execFile` ou `spawn`.

---

## 📚 Referências específicas deste projeto

| Tópico                                                                                                              | Onde olhar                                                                                       |
| :------------------------------------------------------------------------------------------------------------------ | :----------------------------------------------------------------------------------------------- |
| Regras transversais (zero `throw` em domínio, `import type`, extensão `.ts`, `Result<T,E>`, sem `any`, sem `class`) | [`../../../CLAUDE.md`](../../../CLAUDE.md)                                                       |
| Quando usar `exec`/`execFile`/`spawn`/`fork` — árvore de decisão + segurança                                        | [`./references/exec-vs-execfile-vs-spawn.md`](./references/exec-vs-execfile-vs-spawn.md)         |
| Tradução shell → `child_process` (command sub, pipes, redirect, env, here-doc)                                      | [`./references/sh-to-cp-mapping.md`](./references/sh-to-cp-mapping.md)                           |
| Tradução erro/`exitCode`/`signal` → `Result<T, E>` ou exit code sysexits.h                                          | [`./references/childprocess-errors-to-result.md`](./references/childprocess-errors-to-result.md) |
| Padrão `Result<T, E>` do projeto                                                                                    | [`src/shared/result.ts`](../../../src/shared/result.ts)                                          |
| Exit codes sysexits.h vigentes                                                                                      | [`../application-cli-builder/SKILL.md`](../application-cli-builder/SKILL.md) §"Exit codes"       |
| Skill irmã para tudo que é só filesystem (sem disparar binário)                                                     | [`../nodejs-fs-scripter/SKILL.md`](../nodejs-fs-scripter/SKILL.md)                               |
| Quando isso vira **port** (ex.: `GitVcsPort`, `ContainerRuntimePort`)                                               | [`../ports-and-adapters/SKILL.md`](../ports-and-adapters/SKILL.md)                               |
| Comandos do projeto (`pnpm`, nunca `npm`) — ADR-0012 reiterado no CLAUDE.md                                         | [`../../../CLAUDE.md`](../../../CLAUDE.md) §"IMPORTANTE"                                         |

---

## Princípio operacional

> **Shell é um runtime hostil.** Toda string que vai pra um shell é potencialmente um RCE quando concatenada com input externo. `execFile` e `spawn` aceitam **argumentos como array** — o kernel passa cada elemento como `argv[N]` sem interpretação. Use isso e o problema desaparece.
>
> 1. **Tipado** — exit code é `number | null`, signal é `NodeJS.Signals | null`. Trate ambos.
> 2. **Sem shell** — sem `cmd | cmd`, sem `> file`, sem `$VAR` expandido — você faz isso em Node.
> 3. **Auditável** — `git blame` mostra `['commit', '-m', message]`, não `git commit -m "${user_input}"`.
> 4. **Cancelável** — `AbortSignal` mata o filho com `SIGTERM` (e `SIGKILL` no `killSignal`).

---

## Regras invariantes (cumpre sempre)

1. **`execFile` ou `spawn` por default.** `exec` (com shell) só com **string literal sem interpolação** — e mesmo assim prefira `execFile`. Comente o motivo quando usar `exec`.
2. **Argumentos como array.** Nunca `execFile('git commit -m ' + msg)`. Sempre `execFile('git', ['commit', '-m', msg])`.
3. **`promisify` para `execFile`** quando quiser API moderna baseada em Promise:
   ```ts
   import { execFile } from 'node:child_process';
   import { promisify } from 'node:util';
   const run = promisify(execFile);
   ```
4. **`shell: true` é proibido.** Se você precisa de pipe/redirect, faça isso em Node (`subprocess.stdout.pipe(...)`).
5. **`maxBuffer` explícito** quando saída pode passar de 1 MiB. Default trunca silenciosamente em `exec`/`execFile`.
6. **Sempre tratar `signal`** além de `exitCode`. Processo morto por `SIGKILL`/`SIGTERM` tem `exitCode === null`.
7. **`AbortSignal`** em qualquer chamada que possa travar (`signal: AbortSignal.timeout(30_000)`).
8. **`stdio: 'inherit'`** quando o usuário quer ver progresso (tipo `git clone` mostrando %). `'pipe'` (default) quando você precisa capturar.
9. **Sem `any` no `error`.** `error: ExecFileException` tem `code: number | string | undefined` e `signal: NodeJS.Signals | undefined`.
10. **Logs do filho ao stderr do pai.** Stdout só com o **dado consumível** (igual à regra geral de CLI).
11. **`pnpm`, nunca `npm`.** Ao chamar package manager: `execFile('pnpm', ['install'])`.
12. **Cleanup de `ChildProcess`.** Em script async longo, use `using sub = spawn(...)` (Node 24 suporta `Symbol.dispose`) ou `try/finally` com `subprocess.kill()`.

---

## Estrutura típica de um script

```
scripts/
├── snapshot-db.ts                       # roda mysqldump → grava arquivo
├── git-tag-release.ts                   # roda git tag + git push
├── docker-compose-up-when-ready.ts      # sobe stack e espera healthcheck
└── lib/
    ├── run-result.ts                    # wrapper execFile → Result<{ stdout, stderr }, RunError>
    └── exit-codes.ts                    # constantes sysexits.h
```

Execução padrão:

```bash
pnpm exec node --experimental-strip-types --no-warnings scripts/snapshot-db.ts --to backups/2026-05-15.sql
```

---

## Wrapper canônico: `run` baseado em `Result<T, E>`

```ts
// scripts/lib/run-result.ts
import { execFile, type ExecFileException } from 'node:child_process';
import { promisify } from 'node:util';
import type { Result } from '#src/shared/result.ts';

const execFileP = promisify(execFile);

export type RunError =
  | { kind: 'spawn-failed'; message: string }
  | { kind: 'non-zero-exit'; code: number; stdout: string; stderr: string }
  | { kind: 'killed-by-signal'; signal: NodeJS.Signals; stdout: string; stderr: string }
  | { kind: 'timeout'; stdout: string; stderr: string }
  | { kind: 'buffer-overflow'; stdout: string; stderr: string };

export type RunOk = Readonly<{ stdout: string; stderr: string }>;

export type RunOptions = Readonly<{
  cwd?: string;
  env?: Readonly<Record<string, string | undefined>>;
  signal?: AbortSignal;
  timeoutMs?: number;
  maxBufferBytes?: number;
  encoding?: BufferEncoding;
}>;

export const run = async (
  file: string,
  args: readonly string[],
  opts: RunOptions = {},
): Promise<Result<RunOk, RunError>> => {
  try {
    const { stdout, stderr } = await execFileP(file, args.slice(), {
      cwd: opts.cwd,
      env: opts.env as NodeJS.ProcessEnv | undefined,
      signal: opts.signal,
      timeout: opts.timeoutMs ?? 0,
      maxBuffer: opts.maxBufferBytes ?? 10 * 1024 * 1024, // 10 MiB default
      encoding: opts.encoding ?? 'utf8',
      shell: false, // CRITICAL: nunca shell
      windowsHide: true,
    });
    return { ok: true, value: { stdout: String(stdout), stderr: String(stderr) } };
  } catch (e: unknown) {
    return { ok: false, error: classifyExecError(e) };
  }
};

const classifyExecError = (e: unknown): RunError => {
  if (!isExecFileException(e)) {
    return { kind: 'spawn-failed', message: e instanceof Error ? e.message : String(e) };
  }
  const stdout = typeof e.stdout === 'string' ? e.stdout : '';
  const stderr = typeof e.stderr === 'string' ? e.stderr : '';

  if (e.code === 'ABORT_ERR' || (e.killed === true && e.signal === 'SIGTERM')) {
    return { kind: 'timeout', stdout, stderr };
  }
  if (e.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER') {
    return { kind: 'buffer-overflow', stdout, stderr };
  }
  if (typeof e.signal === 'string') {
    return { kind: 'killed-by-signal', signal: e.signal as NodeJS.Signals, stdout, stderr };
  }
  if (typeof e.code === 'number') {
    return { kind: 'non-zero-exit', code: e.code, stdout, stderr };
  }
  return { kind: 'spawn-failed', message: e.message };
};

type ExecFileExceptionLike = Error &
  Partial<ExecFileException> & {
    stdout?: string | Buffer;
    stderr?: string | Buffer;
  };

const isExecFileException = (e: unknown): e is ExecFileExceptionLike =>
  e instanceof Error && ('code' in e || 'signal' in e || 'stdout' in e);
```

Uso típico:

```ts
const r = await run('git', ['rev-parse', 'HEAD'], { cwd: repoRoot });
if (!r.ok) {
  switch (r.error.kind) {
    case 'non-zero-exit':
      stderr.write(`git falhou (exit ${r.error.code}): ${r.error.stderr}\n`);
      return 1;
    case 'spawn-failed':
      stderr.write(`não foi possível executar git: ${r.error.message}\n`);
      return 127; // command not found
    case 'killed-by-signal':
      stderr.write(`git morto por ${r.error.signal}\n`);
      return 130;
    case 'timeout':
      stderr.write('git timeout\n');
      return 124; // GNU timeout convention
    case 'buffer-overflow':
      stderr.write('git saída estourou maxBuffer\n');
      return 74;
    default: {
      const _exhaustive: never = r.error;
      return _exhaustive;
    }
  }
}
const sha = r.value.stdout.trim();
```

---

## Quando usar cada API (resumo — detalhes em [`./references/exec-vs-execfile-vs-spawn.md`](./references/exec-vs-execfile-vs-spawn.md))

| API                          | Quando                                                                                                                     |  Buffer?  |     Shell?     |       Streaming?       |
| :--------------------------- | :------------------------------------------------------------------------------------------------------------------------- | :-------: | :------------: | :--------------------: |
| `execFile`                   | Comando + args fixos; saída pequena (< 10 MiB); espera terminar                                                            | ✅ buffer | ❌ direto exec |           ❌           |
| `spawn`                      | Saída grande, longa, ou quer pipe; quer ver progresso em real-time                                                         | ❌ stream | ❌ direto exec | ✅ stdin/stdout/stderr |
| `exec`                       | **Praticamente nunca.** Só com string literal sem input externo, quando precisa de glob expansion ou outra mágica de shell | ✅ buffer |  ✅ `/bin/sh`  |           ❌           |
| `fork`                       | Subprocesso Node especificamente (worker pattern) com canal IPC                                                            |    n/a    |       ❌       |   ✅ + `.send()` IPC   |
| `execFileSync` / `spawnSync` | Pré-commit hook em CommonJS, ou bootstrap síncrono                                                                         |   varia   |     varia      |          n/a           |

Árvore de decisão:

```
Precisa do shell para interpretar `|`, `>`, `*`, `$VAR`?
├── SIM (e a string é literal sem input externo) → exec (com comentário do porquê)
└── NÃO
    ├── Saída grande ou quer streamar progresso? → spawn
    ├── Subprocesso Node com IPC? → fork
    └── Caso comum (binário + args, captura saída) → execFile
```

---

## Anatomia de um script (template canônico)

```ts
#!/usr/bin/env -S node --experimental-strip-types --no-warnings
// scripts/git-tag-release.ts
//
// Substitui:  git tag -a "v${VER}" -m "release ${VER}" && git push origin "v${VER}"

import { argv, exit, stderr, stdout } from 'node:process';
import { run } from './lib/run-result.ts';

type Flags = Readonly<{ versao: string; dryRun: boolean }>;
type FlagError = Readonly<{ error: string }>;

const parseFlags = (raw: readonly string[]): Flags | FlagError => {
  let versao: string | null = null;
  let dryRun = false;
  for (let i = 0; i < raw.length; i++) {
    const arg = raw[i];
    if (arg === '--versao') {
      const v = raw[i + 1];
      if (v === undefined) return { error: '--versao requer valor' };
      if (!/^\d+\.\d+\.\d+$/.test(v)) return { error: `--versao inválida: ${v}` };
      versao = v;
      i += 1;
    } else if (arg === '--dry-run') {
      dryRun = true;
    } else {
      return { error: `flag desconhecida: ${arg}` };
    }
  }
  if (versao === null) return { error: '--versao é obrigatório' };
  return { versao, dryRun };
};

const main = async (): Promise<number> => {
  const flags = parseFlags(argv.slice(2));
  if ('error' in flags) {
    stderr.write(`Erro de uso: ${flags.error}\n`);
    return 64;
  }

  const tag = `v${flags.versao}`;
  const msg = `release ${flags.versao}`;

  if (flags.dryRun) {
    stdout.write(`[dry-run] git tag -a ${tag} -m "${msg}"\n`);
    stdout.write(`[dry-run] git push origin ${tag}\n`);
    return 0;
  }

  const tagR = await run('git', ['tag', '-a', tag, '-m', msg], {
    timeoutMs: 10_000,
  });
  if (!tagR.ok) {
    stderr.write(`git tag falhou: ${formatError(tagR.error)}\n`);
    return 1;
  }

  const pushR = await run('git', ['push', 'origin', tag], {
    timeoutMs: 60_000,
  });
  if (!pushR.ok) {
    stderr.write(`git push falhou: ${formatError(pushR.error)}\n`);
    stderr.write(`Para reverter: git tag -d ${tag}\n`);
    return 1;
  }

  stdout.write(`✅ ${tag} criada e publicada\n`);
  return 0;
};

const formatError = (e: import('./lib/run-result.ts').RunError): string => {
  switch (e.kind) {
    case 'non-zero-exit':
      return `exit ${e.code}: ${e.stderr.trim()}`;
    case 'killed-by-signal':
      return `morto por ${e.signal}`;
    case 'spawn-failed':
      return e.message;
    case 'timeout':
      return 'timeout';
    case 'buffer-overflow':
      return 'saída excedeu maxBuffer';
    default: {
      const _: never = e;
      return _;
    }
  }
};

exit(await main());
```

Pontos-chave:

- **`parseFlags` puro** valida formato da versão **antes** de tocar em `git`.
- **`run` para todas as chamadas** — sem `try/catch` no main.
- **`switch` exaustivo** no formatError — TS trava se `RunError` ganhar variante nova.
- **Timeouts diferentes** por operação (tag local: 10s, push de rede: 60s).
- **Reversão na falha** documentada na mensagem ao usuário.

---

## Padrões frequentes

### Capturar `$(comando)` (command substitution)

```ts
const r = await run('git', ['rev-parse', '--show-toplevel']);
if (!r.ok) return 1;
const repoRoot = r.value.stdout.trim();
```

### Pipe `cmd1 | cmd2` (sem shell!)

```ts
import { spawn } from 'node:child_process';
import { pipeline } from 'node:stream/promises';

const find = spawn('git', ['ls-files'], { stdio: ['ignore', 'pipe', 'inherit'] });
const wc = spawn('wc', ['-l'], { stdio: ['pipe', 'pipe', 'inherit'] });

await pipeline(find.stdout!, wc.stdin!);
// captura wc.stdout
```

> Equivalente Node-nativo (sem `wc`): conta linhas em JS após `git ls-files`. Reduza dependência de binários externos sempre que possível.

### Redirecionamento `> arquivo`

```ts
import { createWriteStream } from 'node:fs';
import { spawn } from 'node:child_process';
import { pipeline } from 'node:stream/promises';

const dump = spawn('mysqldump', ['-u', user, '-p' + pwd, dbName], {
  stdio: ['ignore', 'pipe', 'inherit'],
});
await pipeline(dump.stdout!, createWriteStream('backup.sql'));
```

> ⚠️ Senha em `argv` é visível em `ps`. Para mysqldump use `--defaults-file` ou variável de ambiente, nunca `-p<pwd>` literal.

### Streaming de output ("acompanhar progresso")

```ts
import { spawn } from 'node:child_process';

const child = spawn('pnpm', ['install'], { stdio: 'inherit' }); // pai e filho compartilham TTY

await new Promise<void>((resolve, reject) => {
  child.on('close', (code, signal) => {
    if (code === 0) resolve();
    else reject(new Error(`pnpm install falhou (exit=${code}, signal=${signal})`));
  });
  child.on('error', reject);
});
```

### Input via stdin

```ts
import { spawn } from 'node:child_process';

const child = spawn('jq', ['.titulo'], { stdio: ['pipe', 'pipe', 'inherit'] });
child.stdin!.end('{"titulo": "Contrato 001"}\n');

let out = '';
child.stdout!.setEncoding('utf8');
for await (const chunk of child.stdout!) out += chunk;
// out === '"Contrato 001"\n'
```

### Timeout + cancelamento

```ts
const ac = new AbortController();
const timer = setTimeout(() => ac.abort(), 30_000);
try {
  const r = await run('curl', ['-s', url], { signal: ac.signal });
  // ...
} finally {
  clearTimeout(timer);
}
```

Ou (Node 17+, mais limpo):

```ts
await run('curl', ['-s', url], { signal: AbortSignal.timeout(30_000) });
```

### Variáveis de ambiente para o filho

```ts
await run('node', ['migrate.js'], {
  env: {
    ...process.env,
    DATABASE_URL: 'mysql://...',
    NODE_ENV: 'production',
  },
});
```

> Passar `env: { FOO: 'bar' }` **sem** spread substitui `process.env` inteiro — quebra `PATH` e o binário some.

### Esperar healthcheck (substituto de `until curl -f ...; do sleep 1; done`)

```ts
const esperarSaudavel = async (url: string, totalMs: number): Promise<boolean> => {
  const fim = Date.now() + totalMs;
  while (Date.now() < fim) {
    const r = await run('curl', ['-fsS', '-o', '/dev/null', url], {
      timeoutMs: 2000,
    });
    if (r.ok) return true;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
};
```

> Quando possível, troque `curl` por `fetch` nativo — uma dependência a menos.

---

## Anti-padrões

| ❌ Errado                                                      | ✅ Certo                                                                                |
| :------------------------------------------------------------- | :-------------------------------------------------------------------------------------- |
| `exec('git commit -m "' + msg + '"')` (RCE)                    | `execFile('git', ['commit', '-m', msg])`                                                |
| `exec('rm -rf ' + dir)`                                        | `fsPromises.rm(dir, { recursive: true, force: true })` — não chame `rm` externo         |
| `spawn('git', args, { shell: true })`                          | `spawn('git', args)` — `shell: true` reintroduz injeção                                 |
| `execSync(cmd)` num script async                               | `await run(file, args)` — `Sync` bloqueia event loop                                    |
| Ignorar `signal` no callback do `exit`                         | Tratar `exitCode === null && signal !== null` como "morto por sinal"                    |
| `error.code` esperando ser number                              | `code` pode ser `'ABORT_ERR'` (string) ou `42` (number) — narrowing                     |
| `exec(cmd)` confiando no default `maxBuffer = 1MiB`            | Especifique `maxBuffer` ou use `spawn` + stream                                         |
| `child.kill()` sem timeout para `SIGKILL`                      | `child.kill('SIGTERM')`, espera 5s, `child.kill('SIGKILL')` se ainda vivo               |
| `child.stdout.on('data', ...)` acumulando em string sem limite | Use `for await (const chunk of child.stdout)` + limite explícito, ou `stream/consumers` |
| Esquecer `windowsHide: true` em CI Windows                     | Sempre passar — esconde janela do filho                                                 |
| Chamar `npm` em qualquer lugar                                 | `pnpm` — [ADR-0012](../../../CLAUDE.md)                                                 |
| `console.log(child.stderr)` (Buffer)                           | `process.stderr.write(child.stderr.toString())`                                         |
| `subprocess.stdout!.pipe(otherStream)` sem `pipeline()`        | `await pipeline(subprocess.stdout!, otherStream)` — propaga erro                        |
| Re-executar `pnpm install` para forçar exit code 0             | Logar o erro real; falha é informação, não falha do script                              |

---

## Quando NÃO usar esta skill

- **Operação de filesystem pura** (cp, rm, mkdir, glob): use [`nodejs-fs-scripter`](../nodejs-fs-scripter/SKILL.md). Não chame `cp`/`rm` externos.
- **Domínio precisa rodar `git`, `docker`, etc.**: modele um Port (`GitVcsPort`, `ContainerRuntimePort`) via [`ports-and-adapters`](../ports-and-adapters/SKILL.md). O adapter real usa esta skill por dentro; o domínio não.
- **CLI da P.O.**: [`application-cli-builder`](../application-cli-builder/SKILL.md). Esta skill é para automação interna / devops / scripts de build.
- **HTTP call simples**: `fetch` nativo (Node 18+). Não chame `curl`.
- **Parsing de JSON**: `JSON.parse`. Não chame `jq`.

---

## Como esta skill se relaciona com outras

```
ts-domain-modeler           (modela tipos puros, sem processos)
        │
        ▼
ports-and-adapters          (GitVcsPort, ContainerRuntimePort)
        │                            │
        ▼                            ▼
nodejs-fs-scripter   ◄──┼──►   nodejs-process-runner   ◄── você está aqui
        │                            │
        └──────── usados juntos por scripts de devops/build ──────┘
        ▼
application-cli-builder     (CLI da P.O.; usa wrappers internamente)
```

---

## Checklist antes de declarar pronto

- [ ] Script roda com `pnpm exec node --experimental-strip-types --no-warnings scripts/<nome>.ts` sem warning.
- [ ] Toda chamada externa usa `execFile`/`spawn`, **nunca** `exec` com interpolação.
- [ ] `shell: false` (ou omitido — esse é o default em `execFile`/`spawn`).
- [ ] Cada chamada tem `timeoutMs` ou `signal` explícito.
- [ ] `error` narrowed via wrapper `run()` → `Result<T, RunError>`; main faz `switch` exaustivo.
- [ ] Saída do filho > 1 MiB → `spawn` com stream, **não** `execFile`.
- [ ] `maxBuffer` explícito quando `execFile` é usado e saída pode crescer.
- [ ] Exit codes do script seguem sysexits.h.
- [ ] Stdout só com dado consumível; progresso/logs/erro vão pro stderr.
- [ ] `windowsHide: true` setado se script pode rodar em CI Windows.
- [ ] Credenciais **fora de `argv`** — env var ou stdin.
- [ ] Cleanup de subprocesso garantido em erro/SIGINT (kill + `using`/finally).
- [ ] `tsc --noEmit`, `pnpm run format:check`, `pnpm run lint` passam.
- [ ] Se o script substituiu um `.sh`, o `.sh` foi removido (`git rm`).

---

## Changelog

- **2026-05-15:** Criação. Ancorada em `handbook/reference/nodejs/Child processes.md`. Pareada com `nodejs-fs-scripter` (FS puro) e `ports-and-adapters` (quando a invocação externa vira dependência do domínio).
