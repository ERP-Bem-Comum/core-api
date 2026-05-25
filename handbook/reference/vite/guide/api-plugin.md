# Plugin API

Vite plugins extend Rolldown's plugin interface with Vite-specific options, allowing you to write once and work for both dev and build.

## Authoring a Plugin

Before creating a plugin, check the [Features guide](/guide/features) to see if your need is already covered. Review community plugins in [Rollup awesome](https://github.com/rollup/awesome) and [Vite specific plugins](https://github.com/vitejs/awesome-vite#plugins).

Plugins can be inlined in `vite.config.js` without creating a separate package. Once proven useful, consider sharing it with the ecosystem.

> **Tip:** Use [vite-plugin-inspect](https://github.com/antfu/vite-plugin-inspect) for debugging plugins. Visit `localhost:5173/__inspect/` to inspect module transformations.

## Conventions

### Rolldown Compatible Plugins

If your plugin doesn't use Vite-specific hooks and works as a compatible Rolldown plugin, follow [Rolldown naming conventions](https://rolldown.rs/apis/plugin-api#conventions):

- Prefix with `rolldown-plugin-`
- Include `rolldown-plugin` and `vite-plugin` keywords in package.json

### Vite-Only Plugins

- Prefix with `vite-plugin-`
- Include `vite-plugin` keyword
- Document why it requires Vite-specific features

### Framework-Specific Plugins

- `vite-plugin-vue-` for Vue
- `vite-plugin-react-` for React
- `vite-plugin-svelte-` for Svelte

See [Virtual Modules Convention](#virtual-modules-convention) as well.

## Plugins Config

Users add plugins to `devDependencies` and configure via the `plugins` array option:

```js
import vitePlugin from 'vite-plugin-feature'
import rollupPlugin from 'rollup-plugin-feature'

export default defineConfig({
  plugins: [vitePlugin(), rollupPlugin()],
})
```

Falsy plugins are ignored, useful for conditional activation. Plugins can also accept presets containing multiple plugins, which are flattened internally:

```js
// framework-plugin
import frameworkRefresh from 'vite-plugin-framework-refresh'
import frameworkDevtools from 'vite-plugin-framework-devtools'

export default function framework(config) {
  return [frameworkRefresh(config), frameworkDevTools(config)]
}
```

```js
// vite.config.js
import { defineConfig } from 'vite'
import framework from 'vite-plugin-framework'

export default defineConfig({
  plugins: [framework()],
})
```

## Simple Examples

> **Convention:** Vite/Rolldown/Rollup plugins are typically factory functions returning the plugin object, accepting options for customization.

### Transforming Custom File Types

```js
const fileRegex = /\.(my-file-ext)$/

export default function myPlugin() {
  return {
    name: 'transform-file',

    transform: {
      filter: {
        id: fileRegex,
      },
      handler(src, id) {
        return {
          code: compileFileToJS(src),
          map: null, // provide source map if available
        }
      },
    },
  }
}
```

### Importing a Virtual File

See the [Virtual Modules Convention section](#virtual-modules-convention).

## Virtual Modules Convention

Virtual modules pass build-time information to source files using standard ESM import syntax.

```js
import { exactRegex } from '@rolldown/pluginutils'

export default function myPlugin() {
  const virtualModuleId = 'virtual:my-module'
  const resolvedVirtualModuleId = '\0' + virtualModuleId

  return {
    name: 'my-plugin', // required, will show up in warnings and errors
    resolveId: {
      filter: { id: exactRegex(virtualModuleId) },
      handler() {
        return resolvedVirtualModuleId
      },
    },
    load: {
      filter: { id: exactRegex(resolvedVirtualModuleId) },
      handler() {
        return `export const msg = "from virtual module"`
      },
    },
  }
}
```

Usage in JavaScript:

```js
import { msg } from 'virtual:my-module'

console.log(msg)
```

**Convention:** Virtual modules use the `virtual:` prefix for user-facing paths. Use the plugin name as a namespace to avoid collisions (e.g., `virtual:posts`, `virtual:posts/helpers`). Internally, prefix module IDs with `\0` when resolving—a Rollup ecosystem convention that prevents other plugins from processing the ID and ensures sourcemaps work correctly. The `\0` character gets encoded as `/@id/__x00__{id}` during dev and decoded before reaching the plugins pipeline.

> **Note:** Modules directly derived from real files (like SFC script modules in .vue/.svelte files) don't need this convention. SFCs generate submodules that map back to the filesystem, and using `\0` would break sourcemaps.

## Universal Hooks

During dev, Vite's plugin container invokes [Rolldown Build Hooks](https://rolldown.rs/apis/plugin-api#build-hooks) identically to Rolldown.

### Server Startup (Called Once)

- [`options`](https://rolldown.rs/reference/interface.plugin#options)
- [`buildStart`](https://rolldown.rs/reference/Interface.Plugin#buildstart)

### Per-Module Request

- [`resolveId`](https://rolldown.rs/reference/Interface.Plugin#resolveid)
- [`load`](https://rolldown.rs/reference/Interface.Plugin#load)
- [`transform`](https://rolldown.rs/reference/Interface.Plugin#transform)

These hooks receive an extended `options` parameter with additional Vite-specific properties. See [SSR documentation](/guide/ssr#ssr-specific-plugin-logic) for details.

Some `resolveId` calls' `importer` values may be absolute paths to `index.html` at root, since Vite's unbundled dev server pattern can't always derive the actual importer. Imports handled within Vite's resolve pipeline provide correct `importer` values.

### Server Closure

- [`buildEnd`](https://rolldown.rs/reference/Interface.Plugin#buildend)
- [`closeBundle`](https://rolldown.rs/reference/Interface.Plugin#closebundle)

> **Note:** The [`moduleParsed`](https://rolldown.rs/reference/Interface.Plugin#moduleparsed) hook is **not** called during dev (Vite avoids full AST parsing for performance). [Output Generation Hooks](https://rolldown.rs/apis/plugin-api#output-generation-hooks) (except `closeBundle`) are **not** called during dev.

## Vite Specific Hooks

Vite plugins provide hooks for Vite-specific purposes, ignored by Rollup.

### `config`

- **Type:** `(config: UserConfig, env: { mode: string, command: string }) => UserConfig | null | void`
- **Kind:** `async`, `sequential`

Modifies Vite config before resolution. Receives raw user config (CLI options merged with config file) and config env exposing `mode` and `command`. Returns a partial config object (deeply merged into existing) or directly mutates the config.

**Example:**

```js
// return partial config (recommended)
const partialConfigPlugin = () => ({
  name: 'return-partial',
  config: () => ({
    resolve: {
      alias: {
        foo: 'bar',
      },
    },
  }),
})

// mutate the config directly (use only when merging doesn't work)
const mutateConfigPlugin = () => ({
  name: 'mutate-config',
  config(config, { command }) {
    if (command === 'build') {
      config.root = 'foo'
    }
  },
})
```

> **Note:** User plugins resolve before this hook runs, so injecting plugins inside `config` has no effect.

### `configResolved`

- **Type:** `(config: ResolvedConfig) => void | Promise<void>`
- **Kind:** `async`, `parallel`

Called after Vite config resolves. Use to read and store final resolved config. Useful when plugin behavior depends on the command being run.

**Example:**

```js
const examplePlugin = () => {
  let config

  return {
    name: 'read-config',

    configResolved(resolvedConfig) {
      // store the resolved config
      config = resolvedConfig
    },

    // use stored config in other hooks
    transform(code, id) {
      if (config.command === 'serve') {
        // dev: plugin invoked by dev server
      } else {
        // build: plugin invoked by Rollup
      }
    },
  }
}
```

> **Note:** The `command` value is `serve` in dev (CLI aliases `vite`, `vite dev`, `vite serve`).

### `configureServer`

- **Type:** `(server: ViteDevServer) => (() => void) | void | Promise<(() => void) | void>`
- **Kind:** `async`, `sequential`
- **See also:** [ViteDevServer](./api-javascript#vitedevserver)

Hook for configuring the dev server. Common use case: adding custom middlewares to the internal [connect](https://github.com/senchalabs/connect) app.

```js
const myPlugin = () => ({
  name: 'configure-server',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      // custom handle request...
    })
  },
})
```

#### Injecting Post Middleware

The `configureServer` hook runs before internal middlewares install, so custom middlewares execute first by default. To inject middleware **after** internal middlewares, return a function from `configureServer`:

```js
const myPlugin = () => ({
  name: 'configure-server',
  configureServer(server) {
    // return a post hook that is called after internal middlewares are
    // installed
    return () => {
      server.middlewares.use((req, res, next) => {
        // custom handle request...
      })
    }
  },
})
```

#### Storing Server Access

Other plugin hooks may need dev server instance access (WebSocket server, file watcher, module graph). This hook stores the server instance:

```js
const myPlugin = () => {
  let server
  return {
    name: 'configure-server',
    configureServer(_server) {
      server = _server
    },
    transform(code, id) {
      if (server) {
        // use server...
      }
    },
  }
}
```

> **Note:** `configureServer` doesn't run during production builds, so other hooks must guard against its absence.

### `configurePreviewServer`

- **Type:** `(server: PreviewServer) => (() => void) | void | Promise<(() => void) | void>`
- **Kind:** `async`, `sequential`
- **See also:** [PreviewServer](./api-javascript#previewserver)

Same as [`configureServer`](/guide/api-plugin#configureserver) but for the preview server. Similarly, `configurePreviewServer` runs before other middlewares install. Return a function to inject middleware **after** internal middlewares:

```js
const myPlugin = () => ({
  name: 'configure-preview-server',
  configurePreviewServer(server) {
    // return a post hook that is called after other middlewares are
    // installed
    return () => {
      server.middlewares.use((req, res, next) => {
        // custom handle request...
      })
    }
  },
})
```

### `transformIndexHtml`

- **Type:** `IndexHtmlTransformHook | { order?: 'pre' | 'post', handler: IndexHtmlTransformHook }`
- **Kind:** `async`, `sequential`

Dedicated hook for transforming HTML entry point files like `index.html`. Receives current HTML string and transform context. Context exposes [`ViteDevServer`](./api-javascript#vitedevserver) during dev and Rollup output bundle during build.

Hook can return:

- Transformed HTML string
- Array of tag descriptor objects (`{ tag, attrs, children }`) to inject. Each tag can specify injection location (default: prepend to `<head>`)
- Object with both: `{ html, tags }`

By default `order` is `undefined` (applies after HTML transformation). Set `order: 'pre'` to apply before HTML processing. `order: 'post'` applies after all undefined-order hooks.

**Basic Example:**

```js
const htmlPlugin = () => {
  return {
    name: 'html-transform',
    transformIndexHtml(html) {
      return html.replace(
        /<title>(.*?)<\/title>/,
        `<title>Title replaced!</title>`,
      )
    },
  }
}
```

**Full Hook Signature:**

```ts
type IndexHtmlTransformHook = (
  html: string,
  ctx: {
    path: string
    filename: string
    server?: ViteDevServer
    bundle?: import('rollup').OutputBundle
    chunk?: import('rollup').OutputChunk
  },
) =>
  | IndexHtmlTransformResult
  | void
  | Promise<IndexHtmlTransformResult | void>

type IndexHtmlTransformResult =
  | string
  | HtmlTagDescriptor[]
  | {
      html: string
      tags: HtmlTagDescriptor[]
    }

interface HtmlTagDescriptor {
  tag: string
  /**
   * attribute values will be escaped automatically if needed
   */
  attrs?: Record<string, string | boolean>
  children?: string | HtmlTagDescriptor[]
  /**
   * default: 'head-prepend'
   */
  injectTo?: 'head' | 'body' | 'head-prepend' | 'body-prepend'
}
```

> **Note:** This hook won't be called with frameworks having custom entry file handling (e.g., [SvelteKit](https://github.com/sveltejs/kit/discussions/8269#discussioncomment-4509145)).

### `handleHotUpdate`

- **Type:** `(ctx: HmrContext) => Array<ModuleNode> | void | Promise<Array<ModuleNode> | void>`
- **Kind:** `async`, `sequential`
- **See also:** [HMR API](./api-hmr)

Performs custom HMR update handling. Receives context object:

```ts
interface HmrContext {
  file: string
  timestamp: number
  modules: Array<ModuleNode>
  read: () => string | Promise<string>
  server: ViteDevServer
}
```

- `modules`: Array of modules affected by the changed file. Single file may map to multiple served modules (e.g., Vue SFCs).
- `read`: Async function returning file content. Provided because file change callbacks may fire before editor finishes writing, and `fs.readFile` would return empty content. This normalizes that behavior.

Hook can:

**Filter and narrow affected modules** for more accurate HMR.

**Return empty array and perform full reload:**

```js
handleHotUpdate({ server, modules, timestamp }) {
  // Invalidate modules manually
  const invalidatedModules = new Set()
  for (const mod of modules) {
    server.moduleGraph.invalidateModule(
      mod,
      invalidatedModules,
      timestamp,
      true
    )
  }
  server.ws.send({ type: 'full-reload' })
  return []
}
```

**Return empty array and perform complete custom HMR** by sending custom events to client:

```js
handleHotUpdate({ server }) {
  server.ws.send({
    type: 'custom',
    event: 'special-update',
    data: {}
  })
  return []
}
```

Client code registers handlers using [HMR API](./api-hmr) (injected by same plugin's `transform` hook):

```js
if (import.meta.hot) {
  import.meta.hot.on('special-update', (data) => {
    // perform custom update
  })
}
```

## Plugin Context Meta

Plugin hooks accessing plugin context can use additional properties on `this.meta`:

- `this.meta.viteVersion`: Current Vite version string (e.g., `"8.0.0"`).

### Detecting Rolldown Powered Vite

[`this.meta.rolldownVersion`](https://rolldown.rs/reference/Interface.PluginContextMeta#rolldownversion) is only available for Rolldown-powered Vite (Vite 8+). Detect Rolldown:

```ts
function versionCheckPlugin(): Plugin {
  return {
    name: 'version-check',
    buildStart() {
      if (this.meta.rolldownVersion) {
        // only do something if running on a Rolldown powered Vite
      } else {
        // do something else if running on a Rollup powered Vite
      }
    },
  }
}
```

## Output Bundle Metadata

During build, Vite augments Rolldown's output objects with Vite-specific `viteMetadata` field.

Available through:

- `RenderedChunk` (in `renderChunk`, `augmentChunkHash`)
- `OutputChunk` and `OutputAsset` (in `generateBundle`, `writeBundle`)

`viteMetadata` provides:

- `viteMetadata.importedCss: Set<string>`
- `viteMetadata.importedAssets: Set<string>`

Useful for plugins inspecting emitted CSS and static assets without relying on [`build.manifest`](/config/build-options#build-manifest).

**Example:**

```ts
function outputMetadataPlugin(): Plugin {
  return {
    name: 'output-metadata-plugin',
    generateBundle(_, bundle) {
      for (const output of Object.values(bundle)) {
        const css = output.viteMetadata?.importedCss
        const assets = output.viteMetadata?.importedAssets
        if (!css?.size && !assets?.size) continue

        console.log(output.fileName, {
          css: css ? [...css] : [],
          assets: assets ? [...assets] : [],
        })
      }
    },
  }
}
```

## Plugin Ordering

Vite plugins can specify an `enforce` property (like webpack loaders) to adjust application order. Value can be `"pre"` or `"post"`. Resolved plugins order:

1. Alias
2. User plugins with `enforce: 'pre'`
3. Vite core plugins
4. User plugins without enforce value
5. Vite build plugins
6. User plugins with `enforce: 'post'`
7. Vite post build plugins (minify, manifest, reporting)

> **Note:** This is separate from hooks ordering, which remain subject to their [`order` attribute](https://rolldown.rs/reference/TypeAlias.ObjectHook#order).

## Conditional Application

By default, plugins apply to both serve and build. For conditional application, use the `apply` property:

```js
function myPlugin() {
  return {
    name: 'build-only',
    apply: 'build', // or 'serve'
  }
}
```

Use a function for precise control:

```js
apply(config, { command }) {
  // apply only on build but not for SSR
  return command === 'build' && !config.build.ssr
}
```

## Rolldown Plugin Compatibility

Many Rolldown/Rollup plugins work directly as Vite plugins (e.g., `@rollup/plugin-alias`, `@rollup/plugin-json`), but not all.

Rolldown/Rollup plugins work as Vite plugins if they:

- Don't use the [`moduleParsed`](https://rolldown.rs/reference/Interface.Plugin#moduleparsed) hook
- Don't rely on Rolldown-specific options like [`transform.inject`](https://rolldown.rs/reference/InputOptions.transform#inject)
- Don't have strong coupling between bundle-phase and output-phase hooks

For build-phase-only plugins, specify under `build.rolldownOptions.plugins`. Works the same as Vite plugin with `enforce: 'post'` and `apply: 'build'`.

Augment existing Rolldown/Rollup plugins with Vite properties:

```js
import example from 'rolldown-plugin-example'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    {
      ...example(),
      enforce: 'post',
      apply: 'build',
    },
  ],
})
```

## Path Normalization

Vite normalizes paths using POSIX separators (`/`) while preserving Windows volumes. Rollup keeps resolved paths untouched, using win32 separators (`\\`) on Windows. However, Rollup plugins use [`normalizePath` utility](https://github.com/rollup/plugins/tree/master/packages/pluginutils#normalizepath) from `@rollup/pluginutils` internally, converting separators to POSIX before comparisons. This ensures Vite-used Rollup plugins handle `include`/`exclude` patterns and path comparisons correctly.

For Vite plugins, normalize paths before comparing against resolved IDs. Vite exports equivalent `normalizePath`:

```js
import { normalizePath } from 'vite'

normalizePath('foo\\bar') // 'foo/bar'
normalizePath('foo/bar') // 'foo/bar'
```

## Filtering, include/exclude pattern

Vite exposes [`@rollup/pluginutils`'s `createFilter`](https://github.com/rollup/plugins/tree/master/packages/pluginutils#createfilter) function, encouraging standard include/exclude filtering patterns used in Vite core.

### Hook Filters

Rolldown introduced [hook filter feature](https://rolldown.rs/apis/plugin-api/hook-filters) reducing Rust-JavaScript runtime communication overhead. Plugins specify patterns determining when hooks execute, improving performance by avoiding unnecessary invocations.

Supported by Rollup 4.38.0+, Vite 6.3.0+. For backward compatibility with older versions, run filters inside hook handlers:

```js
export default function myPlugin() {
  const jsFileRegex = /\.js$/

  return {
    name: 'my-plugin',
    // Example: only call transform for .js files
    transform: {
      filter: {
        id: jsFileRegex,
      },
      handler(code, id) {
        // Additional check for backward compatibility
        if (!jsFileRegex.test(id)) return null

        return {
          code: transformCode(code),
          map: null,
        }
      },
    },
  }
}
```

> **Tip:** [`@rolldown/pluginutils`](https://www.npmjs.com/package/@rolldown/pluginutils) exports hook filter utilities like `exactRegex` and `prefixRegex`. Also re-exported from `rolldown/filter` for convenience.

## Client-server Communication

Since Vite 2.9, utilities help plugins handle client communication.

### Server to Client

Plugin side: use `server.ws.send` broadcasting events to client:

```js
export default defineConfig({
  plugins: [
    {
      // ...
      configureServer(server) {
        server.ws.on('connection', () => {
          server.ws.send('my:greetings', { msg: 'hello' })
        })
      },
    },
  ],
})
```

> **Note:** **Always prefix** event names avoiding collisions with other plugins.

Client side: use [`hot.on`](/guide/api-hmr#hot-on-event-cb) listening to events:

```ts
// client side
if (import.meta.hot) {
  import.meta.hot.on('my:greetings', (data) => {
    console.log(data.msg) // hello
  })
}
```

### Client to Server

Send client-to-server events using [`hot.send`](/guide/api-hmr#hot-send-event-payload):

```ts
// client side
if (import.meta.hot) {
  import.meta.hot.send('my:from-client', { msg: 'Hey!' })
}
```

Server side: use `server.ws.on` listening to events:

```js
export default defineConfig({
  plugins: [
    {
      // ...
      configureServer(server) {
        server.ws.on('my:from-client', (data, client) => {
          console.log('Message from client:', data.msg) // Hey!
          // reply only to the client (if needed)
          client.send('my:ack', { msg: 'Hi! I got your message!' })
        })
      },
    },
  ],
})
```

### TypeScript for Custom Events

Vite infers payload types from `CustomEventMap` interface. Type custom events by extending the interface:

> **Note:** Include the `.d.ts` extension specifying TypeScript declaration files. Typescript may not recognize module extension otherwise.

```ts
// events.d.ts
import 'vite/types/customEvent.d.ts'

declare module 'vite/types/customEvent.d.ts' {
  interface CustomEventMap {
    'custom:foo': { msg: string }
    // 'event-key': payload
  }
}
```

This interface extension is used by `InferCustomEventPayload<T>` inferring payload type for event `T`. See [HMR API Documentation](./api-hmr#hmr-api) for details.

```ts
type CustomFooPayload = InferCustomEventPayload<'custom:foo'>
import.meta.hot?.on('custom:foo', (payload) => {
  // The type of payload will be { msg: string }
})
import.meta.hot?.on('unknown:event', (payload) => {
  // The type of payload will be any
})
```
