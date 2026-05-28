# SPEC — Borda HTTP do módulo Contracts (`EPIC-CONTRACTS-HTTP`)

> **Status do épico:** ✅ **ENTREGUE em 2026-05-28.** Fatias C0-C5 + hardening C3 fechadas ALL-GREEN (todas
> `closed-green` no pipeline W0→W3). Smoke E2E validado contra MySQL real (4/4). Borda HTTP de contratos
> completa: reads, writes, documentos, export CSV — RBAC fino, dual-pool RW (ADR-0026), Zod contract-first
> (ADR-0027), storage S3/MinIO (ADR-0019). Audit trail em `.claude/.pipeline/CONTRACTS-HTTP-*/`. Este arquivo
> é histórico — ver §10 para o estado por fatia e §"Follow-ups" no fim.
>
> **Tipo:** épico (filho de `EPIC-HTTP-CORE-API`) · **Size:** XL (fatiado em §10) · **Status da spec:** aprovada (2026-05-28, Gabriel)
> **ADRs tocados:** `ADR-0023` (4 estados), `ADR-0025` (HTTP adapter), `ADR-0026` (RW split — **retomado aqui**), `ADR-0027` (Zod contract-first), `ADR-0006`/`0028` (modular/shell), `ADR-0024` (auth — rotas protegidas), `ADR-0022` (timeline/read-models), `ADR-0019` (storage), `ADR-0014`/`0020` (MySQL)
> **Método:** spec-driven nativo (`../runbooks/spec-driven-pipeline.md`). Decisões 2026-05-28 (Gabriel): **só planejar** nesta etapa; **RW split SIM** no composition.

## 1. Problema & contexto

O módulo `contracts` está completo internamente (agregados Contract/Amendment/Document, ~14 use cases, repos Drizzle, CLI) mas só é acessível via **CLI**. O contrato REST legado (`handbook/api_documentations/contracts/openapi.yaml`, 13 endpoints) precisa ser reexposto como **ACL** sobre o domínio novo. A borda auth HTTP fechou (H0→H2 do `EPIC-HTTP-CORE-API`), entregando o **mecanismo de proteção** (`requireAuth`/`authorize`) e o **padrão de composition + plugin factory**. É também o lugar onde o **RW split (ADR-0026)** rende de verdade — as listagens/consultas de contratos são read-heavy (ADR-0026:22).

## 2. User stories

- Como **operador (via BFF)**, quero `GET /api/v2/contracts` (listar) e `GET /api/v2/contracts/{id}` (detalhe), para consultar contratos.
- Como **operador**, quero `GET /api/v2/contracts/{id}/history` (timeline — ADR-0022), para auditar o ciclo de vida.
- Como **operador**, quero `POST /api/v2/contracts` (criar — Pending ou Active) e `POST /contracts/{id}/activate` (ativar com documento assinado), para cadastrar e ativar.
- Como **operador**, quero `POST /api/v2/contracts/{id}/amendments` (aditivo) e homologar, para ajustar valor/prazo.
- Como **operador**, quero anexar documentos (upload, assinado, liquidação, distrato), para compor o dossiê.
- Como **dev/ops**, quero que toda rota de contracts exija **access token válido** + permissão (RBAC), para proteger dados de negócio.

## 3. Critérios de aceitação (alto nível — cada ticket detalha)

- **CA1** — Toda rota sob `/api/v2/contracts/*` exige `requireAuth` (401 sem token; do `auth/public-api/http.ts`); mutações exigem `authorize(permission)` (403). *(diferente das rotas auth, que são públicas.)*
- **CA2** — Reads (`list`/`get`/`history`) roteiam para o **pool reader**; mutações para o **writer** (ADR-0026). Single-node: ambos no mesmo host.
- **CA3** — Cada rota valida shape por **Zod** (ADR-0027) → smart constructor do domínio → use case → `Result`→HTTP; OpenAPI 3.1.1 gerado.
- **CA4** — Os estados do ADR-0023 são respeitados: `create` (Pending|Active), `activate` (Pending→Active, exige doc+signedAt), `end` (Terminated); aditivo só em `Active` (RN-CV-01).
- **CA5** — ACL: nenhum vazamento do shape legado que conflite com o domínio novo; o `openapi.yaml` legado é **referência**, não cópia literal.
- **CA6** — Domínio/application sem Fastify/Zod (ADR-0006/0027); plugin consome use cases via composition (não conhece adapters).

## 4. Não-objetivos / fora de escopo (do épico)

- **`GET /contracts/pdf`** (render de PDF) — gap sem use case; ticket próprio/diferido (avaliar lib de PDF — supply-chain ADR-0011).
- **`PUT /contracts/{id}` como edição livre de campos** — o domínio novo **não** tem update livre (valor/prazo derivam de aditivos homologados). Mapeado para **transições** (activate/end), não edição. ACL resolve por endpoint de ação.
- **`DELETE /contracts/{id}` como hard-delete** — não existe (tripwire ADR-0019); mapeia para `end`/terminate (Distrato).
- CLI de contracts permanece (não é substituída).
- Mudança de domínio/use case (já prontos — só expor). Novos use cases só se um gap exigir (ticket próprio).

## 5. Clarificações (decisões)

- **D1 — Só planejar:** esta etapa entrega **apenas a spec-mãe** + fatiamento; nenhum `src/` tocado até a aprovação e o W0 de cada ticket. (2026-05-28, Gabriel.)
- **D2 — RW split SIM:** o composition contracts HTTP nasce com **writer/reader pools** (ADR-0026, retoma o I1 diferido no lugar onde rende). `list/get/history` → reader; mutações → writer. `CONTRACTS_DATABASE_URL` (writer) + `CONTRACTS_READER_URL` opcional; single-node aponta ambos ao mesmo host. (2026-05-28, Gabriel.)
- **D3 — Rotas protegidas:** contracts é dado de negócio → toda rota exige `requireAuth` (verify access JWT) + `authorize(permission)` quando mutável. O mecanismo vem do `auth` via **`auth/public-api/http.ts`** (cross-módulo permitido, ADR-0006/0024). Permissões: `contract:read`, `contract:write` (+ granularidade a definir por ticket).
- **D4 — Versão/paths:** rotas sob **`/api/v2/contracts/*`** (ADR-0025); o legado `/contracts` é ACL/referência. PUT/DELETE legados viram **endpoints de ação** (`/activate`, `/end`) coerentes com os estados.
- **D5 — RESTful do domínio:** aditivo vira sub-recurso `POST /contracts/{id}/amendments` (não `/contracts/aditive` legado); documentos sob `/contracts/{id}/documents` (não `/files/contracts`). ACL moderniza a forma preservando a intenção.

## 6. Plano técnico de alto nível (sem código)

```
src/modules/contracts/adapters/http/
  composition.ts  — buildContractsHttpDeps({ driver, writerUrl, readerUrl }):
                     dual-pool (writer/reader); monta contractRepo/amendmentRepo/documentRepo
                     (reads→reader, writes→writer) + outbox + clock + storage; instancia os use cases.
                     ContractsHttpDeps = use cases instanciados + shutdown (fecha os 2 pools).
  schemas.ts      — Zod por rota (request/response) — contract-first.
  routes/         — handlers finos: parse → use case → sendResult(map).
  plugin.ts       — contractsHttpPlugin(deps, { requireAuth, authorize }): FastifyPluginAsync,
                     sub-escopo /contracts; aplica requireAuth (preHandler) + authorize por rota.
src/modules/contracts/public-api/http.ts — exporta contractsHttpPlugin + buildContractsHttpDeps.
src/server.ts   — compõe authDeps + contractsDeps; passa requireAuth (de auth) ao plugin de contracts;
                  buildApp({ routes: [authHttpPlugin(authDeps), contractsHttpPlugin(contractsDeps, hooks)] }).
```

**Mapa endpoint (ACL) → use case:**

| `/api/v2/contracts/*` | use case | pool | authz |
| :-- | :-- | :-- | :-- |
| `GET /` (list) | `listContracts` | reader | `contract:read` |
| `GET /{id}` | `getContract` | reader | `contract:read` |
| `GET /{id}/history` | `getContractTimeline` | reader | `contract:read` |
| `POST /` (create Pending\|Active) | `createContract`/`createPendingContract` | writer | `contract:write` |
| `POST /{id}/activate` | `activateContract` | writer | `contract:write` |
| `POST /{id}/end` | `endContract` | writer | `contract:write` |
| `POST /{id}/amendments` | `createAmendment` | writer | `contract:write` |
| `POST /{id}/amendments/{aid}/homologate` | `homologateAmendment` | writer | `contract:write` |
| `POST /{id}/documents` (+categoria: signed/settle/withdrawal) | `uploadDocument`/`attachSignedDocument` | writer | `contract:write` |
| `GET /export.csv` | `listContracts` + serialização CSV | reader | `contract:read` |
| _(pdf, update-livre)_ | — gap | — | fora de escopo |

## 7. Constitution check

| Fonte | Exigência | Como o épico adere |
| :-- | :-- | :-- |
| `ADR-0023` | 4 estados; aditivo só em Active (RN-CV-01); activate exige doc+signedAt (RN-CV-02) | rotas espelham transições; sem update livre (§4) |
| `ADR-0026` | writer/reader; read-after-write no primário; um escritor | D2 dual-pool; reads→reader, writes→writer; após escrita crítica lê do writer |
| `ADR-0025`/`0027` | HTTP adapter; `/api/v2`; Zod borda; OpenAPI gerado | §6; CA3 |
| `ADR-0024`/`0006` | auth via HTTP; cross-módulo só via public-api | requireAuth/authorize do `auth/public-api/http.ts`; D3 |
| `ADR-0022` | timeline via projeção | `getContractTimeline` em `GET /{id}/history` |
| `ADR-0019` | sem hard-delete (tripwire) | DELETE→end/terminate, nunca hard-delete (§4) |
| `ADR-0014`/`0020` | um escritor por DB; MySQL único | writer pool único; reader read-only |

## 8. Riscos & mitigações

| Risco | Sev. | Mitigação |
| :-- | :-- | :-- |
| RW split + read-after-write (criar→listar logo após) ler da réplica stale | média | leitura crítica pós-escrita no **writer** (ADR-0026:99); roteamento explícito por use case |
| ACL do legado divergir do domínio novo (PUT/DELETE/settle) | média | `requirements-engineer` traduz cada endpoint legado em requisito por ticket; gaps explícitos (§4) |
| Cross-módulo (contracts usa auth) ferir ADR-0006 | baixa | só via `auth/public-api/http.ts` (mecanismo authn/authz) — nunca `auth/domain`/`application` |
| Épico inchar (13 endpoints + export + RW split) | alta | fatiamento incremental (§10); reads primeiro (RW split), depois writes, depois docs/export |
| PDF/CSV (render/serialização) | média | CSV = serialização simples (ticket); PDF = gap diferido (lib via ADR-0011) |

## 9. Definition of Done (épico)

- [ ] `/api/v2/contracts/*` protegido (requireAuth + authorize), reads no reader / writes no writer (ADR-0026).
- [ ] CRUD core + aditivo + documentos expostos, respeitando os 4 estados (ADR-0023).
- [ ] OpenAPI 3.1.1 com todos os paths; Zod na borda; domínio sem framework.
- [ ] Cada ticket `closed-green` com sua `001-spec/SPEC.md`; smoke E2E (espelha `AUTH-HTTP-E2E-SMOKE`).
- [ ] Gaps (pdf, update-livre) registrados como diferidos/tickets próprios.

## 10. Fatiamento em tickets (ordem por dependência)

| # | Ticket | Size | Entrega | Depende | Status |
| :-- | :-- | :-- | :-- | :-- | :-- |
| C0 | `CONTRACTS-HTTP-COMPOSITION-RW` | M | composition root contracts HTTP com **dual-pool** (writer/reader, ADR-0026) + `contractsHttpPlugin(deps, hooks)` factory + 1ª rota read `GET /api/v2/contracts` (list, reader) protegida (requireAuth). **Retoma o I1.** | EPIC-HTTP H2 | ✅ closed-green |
| C1 | `CONTRACTS-HTTP-READS` | S | `GET /{id}` (get) + `GET /{id}/history` (timeline) — reads no reader; `authorize('contract:read')` | C0 | ✅ closed-green |
| C2 | `CONTRACTS-HTTP-WRITES-CORE` | M | `POST /` (create Pending\|Active) + `POST /{id}/activate` + `POST /{id}/amendments` + homologate — writer; `authorize('contract:write')`; read-after-write no writer | C0 | ✅ closed-green |
| C3 | `CONTRACTS-HTTP-DOCUMENTS` | M | `POST /{id}/documents` (upload + categorias signed/settle/withdrawal via `uploadDocument`/`attachSignedDocument`) + supersede; storage (ADR-0019) | C0, C2 | ✅ closed-green |
| — | `CONTRACTS-HTTP-DOCS-HARDENING` | S | follow-ups 🟡 do C3: ownership E3 (`:documentId`↔`:id`) + OpenAPI corpo binário + registro do débito de atomicidade do E2 | C3 | ✅ closed-green |
| C4 | `CONTRACTS-HTTP-EXPORT-CSV` | S | `GET /export.csv` (listContracts + serialização CSV, reader) | C1 | ✅ closed-green |
| C5 | `CONTRACTS-HTTP-E2E-SMOKE` | M | smoke E2E (docker + server + fetch) espelhando `AUTH-HTTP-E2E-SMOKE`; valida dual-pool + authz | C0-C4 | ✅ closed-green |
| — | `CONTRACTS-HTTP-PDF` _(diferido)_ | ? | render PDF — gap; avaliar lib (ADR-0011) | — | ⬜ diferido |

**Caminho crítico:** C0 → C1/C2 (paralelos) → C3 → (hardening) → C4 → C5. PDF diferido. **Tudo entregue (2026-05-28).**

## 11. Recursos por etapa (agentes · skills · docs)

### Transversais
- Orquestração: `contratos-orchestrator` + `pipeline-maestro`. Waves: `tdd-strategist` (W0) · `code-reviewer` (W2) · `ts-quality-checker` (W3).
- Spec por ticket: `001-spec/SPEC.md` via `../templates/spec.md`.
- Segurança da borda: agente `security-backend-expert` (revisão authz/401/403, sem vazar dado).

### C0 — composition + dual-pool
- Agentes: `mysql2-driver-expert` (**canônico** — dual pool, timeouts, 2 endpoints) · `drizzle-orm-expert` (injeção reader/writer nos repos) · `fastify-server-expert` (plugin factory + preHandler) · `mysql-database-expert` (replication/read-after-write).
- Skills: `ports-and-adapters` (ports por intenção: reader vs writer).
- Docs: `ADR-0026` (`:98-101`), `handbook/reference/mysql2/`, `drizzle/{connect-overview,transactions}.mdx`, padrão `contracts/cli/{context,drivers/mysql}.ts`, `auth/adapters/http/composition.ts` (referência viva).

### C1/C2/C3 — rotas
- Agentes: `fastify-server-expert` (rotas + schema) · `drizzle-orm-expert`+`mysql-database-expert` (EXPLAIN das listagens/paginação — reader).
- Skills: `requirements-engineer` (**ACL**: traduzir cada endpoint legado em requisito; resolver gaps) · `ports-and-adapters` · `modular-monolith` (contracts↔auth via public-api).
- Docs: `handbook/api_documentations/contracts/openapi.yaml` (ACL), `ADR-0023` (estados/RN-CV), `handbook/domain_questions/contratos/`, `auth/adapters/http/{plugin,schemas}.ts` (padrão).

### C4 — export CSV
- Skills: `application-cli-builder`/formatters (reuso da serialização) · `nodejs-fs-scripter` (streaming se grande).

### C5 — E2E
- Agentes: `docker-compose-expert` · `nodejs-runtime-expert`. Espelha `scripts/e2e-auth.sh` + `tests/e2e/auth-smoke.e2e.ts`.

---

## 12. Fechamento (2026-05-28)

**Épico ENTREGUE.** As 7 fatias (C0-C5 + hardening C3) fecharam `closed-green` no pipeline W0→W3 no mesmo
dia. Estado final do código:

- **Borda HTTP de contratos** sob `/api/v2/contracts`: list, `GET /{id}`, `/{id}/history`, `POST /`,
  `/{id}/activate`, `/{id}/amendments`, `/{amendmentId}/homologate`, `/{id}/documents` (+ aditivo),
  `/{id}/documents/{documentId}/supersede`, `export.csv` — todas com `requireAuth`; RBAC fino
  (`contract:read`/`contract:write`) nas protegidas.
- **Dual-pool RW** (ADR-0026) com reader/writer; **Zod contract-first** + OpenAPI (ADR-0027), incl. corpo
  binário (`format: binary`) e response `text/csv`; **storage S3/MinIO** (ADR-0019); **outbox** preservado.
- **Validação E2E** (`pnpm run test:e2e:contracts`, Docker): server real + MySQL dual-pool (writer=root,
  reader=`readonly_bi`) + seed RBAC via env — smoke 4/4.

**Bugs latentes corrigidos no caminho** (expostos por montar auth+contracts no mesmo MySQL — C5):
1. Seed RBAC inline não persistia o `Role` → FK `auth_user_role` quebrava em mysql (`applyRbacSeed` agora
   salva o role antes do user).
2. Migrations puladas por journal `__drizzle_migrations` compartilhado → `migrationsTable` por módulo.

**Follow-ups (não-bloqueantes, `.claude/.planning/`):**
- `HOMOLOGATE-DISTRIBUTED-ATOMICITY.md` — atomicidade distribuída do `homologate` e do upload+attach (E2);
  resolução = épico `CTR-HOMOLOGATE-ATOMIC-TX` quando priorizado.
- **Produção (Fase 2+):** barreira de ambiente para o seed via env (recusar `CORE_API_E2E` em prod) +
  migração do journal `__drizzle_migrations` legado antes do 1º deploy (ver C5 REVIEW notas 1-2).
- `CONTRACTS-HTTP-PDF` — render PDF, diferido (gap do contrato legado; avaliar lib sob ADR-0011).

> **Status:** ✅ **ENTREGUE (2026-05-28, Gabriel).** Histórico/auditável — não é mais plano ativo.
> Audit trail completo em `.claude/.pipeline/CONTRACTS-HTTP-*/` e `CONTRACTS-HTTP-DOCS-HARDENING/`.
