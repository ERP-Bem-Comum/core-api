# W1 — Implementação CTR-SHARED-REORG-PRIMITIVES

> Refactor puro estrutural. Zero mudança comportamental. Outcome: GREEN.

## O que mudou

### 1. Pasta criada

```bash
mkdir -p src/shared/primitives
```

### 2. Arquivos movidos

| De | Para |
| :--- | :--- |
| `src/shared/brand.ts` | `src/shared/primitives/brand.ts` |
| `src/shared/result.ts` | `src/shared/primitives/result.ts` |
| `src/shared/immutable.ts` | `src/shared/primitives/immutable.ts` |
| `src/shared/id.ts` | `src/shared/utils/id.ts` |

Comando: `mv` simples (sem `git mv` por causa do bloqueio Xcode license no shell desta sessão).

### 3. Barrel atualizado

`src/shared/index.ts` — paths internos atualizados, API pública (símbolos + tipos) intacta:

```ts
export type { Result } from './primitives/result.ts';
export { ok, err, isOk, isErr, mapErr, combine } from './primitives/result.ts';
export type { Brand, BrandOf } from './primitives/brand.ts';
export { immutable, deepImmutable } from './primitives/immutable.ts';
export { newUuid, isUuidV4 } from './utils/id.ts';
```

### 4. Imports atualizados em todo o repo

**Round 1 — subpath imports (`#src/shared/...`):** 7 atualizações manuais (6 estáticos + 1 dynamic). Encontrados via `grep -rEn "from ['\"]#src/shared/(brand|result|id|immutable)\.ts['\"]"`.

**Round 2 — imports relativos (descoberto por falha do `pnpm run pipeline:state`):** sed em batch sobre todo o repo:

```bash
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.mjs" -o -name "*.cjs" -o -name "*.js" \) \
  ! -path "./node_modules/*" ! -path "./.git/*" ! -path "./dist/*" ! -path "./.pipeline/*" \
  -exec sed -i '' -E "
    s#/shared/result\.ts#/shared/primitives/result.ts#g;
    s#/shared/brand\.ts#/shared/primitives/brand.ts#g;
    s#/shared/immutable\.ts#/shared/primitives/immutable.ts#g;
    s#/shared/id\.ts#/shared/utils/id.ts#g
  " {} +
```

Cobriu **~70 ocorrências adicionais** em `src/modules/contracts/`, `src/modules/notifications/`, `scripts/pipeline/`, `tests/`.

**Round 3 — imports relativos curtos dentro de `src/shared/kernel/`:** O sed do round 2 só matcha `/shared/X.ts` (com `/shared/` no prefixo). Mas arquivos dentro de `src/shared/kernel/` usavam `../result.ts` (curto, sem `/shared/`). 9 ocorrências em 4 arquivos:

| Arquivo | Imports afetados |
| :--- | :--- |
| `src/shared/kernel/non-zero-money.ts` | `../result.ts` |
| `src/shared/kernel/user-ref.ts` | `../result.ts`, `../id.ts`, `../brand.ts` |
| `src/shared/kernel/period.ts` | `../result.ts`, `../immutable.ts`, `../brand.ts` |
| `src/shared/kernel/money.ts` | `../result.ts`, `../immutable.ts`, `../brand.ts` |

Sed escopado:

```bash
find src/shared -type f -name "*.ts" -exec sed -i '' -E "
  s#from '\\.\\./result\\.ts'#from '../primitives/result.ts'#g;
  s#from '\\.\\./brand\\.ts'#from '../primitives/brand.ts'#g;
  s#from '\\.\\./immutable\\.ts'#from '../primitives/immutable.ts'#g;
  s#from '\\.\\./id\\.ts'#from '../utils/id.ts'#g
" {} +
```

## Validação

### `pnpm run pipeline:state` (smoke test do próprio toolchain)

Antes do round 2: `ERR_MODULE_NOT_FOUND` — script tentava importar `src/shared/result.ts` inexistente.
Depois: comando volta a funcionar (`init` testado com sucesso na criação retroativa deste próprio ticket).

### `pnpm run typecheck`

Reporta **apenas erros pré-existentes do ticket `CTR-STORAGE-S3-ADAPTER` em W0 RED esperado**:

```
tests/modules/contracts/adapters/storage/s3-config-aws.test.ts(27,8): error TS2307
tests/modules/contracts/adapters/storage/s3-error-mapper.test.ts(27,28): error TS2307
tests/modules/contracts/adapters/storage/s3.integration.test.ts(34,8): error TS2307: Cannot find module '@aws-sdk/client-s3'
tests/modules/contracts/adapters/storage/s3.integration.test.ts(36,41): error TS2307: Cannot find module '#src/modules/contracts/adapters/storage/document-storage.s3.ts'
... (5 erros adicionais no mesmo arquivo, todos do RED esperado)
```

**Zero erro novo introduzido por este ticket.**

### Tests dos arquivos movidos

```bash
node --test --experimental-strip-types --no-warnings \
  tests/shared/brand.test.ts \
  tests/shared/immutable.test.ts \
  tests/shared/result.test.ts
# ℹ tests 55 / pass 55 / fail 0 / duration_ms 84.49
```

GREEN.

## Estrutura final

```
src/shared/
├── primitives/             ← NOVO
│   ├── brand.ts
│   ├── immutable.ts
│   └── result.ts
├── utils/
│   ├── date.ts             (intacto)
│   ├── id.ts               ← MOVIDO da raiz
│   └── string.ts           (intacto)
├── adapters/               (intacto)
├── kernel/                 (4 arquivos com imports atualizados)
├── ports/                  (intacto)
└── index.ts                ← paths atualizados, API pública igual
```

## Outcome

GREEN — todos os CAs atendidos. Refactor estrutural completo sem mudança comportamental, barrel mantém API pública, suite shared/ verde, typecheck só com RED pré-existente esperado do CTR-STORAGE-S3-ADAPTER.
