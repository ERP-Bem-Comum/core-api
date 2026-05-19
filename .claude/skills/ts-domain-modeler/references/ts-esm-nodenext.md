# ESM, NodeNext, `import type`, `.ts` extensions

> 📖 **Fonte canônica:** [`handbook/reference/typescript/Modules.md`](../../../../../handbook/reference/typescript/Modules.md) — §ES Module Syntax (linhas 56-116), §`import type` (linhas 204-222), §esModuleInterop (linhas 329-331).

---

## 1. Stack do projeto

- **Runtime:** Node.js 24 LTS (estável Node 22+).
- **TypeScript:** 6.0 (ver [ADR-0009](../../../../../handbook/architecture/adr/0009-node-24-typescript-6-with-7-roadmap.md)).
- **Módulos:** **ESM puro** — `"type": "module"` no `package.json`.
- **Resolução:** `"module": "NodeNext"` + `"moduleResolution": "NodeNext"` no `tsconfig.json`.

Sem CommonJS, sem `require`, sem `module.exports`.

---

## 2. `tsconfig.json` mínimo recomendado

```jsonc
{
  "compilerOptions": {
    "target": "ES2024",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2024"],
    "rootDir": "./src",

    "noEmit": true,
    "allowImportingTsExtensions": true,
    "types": ["node"],

    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "useUnknownInCatchVariables": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitReturns": true,

    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,

    "isolatedModules": true,
    "verbatimModuleSyntax": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

Por que cada flag importa:

| Flag | Motivo |
| :--- | :--- |
| `module: NodeNext` | Resolução nativa de ESM do Node |
| `noEmit: true` | TS só verifica; runtime usa `--experimental-strip-types` |
| `allowImportingTsExtensions: true` | Permite `import x from './foo.ts'` |
| `verbatimModuleSyntax: true` | Força `import type` para tipos, evita "fantasma" |
| `exactOptionalPropertyTypes: true` | `foo?: string` ≠ `foo?: string \| undefined` |
| `useUnknownInCatchVariables: true` | `catch (e)` é `unknown`, não `any` |
| `noUncheckedIndexedAccess: true` | `arr[0]` é `T \| undefined`, força check |
| `strict: true` | Liga 8+ checks rigorosos |

---

## 3. Imports — sempre com `.ts`

Em ESM puro Node, **a extensão é obrigatória no import**. Como rodamos via `node --experimental-strip-types`, usamos `.ts` direto.

```ts
// ✅ Correto
import { ok, err, type Result } from './result.ts';
import { Moeda } from '../shared/moeda.ts';

// ❌ Errado — falta extensão
import { ok, err } from './result';

// ❌ Errado — extensão .js sem build
import { ok, err } from './result.js';
```

> ⚠️ Algumas IDEs adicionam imports sem extensão automaticamente. Configure a IDE para incluir `.ts`.

---

## 4. `import type` — verbatimModuleSyntax

Quando o import é **puramente de tipo**, use `import type` ou prefixe campos individuais com `type`:

```ts
// ✅ Apenas tipos — não gera nenhum import no JS de runtime
import type { Result } from './result.ts';
import type { Brand } from './brand.ts';

// ✅ Misto — só `Result` é tipo, `ok` e `err` são valores
import { ok, err, type Result } from './result.ts';

// ❌ Vai falhar em verbatimModuleSyntax: true porque Result não tem runtime
import { Result, ok, err } from './result.ts';
```

Motivação: **`verbatimModuleSyntax` força clareza sobre o que existe em runtime**. Evita "fantasmas" — imports que somem porque eram só tipo, quebrando consumidores que esperavam runtime.

---

## 5. Barrel exports (`index.ts`)

Cada pasta do domínio tem `index.ts` que reexporta a API pública:

```ts
// src/modules/contratos/domain/shared/index.ts
export type { Moeda, MoedaError } from './moeda.ts';
export { Moeda } from './moeda.ts';

export type { Periodo, PeriodoError } from './periodo.ts';
export { Periodo } from './periodo.ts';

export type { ContratoId, AditivoId, DocumentoId } from './ids.ts';
export { ContratoId, AditivoId, DocumentoId } from './ids.ts';

export type { UsuarioRef } from './usuario-ref.ts';
export { UsuarioRef } from './usuario-ref.ts';
```

```ts
// src/modules/contratos/domain/index.ts
export * from './shared/index.ts';
export * from './contrato/index.ts';
export * from './aditivo/index.ts';
```

Pontos:

- **`export type { ... }`** separado de **`export { ... }`** para satisfazer `verbatimModuleSyntax`.
- Barrels **só na fronteira do módulo**. Dentro do agregado, importe direto do arquivo.
- Não fazer barrel de barrel de barrel — torna circular dependency invisível.

---

## 6. Rodar TS direto sem build (Node 22+)

```bash
# Type check
npx tsc --noEmit

# Rodar arquivo TS direto
node --experimental-strip-types src/main.ts

# Rodar testes do node:test em arquivos .test.ts
node --test --experimental-strip-types --no-warnings 'src/**/*.test.ts'
```

`--experimental-strip-types` (Node 22.6+) remove anotações de tipo em tempo de carga. É o que permite usar `.ts` direto, sem build. Sem dependências de transpiler (esbuild, swc, tsx).

> **Trade-off:** strip-types só **remove tipos** — não transforma `enum`, `namespace`, decorators legacy. Como nosso domínio é TS funcional puro, não usamos nada disso. Para Application+Adapters (que vão usar NestJS depois), provavelmente buildaremos para `dist/`.

---

## 7. Re-exports e namespaces

Não usar `namespace` do TS — é construção CommonJS. Para agrupar funções em um VO:

```ts
// ✅ Padrão namespace-de-funções (object literal exportado)
export const Moeda = {
  fromCentavos: (...) => { ... },
  somar: (...) => { ... },
  zero: () => { ... },
};

// Em outro arquivo
import { Moeda } from './moeda.ts';
Moeda.fromCentavos(100);

// ❌ Não usar
namespace Moeda { ... }
```

Tipo `Moeda` + valor `Moeda` (object literal) podem coexistir — TS resolve por contexto.

---

## 8. Paths absolutos vs. relativos

Para Fase 1 (pequena), **usar imports relativos** (`../shared/...`). Não configurar `paths` no `tsconfig` ainda — adiciona complexidade que strip-types do Node nem suporta sem mapper externo.

Se a árvore crescer e os `../../../../` ficarem doloridos, considerar:

1. Mover utilitários para sub-pacotes via workspace pnpm.
2. Ou aceitar paths relativos profundos como sinal de que a estrutura precisa achatar.

---

## 9. Anti-padrões

| ❌ Errado | ✅ Certo |
| :--- | :--- |
| `require('./foo')` | `import { x } from './foo.ts'` |
| `module.exports = { ... }` | `export { ... }` |
| `import x from './foo'` (sem ext) | `import x from './foo.ts'` |
| `import { Type } from './foo.ts'` (tipo só) | `import type { Type } from './foo.ts'` |
| `export = X` | `export default X` ou `export { X }` |
| `import * as X` em domínio | Imports nomeados explícitos |
| `tsconfig` com `"module": "CommonJS"` | `"module": "NodeNext"` |
| `"target": "ES2015"` | `"target": "ES2024"` (Node 22+ aceita) |

---

## 10. Checklist de verificação

Antes de fechar uma sessão:

- [ ] Todos os imports terminam com `.ts`.
- [ ] `import type` usado em imports puramente de tipo.
- [ ] `tsc --noEmit` zero erros.
- [ ] `package.json` tem `"type": "module"`.
- [ ] Sem `require`, sem `module.exports`, sem `namespace`.
- [ ] Sem `enum` (usar `as const` ou string literal union).

---

## 11. Glossário

| Termo | Definição |
| :--- | :--- |
| ESM | ECMAScript Modules — padrão oficial do JS |
| CommonJS | Sistema de módulos legacy do Node (`require`) |
| NodeNext | Modo de resolução do TS que segue regras do Node moderno |
| `verbatimModuleSyntax` | Força clareza sobre imports tipo vs. valor |
| `--experimental-strip-types` | Flag do Node 22.6+ que remove tipos em runtime |
| Barrel export | `index.ts` que reexporta API pública de uma pasta |
| `isolatedModules` | Garante que cada arquivo possa ser compilado isoladamente |
