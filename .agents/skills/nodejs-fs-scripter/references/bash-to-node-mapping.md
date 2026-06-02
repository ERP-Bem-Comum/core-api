# Bash → Node — Catálogo de Operações

> 📖 **Fonte canônica:** [`handbook/reference/nodejs/File system.md`](../../../../handbook/reference/nodejs/File system.md) (Node 24 oficial). Esta página é índice operacional — sempre que o nome de uma API aparecer aqui, vá para o doc oficial para signature e edge-cases atualizados.

Convenção dos exemplos:

```ts
import {} from /* ... */ 'node:fs/promises';
import {} from /* ... */ 'node:path';
import {} from /* ... */ 'node:process';
import {} from /* ... */ 'node:os';
import {} from /* ... */ 'node:crypto';
```

---

## Leitura de arquivos

### `cat arquivo`

```ts
import { readFile } from 'node:fs/promises';
const conteudo = await readFile('arquivo.txt', 'utf8');
```

> Para arquivos grandes (>64MB), prefira `createReadStream` — `readFile` carrega tudo na memória.

### `cat a b c > out`

```ts
import { createReadStream, createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';

const out = createWriteStream('out.txt');
for (const f of ['a', 'b', 'c']) {
  await pipeline(createReadStream(f), out, { end: false });
}
out.end();
```

### `head -n 10 arquivo`

```ts
import { open } from 'node:fs/promises';
const fh = await open('arquivo.txt', 'r');
const linhas: string[] = [];
for await (const linha of fh.readLines()) {
  linhas.push(linha);
  if (linhas.length === 10) break;
}
await fh.close();
```

### `tail -c 1024 arquivo` (últimos 1024 bytes)

```ts
import { open } from 'node:fs/promises';
const fh = await open('arquivo.txt', 'r');
const { size } = await fh.stat();
const buf = Buffer.alloc(Math.min(1024, size));
await fh.read(buf, 0, buf.length, Math.max(0, size - buf.length));
await fh.close();
```

### `tail -f arquivo`

⚠️ `fs.watch` tem **caveats sérios** (eventos coalescentes, comportamento por SO). Padrão robusto:

```ts
import { watch, stat } from 'node:fs/promises';

let cursor = (await stat('app.log')).size;
const w = watch('app.log');
for await (const _ of w) {
  const { size } = await stat('app.log');
  if (size > cursor) {
    // ler de cursor..size com createReadStream({ start: cursor, end: size - 1 })
    cursor = size;
  } else if (size < cursor) {
    // arquivo rotacionou
    cursor = 0;
  }
}
```

---

## Escrita

### `echo "x" > a`

```ts
import { writeFile } from 'node:fs/promises';
await writeFile('a', 'x\n');
```

### `echo "x" >> a`

```ts
import { appendFile } from 'node:fs/promises';
await appendFile('a', 'x\n');
```

### `cat <<'EOF' > a` (heredoc)

```ts
import { writeFile } from 'node:fs/promises';
await writeFile(
  'a',
  `linha 1
linha 2
linha 3
`,
);
```

### Atomic write (substitui qualquer `> arquivo` sensível)

```ts
import { rename, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

const writeAtomic = async (path: string, data: string | Uint8Array): Promise<void> => {
  const tmp = `${path}.${randomUUID()}.tmp`;
  await writeFile(tmp, data);
  await rename(tmp, path);
};
```

---

## Listagem

### `ls dir/`

```ts
import { readdir } from 'node:fs/promises';
const nomes = await readdir('dir');
```

### `ls -la dir/`

```ts
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

const entries = await readdir('dir', { withFileTypes: true });
for (const e of entries) {
  const full = join('dir', e.name);
  const s = await stat(full);
  // s.size, s.mtime, s.mode, e.isDirectory(), e.isSymbolicLink()
}
```

### `ls -R dir/` (recursivo)

```ts
import { readdir } from 'node:fs/promises';
const tudo = await readdir('dir', { recursive: true, withFileTypes: true });
```

### Listagem de dir grande (>10k arquivos)

```ts
import { opendir } from 'node:fs/promises';
for await (const entry of await opendir('dir-grande')) {
  // streaming — não carrega array inteiro
}
```

---

## Cópia / movimentação / remoção

### `cp a b`

```ts
import { copyFile, constants } from 'node:fs/promises';
await copyFile('a', 'b');
// Para falhar se destino existir:
await copyFile('a', 'b', constants.COPYFILE_EXCL);
```

### `cp -r a/ b/`

```ts
import { cp } from 'node:fs/promises';
await cp('a', 'b', { recursive: true });
// Preservar timestamps e hardlinks:
await cp('a', 'b', { recursive: true, preserveTimestamps: true });
// Não sobrescrever:
await cp('a', 'b', { recursive: true, force: false, errorOnExist: true });
```

### `mv a b`

```ts
import { rename } from 'node:fs/promises';
await rename('a', 'b'); // só funciona no MESMO filesystem
```

Cross-filesystem (`/tmp` → `/home`):

```ts
import { cp, rm } from 'node:fs/promises';
await cp('a', 'b', { recursive: true });
await rm('a', { recursive: true, force: true });
```

### `rm a`

```ts
import { unlink } from 'node:fs/promises';
await unlink('a');
```

### `rm -rf dir/`

```ts
import { rm } from 'node:fs/promises';
await rm('dir', { recursive: true, force: true });
```

> `force: true` é equivalente ao `-f` — **suprime erro se o path não existe**. Sem ele, `ENOENT` propaga.

### `rmdir dir/` (apenas se vazio)

```ts
import { rmdir } from 'node:fs/promises';
await rmdir('dir');
```

---

## Diretórios

### `mkdir dir`

```ts
import { mkdir } from 'node:fs/promises';
await mkdir('dir');
```

### `mkdir -p a/b/c`

```ts
import { mkdir } from 'node:fs/promises';
await mkdir('a/b/c', { recursive: true });
```

### `mktemp -d`

```ts
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = await mkdtemp(join(tmpdir(), 'pref-'));
// ... usar dir ...
// limpar no final manualmente
```

### `mktemp -d` com cleanup automático (`trap … EXIT`)

```ts
import { mkdtempDisposable } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

{
  await using temp = await mkdtempDisposable(join(tmpdir(), 'pref-'));
  // ... usar temp.path ...
} // cleanup automático ao sair do escopo
```

---

## Permissões / propriedade

### `chmod 644 a`

```ts
import { chmod } from 'node:fs/promises';
await chmod('a', 0o644);
```

### `chmod +x script.sh`

```ts
await chmod('script.sh', 0o755);
```

### `chown user:group a` _(requer root em geral)_

```ts
import { chown } from 'node:fs/promises';
await chown('a', uid, gid);
```

---

## Testes / metadata

### `[ -f arquivo ]` / `[ -e arquivo ]` / `[ -d dir ]`

⚠️ **Não use `existsSync` antes de abrir um arquivo** (TOCTOU). Padrão correto: tente abrir e capture `ENOENT`.

Para _script_ que só precisa testar:

```ts
import { stat } from 'node:fs/promises';

const exists = async (p: string): Promise<boolean> => {
  try {
    await stat(p);
    return true;
  } catch (e: unknown) {
    if (e instanceof Error && 'code' in e && e.code === 'ENOENT') return false;
    throw e;
  }
};

const isDir = async (p: string): Promise<boolean> => {
  try {
    return (await stat(p)).isDirectory();
  } catch {
    return false;
  }
};
```

### `stat -c %s a` (tamanho)

```ts
import { stat } from 'node:fs/promises';
const { size } = await stat('a');
```

### `stat -c %Y a` (mtime unix)

```ts
const mtimeSec = Math.floor((await stat('a')).mtime.getTime() / 1000);
```

---

## Symlinks / paths

### `ln -s alvo nome`

```ts
import { symlink } from 'node:fs/promises';
await symlink('alvo', 'nome'); // alvo pode ser relativo
```

### `ln a b` (hard link)

```ts
import { link } from 'node:fs/promises';
await link('a', 'b');
```

### `readlink nome`

```ts
import { readlink } from 'node:fs/promises';
const alvo = await readlink('nome');
```

### `realpath a`

```ts
import { realpath } from 'node:fs/promises';
const abs = await realpath('a');
```

---

## Busca

### `find . -name '*.ts'`

```ts
import { glob } from 'node:fs/promises';
for await (const f of glob('**/*.ts')) {
  // ...
}
```

### `find . -name '*.ts' -not -path '*/node_modules/*'`

```ts
for await (const f of glob('**/*.ts', { exclude: ['**/node_modules/**'] })) {
  // ...
}
```

### `find . -type d -name 'CTR-*'`

```ts
for await (const d of glob('**/CTR-*', { withFileTypes: true })) {
  if (d.isDirectory()) {
    // ...
  }
}
```

### `find . -mtime +30 -delete`

`glob` não filtra por mtime — combine:

```ts
import { glob, rm, stat } from 'node:fs/promises';

const limiteMs = 30 * 24 * 60 * 60 * 1000;
const agora = Date.now();
for await (const f of glob('**/*')) {
  const s = await stat(f);
  if (agora - s.mtime.getTime() > limiteMs) {
    await rm(f, { recursive: true, force: true });
  }
}
```

---

## Hash / checksum

> Não é `fs/promises`, mas substitui `md5sum`/`sha256sum`.

### `sha256sum arquivo`

```ts
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const hash = createHash('sha256')
  .update(await readFile('arquivo'))
  .digest('hex');
```

### Hash de arquivo grande (streaming)

```ts
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';

const h = createHash('sha256');
await pipeline(createReadStream('arquivo'), h);
const hex = h.digest('hex');
```

---

## Compressão

### `gzip arquivo`

```ts
import { createReadStream, createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { createGzip } from 'node:zlib';

await pipeline(createReadStream('arquivo'), createGzip(), createWriteStream('arquivo.gz'));
```

### `gunzip arquivo.gz`

```ts
import { createGunzip } from 'node:zlib';

await pipeline(createReadStream('arquivo.gz'), createGunzip(), createWriteStream('arquivo'));
```

---

## Variáveis de ambiente / cwd

| Bash             | Node                                                                                                               |
| :--------------- | :----------------------------------------------------------------------------------------------------------------- |
| `pwd`            | `process.cwd()`                                                                                                    |
| `cd dir; ...`    | passe `cwd` para `child_process` ou use `path.resolve(dir, ...)`. **Evite** mudar `process.chdir` em script async. |
| `$HOME`          | `os.homedir()` ou `process.env.HOME`                                                                               |
| `$TMPDIR`        | `os.tmpdir()`                                                                                                      |
| `$PATH`          | `process.env.PATH` (split por `path.delimiter`)                                                                    |
| `export FOO=bar` | `process.env.FOO = 'bar'` (afeta apenas o processo Node)                                                           |

---

## Pipes / redirecionamento

### `cmd1 | cmd2 | cmd3`

```ts
import { pipeline } from 'node:stream/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import { Transform } from 'node:stream';

const upper = new Transform({
  transform(chunk, _enc, cb) {
    cb(null, chunk.toString().toUpperCase());
  },
});

await pipeline(createReadStream('in.txt'), upper, createWriteStream('out.txt'));
```

### `cmd 2>&1`

`spawn` / `execFile` controlam stdio. Para combinar stdout/stderr:

```ts
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const { stdout, stderr } = await run('git', ['status']);
// combine como preferir
```

---

## Caveats que você não vai descobrir lendo a tabela acima

1. **`fs.watch` coalesce eventos** — não suponha 1 evento por mudança. Sempre re-`stat` no callback. Ver `File system.md` §`fs.watch` → "Caveats".
2. **`rename` entre filesystems falha** com `EXDEV`. Fallback: `cp` + `rm`.
3. **`readdir(p, { recursive: true })`** retorna paths **relativos a `p`**, não absolutos. Use `join(p, entry)`.
4. **`writeFile` com `flag: 'wx'`** falha se o arquivo existe — útil para criar lockfile.
5. **Em macOS, `fs.watch` não recursive** sem `{ recursive: true }`. Em Linux, **recursive** só em algumas versões.
6. **`copyFile` não preserva timestamps por padrão.** Use `cp(..., { preserveTimestamps: true })`.
7. **`rm` com `force: true`** suprime `ENOENT` mas **não** `EACCES` ou `EBUSY` — esses propagam.
8. **`AbortSignal`** em operações longas (`cp`, `readFile`, `writeFile`, `glob`) — passe `{ signal: AbortSignal.timeout(30_000) }`.

---

## Referência cruzada por capítulo do `File system.md`

| Operação                                    | Onde está no doc oficial                         |
| :------------------------------------------ | :----------------------------------------------- |
| Promise APIs                                | §"Promises API"                                  |
| `FileHandle.readLines` / `readv` / `writev` | §"Class: `FileHandle`"                           |
| `glob` async                                | §`fsPromises.glob`                               |
| `cp` recursivo + opções                     | §`fsPromises.cp`                                 |
| `rm -rf`                                    | §`fsPromises.rm`                                 |
| `mkdtempDisposable` (Symbol.asyncDispose)   | §`fsPromises.mkdtempDisposable`                  |
| `opendir` + async iterator                  | §`fsPromises.opendir` + §"Class: `fs.Dir`"       |
| `Dirent` (isFile, isDirectory, parentPath)  | §"Class: `fs.Dirent`"                            |
| `watch` + caveats                           | §`fsPromises.watch` + §`fs.watch` "Caveats"      |
| File modes                                  | §"File modes" (depois de `fs.chmod`)             |
| Stream APIs                                 | §`fs.createReadStream` / §`fs.createWriteStream` |
