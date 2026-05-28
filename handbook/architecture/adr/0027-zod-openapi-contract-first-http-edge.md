[← Voltar para ADRs](./README.md)

# ADR-0027: Zod + zod-openapi como contract-first da borda HTTP (validação de I/O + OpenAPI 3.1.1)

- **Status:** Accepted
- **Date:** 2026-05-27
- **Deciders:** Gabriel Aderaldo + Arquiteto técnico
- **Relacionado:** [ADR-0025](./0025-http-server-fastify-core-api.md) (Fastify como adapter de borda), [ADR-0006](./0006-modular-monolith-core-api.md) (domínio sem framework), [ADR-0011](./0011-supply-chain-hardening.md) (supply-chain), [ADR-0024](./0024-identity-and-rbac-auth-module.md) (auth HTTP), [ADR-0023](./0023-contract-lifecycle-pending-state.md) (contracts HTTP — `openapi.yaml` legado), [Inquiry-0005](../../inquiries/0005-supply-chain-axios-and-dependency-hardening.md) (dep hardening), [Inquiry-0007](../../inquiries/0007-http-framework-fastify-vs-express.md) (Fastify)

---

## Contexto

O [ADR-0025](./0025-http-server-fastify-core-api.md) adotou Fastify como adapter de borda e fixou "validação de **todo** request body via smart constructors do domínio antes de chamar o use case" (`0025:36`) e "validação por schema, hooks e Pino" (`0025:47`) — **sem cravar o mecanismo de schema**. Fastify nativamente usa JSON Schema (Ajv). Faltam três garantias na borda:

1. **Validação de shape do request/response** (campos presentes, tipos primitivos) com erro 400 cedo, antes mesmo do smart constructor.
2. **Tipos TypeScript derivados** do schema (sem digitar o tipo do payload à mão e arriscar drift).
3. **Documentação OpenAPI da API** que não derive do código manualmente — o `openapi.yaml` legado de contracts ([ADR-0023](./0023-contract-lifecycle-pending-state.md)) é **3.0.3 mantido à mão**, fonte garantida de drift entre doc e comportamento real.

A escolha do mecanismo de schema da borda é decisão transversal: define o padrão para **todo** o HTTP (auth e contracts) e adiciona dependências (governadas pelo [ADR-0011](./0011-supply-chain-hardening.md)).

---

## Decisão

Adotar **Zod v4 + `zod-openapi` + `fastify-zod-openapi`** como o **contract-first da borda HTTP**: um schema Zod por rota é a **única fonte** de validação de I/O, tipos TS e documentação OpenAPI.

### Fronteira (invariante dura)

- **Zod vive exclusivamente em `adapters/http/`.** Domínio e application **nunca** importam Zod — preserva `0025:30` ("domínio e application permanecem sem framework") e o [ADR-0006](./0006-modular-monolith-core-api.md). Falha esperada se violado: lógica de negócio acoplada a Zod.
- **Divisão de responsabilidade (não é redundância — são camadas distintas):**
  - **Zod (borda):** valida o *envelope* (JSON bem-formado, campos/tipos primitivos), **serializa a resposta** e **gera o OpenAPI**. Shape inválido → **400** antes do use case.
  - **Smart constructors (domínio):** validam **invariante de negócio** (`Email`, `Password`, `Money`…) e retornam `Result<T,E>`. Regra violada → erro de domínio mapeado para **4xx**.
  - **Fluxo:** `request → Zod (shape, 400) → smart constructors (regra, Result→4xx) → use case → Result→HTTP`.

### OpenAPI 3.1.1

- O documento é **gerado dos schemas Zod**, nunca escrito à mão. Versão-alvo **3.1.1** — `zod-openapi` suporta **3.1.0/3.1.1 apenas** (3.0.x e 3.2.0 fora). 3.1.x já é alinhado ao JSON Schema 2020-12.
- O `openapi.yaml` legado (3.0.3, `handbook/api_documentations/contracts/openapi.yaml`) deixa de ser alvo e passa a ser **referência de migração/ACL** para as rotas de contracts (ADR-0023). Não é mantido à mão como contrato vivo.
- `@fastify/swagger` + `@fastify/swagger-ui` servem o documento gerado (ambos já documentados em `handbook/reference/fastify-plugins/`).

### Supply-chain (ADR-0011)

- `zod`, `zod-openapi`, `fastify-zod-openapi`, `@fastify/swagger`, `@fastify/swagger-ui` entram via `pnpm` + `approve-builds`, versões **pinadas**, auditadas no PR que instala (padrão do Inquiry-0005). Nunca `npm`.

---

## Consequências

### Positivas

- **Single source of truth** na borda: um schema → validação de I/O + tipos + OpenAPI. Zero drift doc↔código.
- Erro de shape barrado **antes** do domínio (400 cedo, mensagem estável).
- Documentação viva da API, versionada com o código.
- Domínio intocado — Zod não cruza a fronteira do adapter.

### Negativas

- Dependências novas (Zod v4 + cadeia) — superfície de supply-chain (mitigada por ADR-0011).
- **Sobreposição parcial deliberada** Zod (shape) × smart constructor (regra): o mesmo campo é "tocado" duas vezes em camadas diferentes. É intencional, não DRY-violation.
- Zod v4 é recente; `fastify-zod-openapi` (v5.x) tem adoção menor que o ecossistema Ajv nativo.

### Neutras

- 3.2.0 fica como *north-star*: reavaliar quando `zod-openapi` suportar (ver §Quando re-avaliar).

---

## Alternativas Consideradas

### A. JSON Schema nativo do Fastify (Ajv)
**Rejeitada porque:** exige declarar tipos TS à mão (drift) e o OpenAPI ainda precisaria de geração separada. Verboso e sem inferência.

### B. TypeBox
**Rejeitada nesta fase porque:** entrega inferência + JSON Schema, mas Zod é o padrão de fato do ecossistema, mais expressivo em refinements e com `zod-openapi` maduro para o pipeline OpenAPI.

### C. Só smart constructors (sem schema de borda)
**Rejeitada porque:** perde a geração de OpenAPI e a validação de shape cedo; o domínio passaria a receber `unknown` cru e a 400-vs-422 ficaria ambígua.

### D. Manter `openapi.yaml` à mão
**Rejeitada porque:** drift garantido entre doc e comportamento — exatamente o problema que originou esta decisão.

---

## Quando Re-avaliar

- Quando `zod-openapi` suportar **OpenAPI 3.2.0** (hoje só 3.1.0/3.1.1) — então avaliar bump do alvo.
- Se Zod v4 introduzir breaking change que custe mais que o ganho.
- Se a sobreposição shape×regra virar fonte de bug/confusão recorrente.

---

## Invariantes normativas

- **Zod só em `adapters/http/`.** Domínio/application nunca importam Zod.
- **OpenAPI é gerado dos schemas Zod**, nunca escrito à mão; alvo **3.1.1**.
- **Smart constructors mantêm a regra de negócio** — Zod valida shape, não substitui invariante de domínio.
- Dependências entram via `pnpm` + `approve-builds`, pinadas (ADR-0011).

---

## Referências

- [ADR-0025](./0025-http-server-fastify-core-api.md) — Fastify adapter de borda (`:30`, `:36`, `:47`).
- [ADR-0006](./0006-modular-monolith-core-api.md) — domínio sem framework.
- [ADR-0011](./0011-supply-chain-hardening.md) — supply-chain (`approve-builds`, pnpm).
- [ADR-0023](./0023-contract-lifecycle-pending-state.md) — `openapi.yaml` legado (3.0.3) como ACL.
- `handbook/reference/fastify-plugins/{swagger,swagger-ui}.md` — serviço do documento.
- [fastify-zod-openapi](https://github.com/samchungy/fastify-zod-openapi) · [zod-openapi](https://github.com/samchungy/zod-openapi) · [Zod](https://zod.dev/) · [OpenAPI 3.1.1](https://spec.openapis.org/oas/v3.1.1.html).
