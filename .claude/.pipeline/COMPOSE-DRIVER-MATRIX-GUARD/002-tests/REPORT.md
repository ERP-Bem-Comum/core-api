# W0 — COMPOSE-DRIVER-MATRIX-GUARD — RED (demonstrado por mutação)

**Agente:** `docker-compose-expert` (auditoria) + `tdd-strategist` (teste). Origem: análise do que falta ao #404 — descoberto que `compose.yaml` (main==dev) **já declara** os 7 módulos; o gargalo #374/#444 é OPS (deploy), não código. Lacuna real: **nenhum teste trava a completude da matriz** — remover um `*_DRIVER` do compose só seria pego por um boot crashando prod (o guard do #456, exit 78).

## Auditoria (docker-compose-expert, read-only)

Matriz do serviço `http` vs `readModuleDriverConfigs` (server.ts:124): **completa, 0 lacuna**. 6 módulos com URL própria (auth, programs, contracts, partners, financial, budget-plans) têm `<DRIVER>: mysql` + export do secret + secret no serviço + secret top-level; `reports` tem `REPORTS_DRIVER: mysql` + a cascata (`REPORTS_* ?? *`, server.ts:268) coberta pelas 4 fontes. Nenhum teste existente trava isso (`module-driver-config.test.ts` cobre só a função; os `*-compose.test.ts` cobrem healthcheck/depends_on, não a matriz de drivers).

## RED (prova de guarda por mutação)

`tests/infra/module-driver-matrix-compose.test.ts` — 24 casos (asserção de texto sobre `compose.yaml`, zero-dep, roda sem Docker).

```
compose completo           → 24/24 pass
remover BUDGET_PLANS_DRIVER → 23 pass · 1 FAIL:
  "BUDGET_PLANS_DRIVER: mysql ausente no serviço http — módulo degradaria p/ memory em prod (#374/#444)"
restaurar                  → 24/24 pass
```

O teste pega a lacuna EXATA do #374 na config do deploy, um nível acima do guard do #456.
