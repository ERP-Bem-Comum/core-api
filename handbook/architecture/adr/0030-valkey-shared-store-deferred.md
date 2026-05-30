[← Voltar para ADRs](./README.md)

# ADR-0030: Store compartilhado (Valkey via ioredis) — adiado até multi-instância

- **Status:** Proposed
- **Date:** 2026-05-30
- **Deciders:** Arquiteto técnico + Gabriel Aderaldo
- **Relacionado:** [ADR-0011](./0011-supply-chain-hardening.md) (supply-chain), [ADR-0005](./0005-thin-bff-gateway.md) (BFF burro), [ADR-0021](./0021-aws-primary-magalu-pbe-supersedes-0007.md) (cloud), [ADR-0024](./0024-identity-and-rbac-auth-module.md) (auth)
- **Discussão:** [`.claude/.planning/REDIS-RATE-LIMIT-STORE.md`](../../../.claude/.planning/REDIS-RATE-LIMIT-STORE.md)

---

## Contexto

O hardening de auth (épico `EPIC-AUTH-SECURITY-HARDENING`, BE-REC-001) deixou **uma única peça de
estado in-memory: o rate-limit** (`@fastify/rate-limit`). O account lockout já persiste em MySQL
(`CTR-AUTH-LOCKOUT-PERSISTENCE`). Rate-limit in-memory só é deficiente **com múltiplas instâncias**
do core-api (teto real `N × max`, zera no restart). Hoje a topologia (ADR-0005: BFF burro → core-api)
**não declara escala horizontal** do core-api, e o BFF já throttla por origem (defense-in-depth).

## Decisão (proposta)

1. **Adiar** a adoção de um store compartilhado **enquanto o core-api for single-instance** (YAGNI).
   Manter o rate-limit in-memory; documentar a dívida (este ADR + comentário em `src/shared/http/app.ts`).
2. **Quando** a escala horizontal entrar no roadmap, adotar **Valkey** (engine) via **`ioredis`**
   (cliente exigido pelo `@fastify/rate-limit`), **escopo store compartilhado** (rate-limit + cache +
   sessão futura — amortiza o custo de infra), promovendo este ADR a **Accepted** + tickets de infra
   (compose/secrets/ElastiCache ou Magalu) e wiring (`redis:` + `skipOnError: true`).

### Por que Valkey (não Redis)

Redis mudou para RSALv2/SSPL em 2024. **Valkey** (fork OSS pela Linux Foundation) é wire-compatible
→ `ioredis` funciona sem mudança e evita risco de licença num ERP. Redis upstream só se um managed
service alvo não oferecer Valkey.

## Gatilho de ativação

Abrir o ticket de adoção **antes** de subir a 2ª instância do core-api. Enquanto single-instance, o
lockout por conta (MySQL) cobre brute force/spraying e o teto in-memory é funcionalmente correto.

## Alternativas consideradas

- **Custom `store` sobre MySQL:** evita novo serviço, mas rate-limit é alta-frequência (cada request)
  → carga/latência indevidas no RDBMS. Subótimo; só se houver veto duro a novo serviço.
- **Manter in-memory indefinidamente:** inviável sob escala horizontal.

## Consequências

- **Positiva:** não paga custo de infra antes da necessidade; direção (Valkey, escopo geral) já fixada
  para adoção rápida quando preciso.
- **Negativa:** dívida técnica explícita — rate-limit não escala horizontalmente até a promoção deste ADR.
- **Neutra:** o comentário em `app.ts` aponta para esta decisão.

## Referências

- [`.claude/.planning/REDIS-RATE-LIMIT-STORE.md`](../../../.claude/.planning/REDIS-RATE-LIMIT-STORE.md) — análise das opções.
- `handbook/reference/fastify-plugins/rate-limit.md` — `redis`/`store`/`skipOnError`.
