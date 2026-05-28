# Using Environment Instances

## Accessing the Environments

During development, environments in a dev server can be accessed via `server.environments`:

```js
// create the server, or get it from the configureServer hook
const server = await createServer(/* options */)

const clientEnvironment = server.environments.client
clientEnvironment.transformRequest(url)
console.log(server.environments.ssr.moduleGraph)
```

Plugin access to current environment is documented in the Environment API for Plugins section.

## DevEnvironment Class

Each environment during development is an instance of the `DevEnvironment` class:

```ts
class DevEnvironment {
  /**
   * Unique identifier for the environment in a Vite server.
   * By default Vite exposes 'client' and 'ssr' environments.
   */
  name: string
  /**
   * Communication channel to send and receive messages from the
   * associated module runner in the target runtime.
   */
  hot: NormalizedHotChannel
  /**
   * Graph of module nodes, with the imported relationship between
   * processed modules and the cached result of the processed code.
   */
  moduleGraph: EnvironmentModuleGraph
  /**
   * Resolved plugins for this environment, including the ones
   * created using the per-environment `create` hook
   */
  plugins: Plugin[]
  /**
   * Allows to resolve, load, and transform code through the
   * environment plugins pipeline
   */
  pluginContainer: EnvironmentPluginContainer
  /**
   * Resolved config options for this environment. Options at the server
   * global scope are taken as defaults for all environments, and can
   * be overridden (resolve conditions, external, optimizedDeps)
   */
  config: ResolvedConfig & ResolvedDevEnvironmentOptions

  constructor(
    name: string,
    config: ResolvedConfig,
    context: DevEnvironmentContext,
  )

  /**
   * Resolve the URL to an id, load it, and process the code using the
   * plugins pipeline. The module graph is also updated.
   */
  async transformRequest(url: string): Promise<TransformResult | null>

  /**
   * Register a request to be processed with low priority. This is useful
   * to avoid waterfalls. The Vite server has information about the
   * imported modules by other requests, so it can warmup the module graph
   * so the modules are already processed when they are requested.
   */
  async warmupRequest(url: string): Promise<void>

  /**
   * Called by the module runner to retrieve information about the specified
   * module. Internally calls `transformRequest` and wraps the result in the
   * format that the module runner understands.
   * This method is not meant to be called manually.
   */
  async fetchModule(
    id: string,
    importer?: string,
    options?: FetchFunctionOptions,
  ): Promise<FetchResult>
}
```

### DevEnvironmentContext

```ts
interface DevEnvironmentContext {
  hot: boolean
  transport?: HotChannel | WebSocketServer
  options?: EnvironmentOptions
  remoteRunner?: {
    inlineSourceMap?: boolean
  }
  depsOptimizer?: DepsOptimizer
}
```

### TransformResult

```ts
interface TransformResult {
  code: string
  map: SourceMap | { mappings: '' } | null
  etag?: string
  deps?: string[]
  dynamicDeps?: string[]
}
```

An environment instance processes URLs using `environment.transformRequest(url)`. This resolves the URL to a module ID, loads it (from filesystem or virtual module plugin), and transforms the code. Imports and metadata are recorded in the module graph. Transform results are cached in the module upon completion.

## Separate Module Graphs

Each environment maintains an isolated module graph with the same signature, enabling generic algorithms to traverse or query graphs independently. When files are modified, each environment's module graph discovers affected modules for independent HMR processing.

### EnvironmentModuleNode

```ts
class EnvironmentModuleNode {
  environment: string

  url: string
  id: string | null = null
  file: string | null = null

  type: 'js' | 'css'

  importers = new Set<EnvironmentModuleNode>()
  importedModules = new Set<EnvironmentModuleNode>()
  importedBindings: Map<string, Set<string>> | null = null

  info?: ModuleInfo
  meta?: Record<string, any>
  transformResult: TransformResult | null = null

  acceptedHmrDeps = new Set<EnvironmentModuleNode>()
  acceptedHmrExports: Set<string> | null = null
  isSelfAccepting?: boolean
  lastHMRTimestamp = 0
  lastInvalidationTimestamp = 0
}
```

### EnvironmentModuleGraph

`environment.moduleGraph` is an instance of `EnvironmentModuleGraph`:

```ts
export class EnvironmentModuleGraph {
  environment: string

  urlToModuleMap = new Map<string, EnvironmentModuleNode>()
  idToModuleMap = new Map<string, EnvironmentModuleNode>()
  etagToModuleMap = new Map<string, EnvironmentModuleNode>()
  fileToModulesMap = new Map<string, Set<EnvironmentModuleNode>>()

  constructor(
    environment: string,
    resolveId: (url: string) => Promise<PartialResolvedId | null>,
  )

  async getModuleByUrl(
    rawUrl: string,
  ): Promise<EnvironmentModuleNode | undefined>

  getModuleById(id: string): EnvironmentModuleNode | undefined

  getModulesByFile(file: string): Set<EnvironmentModuleNode> | undefined

  onFileChange(file: string): void

  onFileDelete(file: string): void

  invalidateModule(
    mod: EnvironmentModuleNode,
    seen: Set<EnvironmentModuleNode> = new Set(),
    timestamp: number = monotonicDateNow(),
    isHmr: boolean = false,
  ): void

  invalidateAll(): void

  async ensureEntryFromUrl(
    rawUrl: string,
    setIsSelfAccepting = true,
  ): Promise<EnvironmentModuleNode>

  createFileOnlyEntry(file: string): EnvironmentModuleNode

  async resolveUrl(url: string): Promise<ResolvedUrl>

  updateModuleTransformResult(
    mod: EnvironmentModuleNode,
    result: TransformResult | null,
  ): void

  getModuleByEtag(etag: string): EnvironmentModuleNode | undefined
}
```

## FetchResult

The `environment.fetchModule` method returns a `FetchResult` union of `CachedFetchResult`, `ExternalFetchResult`, and `ViteFetchResult`.

### CachedFetchResult

```ts
export interface CachedFetchResult {
  /**
   * If the module is cached in the runner, this confirms
   * it was not invalidated on the server side.
   */
  cache: true
}
```

Analogous to HTTP 304 (Not Modified) status.

### ExternalFetchResult

```ts
export interface ExternalFetchResult {
  /**
   * The path to the externalized module starting with file://.
   * By default this will be imported via a dynamic "import"
   * instead of being transformed by Vite and loaded with the Vite runner.
   */
  externalize: string
  /**
   * Type of the module. Used to determine if the import statement is correct.
   * For example, if Vite needs to throw an error if a variable is not actually exported.
   */
  type: 'module' | 'commonjs' | 'builtin' | 'network'
}
```

Instructs the module runner to import via the runtime's native import mechanism.

### ViteFetchResult

```ts
export interface ViteFetchResult {
  /**
   * Code that will be evaluated by the Vite runner.
   * By default this will be wrapped in an async function.
   */
  code: string
  /**
   * File path of the module on disk.
   * This will be resolved as import.meta.url/filename.
   * Will be `null` for virtual modules.
   */
  file: string | null
  /**
   * Module ID in the server module graph.
   */
  id: string
  /**
   * Module URL used in the import.
   */
  url: string
  /**
   * Invalidate module on the client side.
   */
  invalidate: boolean
}
```

Returns information about the current module including executable code, file path, module ID, and URL. The `invalidate` field directs the runner to refresh the module before execution rather than using cached values.
