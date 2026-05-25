# Environment API for Frameworks

## Release Candidate Status

The Environment API is in release candidate phase. While the APIs maintain stability between major releases to allow ecosystem experimentation, some specific APIs remain experimental and may have breaking changes in future major versions.

Resources for feedback:
- [Feedback discussion](https://github.com/vitejs/vite/discussions/16358)
- [Environment API PR](https://github.com/vitejs/vite/pull/16471)

## DevEnvironment Communication Levels

Since environments may operate in different runtimes with varying constraints, the Environment API provides three communication approaches for runtime-agnostic framework code.

### RunnableDevEnvironment

This environment type enables arbitrary value communication. Non-client environments like the implicit `ssr` environment use `RunnableDevEnvironment` during development by default. It requires the same runtime as the Vite server and functions similarly to `ssrLoadModule`, enabling HMR support for SSR development.

```typescript
export class RunnableDevEnvironment extends DevEnvironment {
  public readonly runner: ModuleRunner
}

class ModuleRunner {
  public async import(url: string): Promise<Record<string, any>>
}

if (isRunnableDevEnvironment(server.environments.ssr)) {
  await server.environments.ssr.runner.import('/entry-point.js')
}
```

> **Warning:** The runner is evaluated lazily on first access. Vite enables source map support when the runner is created.

#### Example SSR Middleware Implementation

```javascript
import fs from 'node:fs'
import path from 'node:path'
import { createServer } from 'vite'

const viteServer = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  environments: {
    server: {
      // modules run in the same process as the vite server
    },
  },
})

const serverEnvironment = viteServer.environments.server

app.use('*', async (req, res, next) => {
  const url = req.originalUrl

  // 1. Read index.html
  const indexHtmlPath = path.resolve(import.meta.dirname, 'index.html')
  let template = fs.readFileSync(indexHtmlPath, 'utf-8')

  // 2. Apply Vite HTML transforms
  template = await viteServer.transformIndexHtml(url, template)

  // 3. Load the server entry
  const { render } = await serverEnvironment.runner.import(
    '/src/entry-server.js',
  )

  // 4. Render the app HTML
  const appHtml = await render(url)

  // 5. Inject the app-rendered HTML into the template
  const html = template.replace(`<!--ssr-outlet-->`, appHtml)

  // 6. Send the rendered HTML back
  res.status(200).set({ 'Content-Type': 'text/html' }).end(html)
})
```

Add HMR support in the server entry file:

```javascript
// src/entry-server.js
export function render(...) { ... }

if (import.meta.hot) {
  import.meta.hot.accept()
}
```

### FetchableDevEnvironment

This environment communicates via the Fetch API interface, recommended over `RunnableDevEnvironment` for broader runtime compatibility. It provides the `handleRequest` method for standardized request handling:

```typescript
import {
  createServer,
  createFetchableDevEnvironment,
  isFetchableDevEnvironment,
} from 'vite'

const server = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  environments: {
    custom: {
      dev: {
        createEnvironment(name, config) {
          return createFetchableDevEnvironment(name, config, {
            handleRequest(request: Request): Promise<Response> | Response {
              // handle Request and return a Response
            },
          })
        },
      },
    },
  },
})

// Any consumer can now call `dispatchFetch`
if (isFetchableDevEnvironment(server.environments.custom)) {
  const response: Response = await server.environments.custom.dispatchFetch(
    new Request('http://example.com/request-to-handle'),
  )
}
```

> **Warning:** Vite validates that requests are instances of the global `Request` class and responses are instances of the global `Response` class, throwing `TypeError` otherwise.

### Raw DevEnvironment

For environments not implementing `RunnableDevEnvironment` or `FetchableDevEnvironment`, manual communication setup is required.

#### Using Virtual Modules

If code runs in the same runtime as user modules without requiring Node.js-specific APIs, virtual modules eliminate the need to access values through Vite's APIs:

```typescript
import { createServer } from 'vite'

const server = createServer({
  plugins: [
    {
      name: 'virtual-module',
      /* plugin implementation */
    },
  ],
})
const ssrEnvironment = server.environment.ssr

if (ssrEnvironment instanceof CustomDevEnvironment) {
  ssrEnvironment.runEntrypoint('virtual:entrypoint')
} else {
  throw new Error(`Unsupported runtime for ${ssrEnvironment.name}`)
}

// virtual:entrypoint
const { createHandler } = await import('./entrypoint.js')
const handler = createHandler(input)
const response = handler(new Request('http://example.com/'))

// ./entrypoint.js
export function createHandler(input) {
  return function handler(req) {
    return new Response('hello')
  }
}
```

#### Plugin for transformIndexHtml

```typescript
function vitePluginVirtualIndexHtml(): Plugin {
  let server: ViteDevServer | undefined
  return {
    name: vitePluginVirtualIndexHtml.name,
    configureServer(server_) {
      server = server_
    },
    resolveId(source) {
      return source === 'virtual:index-html' ? '\0' + source : undefined
    },
    async load(id) {
      if (id === '\0' + 'virtual:index-html') {
        let html: string
        if (server) {
          this.addWatchFile('index.html')
          html = fs.readFileSync('index.html', 'utf-8')
          html = await server.transformIndexHtml('/', html)
        } else {
          html = fs.readFileSync('dist/client/index.html', 'utf-8')
        }
        return `export default ${JSON.stringify(html)}`
      }
      return
    },
  }
}
```

#### Using hot.send for Node.js APIs

For Node.js-dependent code, `hot.send` communicates between user modules and Vite API code. Note this approach may not work identically after build:

```typescript
// code using the Vite's APIs
import { createServer } from 'vite'

const server = createServer({
  plugins: [
    {
      name: 'virtual-module',
      /* plugin implementation */
    },
  ],
})
const ssrEnvironment = server.environment.ssr

if (ssrEnvironment instanceof RunnableDevEnvironment) {
  ssrEnvironment.runner.import('virtual:entrypoint')
} else if (ssrEnvironment instanceof CustomDevEnvironment) {
  ssrEnvironment.runEntrypoint('virtual:entrypoint')
} else {
  throw new Error(`Unsupported runtime for ${ssrEnvironment.name}`)
}

const req = new Request('http://example.com/')

const uniqueId = 'a-unique-id'
ssrEnvironment.send('request', serialize({ req, uniqueId }))
const response = await new Promise((resolve) => {
  ssrEnvironment.on('response', (data) => {
    data = deserialize(data)
    if (data.uniqueId === uniqueId) {
      resolve(data.res)
    }
  })
})

// virtual:entrypoint
const { createHandler } = await import('./entrypoint.js')
const handler = createHandler(input)

import.meta.hot.on('request', (data) => {
  const { req, uniqueId } = deserialize(data)
  const res = handler(req)
  import.meta.hot.send('response', serialize({ res: res, uniqueId }))
})

// ./entrypoint.js
export function createHandler(input) {
  return function handler(req) {
    return new Response('hello')
  }
}
```

## Environments During Build

For backward compatibility, `vite build` and `vite build --ssr` build only the client and SSR environments respectively.

When the `builder` option is defined (or using `vite build --app`), the build process creates a `ViteBuilder` instance to build all configured environments for production. By default, environments build serially respecting the `environments` record order. Configure build behavior using the `builder.buildApp` option:

```javascript
// vite.config.js
import { defineConfig } from 'vite'

export default defineConfig({
  builder: {
    buildApp: async (builder) => {
      const environments = Object.values(builder.environments)
      await Promise.all(
        environments.map((environment) => builder.build(environment)),
      )
    },
  },
})
```

Plugins can define a `buildApp` hook. Hooks with order `'pre'` and `null` execute before the configured `builder.buildApp`, while `'post'` hooks execute after. Use `environment.isBuilt` to check if an environment has completed building.

## Environment Agnostic Code

The current `environment` instance is typically available as part of the execution context, making direct access through `server.environments` rare. Inside plugin hooks, the environment is exposed as part of `PluginContext` and accessible via `this.environment`. See [Environment API for Plugins](./api-environment-plugins) for building environment-aware plugins.
