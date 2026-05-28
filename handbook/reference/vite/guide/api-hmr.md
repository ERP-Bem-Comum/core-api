# HMR API

## Note

This documentation covers the client-side HMR API. For plugin-based HMR update handling, refer to [handleHotUpdate](./api-plugin#handlehotupdate).

The manual HMR API is intended primarily for framework and tooling creators. Most end users benefit from HMR through framework-specific starter templates.

Vite exposes its manual HMR API through the special `import.meta.hot` object:

```ts
interface ImportMeta {
  readonly hot?: ViteHotContext
}

interface ViteHotContext {
  readonly data: any

  accept(): void
  accept(cb: (mod: ModuleNamespace | undefined) => void): void
  accept(dep: string, cb: (mod: ModuleNamespace | undefined) => void): void
  accept(
    deps: readonly string[],
    cb: (mods: Array<ModuleNamespace | undefined>) => void,
  ): void

  dispose(cb: (data: any) => void): void
  prune(cb: (data: any) => void): void
  invalidate(message?: string): void

  on<T extends CustomEventName>(
    event: T,
    cb: (payload: InferCustomEventPayload<T>) => void,
  ): void
  off<T extends CustomEventName>(
    event: T,
    cb: (payload: InferCustomEventPayload<T>) => void,
  ): void
  send<T extends CustomEventName>(
    event: T,
    data?: InferCustomEventPayload<T>,
  ): void
}
```

## Required Conditional Guard

Always guard HMR API usage with a conditional block to enable tree-shaking in production:

```js
if (import.meta.hot) {
  // HMR code
}
```

## IntelliSense for TypeScript

Vite provides type definitions for `import.meta.hot` in `vite/client.d.ts`. Add "vite/client" to your `tsconfig.json` types:

```json
{
  "compilerOptions": {
    "types": ["vite/client"]
  }
}
```

## `hot.accept(cb)`

For a module to self-accept updates, use `import.meta.hot.accept` with a callback receiving the updated module:

```js
export const count = 1

if (import.meta.hot) {
  import.meta.hot.accept((newModule) => {
    if (newModule) {
      // newModule is undefined when SyntaxError happened
      console.log('updated: count is now ', newModule.count)
    }
  })
}
```

A module that "accepts" hot updates is considered an **HMR boundary**.

Vite's HMR does not swap the originally imported module: if an HMR boundary module re-exports imports from a dependency, it is responsible for updating those re-exports (using `let`). Importers up the chain from the boundary module will not be notified of the change. This simplified implementation is sufficient for most dev use cases while avoiding expensive proxy module generation.

Vite requires the call to appear as `import.meta.hot.accept(` (whitespace-sensitive) in source code for HMR support. This is a requirement of Vite's static analysis.

## `hot.accept(deps, cb)`

A module can accept updates from direct dependencies without reloading itself:

```js
import { foo } from './foo.js'

foo()

if (import.meta.hot) {
  import.meta.hot.accept('./foo.js', (newFoo) => {
    // the callback receives the updated './foo.js' module
    newFoo?.foo()
  })

  // Can also accept an array of dep modules:
  import.meta.hot.accept(
    ['./foo.js', './bar.js'],
    ([newFooModule, newBarModule]) => {
      // The callback receives an array where only the updated module is
      // non null. If the update was not successful (syntax error for ex.),
      // the array is empty
    },
  )
}
```

## `hot.dispose(cb)`

A self-accepting module or one expected to be accepted by others can use `hot.dispose` to clean up persistent side effects created by its updated copy:

```js
function setupSideEffect() {}

setupSideEffect()

if (import.meta.hot) {
  import.meta.hot.dispose((data) => {
    // cleanup side effect
  })
}
```

## `hot.prune(cb)`

Register a callback that executes when the module is no longer imported on the page. Compared to `hot.dispose`, use this when source code cleans up side-effects during updates and you only need cleanup when removed from the page. Vite uses this for `.css` imports.

```js
function setupOrReuseSideEffect() {}

setupOrReuseSideEffect()

if (import.meta.hot) {
  import.meta.hot.prune((data) => {
    // cleanup side effect
  })
}
```

## `hot.data`

The `import.meta.hot.data` object persists across instances of the same updated module. Use it to pass information from a previous module version to the next.

Re-assignment of `data` itself is not supported. Instead, mutate properties of the `data` object to preserve information added by other handlers:

```js
// ok
import.meta.hot.data.someValue = 'hello'

// not supported
import.meta.hot.data = { someValue: 'hello' }
```

## `hot.decline()`

Currently a noop for backward compatibility. This could change in future versions. Use `hot.invalidate()` to indicate the module is not hot-updatable.

## `hot.invalidate(message?: string)`

A self-accepting module may determine at runtime that it cannot handle a HMR update, requiring forceful propagation to importers. Call `import.meta.hot.invalidate()` to invalidate the importers of the caller as if the caller wasn't self-accepting. This logs a message in both browser console and terminal. Pass a message to provide context on why invalidation occurred.

Always call `import.meta.hot.accept` even if you plan to call `invalidate` immediately after, or the HMR client won't listen for future changes. Recommend calling `invalidate` within the `accept` callback:

```js
import.meta.hot.accept((module) => {
  // You may use the new module instance to decide whether to invalidate.
  if (cannotHandleUpdate(module)) {
    import.meta.hot.invalidate()
  }
})
```

## `hot.on(event, cb)`

Listen to an HMR event.

Vite automatically dispatches these HMR events:

- `'vite:beforeUpdate'` when an update is about to be applied (e.g. a module will be replaced)
- `'vite:afterUpdate'` when an update has just been applied (e.g. a module has been replaced)
- `'vite:beforeFullReload'` when a full reload is about to occur
- `'vite:beforePrune'` when modules that are no longer needed are about to be pruned
- `'vite:invalidate'` when a module is invalidated with `import.meta.hot.invalidate()`
- `'vite:error'` when an error occurs (e.g. syntax error)
- `'vite:ws:disconnect'` when the WebSocket connection is lost
- `'vite:ws:connect'` when the WebSocket connection is (re-)established

Plugins can also send custom HMR events. See [handleHotUpdate](/guide/api-plugin#handlehotupdate) for more details.

## `hot.off(event, cb)`

Remove callback from the event listeners.

## `hot.send(event, data)`

Send custom events back to Vite's dev server.

If called before the connection is established, data will be buffered and sent once connected.

See [Client-server Communication](/guide/api-plugin#client-server-communication) for more details, including a section on [Typing Custom Events](/guide/api-plugin#typescript-for-custom-events).

## Further Reading

To learn more about HMR API usage and how it works under-the-hood:

- [Hot Module Replacement is Easy](https://bjornlu.com/blog/hot-module-replacement-is-easy)
