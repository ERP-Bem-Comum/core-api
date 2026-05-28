# Migration from v7

## Overview

This guide documents breaking changes when upgrading from Vite v7 to v8. The migration focuses primarily on Vite's shift to Rolldown and Oxc-based tooling.

## Default Browser Target Change

The `build.target` default value updated to align with Baseline Widely Available features as of 2026-01-01:

- Chrome: 107 → 111
- Edge: 107 → 111
- Firefox: 104 → 114
- Safari: 16.0 → 16.4

These versions represent approximately two-and-a-half-year-old releases.

## Rolldown Integration

### Gradual Migration Path

The `rolldown-vite` package provides Vite 7 with Rolldown support as an intermediate step. Update your `package.json` to migrate:

```json
{
  "devDependencies": {
    "vite": "^8.0.0"
  }
}
```

### Dependency Optimizer Now Uses Rolldown

Rolldown replaces esbuild for dependency optimization. Vite maintains backward compatibility through automatic conversion of `optimizeDeps.esbuildOptions` to `optimizeDeps.rolldownOptions`. The `esbuild` option is deprecated.

**Automatic conversions include:**
- `minify` → `output.minify`
- `treeShaking` → `treeshake`
- `define` → `transform.define`
- `loader` → `moduleTypes`
- `preserveSymlinks` → `!resolve.symlinks`
- `resolveExtensions` → `resolve.extensions`
- `mainFields` → `resolve.mainFields`
- `conditions` → `resolve.conditionNames`
- `keepNames` → `output.keepNames`
- `platform` → `platform`
- `plugins` → `plugins` (partial support)

Access converted options via the `configResolved` hook:

```js
const plugin = {
  name: 'log-config',
  configResolved(config) {
    console.log('options', config.optimizeDeps.rolldownOptions)
  },
}
```

### JavaScript Transforms by Oxc

Oxc replaces esbuild for JavaScript transformation. The `esbuild` configuration option is deprecated in favor of `oxc`.

**Automatic conversions:**
- `jsxInject` → `jsxInject`
- `include`/`exclude` → `include`/`exclude`
- `jsx: 'preserve'` → `jsx: 'preserve'`
- `jsx: 'automatic'` → `jsx: { runtime: 'automatic' }`
- `jsxImportSource` → `jsx.importSource`
- `jsx: 'transform'` → `jsx: { runtime: 'classic' }`
- `jsxFactory` → `jsx.pragma`
- `jsxFragment` → `jsx.pragmaFrag`
- `jsxDev` → `jsx.development`
- `jsxSideEffects` → `jsx.pure`
- `define` → `define`

For `banner` and `footer`, use custom plugins with transform hooks.

> **Note:** Oxc does not support the `esbuild.supported` option. See [oxc-project/oxc#15373](https://github.com/oxc-project/oxc/issues/15373).

#### Native Decorators Workaround

Oxc doesn't support lowering native decorators pending specification progress. Use Babel or SWC as a workaround.

**With Babel:**

```bash
npm install -D @rolldown/plugin-babel @babel/plugin-proposal-decorators
```

```ts
import { defineConfig } from 'vite'
import babel from '@rolldown/plugin-babel'

function decoratorPreset(options: Record<string, unknown>) {
  return {
    preset: () => ({
      plugins: [['@babel/plugin-proposal-decorators', options]],
    }),
    rolldown: {
      filter: {
        code: '@',
      },
    },
  }
}

export default defineConfig({
  plugins: [babel({ presets: [decoratorPreset({ version: '2023-11' })] })],
})
```

**With SWC:**

```bash
npm install -D @rollup/plugin-swc @swc/core
```

```js
import { defineConfig, withFilter } from 'vite'

export default defineConfig({
  plugins: [
    withFilter(
      swc({
        swc: {
          jsc: {
            parser: { decorators: true, decoratorsBeforeExport: true },
            transform: { decoratorVersion: '2023-11' },
          },
        },
      }),
      { transform: { code: '@' } },
    ),
  ],
})
```

#### esbuild Fallbacks

esbuild is now optional. If plugins use `transformWithEsbuild`, install esbuild as a devDependency. Migrate to the deprecated `transformWithOxc` function instead.

### JavaScript Minification by Oxc

Oxc Minifier handles JavaScript minification. Use deprecated `build.minify: 'esbuild'` to revert; esbuild must be installed as devDependency.

Replace `esbuild.minify*` options with `build.rolldownOptions.output.minify`. Replace `esbuild.drop` with `build.rolldownOptions.output.minify.compress.drop*` options.

Property mangling options (`mangleProps`, `reserveProps`, `mangleQuoted`, `mangleCache`) aren't supported. See [oxc-project/oxc#15375](https://github.com/oxc-project/oxc/issues/15375).

**Minifier assumption differences:**
- [esbuild minify assumptions](https://esbuild.github.io/api/#minify-considerations)
- [Oxc Minifier assumptions](https://oxc.rs/docs/guide/usage/minifier.html#assumptions)

Report minification issues in JavaScript applications.

### CSS Minification by Lightning CSS

Lightning CSS handles CSS minification by default. Use `build.cssMinify: 'esbuild'` to switch back (requires esbuild devDependency).

Lightning CSS provides better syntax lowering; CSS bundle size may increase slightly.

## Consistent CommonJS Interop

Default imports from CommonJS modules are now handled consistently. The `default` import is the `module.exports` value if:

- The importer is `.mjs` or `.mts`
- The closest `package.json` has `type: 'module'`
- The `module.exports.__esModule` is not `true`

Otherwise, the `default` import is `module.exports.default`.

**Previous behavior differences:**
- Development checks only applied to optimized dependencies
- Build logic differed based on `__esModule` and `default` property existence

This change may break existing CJS imports. Use deprecated `legacy.inconsistentCjsInterop: true` temporarily. Report affected packages to maintainers with reference to [Rolldown's bundling CJS documentation](https://rolldown.rs/in-depth/bundling-cjs#ambiguous-default-import-from-cjs-modules).

## Removed Module Resolution Using Format Sniffing

Vite no longer uses content-based heuristics when both `browser` and `module` fields exist in `package.json`. The `resolve.mainFields` option order is always respected.

Workarounds:
- Use `resolve.alias` to map to desired files
- Apply patches via `patch-package` or `pnpm patch`

## Require Calls For Externalized Modules

`require` calls for externalized modules are preserved as `require`, not converted to `import`. This preserves `require` semantics.

Use Rolldown's built-in `esmExternalRequirePlugin` (re-exported from Vite) to convert:

```js
import { defineConfig, esmExternalRequirePlugin } from 'vite'

export default defineConfig({
  plugins: [
    esmExternalRequirePlugin({
      external: ['react', 'vue', /^node:/],
    }),
  ],
})
```

See [Rolldown's `require` external modules documentation](https://rolldown.rs/in-depth/bundling-cjs#require-external-modules).

## `import.meta.url` in UMD / IIFE

`import.meta.url` is no longer polyfilled in UMD/IIFE formats; it becomes `undefined`. Restore previous behavior using `define` with `build.rolldownOptions.output.intro`. See [Rolldown's well-known `import.meta` properties documentation](https://rolldown.rs/in-depth/non-esm-output-formats#well-known-import-meta-properties).

## Removed `build.rollupOptions.watch.chokidar` Option

Migrate to `build.rolldownOptions.watch.watcher`.

## Removed Object Form `build.rollupOptions.output.manualChunks`

The object form is unsupported; the function form is deprecated. Use Rolldown's `codeSplitting` option instead. See [Rolldown's manual code splitting documentation](https://rolldown.rs/in-depth/manual-code-splitting).

## `build()` Throws `BundleError`

`build()` now throws `BundleError` (typed as `Error & { errors?: RolldownError[] }`) instead of raw errors. Access individual errors via `.errors`:

```js
try {
  await build()
} catch (e) {
  if (e.errors) {
    for (const error of e.errors) {
      console.log(error.code)
    }
  }
}
```

## Module Type Support and Auto Detection

Rolldown automatically sets module types based on file extensions. When converting content to JavaScript in `load` or `transform` hooks, add `moduleType: 'js'`:

```js
const plugin = {
  name: 'txt-loader',
  load(id) {
    if (id.endsWith('.txt')) {
      const content = fs.readFile(id, 'utf-8')
      return {
        code: `export default ${JSON.stringify(content)}`,
        moduleType: 'js',
      }
    }
  },
}
```

## Other Related Deprecations

Deprecated options for future removal:

- `build.rollupOptions` → `build.rolldownOptions`
- `worker.rollupOptions` → `worker.rolldownOptions`
- `build.commonjsOptions` (now no-op)
- `build.dynamicImportVarsOptions.warnOnError` (now no-op)
- `resolve.alias[].customResolver` → custom plugin with `resolveId` hook and `enforce: 'pre'`

## Removed Deprecated Features

- Passing a URL to `import.meta.hot.accept` is no longer supported; pass an id instead

## Advanced

Breaking changes affecting minority use cases:

- **Extglobs not supported yet** ([rolldown-vite#365](https://github.com/vitejs/rolldown-vite/issues/365))
- **TypeScript legacy namespace partially supported** – See [Oxc Transformer's namespace documentation](https://oxc.rs/docs/guide/usage/transformer/typescript.html#partial-namespace-support)
- **`define` doesn't share object references** – Each variable gets a separate copy. See [Oxc's define documentation](https://oxc.rs/docs/guide/usage/transformer/global-variable-replacement#define)
- **`bundle` object changes:**
  - Assigning to `bundle[foo]` unsupported; use `this.emitFile()`
  - References not shared across hooks ([rolldown-vite#410](https://github.com/vitejs/rolldown-vite/issues/410))
  - `structuredClone(bundle)` unsupported; use `structuredClone({ ...bundle })` ([rolldown-vite#128](https://github.com/vitejs/rolldown-vite/issues/128))
- **Parallel hooks execute sequentially** – See [Rolldown's sequential hook execution documentation](https://rolldown.rs/apis/plugin-api#sequential-hook-execution)
- **`"use strict";` not always injected** – See [Rolldown's directives documentation](https://rolldown.rs/in-depth/directives)
- **ES5 and below transformations unsupported with plugin-legacy** ([rolldown-vite#452](https://github.com/vitejs/rolldown-vite/issues/452))
- **Multiple browser versions error** – Passing the same browser with multiple versions now errors
- **Rolldown feature gaps:**
  - `build.rollupOptions.output.format: 'system'` ([rolldown#2387](https://github.com/rolldown/rolldown/issues/2387))
  - `build.rollupOptions.output.format: 'amd'` ([rolldown#2528](https://github.com/rolldown/rolldown/issues/2528))
  - `shouldTransformCachedModule` hook ([rolldown#4389](https://github.com/rolldown/rolldown/issues/4389))
  - `resolveImportMeta` hook ([rolldown#1010](https://github.com/rolldown/rolldown/issues/1010))
  - `renderDynamicImport` hook ([rolldown#4532](https://github.com/rolldown/rolldown/issues/4532))
  - `resolveFileUrl` hook
- **`parseAst` / `parseAstAsync` deprecated** – Migrate to `parseSync` / `parse` with more features
- **Comment handling changes:**
  - Comments removed before `renderChunk` hook (not after)
  - Comments other than [listed ones](https://rolldown.rs/reference/OutputOptions.comments) moved; Rollup only removes adjacent comments

## Migration from v6

Review the [Migration from v6 Guide](https://v7.vite.dev/guide/migration) in Vite v7 docs first, then apply changes above.
