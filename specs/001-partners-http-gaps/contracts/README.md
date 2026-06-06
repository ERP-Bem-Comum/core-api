# Contracts — Borda HTTP `/api/v1` (épico `partners-http-gaps`)

**Feature**: `specs/001-partners-http-gaps/contracts/` · Fase 1 do plan.

> A rota HTTP é a fronteira (ADR-0025/0028). Cada contrato: **input** (Zod, validado na entrada), **output**
> (DTO/`Response`), **permissão** (RBAC), **erros** (envelope `{error:{code,message,requestId}}`). Devem
> **casar 1:1** com os server functions que o BFF descreve em `web-app/specs/008-partners/contracts/README.md`
> (FR-008). Schemas Zod executáveis ficam em `src/modules/partners/adapters/http/*-schemas.ts`.

## Convenções (do recon — `supplier-plugin.ts`)

- `preHandler: [requireAuth, authorize(PERM)]`; schema `satisfies FastifyZodOpenApiSchema`.
- Erro mapeado por `ReadonlySet` código→status (404/409/400/403/503; default 422); `requestId = currentCorrelationId() ?? reply.request.id`.

## US-001 — Import de colaboradores

| Server fn (BFF)       | Método/Rota                         | Input                        | Output                                           | Permissão            |
| --------------------- | ----------------------------------- | ---------------------------- | ------------------------------------------------ | -------------------- |
| `importCollaborators` | `POST /api/v1/collaborators/import` | multipart `file` (CSV UTF-8) | `{ created: number, failed: [{ line, error }] }` | `collaborator:write` |

- Borda: multipart → texto → `parseCsv` (util) → cada record → `RegisterCollaboratorCommand` (Zod) → `importCollaborators` → adapta `{importedCount, failed:[{index,error}]}` → `{created, failed:[{line,error}]}` (`index+2`→`line`, considerando header).
- Erros: arquivo vazio → `{created:0, failed:[]}`; malformado → 400 `csv-malformed`.

## US-003 — Export de fornecedores

| Server fn         | Método/Rota                    | Input                                 | Output                                           | Permissão       |
| ----------------- | ------------------------------ | ------------------------------------- | ------------------------------------------------ | --------------- |
| `exportSuppliers` | `GET /api/v1/suppliers/export` | query `search?/active?/categories?[]` | `text/csv` (BOM + RFC 4180) via `suppliersToCsv` | `supplier:read` |

## US-004 — Catálogo de categorias

| Server fn               | Método/Rota                                | Input | Output                                   | Permissão       |
| ----------------------- | ------------------------------------------ | ----- | ---------------------------------------- | --------------- |
| `listServiceCategories` | `GET /api/v1/suppliers/service-categories` | —     | `string[]` (39 códigos legados literais) | `supplier:read` |

## US-002 — Estados / Municípios parceiros

| Server fn                   | Método/Rota                                                                                  | Input             | Output                                     | Permissão         |
| --------------------------- | -------------------------------------------------------------------------------------------- | ----------------- | ------------------------------------------ | ----------------- |
| `listPartnerStates`         | `GET /api/v1/partner-states`                                                                 | —                 | `PartnerStateDto[]` (27 UFs + `isPartner`) | `geography:read`  |
| `togglePartnerState`        | `POST /api/v1/partner-states/:uf` (marcar) · `DELETE /api/v1/partner-states/:uf` (desmarcar) | `params.uf`       | `PartnerStateDto`                          | `geography:write` |
| `listMunicipalitiesByUf`    | `GET /api/v1/partner-municipalities?uf=`                                                     | `query.uf`        | `PartnerMunicipalityDto[]`                 | `geography:read`  |
| `togglePartnerMunicipality` | `POST/DELETE /api/v1/partner-municipalities/:ibgeCode`                                       | `params.ibgeCode` | `PartnerMunicipalityDto`                   | `geography:write` |

- Toggle idempotente (marcar já-ativa = 200 no-op). UF/IBGE inválido (fora do catálogo) → 400/404.
- Cross-state: a listagem de **parceiros** não filtra por UF; `?uf=` filtra o catálogo de candidatos.

## US-005 — Filtros descartados

- `GET /api/v1/collaborators` **não anuncia** `programa`/`idade` no schema de query (FR-012). Contrato inalterado fora isso.

> Erros canônicos: `not-found` 404, `validation` 400/422, `unauthorized` 401, `forbidden` 403, `conflict` 409, `unknown` 5xx — sempre no envelope.

## Segurança da informação (borda HTTP) — `/acdg-skills:security-reviewer`

> Controles **MUST** por rota nova, além do baseline já estabelecido (`requireAuth` + `authorize` + Zod +
> envelope com `requestId`). Fonte canônica disponível: OWASP AI Exchange (princípios transversais a backend
> web abaixo); o detalhamento de implementação fica a cargo do agente `security-backend-expert` na W2 de
> cada ticket. Estes controles viram **casos de teste W0** (RED) e itens de review (W2).

### Baseline (todas as 7 rotas)

- **Autorização server-side por requisição** (Broken Access Control — OWASP A01): nunca confiar no cliente; a permissão é checada no `preHandler`. Princípio canônico (least privilege / honrar autorização):
  > - Limit both permissions and attack surface. Privileges can be controlled by configuring permissions in an authorization mechanism, and by removing access to elements and thus reducing the attack surface...
  > - Honor limitations of the served: Execute actions ... with the rights and privileges of the user or service being served. This ensures that no actions are invoked and no data is retrieved outside authorizations.
  >   — *(Linha 1984, p. 89, OWASP, *OWASP AI Exchange*)*
- **Envelope sem vazamento**: `code` é literal kebab-case interno; **nunca** ecoar stack/SQL/detalhe de infra. `requestId` para correlação (não expõe dado).
- **Sem mass assignment**: o body é validado por Zod com **allowlist** de campos (`.strict()`); campos não previstos são rejeitados, não silenciosamente persistidos.

### US-001 `POST /collaborators/import` (maior superfície)

- **Limite de upload** (DoS por conteúdo grande — resource exhaustion):
  > Specific input ... leads to resource exhaustion, which can be ... availability issues (system being very slow or unresponsive, also called denial of service). The failure occurs from frequency, volume, or the content of the input.
  > — *(Linha 3711, p. 189, OWASP, *OWASP AI Exchange*)*
  - MUST: `@fastify/multipart` com `limits` (`fileSize` máx, `files: 1`, `fields` mínimos); **cap de linhas** (ex.: ≤ 5.000) — o loop do `importCollaborators` é sequencial, então N grande = tempo linear.
  - MUST: validar `content-type`/extensão = CSV; rejeitar binário (`.xlsx` fora de escopo — ADR-0002).
  - MUST: **não logar PII** (CPF/email das linhas) — log só agrega `{importedCount, failedCount}`.
  - SHOULD: rate-limit na rota (import é cara).
- **Sem CSV-injection na ida**: o parsing trata célula como dado (não avalia fórmula); a sanitização anti-fórmula é responsabilidade da **geração** (export), não do import.

### US-003 `GET /suppliers/export` (dado sensível)

- **CSV/Formula injection (saída)**: MUST passar pelo `escapeCsvCell` do util compartilhado (prefixa `=+-@` etc.) — já garantido pelo `shared/utils/csv.ts` (ADR-0002).
- **Exposição de dados financeiros**: o CSV carrega **dados bancários/PIX** do fornecedor → confirmar que `supplier:read` é a barra correta; SHOULD auditar (log de quem exportou + filtros) por se tratar de extração em massa de PII/financeiro.
- **Headers seguros**: `Content-Type: text/csv; charset=utf-8` + `Content-Disposition: attachment; filename=...` (evita render/execução no browser); `X-Content-Type-Options: nosniff`.

### US-002 territorial (toggle)

- **Validação de identificador**: `:uf`/`:ibgeCode` MUST ∈ catálogo (`State.parse`/`Municipality.parse`) antes de qualquer escrita — rejeita valor arbitrário (evita criar linha com identidade inválida). Sem ownership por usuário (qualquer `geography:write` altera qualquer UF — by design), mas a escrita é registrada (auditoria do soft-delete).
- **CSRF**: se a auth usa cookie de sessão do browser, `POST/DELETE` exigem proteção CSRF; se usa bearer token (não-cookie), N/A — **confirmar o mecanismo de auth** na W2.

### US-004 catálogo / US-005 filtros

- Catálogo: read-only, conjunto fechado — risco baixo; só RBAC (`supplier:read`).
- Filtros descartados: garantir que query params não suportados (`programa`/`idade`) são **ignorados/rejeitados** pelo Zod `.strict()`, não repassados crus a nenhuma query.
