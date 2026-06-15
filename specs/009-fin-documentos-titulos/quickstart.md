# Quickstart: Financeiro — Fatia 1

**Feature**: `specs/009-fin-documentos-titulos/` · branch `feat/fin-module` (worktree `.claude/worktrees/fin-module`).

> Pré-requisitos: Node 24, pnpm (ADR-0012), Docker (MySQL). Sempre operar deste worktree (2 agentes no repo).

## Setup

```bash
pnpm install
pnpm run secrets:setup            # secrets/*.txt p/ docker-compose
# MySQL local (compose) p/ integração:
pnpm run test:integration         # sobe MySQL via compose --wait e roda a suíte de integração
```

## Migration do módulo (após implementar o schema)

```bash
# editar src/modules/financial/adapters/persistence/schemas/mysql.ts
pnpm run db:generate              # gera migration fin_* (Drizzle Kit) — nunca SQL à mão (ADR-0020)
```

## Subir a borda HTTP

```bash
node src/server.ts                # Fastify; env: CONTRACTS_DATABASE_URL / FINANCIAL_DATABASE_URL etc.
pnpm run worker:outbox            # worker do outbox (eventos do financeiro)
```

## Fluxo de validação (E2E feliz)

1. **Criar NFS-e com retenções** → `POST /api/v1/financial/documents` (Bruto 1.000,00, desc. fonte 50,00, ISS 50, IRRF 15, INSS 110)
   → 201 com **pai R$ 775,00** + 3 filhos (ISS/IRRF/INSS) em `Open`.
2. **Aprovar** → `POST /documents/:id/approve` (como Aprovador) → 200, pai+filhos `Approved`. Como Operador → **403**.
3. **Editar pós-aprovação** → `PATCH` alterando `grossValueCents` → **409/422** (campo vital imutável); alterar `description` → 200.
4. **Desfazer aprovação** → `POST /documents/:id/undo-approval` → 200 (`Open`); se valores mudarem na nova aprovação, filhos são recriados.
5. **Cancelar** em `Open` → `DELETE /documents/:id` → 204 (hard delete). Em `Approved` → **409**.
6. **Timeline** → `GET /documents/:id/timeline` → 200 com `changes[]` (antes→novo) de cada alteração.

## Gate de qualidade (W3)

```bash
pnpm run typecheck && pnpm run format:check && pnpm run lint && pnpm test
```

## Pipeline (ticket)

```bash
pnpm run pipeline:state init FIN-DOCUMENTO-TITULOS --size L
# W0 (RED) → W1 → W2 → W3, conforme plan.md §"Estimativa de Pipeline"
```
