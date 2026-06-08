---
paths:
  - "api-collections/**"
  - "scripts/e2e-bruno-*.sh"
---

# Regras invariantes — Coleções Bruno (`.bru`)

Aplicáveis a tudo sob `api-collections/`. Normativo: **[ADR-0038](../../handbook/architecture/adr/0038-bruno-cli-mandatory-and-bru-authoring.md)** (vence). Contexto HTTP-first: [ADR-0037](../../handbook/architecture/adr/0037-http-first-retire-embedded-cli.md).

## Invariante #1 — RODAR o CLI é obrigatório (não negociável)

Um `.bru` **escrito mas não executado** é cobertura ilusória. **Todo `.bru` criado ou alterado DEVE ser executado** via `bru run` contra o servidor real (`pnpm run test:integration:all`, que sobe MySQL+MinIO + boota todos os módulos) e **passar** — ou **reprovar conscientemente** como expected-fail isolado. Nunca dar por "pronto" um `.bru` só lido. O **resultado do CLI é a fonte de verdade**, não a leitura do arquivo.

> Para inspecionar o body real de uma resposta (quando o status não basta): `E2E_JSON_REPORT=1 pnpm run test:integration:all` → `test-results/main.json`.

## Invariante #2 — Sintaxe e fidelidade ao schema

- **Sem comentário `#` no topo** — o parser do Bruno rejeita. O arquivo começa com `meta {`. Notas em `meta { docs }`, `folder.bru`, ou `//` dentro de `script:*`.
- **Body alinhado ao schema Zod real da rota** — ler o schema antes. Cuidado com `z.discriminatedUnion` (exige o discriminador: `mode`, `kind`), `min(1)`, e nomes exatos dos campos.
- **Dados válidos** — CPF/CNPJ por módulo 11 (`scripts/seed-partners.ts`); UUID v4 real (nil UUID `0000…0000` → 400, não 404).

## Invariante #3 — Auth, ordem e asserções

- **Um login por perfil** em `0-auth/` (token via `bru.setVar`, reusado por todos os módulos). Não duplicar login. Respeitar o rate-limit de login (em E2E, `AUTH_LOGIN_RATE_LIMIT_MAX`).
- **Encadeamento por `seq` + `setVar`**; rodar tudo num **único `bru run`** (múltiplas pastas no mesmo processo) para o token/var persistir — pasta-a-pasta perde o estado (bug do 401).
- **Asserções tolerantes ao código real, invariante forte**: validação de querystring pode ser **400** (Zod), não 422 — aceitar o real (`expect([400,422,200]).to.include(status)`), mas **nunca 500**.

## Invariante #4 — Expected-fail isolado

Testes que reprovam por design (regressão de fix / feature pendente) vivem em pasta própria (ex. `z-pending-fixes/`), rodados à parte; não bloqueiam o gate verde principal.

## Especialista

[`bruno-api-client-expert`](../agents/bruno-api-client-expert.md) — autoria/execução de coleções `.bru`. Ancorado em [`handbook/reference/bruno/`](../../handbook/reference/bruno/).
