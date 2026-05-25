# Server-Side Rendering (SSR)

SSR specifically refers to front-end frameworks (React, Preact, Vue, Svelte) that support running the same application in Node.js, pre-rendering it to HTML, and hydrating it on the client.

> This is a low-level API meant for library and framework authors.

If your goal is creating an application, check the higher-level SSR plugins at [Awesome Vite SSR section](https://github.com/vitejs/awesome-vite#ssr) first. Vite is working on an improved SSR API with the [Environment API](https://github.com/vitejs/vite/discussions/16358).

## Example Projects

Vite provides built-in SSR support. [`create-vite-extra`](https://github.com/bluwy/create-vite-extra) contains example SSR setups:

- [Vanilla](https://github.com/bluwy/create-vite-extra/tree/master/template-ssr-vanilla)
- [Vue](https://github.com/bluwy/create-vite-extra/tree/master/template-ssr-vue)
- [React](https://github.com/bluwy/create-vite-extra/tree/master/template-ssr-react)
- [Preact](https://github.com/bluwy/create-vite-extra/tree/master/template-ssr-preact)
- [Svelte](https://github.com/bluwy/create-vite-extra/tree/master/template-ssr-svelte)
- [Solid](https://github.com/bluwy/create-vite-extra/tree/master/template-ssr-solid)

## Source Structure

A typical SSR application has this source file structure:

```
- index.html
- server.js # main application server
- src/
  - main.js          # exports env-agnostic (universal) app code
  - entry-client.js  # mounts the app to a DOM element
  - entry-server.js  # renders the app using the framework's SSR API
```

The `index.html` should reference `entry-client.js` and include a placeholder for server-rendered markup:

```html
<div id="app"><!--ssr-outlet--></div>
<script type="module" src="/src/entry-client.js"></script>
```

You can use any placeholder instead of `<!--ssr-outlet-->`, as long as it can be precisely replaced.

## Conditional Logic

Perform conditional logic based on SSR vs. client:

```js
if (import.meta.env.SSR) {
  // ... server only logic
}
```

This is statically replaced during build, enabling tree-shaking of unused branches.

## Setting Up the Dev Server

For SSR apps, use Vite in middleware mode with full server control. Example with [express](https://expressjs.com/):

```js
import fs from 'node:fs'
import path from 'node:path'
import express from 'express'
import { createServer as createViteServer } from 'vite'

async function createServer() {
  const app = express()

  // Create Vite server in middleware mode and configure the app type as
  // 'custom', disabling Vite's own HTML serving logic so parent server
  // can take control
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'custom'
  })

  // Use vite's connect instance as middleware. If you use your own
  // express router (express.Router()), you should use router.use
  // When the server restarts (for example after the user modifies
  // vite.config.js), `vite.middlewares` is still going to be the same
  // reference (with a new internal stack of Vite and plugin-injected
  // middlewares). The following is valid even after restarts.
  app.use(vite.middlewares)

  app.use('*all', async (req, res) => {
    // serve index.html - we will tackle this next
  })

  app.listen(5173)
}

createServer()
```

Here `vite` is an instance of [ViteDevServer](/guide/api-javascript#vitedevserver). `vite.middlewares` is a [Connect](https://github.com/senchalabs/connect) instance usable as middleware in any connect-compatible Node.js framework.

Implement the `*` handler to serve server-rendered HTML:

```js
app.use('*all', async (req, res, next) => {
  const url = req.originalUrl

  try {
    // 1. Read index.html
    let template = fs.readFileSync(
      path.resolve(import.meta.dirname, 'index.html'),
      'utf-8',
    )

    // 2. Apply Vite HTML transforms. This injects the Vite HMR client,
    //    and also applies HTML transforms from Vite plugins, e.g. global
    //    preambles from @vitejs/plugin-react
    template = await vite.transformIndexHtml(url, template)

    // 3. Load the server entry. ssrLoadModule automatically transforms
    //    ESM source code to be usable in Node.js! There is no bundling
    //    required, and provides efficient invalidation similar to HMR.
    const { render } = await vite.ssrLoadModule('/src/entry-server.js')

    // 4. render the app HTML. This assumes entry-server.js's exported
    //     `render` function calls appropriate framework SSR APIs,
    //    e.g. ReactDOMServer.renderToString()
    const appHtml = await render(url)

    // 5. Inject the app-rendered HTML into the template.
    const html = template.replace(`<!--ssr-outlet-->`, () => appHtml)

    // 6. Send the rendered HTML back.
    res.status(200).set({ 'Content-Type': 'text/html' }).end(html)
  } catch (e) {
    // If an error is caught, let Vite fix the stack trace so it maps back
    // to your actual source code.
    vite.ssrFixStacktrace(e)
    next(e)
  }
})
```

Update the `dev` script in `package.json`:

```json
{
  "scripts": {
    "dev": "node server"
  }
}
```

## Building for Production

To ship an SSR project for production:

1. Produce a client build as normal
2. Produce an SSR build, directly loadable via `import()` without using Vite's `ssrLoadModule`

Scripts in `package.json`:

```json
{
  "scripts": {
    "dev": "node server",
    "build:client": "vite build --outDir dist/client",
    "build:server": "vite build --outDir dist/server --ssr src/entry-server.js"
  }
}
```

The `--ssr` flag indicates this is an SSR build and specifies the SSR entry point.

In `server.js`, add production-specific logic by checking `process.env.NODE_ENV`:

- Instead of reading root `index.html`, use `dist/client/index.html` as the template (contains correct asset links)
- Instead of `await vite.ssrLoadModule('/src/entry-server.js')`, use `import('./dist/server/entry-server.js')`
- Move Vite dev server creation and usage behind dev-only conditionals; add static file serving for `dist/client`

Refer to [example projects](#example-projects) for a working setup.

## Generating Preload Directives

Use the `--ssrManifest` flag to generate `.vite/ssr-manifest.json`:

```json
{
  "scripts": {
    "build:client": "vite build --outDir dist/client --ssrManifest"
  }
}
```

This generates `dist/client/.vite/ssr-manifest.json` containing mappings of module IDs to chunks and assets.

`@vitejs/plugin-vue` supports this out of the box, automatically registering used component module IDs on the Vue SSR context:

```js
const ctx = {}
const html = await vueServerRenderer.renderToString(app, ctx)
// ctx.modules is now a Set of module IDs that were used during the render
```

In production `server.js`, read and pass the manifest to the render function. This enables rendering preload directives for async route files and supports [103 Early Hints](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/103).

## Pre-Rendering / SSG

If routes and required data are known ahead of time, pre-render them to static HTML using production SSR logic. This is Static-Site Generation (SSG). See [demo pre-render script](https://github.com/vitejs/vite-plugin-vue/blob/main/playground/ssr-vue/prerender.js).

## SSR Externals

Dependencies are "externalized" from Vite's SSR transform module system by default, speeding up dev and build.

If a dependency needs transformation by Vite's pipeline (using Vite features untranspiled), add it to [`ssr.noExternal`](/config/ssr-options#ssr-noexternal).

Linked dependencies are not externalized by default to use Vite's HMR. To test as non-linked, add to [`ssr.external`](/config/ssr-options#ssr-external).

### Working with Aliases

Configured aliases redirecting one package to another may need aliasing actual `node_modules` packages for SSR externalized dependencies. Both [Yarn](https://classic.yarnpkg.com/en/docs/cli/add/#toc-yarn-add-alias) and [pnpm](https://pnpm.io/aliases/) support aliasing via the `npm:` prefix.

## SSR-specific Plugin Logic

Frameworks like Vue or Svelte compile components into different formats for client vs. SSR. Vite passes an `ssr` property in the `options` object of these plugin hooks:

- `resolveId`
- `load`
- `transform`

**Example:**

```js
export function mySSRPlugin() {
  return {
    name: 'my-ssr',
    transform(code, id, options) {
      if (options?.ssr) {
        // perform ssr-specific transform...
      }
    },
  }
}
```

The options object in `load` and `transform` is optional; Rollup doesn't currently use it but may extend these hooks with metadata in the future.

Before Vite 2.7, this was informed via positional `ssr` param instead of the options object. Major frameworks and plugins are updated, but older posts may reference the previous API.

## SSR Target

The default SSR build target is Node.js, but you can run the server in a Web Worker. Package entry resolution differs per platform. Configure the target as Web Worker using `ssr.target` set to `'webworker'`.

## SSR Bundle

For runtimes like `webworker`, bundle SSR builds into a single JavaScript file by setting `ssr.noExternal` to `true`. This:

- Treats all dependencies as `noExternal`
- Throws an error if any Node.js built-ins are imported

## SSR Resolve Conditions

By default, package entry resolution uses conditions set in [`resolve.conditions`](/config/shared-options#resolve-conditions) for SSR builds. Customize with [`ssr.resolve.conditions`](/config/ssr-options#ssr-resolve-conditions) and [`ssr.resolve.externalConditions`](/config/ssr-options#ssr-resolve-externalconditions).

## Vite CLI

Commands `$ vite dev` and `$ vite preview` can be used for SSR apps. Add SSR middlewares to the dev server with [`configureServer`](/guide/api-plugin#configureserver) and to the preview server with [`configurePreviewServer`](/guide/api-plugin#configurepreviewserver).

Use a post hook so SSR middleware runs _after_ Vite's middlewares.
