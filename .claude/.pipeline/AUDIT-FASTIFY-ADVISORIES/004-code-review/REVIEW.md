# W2 — AUDIT-FASTIFY-ADVISORIES (#573) — REVIEW

**Disciplina:** `code-reviewer` + lente de `security-backend-expert`. **Veredito: APPROVED.**

## Decisões auditadas

- **override vs ignoreGhsas:** optou-se por **corrigir** (override para versões patcheadas), não silenciar
  (`auditConfig.ignoreGhsas`). O advisory some de verdade — não é aceito como risco. Correto.
- **major 10 do @fastify/static:** o risco (swagger-ui declara ^9.1.2) foi **provado inócuo** por 2 testes de
  /docs (boot + serve da UI). Não é fé — é evidência.
- **find-my-way ^9.7.0:** dentro do `^9.0.0` que o fastify pede — zero risco de major.
- **CA4 (Docker):** o Dockerfile copia `pnpm-workspace.yaml` (linhas 64/107) antes do `--frozen-lockfile` →
  os overrides valem no build de prod ([[pnpm-overrides-workspace-yaml-vs-docker-frozen]]).

## Segurança (CWE/OWASP)

- GHSA-c96f-x56v-gq3h (find-my-way) — DoS (CWE-400) na borda HTTP. Fechado.
- GHSA-83w8-p2f5-377r (@fastify/static) — route guard bypass (CWE-284/OWASP A01 Broken Access Control).
  Fechado. Mitigação extra já presente: o /docs é **dev-only** (`NODE_ENV !== 'production'`, app.ts:147),
  então a superfície do bypass nunca esteve exposta em prod — mas corrigimos a dependência mesmo assim.

## Sem afrouxamento

Nenhum advisory silenciado; nenhum gate relaxado. O audit fica verde por **mérito** (deps patcheadas).
