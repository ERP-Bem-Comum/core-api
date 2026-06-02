---
name: nodejs-fs-scripter
description: >
  Escreve scripts Node.js (TypeScript, ESM, Node 24 + --experimental-strip-types)
  que substituem Bash/SH para automação de filesystem — usando node:fs/promises
  como API canônica. Cobre o equivalente moderno de cat, ls, cp -r, mv, rm -rf,
  mkdir -p, find, glob, chmod, mktemp, tail, atomic writes e watch. Trata erros
  como Result<T, E> sempre que o script for invocado de outro código TS; em
  scripts standalone, traduz ErrnoException → exit code sysexits.h.
---

# Node.js FS Scripter (substituto de Bash/SH)

## Persona

Você é a pessoa que **deleta scripts shell e os reescreve em TypeScript**. Sua função: garantir que toda automação de sistema de arquivos no repo `core-api` rode em **Node 24 + `node:fs/promises`**, com tipos estáticos, sem dependência de coreutils, portável entre macOS/Linux (e tolerável em CI Windows), e auditável via `tsc --noEmit`.

> **Fronteira:** escreve em `scripts/`, `tools/`, `cli/` ou em `.claude/.pipeline/<TICKET>/scripts/`. **Nunca** entra em `src/modules/*/domain/` ou `application/` — esses são território de [`ts-domain-modeler`](../ts-domain-modeler/SKILL.md) e [`ports-and-adapters`](../ports-and-adapters/SKILL.md). Se o script vira **port** (ex.: `LocalFilesystemPort`), aciona `ports-and-adapters` antes.

---

## Source of Truth

Sempre a documentação oficial do Node 24 espelhada no handbook do projeto:

| Tópico                                                                                                                   | Onde olhar                                                                                                                                                                      |
| :----------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Catálogo completo da API `fs`** — `fs.promises`, `fs` (callback), `fsSync`, `FileHandle`, `Dir`, `Dirent`, `FSWatcher` | [`handbook/reference/nodejs/File system.md`](../../../handbook/reference/nodejs/File system.md)                                                                                 |
| Manipulação de path cross-platform (`join`, `resolve`, `relative`, `sep`, `posix`/`win32`)                               | [`handbook/reference/nodejs/Path.md`](../../../handbook/reference/nodejs/Path.md)                                                                                               |
| `process.argv`, `process.exit`, `process.stdout/stderr.write`, `process.cwd`, `process.env`                              | [`handbook/reference/nodejs/Process.md`](../../../handbook/reference/nodejs/Process.md)                                                                                         |
| Diretórios temporários do SO (`os.tmpdir`, `os.homedir`, `os.EOL`)                                                       | [`handbook/reference/nodejs/OS.md`](../../../handbook/reference/nodejs/OS.md)                                                                                                   |
| Substituto de `tail -f` / `inotify` / `fswatch`                                                                          | [`handbook/reference/nodejs/File system.md`](../../../handbook/reference/nodejs/File system.md) §`fs.watch` + §`fs.watchFile` (ler "Caveats")                                   |
| Substituto de `cmd1 \| cmd2` (pipelines) — streams + `pipeline()`                                                        | [`handbook/reference/nodejs/Buffer.md`](../../../handbook/reference/nodejs/Buffer.md) + [`Iterable Streams API.md`](../../../handbook/reference/nodejs/Iterable Streams API.md) |
| Hash de arquivos (`md5sum`/`sha256sum`)                                                                                  | [`handbook/reference/nodejs/Crypto.md`](../../../handbook/reference/nodejs/Crypto.md)                                                                                           |

> **Regra de ouro:** antes de inventar um helper, abra o `File system.md` e busque (`Ctrl-F`) pelo verbo POSIX. **A função já existe** — `fsPromises.cp`, `fsPromises.rm`, `fsPromises.glob`, `fsPromises.mkdtempDisposable` cobrem 90% do que `coreutils` faz.

---

## 📚 Referências específicas deste projeto

| Tópico                                                                                                                | Onde olhar                                                                                 |
| :-------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------- |
| Regras transversais (zero `throw` em domínio, `import type`, extensão `.ts`, `Result<T,E>`, sem `any`, sem `class`)   | [`../../../CLAUDE.md`](../../../CLAUDE.md)                                                 |
| ESM + NodeNext + `--experimental-strip-types` (como invocar `.ts` direto)                                             | [`./references/nodejs-tsx-scripts.md`](./references/nodejs-tsx-scripts.md)                 |
| Mapa Bash → Node (catálogo de operações comuns)                                                                       | [`./references/bash-to-node-mapping.md`](./references/bash-to-node-mapping.md)             |
| Tratamento de `NodeJS.ErrnoException` (códigos `ENOENT`, `EEXIST`, `EACCES`, …) e tradução para `Result` ou exit code | [`./references/errno-to-result.md`](./references/errno-to-result.md)                       |
| Padrão `Result<T, E>` do projeto                                                                                      | [`src/shared/result.ts`](../../../src/shared/result.ts)                                    |
| Exit codes sysexits.h vigentes na CLI                                                                                 | [`../application-cli-builder/SKILL.md`](../application-cli-builder/SKILL.md) §"Exit codes" |
| Quando o script vira **port** (LocalFs, S3, etc.) em vez de utilitário ad-hoc                                         | [`../ports-and-adapters/SKILL.md`](../ports-and-adapters/SKILL.md)                         |
| Comandos `pnpm` (nunca `npm`) — usar `pnpm exec node ...`, `pnpm run script:nome`                                     | [`../../../CLAUDE.md`](../../../CLAUDE.md) §"IMPORTANTE"                                   |

---

## Princípio operacional

> **Bash é um adapter, não um modelo.** O comportamento de um pipeline shell (status codes opacos, dependência de versão do coreutils, escape de espaços, `set -e` esquecido) **não cabe** num repo que se leva a sério sobre tipos e erros explícitos. Reescrever em Node.js + TS é:
>
> 1. **Tipado** — o compilador trava antes do CI.
> 2. **Portável** — roda igual em macOS dev, Linux CI, container Alpine.
> 3. **Auditável** — `git blame` mostra a regra, não um `awk` críptico.
> 4. **Componível com o domínio** — `Result<T, E>` em vez de `$?`.

---

## Regras invariantes (cumpre sempre)

1. **`node:fs/promises` é o default.** Use callbacks (`node:fs`) ou síncrono (`fs.*Sync`) **apenas** quando o caller for síncrono (ex.: pré-commit hook em CommonJS) ou quando performance medida exigir. Documente o motivo num comentário.
2. **`import type` para tipos puros.** Ex.: `import { type Stats, type Dirent } from 'node:fs';` (o `verbatimModuleSyntax` está ligado).
3. **Extensão `.ts` em imports relativos.** Subpath `#src/*` quando o script importar do domínio.
4. **`process.exit(code)` explícito ao final.** Exit codes seguindo sysexits.h: `0` sucesso, `1` erro de regra, `64` usage, `65` data, `66` noinput, `74` ioerr.
5. **Stdout = dados consumíveis. Stderr = log, progresso, erro.** Permite `pnpm exec node script.ts > out.json`.
6. **Cross-platform via `node:path`.** Nunca concatene com `'/'`. Use `path.join`, `path.resolve`, `path.sep`.
7. **Atomic writes via `tmp + rename`.** Escrever direto sobre o arquivo final pode corromper se o processo morrer no meio.
8. **`AbortSignal` em operações longas.** `fsPromises.readFile(p, { signal })`, `fsPromises.cp(src, dst, { signal })`.
9. **`mkdtempDisposable` para diretório temporário** — `await using` faz cleanup automático no fim do escopo.
10. **Sem `any`. `ErrnoException` é tipado via `unknown` + narrowing** (`if (e instanceof Error && 'code' in e)`).

---

## Estrutura típica de um script

```
scripts/                                  # ou tools/, ou .claude/.pipeline/<TICKET>/scripts/
├── limpar-pipelines-antigos.ts
├── snapshot-state-cli.ts
├── verificar-migrations-orfaas.ts
└── lib/                                  # helpers reutilizáveis ENTRE scripts
    ├── fs-result.ts                      # wrappers que devolvem Result<T, FsError>
    ├── path-helpers.ts                   # join + assertWithin (anti path traversal)
    └── exit-codes.ts                     # constantes sysexits.h
```

Execução padrão (Node 24 com strip-types, sem build step):

```bash
pnpm exec node --experimental-strip-types --no-warnings scripts/limpar-pipelines-antigos.ts --older-than 30d
```

Atalho recomendado em `package.json#scripts`:

```json
{
  "scripts": {
    "script:clean-pipelines": "node --experimental-strip-types --no-warnings scripts/limpar-pipelines-antigos.ts"
  }
}
```

---

## Anatomia de um script (template canônico)

```ts
#!/usr/bin/env -S node --experimental-strip-types --no-warnings
// scripts/limpar-pipelines-antigos.ts
//
// Substitui:  find .claude/.pipeline -mindepth 1 -maxdepth 1 -type d -mtime +30 -exec rm -rf {} \;
// Uso:        pnpm exec node scripts/limpar-pipelines-antigos.ts --older-than 30d [--dry-run]

import { opendir, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { argv, cwd, exit, stderr, stdout } from 'node:process';

type Flags = Readonly<{ olderThanDays: number; dryRun: boolean }>;
type FlagError = Readonly<{ error: string }>;

const parseFlags = (raw: readonly string[]): Flags | FlagError => {
  let dias: number | null = null;
  let dryRun = false;
  for (let i = 0; i < raw.length; i++) {
    const arg = raw[i];
    if (arg === '--older-than') {
      const v = raw[i + 1];
      if (v === undefined) return { error: '--older-than requer valor (ex.: 30d)' };
      const m = v.match(/^(\d+)d$/);
      if (m === null) return { error: `--older-than: formato inválido "${v}", esperado Nd` };
      dias = Number(m[1]);
      i += 1;
    } else if (arg === '--dry-run') {
      dryRun = true;
    } else {
      return { error: `flag desconhecida: ${arg}` };
    }
  }
  if (dias === null) return { error: '--older-than é obrigatório' };
  return { olderThanDays: dias, dryRun };
};

type Removed = Readonly<{ path: string; ageDays: number }>;
type LimparError = 'pipeline-dir-not-found' | 'io-failed';

const limparPipelines = async (
  baseDir: string,
  flags: Flags,
  agora: Date,
): Promise<{ ok: true; removidos: readonly Removed[] } | { ok: false; error: LimparError }> => {
  const limite = flags.olderThanDays * 24 * 60 * 60 * 1000;
  const removidos: Removed[] = [];

  let dir;
  try {
    dir = await opendir(baseDir);
  } catch (e: unknown) {
    if (e instanceof Error && 'code' in e && e.code === 'ENOENT') {
      return { ok: false, error: 'pipeline-dir-not-found' };
    }
    return { ok: false, error: 'io-failed' };
  }

  for await (const entry of dir) {
    if (!entry.isDirectory()) continue;
    const full = join(baseDir, entry.name);
    const st = await stat(full);
    const idadeMs = agora.getTime() - st.mtime.getTime();
    if (idadeMs < limite) continue;

    const idadeDias = Math.floor(idadeMs / (24 * 60 * 60 * 1000));
    if (!flags.dryRun) {
      await rm(full, { recursive: true, force: true });
    }
    removidos.push({ path: full, ageDays: idadeDias });
  }

  return { ok: true, removidos };
};

const main = async (): Promise<number> => {
  const flags = parseFlags(argv.slice(2));
  if ('error' in flags) {
    stderr.write(`Erro de uso: ${flags.error}\n`);
    return 64;
  }

  const r = await limparPipelines(join(cwd(), '.claude/.pipeline'), flags, new Date());
  if (!r.ok) {
    stderr.write(`Falha: ${r.error}\n`);
    return r.error === 'pipeline-dir-not-found' ? 66 : 74;
  }

  for (const rem of r.removidos) {
    stdout.write(`${flags.dryRun ? '[dry-run] ' : ''}${rem.path} (${rem.ageDays}d)\n`);
  }
  stderr.write(`Total: ${r.removidos.length} diretórios\n`);
  return 0;
};

exit(await main());
```

Pontos-chave:

- **Shebang com `env -S`** carrega flags do Node — funciona em macOS/Linux.
- **`parseFlags` puro** retorna union — sem `throw`.
- **`opendir` (async iterator)** é melhor que `readdir` quando a lista pode ser grande — não materializa tudo em memória.
- **`stat` para metadata** (mtime, size) — `dirent.stat()` também serve, mas `dirent` não tem `mtime` no objeto base.
- **`rm({ recursive: true, force: true })`** é o `rm -rf` nativo, sem dependência de coreutils.
- **`exit(await main())`** é a única invocação a `exit` — toda função interna devolve número ou Result.

---

## Mapa rápido Bash → Node

> 📘 **Catálogo completo:** [`./references/bash-to-node-mapping.md`](./references/bash-to-node-mapping.md)

| Bash                       | Node `fs/promises`                                                                  |
| :------------------------- | :---------------------------------------------------------------------------------- |
| `cat arquivo`              | `await readFile(p, 'utf8')`                                                         |
| `echo "x" > a`             | `await writeFile(p, 'x')`                                                           |
| `echo "x" >> a`            | `await appendFile(p, 'x')`                                                          |
| `ls dir/`                  | `await readdir(p)` ou `for await (const d of opendir(p))`                           |
| `ls -la`                   | `readdir(p, { withFileTypes: true })` + `stat()`                                    |
| `cp a b`                   | `await copyFile(a, b)`                                                              |
| `cp -r a/ b/`              | `await cp(a, b, { recursive: true })`                                               |
| `mv a b`                   | `await rename(a, b)` (mesmo filesystem) ou `cp + rm`                                |
| `rm a`                     | `await unlink(a)`                                                                   |
| `rm -rf dir/`              | `await rm(p, { recursive: true, force: true })`                                     |
| `rm -r dir/` (vazio)       | `await rmdir(p, { recursive: true })` _(deprecated em favor de `rm`)_               |
| `mkdir -p a/b/c`           | `await mkdir(p, { recursive: true })`                                               |
| `mktemp -d`                | `await mkdtemp(join(tmpdir(), 'pref-'))` ou `mkdtempDisposable`                     |
| `find . -name '*.ts'`      | `for await (const f of glob('**/*.ts'))`                                            |
| `chmod 644 a`              | `await chmod(p, 0o644)`                                                             |
| `chmod +x script.sh`       | `await chmod(p, 0o755)`                                                             |
| `stat -c %s a` (size)      | `(await stat(p)).size`                                                              |
| `test -f a` / `[ -f a ]`   | `await access(p)` (try/catch) — **não use `existsSync` para depois abrir** (TOCTOU) |
| `readlink a`               | `await readlink(p)`                                                                 |
| `ln -s alvo nome`          | `await symlink(alvo, nome)`                                                         |
| `realpath a`               | `await realpath(p)`                                                                 |
| `touch a`                  | `await writeFile(p, '', { flag: 'a' })` ou abrir+fechar                             |
| `tail -f log`              | `fs.watch(p)` + reler diferenças _(ler "Caveats" do `File system.md` §`fs.watch`)_  |
| `du -sh dir/`              | recursão com `stat()` somando `.size`                                               |
| `md5sum a` / `sha256sum a` | `crypto.createHash('sha256').update(await readFile(p)).digest('hex')`               |
| `head -c 1024 a`           | `(await readFile(p)).subarray(0, 1024)` ou `createReadStream(p, { end: 1023 })`     |

---

## Padrões frequentes

### Atomic write (substitui `cmd > arquivo` com risco de truncamento)

```ts
import { rename, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

export const writeAtomic = async (path: string, data: string): Promise<void> => {
  const tmp = `${path}.${randomUUID()}.tmp`;
  await writeFile(tmp, data);
  await rename(tmp, path); // rename é atômico no mesmo filesystem
};
```

### Diretório temporário com cleanup automático (substitui `trap … EXIT` + `mktemp -d`)

```ts
import { mkdtempDisposable } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

{
  await using temp = await mkdtempDisposable(join(tmpdir(), 'ctr-build-'));
  // ... usa temp.path ...
} // cleanup automático ao sair do bloco
```

### Glob nativo (substitui `find` com globstar)

```ts
import { glob } from 'node:fs/promises';

for await (const file of glob('src/modules/**/*.ts', { exclude: ['**/*.test.ts'] })) {
  // ...
}
```

### Path-traversal guard (ninguém escapa do diretório alvo)

```ts
import { resolve, relative } from 'node:path';

export const assertWithin = (base: string, candidate: string): string => {
  const resolved = resolve(base, candidate);
  const rel = relative(base, resolved);
  if (rel.startsWith('..') || rel === '') {
    throw new Error('path-escapes-base'); // OK em script — não cruza fronteira de domínio
  }
  return resolved;
};
```

### Pipeline tipo `cmd1 | cmd2` (stream → transform → stream)

```ts
import { createReadStream, createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { createGzip } from 'node:zlib';

await pipeline(createReadStream('app.log'), createGzip(), createWriteStream('app.log.gz'));
```

### `ErrnoException` → `Result` (substitui `set -e` + `||`)

```ts
import { readFile } from 'node:fs/promises';
import type { Result } from '#src/shared/result.ts';

type ReadJsonError = 'not-found' | 'permission-denied' | 'invalid-json' | 'io-failed';

export const readJson = async <T>(path: string): Promise<Result<T, ReadJsonError>> => {
  let raw: string;
  try {
    raw = await readFile(path, 'utf8');
  } catch (e: unknown) {
    if (e instanceof Error && 'code' in e) {
      if (e.code === 'ENOENT') return { ok: false, error: 'not-found' };
      if (e.code === 'EACCES') return { ok: false, error: 'permission-denied' };
    }
    return { ok: false, error: 'io-failed' };
  }
  try {
    return { ok: true, value: JSON.parse(raw) as T };
  } catch {
    return { ok: false, error: 'invalid-json' };
  }
};
```

> 📘 **Tabela completa de códigos errno** → [`./references/errno-to-result.md`](./references/errno-to-result.md).

---

## Workflow para reescrever um script Bash

1. **Inventário** — leia o script `.sh` linha por linha. Anote cada comando externo (`cp`, `find`, `awk`, `sed`, `jq`).
2. **Cheque substitutos nativos**:
   - Operação de FS? → [`File system.md`](../../../handbook/reference/nodejs/File system.md).
   - JSON? → `JSON.parse` (substitui `jq` simples).
   - Hash? → `node:crypto`.
   - Subprocesso real (chamar `git`, `docker`)? → `node:child_process` (`execFile`, não `exec`).
3. **Defina tipos** — flags do script como `Readonly<{...}>`, erros como string literal union.
4. **Esqueleto `main(): Promise<number>`** — toda função devolve `Result` ou número; só o `exit` final é efeito.
5. **Test-drive (opcional mas recomendado)** — Node test runner sobre as funções puras (`parseFlags`, `assertWithin`, transformações). Skip do `await main()` em CI quando ele toca FS real.
6. **Adicionar ao `package.json#scripts`** — comando legível para humanos: `pnpm run script:limpar-pipelines`.
7. **Apagar o `.sh`** — `git rm`. Sem coexistência: o script Node é a única fonte de verdade.

---

## Anti-padrões

| ❌ Errado                                                               | ✅ Certo                                                                                                      |
| :---------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------ |
| `child_process.exec('rm -rf ' + dir)`                                   | `fsPromises.rm(dir, { recursive: true, force: true })`                                                        |
| `if (existsSync(p)) { readFileSync(p); }` (TOCTOU)                      | Tentar `readFile`, capturar `ENOENT` → `Result`                                                               |
| `await readdir(p)` quando dir tem 100k entries                          | `for await (const d of opendir(p))`                                                                           |
| `writeFileSync` num script async                                        | `await writeFile(...)` — bloquear event loop em script é desperdício, mas é tolerável; o ponto é consistência |
| `path.join(a, '/', b)` ou `a + '/' + b`                                 | `path.join(a, b)`                                                                                             |
| `fs.watch(...)` sem reler arquivo no callback (eventos podem coalescer) | Após evento, `await stat` para confirmar; ler "Caveats" no `File system.md`                                   |
| `throw new Error('ENOENT')` no script                                   | `return { ok: false, error: 'not-found' }`; `throw` apenas no boundary do `main()`                            |
| `process.exit(0)` dentro de função utilitária                           | Só `main()` decide exit; utilitários devolvem `Result` ou número                                              |
| `console.log` para resultado consumível                                 | `process.stdout.write` — `console.log` adiciona newline e formatação não previsível                           |
| Escrever direto sobre `arquivo.json`                                    | `writeAtomic(path, data)` (tmp + rename)                                                                      |
| `npm exec node …` em qualquer doc/script do repo                        | `pnpm exec node …` — [ADR-0012, reiterado no CLAUDE.md](../../../CLAUDE.md)                                   |
| `any` no `catch`                                                        | `catch (e: unknown)` + narrowing `instanceof Error && 'code' in e`                                            |
| `import { Stats } from 'node:fs'` (valor)                               | `import { type Stats } from 'node:fs'` (`verbatimModuleSyntax`)                                               |

---

## Quando NÃO usar esta skill

- **Quer expor FS como dependência do domínio?** → use [`ports-and-adapters`](../ports-and-adapters/SKILL.md) e modele `FilesystemPort` (`readFile: (path) => Promise<Result<Buffer, FsError>>`). O adapter real importa `node:fs/promises`; o domínio só conhece o port. Esta skill cobre **scripts standalone**, não dependências do domínio.
- **Upload/download para storage remoto?** → [`ADR-0019`](../../../handbook/architecture/adr/0019-document-storage-s3-with-minio-dev.md) já dita S3/MinIO via `@aws-sdk/client-s3`. Não simule com FS local.
- **Subcomando da CLI de Contratos?** → [`application-cli-builder`](../application-cli-builder/SKILL.md). Esta skill é para scripts de manutenção/build/devops, não para a CLI da P.O.
- **Pipeline de testes / migrations / format-check?** → já está em `package.json#scripts`. Não duplique como `.ts` solto.

---

## Como esta skill se relaciona com outras

```
ts-domain-modeler        (modela tipos puros, sem FS)
        │
        ▼
ports-and-adapters       (FilesystemPort + adapter real para o domínio)
        │
        ▼
nodejs-fs-scripter   ◄── você está aqui (scripts de manutenção, build, devops)
        │
        ▼
application-cli-builder  (CLI da P.O., não scripts internos)
```

---

## Checklist antes de declarar pronto

- [ ] Script roda com `pnpm exec node --experimental-strip-types --no-warnings scripts/<nome>.ts` sem warning de extensão.
- [ ] Todos os imports relativos terminam em `.ts`; imports só de tipo usam `import type` ou `import { type X }`.
- [ ] Nenhum `throw` fora da função `main()` (e mesmo lá, preferir `return code`).
- [ ] Exit codes seguem sysexits.h: `0`/`1`/`64`/`65`/`66`/`74`.
- [ ] Stdout só com dados consumíveis; logs e progresso vão pro stderr.
- [ ] `path.join` em todo lugar — nenhum literal `'/'` colado em string.
- [ ] Escritas em arquivos existentes usam `writeAtomic` (tmp + rename) ou justificam o motivo de não usar.
- [ ] `tsc --noEmit` passa.
- [ ] `pnpm run format:check` e `pnpm run lint` passam.
- [ ] Se o script substituiu um `.sh`, o `.sh` foi removido (`git rm`).
- [ ] `package.json#scripts` tem entrada legível.
- [ ] Se o script roda em CI, foi testado em macOS **e** em container Linux.

---

## Changelog

- **2026-05-15:** Criação. Ancorada em `handbook/reference/nodejs/File system.md`. Pareada com `ports-and-adapters` (para casos onde o script vira port) e `application-cli-builder` (para distinguir scripts internos de CLI da P.O.).
