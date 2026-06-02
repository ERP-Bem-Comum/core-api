# Node 24 + TypeScript em scripts (sem build step)

> 📖 **Fonte:** [`handbook/reference/nodejs/Modules - TypeScript.md`](../../../../handbook/reference/nodejs/Modules - TypeScript.md), [`Command-line options.md`](../../../../handbook/reference/nodejs/Command-line options.md), [`Modules - ECMAScript modules.md`](../../../../handbook/reference/nodejs/Modules - ECMAScript modules.md).

---

## Por que rodar `.ts` direto, sem `tsc`/`esbuild`?

- **Edita-roda em segundos.** Script de manutenção raramente precisa do pipeline de build.
- **Tipos no autor, JS na execução.** Node 24 com `--experimental-strip-types` **descarta** as anotações sem checar — o `tsc --noEmit` no W3 é quem valida tipo.
- **Zero artefato.** Sem `dist/`, sem `.js` versionado, sem `.map`. `git diff` mostra a verdade.

---

## Como invocar

```bash
# direto:
pnpm exec node --experimental-strip-types --no-warnings scripts/limpar.ts

# via script do package.json (preferido):
pnpm run script:limpar

# shebang (linux/macos):
chmod +x scripts/limpar.ts
./scripts/limpar.ts
```

Shebang canônico:

```ts
#!/usr/bin/env -S node --experimental-strip-types --no-warnings
```

`env -S` permite múltiplas flags no shebang — sem ele, só uma flag passa.

---

## O que `--experimental-strip-types` faz e o que NÃO faz

| ✅ Funciona                         | ❌ Não funciona                                 |
| :---------------------------------- | :---------------------------------------------- |
| `type Foo = ...`                    | `enum Foo { ... }`                              |
| `interface Bar { ... }`             | `namespace Foo { ... }`                         |
| `const x: number = 1`               | `class Foo<T> { ... }` com decorators           |
| `function f<T>(x: T): T`            | Decorators (`@Component`, etc.)                 |
| `as const`, `as unknown as X`       | `import './foo'` com extensão omitida           |
| `import { type X } from '...'`      | Sintaxe que **emite** runtime (enum, namespace) |
| `satisfies`, `using`, `await using` | TS antigo (`module=CommonJS`)                   |

Resumindo: **só sintaxe que TS apaga** funciona. Tudo que o TS transpila para runtime falha.

---

## ESM + NodeNext — regras invariantes

Do CLAUDE.md raiz:

1. **`import` relativo sempre com `.ts`**:
   ```ts
   import { writeAtomic } from './lib/fs-result.ts'; // ✅
   import { writeAtomic } from './lib/fs-result'; // ❌ Node não resolve
   ```
2. **`import type` para imports puramente de tipo** (`verbatimModuleSyntax: true`):
   ```ts
   import { type Stats } from 'node:fs'; // ✅
   import type { Stats } from 'node:fs'; // ✅
   import { Stats } from 'node:fs'; // ❌ — Stats não tem runtime
   ```
3. **Subpath imports `#src/*`** quando o script depende do domínio:

   ```ts
   import { type Result, ok, err } from '#src/shared/result.ts';
   ```

   Declaração em `package.json#imports`. Útil para scripts em `scripts/` que importam de `src/` sem `../../../`.

4. **`node:` prefix sempre** em módulos built-in:
   ```ts
   import { readFile } from 'node:fs/promises'; // ✅
   import { readFile } from 'fs/promises'; // ❌ — desencorajado
   ```

---

## tsconfig usado pelo projeto (resumo dos flags relevantes para scripts)

```json
{
  "compilerOptions": {
    "target": "ES2024",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "noEmit": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitReturns": true,
    "exactOptionalPropertyTypes": true,
    "useUnknownInCatchVariables": true,
    "isolatedModules": true
  }
}
```

Pontos que mordem em script:

- **`noUncheckedIndexedAccess`** — `argv[3]` é `string | undefined`. Sempre cheque.
- **`useUnknownInCatchVariables`** — `catch (e)` é `e: unknown`. Você narrowing antes de usar `.code`/`.message`.
- **`exactOptionalPropertyTypes`** — `{ flag?: boolean }` é diferente de `{ flag: boolean | undefined }`. Em script, prefira `boolean` com default explícito.

---

## `await` no top-level

ESM permite top-level `await`. Padrão recomendado para scripts:

```ts
const main = async (): Promise<number> => {
  /* ... */ return 0;
};

process.exit(await main());
```

Não use IIFE async — top-level `await` é a forma canônica em Node 24 ESM.

---

## Manuseio de `argv`

```ts
const args = process.argv.slice(2); // remove [node, scriptPath]
```

> Para parsing real, escreva à mão (zero dep). Se passar de ~6 flags, considere `node:util.parseArgs` (built-in, Node 18+):

```ts
import { parseArgs } from 'node:util';

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    'older-than': { type: 'string' },
    'dry-run': { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false },
  },
  allowPositionals: true,
});
```

---

## Sinal de saída (Ctrl-C, SIGTERM)

```ts
const abort = new AbortController();
const onSig = () => {
  process.stderr.write('\nInterrompido.\n');
  abort.abort();
};
process.on('SIGINT', onSig);
process.on('SIGTERM', onSig);

await cp('a', 'b', { recursive: true, signal: abort.signal });
```

Exit code para SIGINT: `130` (= `128 + 2`).

---

## Padrão de logging

```ts
const log = {
  info: (msg: string) => process.stderr.write(`${msg}\n`),
  warn: (msg: string) => process.stderr.write(`⚠ ${msg}\n`),
  err: (msg: string) => process.stderr.write(`❌ ${msg}\n`),
  data: (msg: string) => process.stdout.write(`${msg}\n`),
};
```

> `console.log` adiciona newline e formata objetos via `util.inspect` — inconsistente para script. Use `process.stdout.write` para dados, `process.stderr.write` para tudo o mais.

---

## Quando o script vira "código de verdade"

Se o script:

- Importa do domínio (`#src/modules/.../domain/...`),
- É invocado de mais de um lugar,
- Tem lógica que faria sentido testar isoladamente,

→ extraia a função pura para `src/shared/` ou `src/modules/<bc>/...` e deixe o script só fazendo o wiring (`parseFlags` → função pura → `exit`).

Se o script vira **dependência do domínio** (ex.: precisa ler arquivos a pedido de um use case), aciona [`ports-and-adapters`](../../ports-and-adapters/SKILL.md) — não importe `node:fs` direto do domínio.
