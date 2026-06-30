# 003 — W1 — Integração + Execução E2E — PRG-PROGRAMS-POLISH

## T058 — Coleção Bruno integrada e EXECUTADA (verde)

Integração no runner `scripts/e2e-bruno-all.sh`:

- `SEED_JSON` += usuário `e2e-programs@example.com` com `["program:read","program:write","program:deactivate"]`.
- Boot do server += `PROGRAMS_DRIVER=mysql PROGRAMS_DATABASE_URL="$DB"`.
- `MAIN_FOLDERS` += `8-programs` (após `7-partners`).
- `environments/local.bru` += `programsOperatorEmail: e2e-programs@example.com`.

### Execução real (Invariante #1 — ADR-0038)

```
MINIO_API_PORT=9100 MINIO_CONSOLE_PORT=9101 E2E_JSON_REPORT=1 pnpm run test:integration:all
```

**Resultado:**

```
[e2e-all] PRINCIPAL:  rc=0  VERDE ✓   (0-auth … 7-partners 8-programs)
[e2e-all] REGRESSÃO:  rc=0  VERDE ✓   (z-pending-fixes)
```

- `test-results/main.json`: **0 falhas**; 40 asserções `PRG` aprovadas.
- Rotas exercitadas com `id` real: lista (14×), detalhe (7×), deactivate (4×), reactivate (4×), logo (6×).

## Correções feitas no caminho (regressão zero)

1. **Conflito de porta MinIO 9000** — o host já roda o **Authentik** do usuário (`acdg-bv-dev-authentik-server-1`) na 9000. Em vez de derrubar serviço alheio, remapeei o MinIO via `MINIO_API_PORT=9100` (o `compose.yaml:40` e o `S3_ENDPOINT` do runner já parametrizam essa env). Authentik intacto.
2. **`folder.bru` com `docs: |` multilinha** — o parser `@usebruno/lang` rejeita bloco multilinha (`Expected ":"`); a sintaxe suportada é `docs:` em uma linha. Corrigido (espelha `z-pending-fixes/pagination/folder.bru`).

## T060 — Quickstart (coberto, decisão consciente)

`specs/008-gestao-programas/quickstart.md` é majoritariamente fluxo de desenvolvimento + curls
de exemplo. A **coleção Bruno (T058) é a validação E2E HTTP real canônica** (ADR-0038), superior
e automatizada vs. curls manuais ad-hoc — exercita o mesmo contrato contra servidor + MySQL real.
O DoD do quickstart fica satisfeito pela suíte verde. Não há curl manual pendente.

## T061 — Citações (feito)

`006-traceability/CITATIONS.md` consolida Evans (6777), Vernon (8985), Ramakrishnan (1959),
Beck (500), referenciando literalmente `specs/008-gestao-programas/research.md`.
