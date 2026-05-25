# Plugins

## Official Plugins

### @vitejs/plugin-vue

Provides Vue 3 Single File Components support.

Repository: [vitejs/vite-plugin-vue/tree/main/packages/plugin-vue](https://github.com/vitejs/vite-plugin-vue/tree/main/packages/plugin-vue)

### @vitejs/plugin-vue-jsx

Provides Vue 3 JSX support (via dedicated Babel transform).

Repository: [vitejs/vite-plugin-vue/tree/main/packages/plugin-vue-jsx](https://github.com/vitejs/vite-plugin-vue/tree/main/packages/plugin-vue-jsx)

### @vitejs/plugin-react

Provides React Fast Refresh support via Oxc Transformer.

Repository: [vitejs/vite-plugin-react/tree/main/packages/plugin-react](https://github.com/vitejs/vite-plugin-react/tree/main/packages/plugin-react)

### @vitejs/plugin-react-swc

Replaces Oxc with SWC during development for SWC plugin usage. Speeds up cold starts and HMR for large projects needing custom plugins.

Repository: [vitejs/vite-plugin-react/tree/main/packages/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/tree/main/packages/plugin-react-swc)

### @vitejs/plugin-rsc

Supports React Server Components through an Environment API integration. Create a minimal RSC app with:

```bash
npm create vite@latest -- --template rsc
```

Repository: [vitejs/vite-plugin-react/tree/main/packages/plugin-rsc](https://github.com/vitejs/vite-plugin-react/tree/main/packages/plugin-rsc)

### @vitejs/plugin-legacy

Provides legacy browsers support for the production build.

Repository: [vitejs/vite/tree/main/packages/plugin-legacy](https://github.com/vitejs/vite/tree/main/packages/plugin-legacy)

## Community Plugins

Community-contributed plugins are listed in the [Vite Plugin Registry](https://registry.vite.dev/plugins).

## Related Resources

- **Rolldown Builtin Plugins:** [rolldown.rs/builtin-plugins](https://rolldown.rs/builtin-plugins/)
- **Rolldown/Rollup Compatibility:** See the [Plugin API documentation](/guide/api-plugin) for compatibility details
