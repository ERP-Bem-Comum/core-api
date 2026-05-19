# `NodeJS.ErrnoException` → `Result<T, E>` / Exit Codes

> 📖 **Fonte:** [`handbook/reference/nodejs/Errors.md`](../../../../handbook/reference/nodejs/Errors.md) §"Class: SystemError" + [`File system.md`](../../../../handbook/reference/nodejs/File system.md) (cada função declara quais errno emite).

---

## Anatomia do erro de FS no Node

Toda operação de `node:fs/promises` que falha rejeita a Promise com um objeto que é, em runtime, um `Error` decorado com:

```ts
interface ErrnoException extends Error {
  errno?: number;     // código POSIX numérico (ex.: -2 para ENOENT em Linux)
  code?: string;      // identificador textual: 'ENOENT', 'EACCES', ...
  path?: string;      // path da operação que falhou
  syscall?: string;   // chamada do kernel ('open', 'unlink', 'rename', ...)
}
```

Com `useUnknownInCatchVariables: true`, o `catch` recebe `unknown`. Narrowing canônico:

```ts
try {
  await readFile(p);
} catch (e: unknown) {
  if (e instanceof Error && 'code' in e && typeof e.code === 'string') {
    // agora e.code é safe
  }
}
```

Helper reutilizável:

```ts
type FsErrnoError = Error & Readonly<{ code: string; path?: string; syscall?: string }>;

export const isErrnoError = (e: unknown): e is FsErrnoError =>
  e instanceof Error
  && 'code' in e
  && typeof (e as { code: unknown }).code === 'string';
```

---

## Códigos errno mais comuns em scripts

| Code | Significado | Causas típicas | Mapear para |
| :--- | :--- | :--- | :--- |
| `ENOENT` | No such file or directory | Path não existe; symlink quebrado | `'not-found'` |
| `EEXIST` | File exists | `mkdir` sem `recursive: true`; `writeFile` com `flag: 'wx'` | `'already-exists'` |
| `EACCES` | Permission denied | Falta `r`/`w`/`x` no path | `'permission-denied'` |
| `EPERM` | Operation not permitted | chown/chmod sem privilégio; arquivo bloqueado | `'operation-not-permitted'` |
| `EISDIR` | Is a directory | `unlink` num dir, `readFile` num dir | `'is-directory'` |
| `ENOTDIR` | Not a directory | Path intermediário é arquivo (`/a/b.txt/c`) | `'not-directory'` |
| `ENOTEMPTY` | Directory not empty | `rmdir` em dir não-vazio | `'directory-not-empty'` |
| `EBUSY` | Resource busy or locked | Arquivo em uso (comum em Windows) | `'resource-busy'` |
| `EMFILE` | Too many open files | Vazamento de FileHandle | `'too-many-open-files'` |
| `ENFILE` | Too many open files in system | Saturação global de FDs | `'system-fd-exhausted'` |
| `ENOSPC` | No space left on device | Disco cheio | `'no-disk-space'` |
| `EROFS` | Read-only file system | Mountpoint readonly | `'read-only-filesystem'` |
| `EXDEV` | Cross-device link | `rename` entre filesystems diferentes — use `cp` + `rm` | `'cross-device-link'` |
| `ELOOP` | Too many symbolic links | Symlink circular | `'symlink-loop'` |
| `ENAMETOOLONG` | File name too long | Path > limite do FS | `'path-too-long'` |
| `EAGAIN` / `EWOULDBLOCK` | Resource temporarily unavailable | Operação não-blocking falhou; retry | `'try-again'` |
| `EINVAL` | Invalid argument | Flag inválida, encoding inválido | `'invalid-argument'` |
| `EBADF` | Bad file descriptor | FD fechado, FH inválido | `'bad-file-descriptor'` |
| `EIO` | I/O error | Falha de hardware ou FS corrompido | `'io-failed'` |

---

## Padrão: `Result<T, E>` em wrapper de FS

```ts
import { readFile } from 'node:fs/promises';
import type { Result } from '#src/shared/result.ts';

export type ReadFileError =
  | 'not-found'
  | 'permission-denied'
  | 'is-directory'
  | 'io-failed';

export const readFileSafe = async (
  path: string,
  encoding: BufferEncoding = 'utf8',
): Promise<Result<string, ReadFileError>> => {
  try {
    const data = await readFile(path, encoding);
    return { ok: true, value: data };
  } catch (e: unknown) {
    if (!isErrnoError(e)) return { ok: false, error: 'io-failed' };
    switch (e.code) {
      case 'ENOENT': return { ok: false, error: 'not-found' };
      case 'EACCES':
      case 'EPERM':  return { ok: false, error: 'permission-denied' };
      case 'EISDIR': return { ok: false, error: 'is-directory' };
      default:       return { ok: false, error: 'io-failed' };
    }
  }
};
```

Vantagens:

- **Caller usa `if (r.ok)` / `switch (r.error)`** com exhaustive check — TS trava se errno novo aparecer no wrapper sem ser tratado.
- **Sem `throw` cruzando a fronteira do script.**
- **Mensagens humanas** ficam no caller (dicionário PT-BR), não dentro do wrapper.

---

## Padrão: errno → exit code (sysexits.h)

Para scripts standalone onde o erro é terminal:

```ts
const exitCodeFor = (code: string): number => {
  switch (code) {
    case 'ENOENT':       return 66; // EX_NOINPUT
    case 'EACCES':
    case 'EPERM':        return 77; // EX_NOPERM
    case 'EROFS':
    case 'ENOSPC':       return 73; // EX_CANTCREAT
    case 'EIO':
    case 'EBUSY':
    case 'EBADF':        return 74; // EX_IOERR
    case 'EINVAL':       return 65; // EX_DATAERR
    default:             return 1;
  }
};

try {
  await operacao();
} catch (e: unknown) {
  if (isErrnoError(e)) {
    process.stderr.write(`❌ ${e.code}: ${e.message}\n`);
    process.exit(exitCodeFor(e.code));
  }
  throw e;
}
```

Códigos sysexits.h vigentes ([referência](https://man.freebsd.org/cgi/man.cgi?query=sysexits)):

| Code | Constante | Quando |
| :--- | :--- | :--- |
| `64` | `EX_USAGE` | Flag/arg inválido |
| `65` | `EX_DATAERR` | Input mal-formado |
| `66` | `EX_NOINPUT` | Arquivo de input não existe |
| `73` | `EX_CANTCREAT` | Não conseguiu criar arquivo de saída |
| `74` | `EX_IOERR` | Erro de I/O |
| `77` | `EX_NOPERM` | Permissão negada |

---

## Anti-padrões

| ❌ Errado | ✅ Certo |
| :--- | :--- |
| `catch (e: any) { if (e.code === 'ENOENT') ... }` | `catch (e: unknown) { if (isErrnoError(e) && e.code === 'ENOENT') ... }` |
| `throw new Error('ENOENT')` para sinalizar erro de domínio | `return { ok: false, error: 'not-found' }` |
| Mapear errno para **mensagem humana** dentro do wrapper | Wrapper devolve **código** (`'not-found'`); caller traduz |
| `if (e.code === 'ENOENT') { ... } else { throw e }` re-jogando para o `main` | `switch` exaustivo cobrindo todos os errnos esperados; default vira `'io-failed'` ou re-throw consciente |
| `existsSync(p) && readFile(p)` (TOCTOU) | `readFileSafe(p)`; testa o `Result` |
| Logar `e.stack` em prod | Logar `e.code` + `e.path`; `stack` só com `--debug` |
| `try { ... } catch { /* silencia */ }` | Converter para `Result` ou re-throw — nunca engolir |
| Tratar `EAGAIN` igual a erro fatal | `EAGAIN` é "tenta de novo"; retry com backoff curto |

---

## Tabela inversa: por operação, quais errnos esperar

| Operação | errnos típicos |
| :--- | :--- |
| `open(p, 'r')` | `ENOENT`, `EACCES`, `EISDIR`, `EMFILE` |
| `open(p, 'wx')` | `EEXIST`, `EACCES`, `ENOSPC` |
| `readFile(p)` | `ENOENT`, `EACCES`, `EISDIR`, `EIO` |
| `writeFile(p, ...)` | `EACCES`, `ENOSPC`, `EROFS`, `EISDIR` |
| `unlink(p)` | `ENOENT`, `EACCES`, `EISDIR`, `EBUSY` |
| `rm(p, { recursive: true })` | `EACCES`, `EBUSY`; com `force: true` engole `ENOENT` |
| `rename(a, b)` | `ENOENT` (origem), `EXDEV` (filesystems diferentes), `EACCES`, `EBUSY` |
| `mkdir(p)` | `EEXIST`, `EACCES`, `ENOSPC`, `ENOTDIR` |
| `mkdir(p, { recursive: true })` | engole `EEXIST`; ainda emite `EACCES`, `ENOSPC` |
| `readdir(p)` | `ENOENT`, `ENOTDIR`, `EACCES` |
| `stat(p)` | `ENOENT`, `EACCES`, `ELOOP` |
| `chmod(p, m)` | `ENOENT`, `EPERM`, `EACCES` |
| `chown(p, u, g)` | `ENOENT`, `EPERM` (quase sempre exige root) |
| `symlink(t, p)` | `EEXIST`, `EACCES`, `ENOENT` |
| `realpath(p)` | `ENOENT`, `ELOOP`, `EACCES` |
| `cp(a, b, { recursive: true })` | `ENOENT`, `EACCES`, `ENOSPC`, `EEXIST` (com `force: false`) |
| `watch(p)` | `ENOENT`; **silencioso** se o arquivo some depois |

> Antes de inventar errno novo no `switch`, abra a função no [`File system.md`](../../../../handbook/reference/nodejs/File system.md) e confirme — algumas operações têm errnos específicos (ex.: `copyFile` com `COPYFILE_EXCL` emite `EEXIST`).

---

## Quando re-throw é OK

- **Errno inesperado** que indica bug no script, não no input — re-throw deixa o stack trace subir, `main()` decide loggar e exit 70 (`EX_SOFTWARE`).
- **`EIO` em CI** — provavelmente runner com problema; re-throw faz o job falhar visivelmente.
- **Dentro de `Promise.all`** quando você quer parar tudo no primeiro erro.

Re-throw **não é OK**:

- Para erros previsíveis (`ENOENT`, `EACCES`) — vira `Result`.
- Para "preguiça de mapear" — toda fronteira de função pública mapeia.
