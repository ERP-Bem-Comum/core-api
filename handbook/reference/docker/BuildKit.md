# BuildKit

BuildKit is the builder backend used by Docker. BuildKit provides improved functionality and improves your builds' performance over the legacy builder used in earlier versions of Docker. It also introduces support for handling more complex scenarios:

- Detect and skip executing unused build stages
- Parallelize building independent build stages
- Incrementally transfer only the changed files in your build context between builds
- Detect and skip transferring unused files in your build context
- Use Dockerfile frontend implementations with many additional features
- Avoid side effects with rest of the API (intermediate images and containers)
- Prioritize your build cache for automatic pruning

The main areas BuildKit improves on the legacy builder are performance, storage management, and extensibility. From the performance side, a significant update is a fully concurrent build graph solver. It can run build steps in parallel when possible and optimize out commands that don't have an impact on the final result. The access to the local source files has also been optimized. By tracking only the updates made to these files between repeated build invocations, there is no need to wait for local files to be read or uploaded before the work can begin.

## LLB

At the core of BuildKit is a Low-Level Build (LLB) definition format. LLB is an intermediate binary format that allows developers to extend BuildKit. LLB defines a content-addressable dependency graph that can be used to put together complex build definitions. It also supports features not exposed in Dockerfiles, like direct data mounting and nested invocation.

Everything about execution and caching of your builds is defined in LLB. The caching model is entirely rewritten compared to the legacy builder. Rather than using heuristics to compare images, LLB directly tracks the checksums of build graphs and content mounted to specific operations. This makes it much faster, more precise, and portable. The build cache can even be exported to a registry, where it can be pulled on-demand by subsequent invocations on any host.

LLB can be generated directly using a golang client package that allows defining the relationships between your build operations using Go language primitives. This gives you full power to run anything you can imagine, but will probably not be how most people will define their builds. Instead, most users would use a frontend component, or LLB nested invocation, to run a prepared set of build steps.

## Frontend

A frontend is a component that takes a human-readable build format and converts it to LLB so BuildKit can execute it. Frontends can be distributed as images, and the user can target a specific version of a frontend that is guaranteed to work for the features used by their definition.

For example, to build a Dockerfile with BuildKit, you would use an external Dockerfile frontend.

## Getting started

BuildKit is the default builder for Docker Desktop and Docker Engine users. If you're building Windows containers, the legacy builder is used instead.

## BuildKit on Windows

> **WARNING — BuildKit only fully supports building Linux containers. Windows container support is experimental.**

BuildKit has experimental support for Windows containers (WCOW) as of version 0.13.

### Known limitations

For information about open bugs and limitations related to BuildKit on Windows, see GitHub issues in the moby/buildkit repository.

### Prerequisites

- Architecture: `amd64`, `arm64` (binaries available but not officially tested yet).
- Supported OS: Windows Server 2019, Windows Server 2022, Windows 11.
- Base images: `ServerCore:ltsc2019`, `ServerCore:ltsc2022`, `NanoServer:ltsc2022`.
- Docker Desktop version 4.29 or later
