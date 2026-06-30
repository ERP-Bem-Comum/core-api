[← Voltar para ADRs](./README.md)

# ADR-0033: Versionamento de API HTTP — `/api/v1` espelha o legado, `/api/v2` é o modelo novo

- **Status:** Accepted
- **Date:** 2026-06-03
- **Deciders:** Gabriel Aderaldo + Arquiteto técnico
- **Relacionado:** [ADR-0001](./0001-strangler-fig-over-rewrite.md) (Strangler Fig), [ADR-0025](./0025-http-server-fastify-core-api.md) (HTTP é adapter; composition root único), [ADR-0027](./0027-zod-openapi-contract-first-http-edge.md) (Zod contract-first na borda), [ADR-0028](./0028-http-edge-shell-location.md) (shell de borda + composition root), [ADR-0031](./0031-partners-registry-module.md) (módulo `partners`)

---

## Contexto

A borda HTTP do core-api nasceu sob o prefixo único **`/api/v2`** (ADR-0025/0027/0028). Os recursos
hoje expostos — `auth` e `contracts` — são **modelo novo** (greenfield, redesenhado no core-api), e
`/api/v2` está correto para eles.

A migração do legado segue a estratégia **Strangler Fig** (ADR-0001): módulos que **espelham o sistema
antigo** entram no core-api carregando shape, campos e códigos **herdados** — por exemplo, Colaboradores
no módulo `partners` (ADR-0031), com `OccupationArea` em códigos legados (`PARC|DDI|DCE|EPV`),
`registrationStatus`, soft-delete por `disableBy`, etc. Esses recursos precisam de uma superfície HTTP que
o **frontend legado e os consumidores existentes reconheçam** sem reescrever seus contratos.

Hoje o `buildApp()` (`src/shared/http/app.ts`) **hardcoda** `/api/v2` em dois pontos: o loop de registro
de plugins e o hook `onSend` de `cache-control: no-store`. Falta uma convenção explícita que diga **onde**
cada recurso é exposto e **como** os dois contratos coexistem no mesmo processo.

---

## Decisão

Dois prefixos de versão **coexistem no mesmo processo Fastify**, atribuídos **por recurso/módulo** (não
globalmente):

| Prefixo | Significado | Recursos |
| :--- | :--- | :--- |
| **`/api/v1`** | Recursos que **espelham o legado** (shape/campos/códigos herdados via Strangler Fig). Contrato **congelado** — evolui só por correção. | Colaboradores (`partners`) — primeiro recurso. |
| **`/api/v2`** | Recursos do **modelo novo** (greenfield, redesenhado). | `auth`, `contracts`. |

**Mudanças no shell de borda (ADR-0028):**

- `buildApp()` deixa de hardcodar o prefixo. `BuildAppOptions.routes` passa de
  `readonly FastifyPluginAsync[]` para **`ReadonlyArray<RouteRegistration>`**, onde
  `RouteRegistration = FastifyPluginAsync | { plugin: FastifyPluginAsync; prefix?: string }` (união
  **retrocompatível**). Plugin direto (forma legada) e `{ plugin }` sem `prefix` caem no **default
  `'/api/v2'`** — auth/contracts seguem **sem mudança de call-site**; `{ plugin, prefix: '/api/v1' }`
  registra sob v1.
- O hook `onSend` de hardening (`cache-control: no-store`) passa a cobrir **`/api/v1` e `/api/v2`** — toda
  rota de negócio é dado sensível, independente da versão.

**Invariantes:**

- Versionamento é **por recurso**: um módulo legado-espelhado vive em `v1`; um redesenhado vive em `v2`.
- Quando um recurso `v1` for **redesenhado**, ganha uma **contraparte `v2`** — o contrato `v1` **não muta**
  (é um contrato público estável para o legado; segue `Sunset`/RFC 8594 quando aposentado, como na linha do
  ADR-0032).
- Esta decisão **não superseda** ADR-0025/0027/0028 — ela os **cumpre**: mesma shell transversal
  (`src/shared/http/`), mesmo composition root único (`src/server.ts`), Zod exclusivo na borda.

---

## Consequências

### Positivas

- **Integração sem fricção do legado.** O frontend/consumidores existentes apontam para `/api/v1` com o
  contrato que já conhecem; nenhum reescrita de cliente.
- **Strangler Fig explícito na URL.** A versão do path comunica de imediato se um recurso é espelho ou
  redesenho — observabilidade e roteamento (BFF/Caddy) ficam triviais.
- **Coexistência sem fork de processo.** v1 e v2 no mesmo binário deployável (ADR-0006/0025), um único
  `listen()`.

### Negativas

- **Dois contratos durante a migração.** Risco de duplicação de DTO/schema. **Mitigação:** `v1` é
  congelado (só correção); evolução de modelo acontece em `v2`. A duplicação é temporária por desenho do
  Strangler Fig.

### Neutras

- O OpenAPI 3.1.1 (`/docs`) passa a documentar dois prefixos.
- O glob do ESLint de borda já cobre `src/modules/*/adapters/http/**`; nada muda.

---

## Alternativas Consideradas

### A. Versão por header (`Accept-Version`)

**Rejeitada porque:** menos explícita na observabilidade/cache, exige negociação no cliente legado (que hoje
chama por URL fixa), e complica o roteamento no BFF/proxy.

### B. Versão por subdomínio (`v1.api.…`)

**Rejeitada porque:** custo de infra (DNS/TLS por versão) sem ganho nesta fase single-process; o path
resolve com simplicidade equivalente.

### C. Tudo em `/api/v2` com campos legados nos DTOs

**Rejeitada porque:** contamina o contrato novo (greenfield) com shape herdado, exatamente o que o
Strangler Fig busca isolar. Mistura os dois modelos no mesmo namespace.

---

## Quando Re-avaliar

- Quando o **BFF v2** assumir a composição de leitura (ADR-0032): reavaliar se `/api/v1` migra para trás
  do BFF ou é aposentado com `Sunset`.
- Se surgir uma **terceira versão** (`v3`): a forma `{ plugin, prefix }` já generaliza; reavaliar se vale um
  mapa `apiVersions` explícito no `buildApp`.

---

## Referências

- [ADR-0001](./0001-strangler-fig-over-rewrite.md) — Strangler Fig sobre rewrite.
- [ADR-0025](./0025-http-server-fastify-core-api.md) — HTTP é adapter; composition root único (`:37`).
- [ADR-0028](./0028-http-edge-shell-location.md) — shell de borda (`src/shared/http/`) + composition root (`src/server.ts`).
- [ADR-0031](./0031-partners-registry-module.md) — módulo `partners` (home de Colaboradores).
- [ADR-0032](./0032-transient-http-composition-read-until-bff.md) — composição transitória + `Sunset` (RFC 8594).
- `EPIC-COLLABORATORS-HTTP-V1` (`.claude/.planning/`) — épico que estreia o `/api/v1`.
</invoke>
