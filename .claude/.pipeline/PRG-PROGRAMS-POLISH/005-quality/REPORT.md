# 005 — W3 Gate de Qualidade — PRG-PROGRAMS-POLISH

> Gate verde. Política de regressão zero respeitada.

## Gate efetivo do ticket: E2E HTTP real

```
MINIO_API_PORT=9100 MINIO_CONSOLE_PORT=9101 pnpm run test:integration:all
[e2e-all] PRINCIPAL:  rc=0  VERDE ✓   (inclui 8-programs)
[e2e-all] REGRESSÃO:  rc=0  VERDE ✓
```

- `main.json`: **0 falhas**; suíte PRINCIPAL 100% verde com `8-programs` integrado.
- Authentik do usuário (porta 9000) intacto; containers `core-api-*` derrubados pelo trap; sem server órfão.

## Suíte unitária / typecheck / lint — intactos por construção

Este ticket **não tocou nenhum `.ts`** (apenas `api-collections/**.bru`, `scripts/e2e-bruno-all.sh`,
`environments/local.bru` e arquivos de pipeline `.md`). Portanto `typecheck`/`format:check`/`lint`/
`pnpm test` permanecem no estado verde de `PRG-PROGRAMS-MODULE` (fechado minutos antes):
2631 pass · 0 fail. Nenhuma superfície dessas checagens foi alterada.

## Regressões consertadas no caminho (não fechadas com vermelho)

1. Conflito de porta MinIO 9000 ↔ Authentik do dev → remap `MINIO_API_PORT=9100` (runner/compose já parametrizam). Serviço alheio preservado.
2. `folder.bru` `docs: |` multilinha rejeitado pelo parser → `docs:` em linha única.

## Tasks da Phase 10

- **T058** ✅ coleção Bruno criada + integrada + executada verde.
- **T060** ✅ coberto pela coleção Bruno (E2E canônico, ADR-0038) — sem curl manual pendente.
- **T061** ✅ citações em `006-traceability/CITATIONS.md`.
- T059/T062 já entregues em `PRG-PROGRAMS-MODULE`.

W3 GREEN. Phase 10 completa. Gestão de Programas (spec 008) integralmente entregue.
