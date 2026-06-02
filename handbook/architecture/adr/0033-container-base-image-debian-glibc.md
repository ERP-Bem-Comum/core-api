[← Voltar para ADRs](./README.md)

# ADR-0033: Imagem-base do container — Debian `bookworm-slim` (glibc) sobre Alpine (musl)

- **Status:** Accepted
- **Date:** 2026-06-02
- **Deciders:** Arquiteto técnico + Gabriel Aderaldo
- **Relacionado:** [ADR-0009](./0009-node-24-typescript-6-with-7-roadmap.md) (roadmap TS 7 / tsgo), [ADR-0011](./0011-supply-chain-hardening.md) (pin de imagem por digest), [ADR-0002](./0002-keep-nodejs-runtime.md) (Node como runtime)

---

## Contexto

A imagem-base do `Dockerfile` do `core-api` era `node:24.15-alpine`. Alpine usa **musl libc** — atrativo pelo tamanho mínimo. O [ADR-0011](./0011-supply-chain-hardening.md) exige que a imagem seja **pinada por digest** (não por tag mutável).

O [ADR-0009](./0009-node-24-typescript-6-with-7-roadmap.md) estabeleceu o **roadmap de migração para TypeScript 7**, cujo compilador nativo (tsgo) é distribuído como `@typescript/native-preview`. O projeto já o adotou como devDependency:

- `package.json:58` — `"@typescript/native-preview": "7.0.0-dev.20260515.1"`.

Esse pacote distribui **binários nativos pré-compilados** (Go), e **só publica a variante glibc**. Numa base musl (Alpine), o `pnpm install` não encontra um artefato compatível e quebra. O racional está documentado no próprio `Dockerfile:24-27`:

> `# Pin: digest do índice multi-arch (amd64 + arm64), Debian bookworm-slim (glibc).`
> `# glibc (não Alpine/musl): binários nativos de devDeps — ex. @typescript/native-preview`
> `# (tsgo, ADR-0009) — só publicam variante glibc; em musl o pnpm install quebra com`
> `# ERR_PNPM_NO_RESOLUTION_MATCHED.`

A força em jogo: a escolha de runtime/tooling (tsgo, decidida no ADR-0009) passou a **restringir** a escolha de libc da imagem-base.

---

## Decisão

**Adotar `node:24.16-bookworm-slim` (Debian, glibc) como imagem-base única do container**, pinada por digest do índice multi-arch (amd64 + arm64):

```dockerfile
FROM node:24.16-bookworm-slim@sha256:242549cd46785b480c832479a730f4f2a20865d61ea2e404fdb2a5c3d3b73ecf AS base
```

- **glibc** garante compatibilidade com binários nativos pré-compilados de devDependencies — em primeiro lugar o tsgo (`@typescript/native-preview`), mas também qualquer outro pacote que distribua só a variante glibc.
- **`-slim`** mantém a superfície enxuta (Debian sem os pacotes de conveniência da imagem cheia), sem cair no problema de libc do Alpine.
- **Pin por digest** preserva a invariante do [ADR-0011](./0011-supply-chain-hardening.md). Atualização do digest via `docker buildx imagetools inspect node:24.16-bookworm-slim --format '{{.Manifest.Digest}}'`.

---

## Consequências

### Positivas

- **tsgo roda no container** — desbloqueia o roadmap TS 7 do [ADR-0009](./0009-node-24-typescript-6-with-7-roadmap.md) em build/CI sem shim de compatibilidade.
- **Compatibilidade ampla** — binários nativos glibc (o caso comum no ecossistema npm) funcionam sem `gcompat`/recompilação.
- **Multi-arch mantido** — o digest aponta para o índice amd64 + arm64 (dev em Apple Silicon, prod em x86).
- **Pin de supply-chain preservado** — digest imutável, alinhado ao ADR-0011.

### Negativas

- **Imagem maior que Alpine.** Debian slim carrega mais que musl mínimo. Agravado por devDeps pesadas (o próprio tsgo). **Mitigação entregue** no `CTR-DEVOPS-HARDENING`: estágio `deps-prod` (`pnpm install --prod --ignore-scripts`) faz o estágio `runtime` **não** levar devDependencies (incluindo tsgo), reduzindo a imagem final. Medição do tamanho real pós-`deps-prod` é follow-up.
- **Superfície de pacotes do SO maior** que Alpine. Mitigação: `-slim` + `--no-install-recommends` + non-root user (já no Dockerfile).

### Neutras

- `tini` (PID 1), non-root user, `STOPSIGNAL SIGTERM` e multi-stage permanecem idênticos — a troca de base não os afeta.
- O portal de docs (`website/`) não usa esta imagem.

---

## Alternativas Consideradas

### A. Manter Alpine (musl) e obter tsgo por outra via

Compilar tsgo da fonte na imagem, ou usar uma variante musl. **Rejeitada:** o `@typescript/native-preview` não publica artefato musl; compilar Go na imagem adiciona toolchain pesado e quebra a reprodutibilidade do pin.

### B. Alpine + camada de compatibilidade glibc (`gcompat`)

**Rejeitada:** `gcompat` é um shim parcial; binários nativos não-triviais falham de forma intermitente. Trocar fragilidade de runtime por economia de MB é mau negócio num ERP financeiro com auditoria.

### C. Distroless

**Rejeitada (por ora):** o runtime depende de `pnpm`/`corepack` e `--experimental-strip-types`; distroless dificulta o entrypoint atual sem ganho de libc (precisaria igualmente glibc). Pode ser reavaliado quando houver build artefato sem dependência de PM em runtime.

### D. Abandonar tsgo e ficar no `tsc` clássico

**Rejeitada:** desfaz o ganho de performance de compilação do roadmap do [ADR-0009](./0009-node-24-typescript-6-with-7-roadmap.md). A base glibc é o custo menor para manter o roadmap.

---

## Quando Re-avaliar

- `@typescript/native-preview` (tsgo) passar a publicar variante **musl** — Alpine volta a ser viável.
- O projeto **abandonar** tsgo / outro tooling glibc-only — remove a restrição.
- Tamanho de imagem virar requisito crítico (edge/serverless) que justifique reabrir o trade-off com distroless.
- Bump de major do Node mudar o conjunto de tags oficiais (re-pinar digest).

---

## Referências

- [ADR-0009](./0009-node-24-typescript-6-with-7-roadmap.md) — Node 24 + TS 6, roadmap TS 7 (origem do tsgo).
- [ADR-0011](./0011-supply-chain-hardening.md) — pin de imagem por digest.
- `Dockerfile:22-30` — estágio `base` com o racional e o pin.
- `package.json:58` — `@typescript/native-preview` (tsgo) como devDependency.
- `CTR-DEVOPS-HARDENING` — estágio `deps-prod` que mitiga o tamanho da imagem final.
