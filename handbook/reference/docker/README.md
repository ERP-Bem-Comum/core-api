# 🐳 Docker Reference

Documentação espelho da [doc oficial do Docker](https://docs.docker.com/), copiada offline para servir como source of truth do projeto.

## Arquivos nesta pasta

| Arquivo | Tamanho | Cobre |
| :--- | ---: | :--- |
| [`Docker overview.md`](./Docker%20overview.md) | 9 KB | Arquitetura cliente/daemon, registries, objetos (images, containers, networks, volumes), tecnologias subjacentes (namespaces) |
| [`Dockerfile reference.md`](./Dockerfile%20reference.md) | **109 KB** | Referência completa de todas as instruções: `FROM`, `RUN`, `CMD`, `LABEL`, `EXPOSE`, `ENV`, `ADD`, `COPY`, `ENTRYPOINT`, `VOLUME`, `USER`, `WORKDIR`, `ARG`, `ONBUILD`, `STOPSIGNAL`, `HEALTHCHECK`, `SHELL` — com sintaxe BuildKit moderna (heredocs, cache mounts, bind mounts, secret mounts) |
| [`Multi-stage builds.md`](./Multi-stage%20builds.md) | 5 KB | Padrão multi-stage, naming de stages, `COPY --from`, target específico, diferenças entre legacy builder e BuildKit |
| [`Building best practices.md`](./Building%20best%20practices.md) | 17 KB | Curated set de práticas oficiais: pin de digest, base image trustada, multi-stage, .dockerignore, ephemeral containers, USER non-root, ENTRYPOINT vs CMD, ENV unset, etc. |
| [`BuildKit.md`](./BuildKit.md) | 4 KB | LLB, frontend (Dockerfile), getting started, BuildKit no Windows (experimental) |
| [`Compose file reference.md`](./Compose%20file%20reference.md) | 4 KB | Compose Specification — top-level elements, service-level elements, healthcheck, depends_on, networks, volumes, profiles, develop/watch |

## Como o projeto consome esta reference

| Onde | Para quê |
| :--- | :--- |
| [`../../../Dockerfile`](../../../Dockerfile) | Aplicação das práticas: multi-stage, digest pin, non-root, tini, OCI labels, cache mounts BuildKit |
| [`../../../.dockerignore`](../../../.dockerignore) | Exclusão disciplinada do build context (não enviar `.git/`, `node_modules/`, `handbook/`, etc.) |
| [`../../../compose.yaml`](../../../compose.yaml) | Materializa ADR-0019 (MinIO local) e ADR-0018 (MySQL opt-in via profile `db`) |
| [`../../architecture/adr/0011-supply-chain-hardening.md`](../../architecture/adr/0011-supply-chain-hardening.md) | Política que governa o Dockerfile: digest pin, `--frozen-lockfile`, `--ignore-scripts`, allowlist de build hooks |
| [`../../architecture/adr/0019-document-storage-s3-with-minio-dev.md`](../../architecture/adr/0019-document-storage-s3-with-minio-dev.md) | Decisão de usar MinIO via Docker para dev, troca de endpoint para AWS S3 em prod |

## Quando consultar

- Antes de **alterar o Dockerfile** — sempre verificar [`Dockerfile reference.md`](./Dockerfile%20reference.md) e [`Building best practices.md`](./Building%20best%20practices.md).
- Antes de **adicionar serviço ao compose** — verificar [`Compose file reference.md`](./Compose%20file%20reference.md).
- Antes de **escolher imagem base** — confirmar que é "Docker Official Images" (badge), pequena (Alpine quando possível), e pinada por digest.
- Quando **performance de build** for ruim — revisitar [`BuildKit.md`](./BuildKit.md) e [`Multi-stage builds.md`](./Multi-stage%20builds.md) (cache mounts, stages paralelas).

## Versionamento

A doc foi snapshot em **2026-05-15** das versões atuais de `docs.docker.com`. Para atualizar, refazer `WebFetch` das URLs originais:

- `https://docs.docker.com/get-started/docker-overview/`
- `https://docs.docker.com/reference/dockerfile/`
- `https://docs.docker.com/build/building/multi-stage/`
- `https://docs.docker.com/build/building/best-practices/`
- `https://docs.docker.com/build/buildkit/`
- `https://docs.docker.com/reference/compose-file/`
