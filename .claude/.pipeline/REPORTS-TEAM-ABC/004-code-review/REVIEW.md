# Code Review — REPORTS-TEAM-ABC (#238 · REP-1)

**Reviewer:** `code-reviewer` + `security-backend-expert` (lente LGPD/segurança).
**Escopo:** projeção `collaborator-projection.ts`, módulo `reports/*`, wiring `server.ts`, agregado `Collaborator`, boundary ADR-0006.

---

## Round 1 — **REJECTED**

### 🔴 F1 (Blocker) — pool MySQL reaberto por requisição HTTP
`collaborator-projection.ts` (`listCollaboratorsForProjection`) abria `openPartnersMysql` (`createPool` + `SELECT 1`) e `handle.close()` (`pool.end()`) **a cada `.list()`**, e o adapter do `reports` chamava isso **por requisição** (`GET /reports/team`). Reintroduzia o anti-padrão "pool por operação" identificado como causa estrutural do `handbook/incidents/0001-prod-rds-connection-exhaustion-2026-07-10.md` (quase-apagão do RDS, `max_connections=60`), agora numa rota HTTP pública (pior que o molde `supplier-projection`, chamado 1× por job batch). **CWE-400 / OWASP API4:2023.**

### 🟡 F2 (Major) — `createDrizzleCollaboratorReader.list()` é `SELECT *` sem `LIMIT`
Over-fetch de todas as colunas (incl. PII) para memória do processo antes do filtro da projeção. **Não é vazamento** (a projeção filtra antes da fronteira; schema Zod filtra de novo).

---

## Correção (round 2)

### F1 — **CORRIGIDO**
Trocado por `openCollaboratorProjectionReader({ connectionString }) → { list, close }` **boot-scoped** (molde `buildPartnersReadPort`): pool aberto **uma vez** em `buildReportsHttpDeps` no boot, reusado entre requisições, fechado só no `shutdown()` (`server.ts:394`). Adapter `TeamReportReadFromPartners` passou a receber o `list` do reader, nunca a connection-string. Validado: CA4 verde no MySQL real com o reader boot-scoped; `pnpm test` 0 fail.

### F2 — **DÍVIDA ACEITA (documentada)**
`createDrizzleCollaboratorReader.list()` é **compartilhado** com a rota de collaborators do `partners` (`partners/adapters/http/composition.ts:331`). Estreitar colunas alteraria comportamento fora do escopo do #238 e sem cobertura própria. Não é vazamento (CA3 comprovado). `par_collaborators` é do tamanho da organização (dezenas/centenas). Follow-up opcional se a tabela crescer.

---

## Round 2 — **APPROVED**

### LGPD (CA1/CA2/CA3) — comprovado por leitura de código
- Projeção copia **campo a campo** as 9 colunas; **sem spread** do agregado. Nenhum campo sensível (`cpf, rg, dateOfBirth, race, genderIdentity, sex, foodCategory, completeAddress, telephone, emergencyContact*, allergies, isPwd, bankAccount, pixKey, email`) é lido.
- Response Zod (`teamMemberSchema`) opera em modo **strip** (Zod v4) + `fast-json-stringify` compilado do JSON Schema → **dupla defesa em profundidade** (confirmado no código do serializer `fastify-zod-openapi`).
- RBAC `preHandler: [requireAuth, authorize('collaborator:read')]` — ordem certa, fail-closed. Handler sem input do usuário (sem query/body/params) → sem vetor de injection. Erro 5xx via `sendResult` devolve envelope genérico (sem leak de detalhe interno).
- Boundary ADR-0006: `reports` importa `partners` **só** via `public-api` (confirmado por grep). IDs UUID v4 opacos (sem IDOR).

### Regras do domínio/adapters
- Zero `throw` cruzando borda (adapters devolvem `Result`); zero `class`; `import type` + extensões `.ts`; error EN kebab-case.

**Veredito final: APPROVED** (2 rounds, dentro do limite).
