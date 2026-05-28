# Static Asset Handling

## Importing Asset as URL

When you import a static asset, Vite returns the resolved public URL upon serving:

```js
import imgUrl from './img.png'
document.getElementById('hero-img').src = imgUrl
```

During development, `imgUrl` equals `/src/img.png`; in production builds, it becomes `/assets/img.2d8efhg.png`.

**Key points:**
- Behavior mirrors webpack's `file-loader`
- Supports absolute public paths and relative paths
- CSS `url()` references follow the same handling
- Vue SFC templates automatically convert asset references into imports
- Common image, media, and font filetypes are auto-detected
- Referenced assets receive hashed filenames and plugin optimization
- Assets smaller than `assetsInlineLimit` become base64 data URLs
- Git LFS placeholders are excluded from inlining automatically

### Explicit URL Imports

Assets not in the internal list can be explicitly imported using `?url`:

```js
import workletURL from 'extra-scalloped-border/worklet.js?url'
CSS.paintWorklet.addModule(workletURL)
```

### Explicit Inline Handling

Control inlining with `?inline` or `?no-inline` suffixes:

```js
import imgUrl1 from './img.svg?no-inline'
import imgUrl2 from './img.png?inline'
```

### Importing Asset as String

Use the `?raw` suffix to import assets as strings:

```js
import shaderString from './shader.glsl?raw'
```

### Importing Script as a Worker

Scripts become web workers with `?worker` or `?sharedworker`:

```js
import Worker from './shader.js?worker'
const worker = new Worker()
```

```js
import SharedWorker from './shader.js?sharedworker'
const sharedWorker = new SharedWorker()
```

```js
import InlineWorker from './shader.js?worker&inline'
```

## The `public` Directory

Place assets in the special `public` directory when they:
- Never appear in source code (e.g., `robots.txt`)
- Must keep exact filenames without hashing
- Don't require prior import to access URLs

Assets here serve at root path `/` during development and copy to the dist directory root unchanged.

Default location: `<root>/public` (configurable via `publicDir` option).

**Important:** Reference public assets using root absolute paths—`public/icon.png` becomes `/icon.png` in source code.

> "In general, prefer importing assets unless you specifically need the guarantees provided by the public directory."

## new URL(url, import.meta.url)

Native ESM feature combining `import.meta.url` with the URL constructor obtains fully resolved static asset URLs:

```js
const imgUrl = new URL('./img.png', import.meta.url).href

document.getElementById('hero-img').src = imgUrl
```

Modern browsers support this natively—Vite doesn't process it during development.

Dynamic URLs via template literals work too:

```js
function getImageUrl(name) {
  return new URL(`./dir/${name}.png`, import.meta.url).href
}
```

Production builds transform these URLs to maintain correct locations after bundling and hashing. The URL string must remain static for analysis; "Vite will not transform this" applies to non-static strings.

**Limitation:** "This pattern does not work if you are using Vite for Server-Side Rendering, because import.meta.url has different semantics in browsers vs. Node.js."

> **Nota da captura:** esta página foi parcialmente resumida pelo WebFetch. Para o conteúdo integral, consulte https://vite.dev/guide/assets
