# Quickstart — runner único de integração

> Como rodar o gate de integração consolidado (US4) após a feature 007 entregue.

## Pré-requisitos

- Docker rodando (MySQL + MinIO sobem via `compose.yaml`).
- `@usebruno/cli` disponível (devDependency; `pnpm` coloca no PATH).

## Comando único

```bash
pnpm run test:integration:all
```

O que ele faz (FR-007 a FR-010):

1. Sobe `mysql` + `minio` via `docker compose --wait`.
2. Gera secrets efêmeros e faz boot do server com **todos os módulos** (auth/contracts/partners → MySQL real; storage → MinIO) e **seeds completos e idempotentes**.
3. Aguarda `/health`.
4. Roda toda a coleção unificada: `bru run api-collections/core-api -r --env local`.
5. Reporta um **resumo único** (total de requests/testes, status).
6. `trap EXIT`: derruba o compose (`down -v`) e limpa secrets — sem órfãos.
7. Sai com **exit 0** se tudo passa; **exit ≠ 0** apontando os casos vermelhos.

## Verificar a contract suite do RoleRepository (US2 / T023)

```bash
# in-memory (rápido, parte do pnpm test)
pnpm test

# Drizzle/MySQL real (opt-in + Docker)
pnpm run test:integration:auth
```

Ambos verdes ⇒ paridade de contrato comprovada (SC-005 da 006 fechada).

## Auditar a cobertura (rede de segurança / SC-001)

Abrir `specs/007-integration-test-suite/safety-net/traceability.md`: todas as linhas devem estar em `verde`, com correspondência 1:1 entre os `.bru` originais e os requests da coleção unificada.

## Smoke de regressão do gate (SC-006)

Introduza uma falha proposital num request (ex.: trocar o status esperado) e rode `pnpm run test:integration:all` — deve retornar exit ≠ 0 identificando o caso. Reverter depois.

## Estado final (US4 entregue)

- **Comando único:** `pnpm run test:integration:all` (`scripts/e2e-bruno-all.sh`).
- **Suíte PRINCIPAL: 172 requests / 295 testes — verde** (exit 0). Determina o gate.
- **Sub-suíte `z-pending-fixes/`:** 85 testes de regressão que **passam** (5 tickets de fix implementados)
  (catálogo, distrato, document-content, location header, paginação) — rodam à parte, não bloqueiam.
- **SC-006 (regressão detectável):** a própria `z-pending-fixes` é a prova viva — testes que descrevem o
  estado correto reprovam, e o runner os reporta. Quebrar um teste da PRINCIPAL faz `RC_MAIN != 0` → exit ≠ 0.
- **Rede de cobertura:** `safety-net/` (BDD/TDD 1:1, traceability, findings). Diagnóstico em `runner-findings.md`.
- **Inspeção de body real:** `E2E_JSON_REPORT=1 pnpm run test:integration:all` → `test-results/main.json`.
