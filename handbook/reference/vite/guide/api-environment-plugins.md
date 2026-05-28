# Environment API for Plugins

## Release Candidate Status

The Environment API is in release candidate phase. Vite maintains API stability between major releases to allow ecosystem experimentation, though "some specific APIs are still considered experimental." The team plans stabilization in a future major release after downstream projects validate the features.

## Accessing Current Environment in Hooks

Previously, Vite used a `ssr` boolean to identify environments. Now plugins access `this.environment` in hook contexts. This provides uniform access to environment options and instances across the plugin pipeline.

Plugins can examine environment-specific configuration:

```ts
transform(code, id) {
  console.log(this.environment.config.resolve.conditions)
}
```

## Registering New Environments

Plugins add environments via the `config` hook by returning environment definitions:

```ts
config(config: UserConfig) {
  return {
    environments: {
      rsc: {
        resolve: {
          conditions: ['react-server', ...defaultServerConditions],
        },
      },
    },
  }
}
```

An empty object registers an environment with default values.

## Environment Configuration Hook

The `configEnvironment` hook configures each environment after partial resolution:

```ts
configEnvironment(name: string, options: EnvironmentOptions) {
  if (name === 'rsc') {
    return {
      resolve: {
        conditions: ['workerd'],
      },
    }
  }
}
```

## Hot Update Hook

The `hotUpdate` hook handles custom HMR for specific environments:

```ts
interface HotUpdateOptions {
  type: 'create' | 'update' | 'delete'
  file: string
  timestamp: number
  modules: Array<EnvironmentModuleNode>
  read: () => string | Promise<string>
  server: ViteDevServer
}
```

Hooks can filter affected modules, trigger full reloads, or send custom events:

```js
hotUpdate({ modules, timestamp }) {
  if (this.environment.name !== 'client')
    return

  const invalidatedModules = new Set()
  for (const mod of modules) {
    this.environment.moduleGraph.invalidateModule(
      mod,
      invalidatedModules,
      timestamp,
      true
    )
  }
  this.environment.hot.send({ type: 'full-reload' })
  return []
}
```

## Per-Environment Plugin State

Since plugin instances are shared across environments, state should use `this.environment` as a key:

```js
function PerEnvironmentCountTransformedModulesPlugin() {
  const state = new Map<Environment, { count: number }>()
  return {
    name: 'count-transformed-modules',
    perEnvironmentStartEndDuringDev: true,
    buildStart() {
      state.set(this.environment, { count: 0 })
    },
    transform(id) {
      state.get(this.environment).count++
    },
    buildEnd() {
      console.log(this.environment.name, state.get(this.environment).count)
    }
  }
}
```

## Per-Environment Plugins

Plugins can specify which environments they apply to using `applyToEnvironment`:

```js
const UnoCssPlugin = () => {
  return {
    buildStart() {
      // init per-environment state
    },
    applyToEnvironment(environment) {
      return true // or return a new plugin instance
    },
    resolveId(id, importer) {
      // only called for applicable environments
    },
  }
}
```

Vite provides a `perEnvironmentPlugin` helper for simplified per-environment wrapping:

```js
import { nonShareablePlugin } from 'non-shareable-plugin'

export default defineConfig({
  plugins: [
    perEnvironmentPlugin('per-environment-plugin', (environment) =>
      nonShareablePlugin({ outputName: environment.name }),
    ),
  ],
})
```

## Application-Plugin Communication

The `environment.hot` API enables plugin-to-application communication for any environment supporting HMR:

```js
configureServer(server) {
  server.environments.ssr.hot.on('my:greetings', (data, client) => {
    client.send('my:foo:reply', `Hello from server! You said: ${data}`)
  })

  server.environments.ssr.hot.send('my:foo', 'Hello from server!')
}
```

Connection events (`vite:client:connect`, `vite:client:disconnect`) allow tracking application instances.

## Build-Time Environment Context

During build, plugin hooks receive the environment instance replacing the `ssr` boolean, including for hooks like `renderChunk` and `generateBundle`.

## Shared Plugins During Build

Vite 6 builds all environments in a single process. By default, separate `ResolvedConfig` instances exist per-environment for backward compatibility. Projects can opt into shared configuration via `builder.sharedConfigBuild: true`, and plugins can set `sharedDuringBuild: true` for unified state across environments.
