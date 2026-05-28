# Project Philosophy

## Lean Extendable Core

Vite aims to support the most common patterns to build Web apps out-of-the-box, while keeping "Vite core" lean and maintainable long-term. The philosophy emphasizes providing "strong primitives and APIs that plugins can build on" rather than embedding every feature directly. The plugin system extends Rollup's plugin API, enabling solutions like vite-plugin-pwa and other community plugins. Rolldown, Vite's bundler, maintains Rollup plugin compatibility for cross-project portability.

## Pushing the Modern Web

Vite provides opinionated features that encourage modern code patterns:

- Source code must be written in ESM; non-ESM dependencies require pre-bundling
- Web workers use the `new Worker` syntax following modern standards
- Node.js modules cannot run in browsers

These patterns prioritize future-proof APIs over immediate backward compatibility.

## A Pragmatic Approach to Performance

Performance has been central since Vite's inception. The dev server architecture maintains fast HMR at scale. The tool leverages native technologies like the Oxc toolchain and Rolldown for intensive tasks while keeping most code in JavaScript for flexibility. Framework plugins integrate Babel when needed for user code compilation.

## Building Frameworks on Top of Vite

Vite serves as a foundation for framework creation rather than just end-user tooling. Its framework-agnostic core pairs with polished plugins for UI frameworks. The JavaScript API enables framework authors to craft customized experiences, while SSR primitives support modern web framework development. Compatibility with backend frameworks like Ruby and Laravel extends its utility.

## An Active Ecosystem

Vite's evolution involves "cooperation between framework and plugin maintainers, users, and the Vite team." The vite-ecosystem-ci tool runs CI tests from major projects on selected pull requests to identify potential regressions before release. Community participation through Discord and GitHub is actively encouraged.

> **Nota da captura:** esta página foi resumida pelo WebFetch. Para o texto integral original, ver https://vite.dev/guide/philosophy
