# Compose file reference

The Compose Specification is the latest and recommended version of the Compose file format. It helps you define a Compose file which is used to configure your Docker application's services, networks, volumes, and more.

Legacy versions 2.x and 3.x of the Compose file format were merged into the Compose Specification. It is implemented in versions 1.27.0 and above (also known as Compose v2) of the Docker Compose CLI.

The Compose Specification on Docker Docs is the Docker Compose implementation. If you wish to implement your own version of the Compose Specification, see the [Compose Specification repository](https://github.com/compose-spec/compose-spec).

## Top-level elements

A Compose file has these top-level keys:

- `version` — deprecated in current versions of Compose v2; kept for backwards compatibility with Compose v1.
- `name` — the project name.
- `services` — services configuration (most important).
- `networks` — declarative network configuration.
- `volumes` — declarative volume configuration.
- `configs` — non-sensitive configuration files (Swarm-style).
- `secrets` — sensitive data (Swarm-style).
- `include` — include another Compose file.
- `extension` — `x-*` user-defined extensions, often used with anchors and aliases.

## Service-level elements (most common)

- `image` — image to start from.
- `build` — build context for the image (path or object with `context`, `dockerfile`, `target`, `args`).
- `command` — overrides the default command.
- `entrypoint` — overrides the default ENTRYPOINT.
- `environment` — environment variables (list or map).
- `env_file` — files to read environment variables from.
- `ports` — port mappings (short or long form). Prefer long form for explicit `target`, `published`, `protocol`, `mode`.
- `volumes` — volume mounts (short or long form).
- `depends_on` — service dependencies; with `condition: service_healthy` waits on health check.
- `healthcheck` — `test`, `interval`, `timeout`, `retries`, `start_period`.
- `restart` — `no` (default), `always`, `on-failure`, `unless-stopped`.
- `networks` — networks to attach to.
- `deploy` — deployment options (mostly Swarm-related).
- `profiles` — service profiles for selective enablement.
- `user`, `working_dir`, `read_only`, `cap_add`, `cap_drop`, `security_opt`, `cgroup`, `pid`, `tmpfs`, `tty`, `stdin_open`, `init`.
- `develop` — `watch` for hot-reload-like developer experience.

## Healthcheck

```yaml
services:
  app:
    image: my-app:1.0.0
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s
```

You can also disable a healthcheck:

```yaml
healthcheck:
  disable: true
```

## Depends_on with health condition

```yaml
services:
  app:
    depends_on:
      db:
        condition: service_healthy
```

## Networks

```yaml
networks:
  backend:
    driver: bridge
    internal: true
  frontend:
    driver: bridge
```

## Volumes

```yaml
volumes:
  db-data:
    driver: local
  cache: {}
```

## Profiles (optional services)

```yaml
services:
  debug-proxy:
    image: proxy:debug
    profiles: ["debug"]
```

Enable with `docker compose --profile debug up`.

## Develop / watch (hot reload)

```yaml
services:
  app:
    build: .
    develop:
      watch:
        - action: sync
          path: ./src
          target: /app/src
        - action: rebuild
          path: package.json
```

## Tips

> **TIP — Want a better editing experience for Compose files in VS Code?** Check out the Docker DX extension for linting, code navigation, and vulnerability scanning.
