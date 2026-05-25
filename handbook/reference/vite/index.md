# Vite — Referência local

> **Fonte:** [vite.dev](https://vite.dev/) · **Versão capturada:** Vite 7 (stable) · **Data da captura:** 2026-05-22
>
> Esta é uma cópia local da documentação oficial do Vite para consulta offline e referência cruzada em ADRs/PRs. **Sempre que precisar da verdade canônica, ir ao site oficial** — esta cópia é congelada e pode ficar desatualizada.

## O que é Vite

> Vite (palavra francesa para "rápido", pronunciada `/viːt/`, como "veet") é uma build tool que oferece uma experiência de desenvolvimento mais rápida e enxuta para projetos web modernos. Consiste em duas partes principais:
>
> - Um **dev server** que adiciona melhorias sobre ESM nativo (HMR extremamente rápido).
> - Um comando **build** que empacota o código com [Rolldown](https://rolldown.rs), pré-configurado para emitir assets estáticos otimizados.

**Confiado por:** OpenAI, Shopify, Stripe, Linear, ClickUp, Wiz · **80k+** GitHub stars · **80M+** downloads npm semanais.

## Por que esta referência existe no ERP-CONTRACTS

Este repositório é `core-api` — backend modular monolith (Node.js 24 + MySQL 8 + Drizzle, CLI-first, sem HTTP server na Fase 1). Vite **não é dependência atual** deste projeto e não há ADR de adoção. Esta referência foi mirroreada para servir como material de apoio quando frontends ou ferramentas paralelas dentro do ecossistema da Envolve precisarem de consulta canônica off-the-shelf.

Se algum dia uma frente Frontend do ecossistema for absorvida pelo monorepo, esta árvore poderá embasar o ADR de adoção.

## Mapa de navegação

### Guide

| Arquivo | Conteúdo |
| --- | --- |
| [guide/index.md](./guide/index.md) | Getting Started — install, scaffold, project root, CLI básica |
| [guide/philosophy.md](./guide/philosophy.md) | Filosofia: lean core, modern web, performance pragmática, framework foundation, ecossistema |
| [guide/why.md](./guide/why.md) | Por que Vite — origens, ecossistema, toolchain unificado, futuro |
| [guide/features.md](./guide/features.md) | Features completas: deps, HMR, TS, HTML, JSX, CSS, assets, JSON, glob, dynamic import, wasm, workers, CSP, license, build optimizations |
| [guide/cli.md](./guide/cli.md) | Tabelas completas de flags: `vite`, `vite build`, `vite preview`, `vite optimize` |
| [guide/using-plugins.md](./guide/using-plugins.md) | Adicionar/ordenar/condicionar plugins |
| [guide/dep-pre-bundling.md](./guide/dep-pre-bundling.md) | Pré-bundling de dependências, cache FS/browser, monorepos |
| [guide/assets.md](./guide/assets.md) | Static asset handling (`?url`, `?raw`, `?worker`, public dir, `new URL`) |
| [guide/build.md](./guide/build.md) | Build de produção, MPA, library mode, advanced base options |
| [guide/static-deploy.md](./guide/static-deploy.md) | Deploy em GitHub Pages, GitLab, Netlify, Vercel, Cloudflare, Firebase, etc. |
| [guide/env-and-mode.md](./guide/env-and-mode.md) | `import.meta.env`, `.env` files, modes, NODE_ENV |
| [guide/ssr.md](./guide/ssr.md) | SSR low-level: middleware mode, build, manifest, externals, target |
| [guide/backend-integration.md](./guide/backend-integration.md) | Servir Vite via Rails/Laravel; manifest schema completo |
| [guide/troubleshooting.md](./guide/troubleshooting.md) | Problemas comuns por área (CLI, dev server, HMR, build) |
| [guide/performance.md](./guide/performance.md) | Auditoria de plugins, resolve, barrel files, warmup, profiling |
| [guide/migration.md](./guide/migration.md) | Migration v7 → v8 (Rolldown, Oxc, CJS interop, etc.) |
| [guide/changes.md](./guide/changes.md) | Breaking changes planejados/considerados/passados |
| [guide/api-plugin.md](./guide/api-plugin.md) | Plugin API completa (hooks, virtual modules, ordering, comunicação) |
| [guide/api-hmr.md](./guide/api-hmr.md) | HMR API client-side (`import.meta.hot.*`) |
| [guide/api-javascript.md](./guide/api-javascript.md) | JS API: `createServer`, `build`, `preview`, `resolveConfig`, `loadEnv` |
| [guide/api-environment.md](./guide/api-environment.md) | Environment API — visão geral, configuração |
| [guide/api-environment-instances.md](./guide/api-environment-instances.md) | `DevEnvironment`, `EnvironmentModuleGraph`, `FetchResult` |
| [guide/api-environment-plugins.md](./guide/api-environment-plugins.md) | Plugins multi-environment, `this.environment`, hooks |
| [guide/api-environment-frameworks.md](./guide/api-environment-frameworks.md) | `RunnableDevEnvironment`, `FetchableDevEnvironment`, build em múltiplos environments |
| [guide/api-environment-runtimes.md](./guide/api-environment-runtimes.md) | Environment factories e module runners para runtime providers |

### Config

| Arquivo | Conteúdo |
| --- | --- |
| [config/index.md](./config/index.md) | `defineConfig`, conditional config, async config, `loadEnv` |
| [config/shared-options.md](./config/shared-options.md) | `root`, `base`, `mode`, `define`, `plugins`, `publicDir`, `cacheDir`, `resolve.*`, `html.cspNonce`, `css.*`, `json.*`, `oxc`, `assetsInclude`, `logLevel`, `envDir`, `envPrefix`, `appType`, `devtools`, `future` |
| [config/server-options.md](./config/server-options.md) | `server.host`, `allowedHosts`, `port`, `https`, `open`, `proxy`, `cors`, `headers`, `hmr`, `forwardConsole`, `warmup`, `watch`, `middlewareMode`, `fs.*`, `origin`, `sourcemapIgnoreList` |
| [config/build-options.md](./config/build-options.md) | `build.target`, `modulePreload`, `outDir`, `assetsDir`, `assetsInlineLimit`, `cssCodeSplit`, `cssMinify`, `sourcemap`, `rolldownOptions`, `lib`, `manifest`, `ssr`, `minify`, `terserOptions`, `watch`, `license` |
| [config/preview-options.md](./config/preview-options.md) | `preview.host`, `port`, `https`, `open`, `proxy`, `cors`, `headers` |
| [config/dep-optimization-options.md](./config/dep-optimization-options.md) | `optimizeDeps.entries`, `exclude`, `include`, `rolldownOptions`, `force`, `noDiscovery`, `holdUntilCrawlEnd`, `needsInterop` |
| [config/ssr-options.md](./config/ssr-options.md) | `ssr.external`, `noExternal`, `target`, `resolve.conditions`, `resolve.externalConditions`, `resolve.mainFields` |
| [config/worker-options.md](./config/worker-options.md) | `worker.format`, `plugins`, `rolldownOptions` |

### Plugins

| Arquivo | Conteúdo |
| --- | --- |
| [plugins/index.md](./plugins/index.md) | Lista oficial: `@vitejs/plugin-vue`, `plugin-vue-jsx`, `plugin-react`, `plugin-react-swc`, `plugin-rsc`, `plugin-legacy` + community registry |

## Notas de captura

- Algumas páginas foram resumidas pelo serviço de WebFetch (notadamente `guide/philosophy`, `guide/assets`, `guide/static-deploy`, `guide/api-environment-runtimes`). Cada uma carrega no fim uma nota apontando para a URL canônica.
- Imagens referenciadas no original (ex.: `vite-environments.DZyy20w5.svg`) **não foram baixadas** — referenciar diretamente em `https://vite.dev/assets/...` quando necessário.
- Links internos no markdown foram preservados como paths absolutos (ex.: `/guide/features`) — para uso local, rewriter manual seria necessário.
- Esta captura representa o estado de **vite.dev em 2026-05-22 (Vite 7 stable)**. Para atualizar: refazer o mirror substituindo este diretório.

## Stack referenciada cross-handbook

Vite **não** está nas tecnologias atuais do `core-api`. Tecnologias ativas:

- [`handbook/reference/nodejs/`](../nodejs/) — Node.js 24 LTS
- [`handbook/reference/typescript/`](../typescript/) — TypeScript 6.0
- [`handbook/reference/drizzle/`](../drizzle/) — Drizzle ORM
- [`handbook/reference/mysql/`](../mysql/) e [`handbook/reference/mysql2/`](../mysql2/) — MySQL 8 + driver
- [`handbook/reference/pnpm/`](../pnpm/) — package manager
- [`handbook/reference/docker/`](../docker/) — containers
- [`handbook/reference/fastify/`](../fastify/) — HTTP server (reservado, Fase 2+)
- [`handbook/reference/nodemailer/`](../nodemailer/) — adapter SMTP
