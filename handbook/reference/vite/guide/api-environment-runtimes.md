# Environment API for Runtimes

## Overview

The Environment API documentation describes how to create custom environment factories and module runners for Vite. As noted in the docs, this API is "generally in the release candidate phase" with plans to stabilize in a future major release.

## Key Components

**Environment Factories** are intended for environment providers (like Cloudflare) rather than end users. They return `EnvironmentOptions` configured for specific target runtimes in both dev and build scenarios.

**Module Runner** executes code in target runtimes. The system provides `ESModulesEvaluator` by default, using `new AsyncFunction` for code evaluation. Custom evaluators can be implemented for runtimes that don't support unsafe evaluation.

## Architecture

The documentation illustrates communication between:
- Vite Dev Server (Node.js)
- DevEnvironment with plugins and module graph
- Target Runtime running ModuleRunner
- HotChannel for HMR/module transport

## Transport Implementation

`ModuleRunnerTransport` handles server-runtime communication through either:
- RPC mechanisms
- Direct function calls (worker threads)
- HTTP requests

The docs emphasize implementing `vite:client:connect` and `vite:client:disconnect` events when using `on`/`off` methods for proper connection lifecycle management.

## Resources

Community feedback is gathered in a [GitHub discussion](https://github.com/vitejs/vite/discussions/16358) regarding these emerging APIs.

> **Nota da captura:** esta página foi parcialmente resumida pelo WebFetch. Para os detalhes completos das interfaces `ModuleRunner`, `ESModulesEvaluator` e `ModuleRunnerTransport`, consulte https://vite.dev/guide/api-environment-runtimes
