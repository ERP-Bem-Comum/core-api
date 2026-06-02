# SPEC — Gap restante de paridade v1↔v2 do módulo Contracts (`EPIC-CONTRACTS-V2-PARITY-GAP`)

> **Tipo:** épico · **Size:** L (fatiado em §10) · **Épico-pai:** `EPIC-CONTRACTS-HTTP` (entregue)
> **Status da spec:** em-revisão
> **ADRs tocados:** `ADR-0032` (composição/borda; "atributo do próprio contrato → evolui o agregado"), `ADR-0023` (4 estados/ciclo de vida), `ADR-0018` (mapeamentos canônicos de persistência), `ADR-0020` (MySQL único; sem ENUM nativo), `ADR-0014` (isolamento por módulo), `ADR-0019` (storage S3/MinIO), `ADR-0027` (Zod contract-first), `ADR-0026` (RW split), `ADR-0006` (cross-módulo só via public-api)
> **Origem:** [`handbook/po-feedback/0001-gap-api-v2-contracts.md`](../../handbook/po-feedback/0001-gap-api-v2-contracts.md) (Buckets C/D) + [ADR-0032](../../handbook/architecture/adr/0032-transient-http-composition-read-until-bff.md).

## 1. Problema & contexto (o PORQUÊ)

O retorno da P.O. (`po-feedback/0001`, condensando os 3 retornos do frontend v2) já foi triado e em grande parte **entregue**: `children[]`/`files[]` no detalhe, filtros+paginação, DELETE de documento com motivo, `contractorRef` + read port de Parceiros — tudo `closed-green`. Sobra o **gap que a ADR-0032 destravou mas ninguém ainda especificou**: os **metadados de cadastro** que são atributos intrínsecos do contrato (e que a v1 mantinha no formulário), a **edição** desses metadados, e o **download** de documento. A ADR-0032 fixa a fronteira (linha 42):

> **dado de outro módulo → composição na borda; atributo do próprio contrato → evolui o agregado.**

Os 5 campos abaixo são atributos do próprio contrato — logo **evoluem o agregado** (modelagem legítima, não corrupção). É o que este épico entrega.

## 2. User stories

- Como **operador (via BFF)**, quero cadastrar um contrato informando **classificação** (Contrato/Ordem de Serviço), **modelo** (Serviço/Doação), **categoria**, **centro de custo** e **observações**, para ter paridade com o formulário da v1.
- Como **operador**, quero que o sistema **rejeite uma Ordem de Serviço acima de R$ 9.999,99** (teto de OS — R1), para impedir uso indevido do tipo.
- Como **operador**, quero **corrigir os metadados de cadastro** de um contrato (título, observações, classificação, categoria, centro de custo) via `PATCH`, sem tocar valor/prazo, para consertar erros de cadastro sem ferir a imutabilidade.
- Como **operador**, quero **baixar/visualizar** um documento anexado, para conferir o arquivo a partir do detalhe do contrato.

## 3. Critérios de aceitação (alto nível — cada fatia detalha em sua SPEC)

- **CA1** — `Contract` (todas as variantes, inclusive `Pending`) carrega `classification`, `contractModel`, `category`, `costCenter`, `observations`; criar contrato sem `classification`/`contractModel` é **erro de compilação** (não runtime).
- **CA2** — **R1 (teto de OS):** `classification = 'ServiceOrder'` com `originalValue.cents > 999_999` → `Result` err `'service-order-exceeds-cap'` (nunca persiste).
- **CA3** — Os 5 campos viajam round-trip: POST aceita → persiste (`ctr_*`) → GET (list e detalhe) devolve; mapper rejeita enum inválido vindo do banco com `Result` err tipado.
- **CA4** — `PATCH /api/v2/contracts/:id` edita **apenas** `title`, `objective`, `observations`, `classification`, `category`, `costCenter`; tentar mudar `originalValue`/`originalPeriod`/`currentValue`/`currentPeriod`/`status`/`signedAt`/`contractorRef`/`sequentialNumber` é **impossível pelo schema** (não é 422 — o campo não existe no body). Edição emite evento `ContractMetadataUpdated` (timeline).
- **CA5** — `GET /api/v2/contracts/:id/documents/:documentId` devolve o documento (URL assinada S3/MinIO ou stream), respeitando ownership (`:documentId` pertence a `:id`) e RBAC `contract:read`.
- **CA6** — Isolamento (ADR-0006/0014): zero campo de outro módulo no agregado; `email`/`telefone`/banco/PIX do contratado seguem por **composição na borda** (ticket `CTR-HTTP-CONTRACT-DETAIL-CONTRACTOR`), nunca duplicados aqui.

## 4. Não-objetivos / fora de escopo

- **`email`/`telephone`/banco/PIX do contratado** — são dado de Parceiros, compostos na borda pelo `CTR-HTTP-CONTRACT-DETAIL-CONTRACTOR` (in-progress). Este épico **não** os modela no agregado.
- **`program`/`budgetPlan`** — bloqueado: BC de Planejamento Orçamentário inexistente (Inquiry-0014). Não entra.
- **`derivedStatus` / status em PT (`Pendente`/`Em Andamento`/`Finalizado`/`Distrato`) / "Vencendo" (≤45d) / "distrato"→`terminate`** — mapeamento de apresentação na camada BFF/composição (ADR-0032); **não** toca o domínio.
- **Edição livre de valor/prazo** — proibida por princípio (#12/#14): valor/período só mudam por **aditivo homologado**. O `PATCH` (F2) cobre só metadados de cadastro.
- **Hard-delete de contrato** (`DELETE /contracts/:id`) — recusado por princípio (exclusão lógica, nunca física); a P.O. já o colocou fora do MVP.
- **Render de PDF** (`GET /contracts/pdf`) — gap diferido (`CONTRACTS-HTTP-PDF`).

## 5. Clarificações (Q&A resolvidas)

- **Q:** Re-condensar os 3 feedbacks ou focar no gap restante? · **R:** Só o gap restante; os 3 já estão em `po-feedback/0001` + ADR-0032 + tickets entregues (Gabriel, 2026-06-02).
- **Q:** Quais itens entram? · **R:** Épico fatiado com os 4 (metadados+R1, PATCH, download); `email`/`telefone` saem por já estarem em curso (Gabriel, 2026-06-02).
- **Q:** `email`/`telefone` são do contrato ou do contratado? · **R:** Do contratado (Parceiros) — vêm por composição na borda, não entram no agregado (Gabriel, 2026-06-02).
- **Q:** Onde os metadados moram no agregado? · **R:** Abordagem A — estender `ContractRegistration` (mesmo lugar do `contractorRef`); rejeitadas: VO agrupado (B) e contexto separado (C) (Gabriel, 2026-06-02).
- **Q:** `category`/`costCenter` são enums ou vínculo ao Orçamentário? · **R:** Enums autocontidos (ADR-0032:42 os lista como atributos do próprio contrato); **não** são FK ao módulo Orçamentário.
- **Q:** O `PATCH` exige novo ADR? · **R:** Não — edita só metadados de cadastro (nunca valor/prazo/status), portanto não fere a imutabilidade; decisão registrada aqui citando ADR-0032 + princípios #12/#14. Mini-ADR só se a fatia revelar tensão nova.

## 6. Plano técnico de alto nível (o COMO — sem código)

**Modelagem (F1) — abordagem A:** os 5 campos entram em `ContractRegistration` (`domain/contract/types.ts`), presentes em todas as variantes. Enums como VOs com smart constructor `Result<T,E>` (idioma: literais EN; rótulo PT no formatter/DTO):

| Campo | Tipo (literal EN) | Rótulo PT (apresentação) | Obrigatório |
| :-- | :-- | :-- | :-- |
| `classification` | `'Contract' \| 'ServiceOrder'` | Contrato / Ordem de Serviço | sim |
| `contractModel` | `'Service' \| 'Donation'` | Serviço / Doação | sim |
| `category` | `'Evaluation' \| 'Operational' \| 'Process'` | Avaliação / Operacional / Processo | não (`null`) |
| `costCenter` | `'HR' \| 'GeneralServices' \| 'Events'` | RH / Serviços Gerais / Eventos | não (`null`) |
| `observations` | `string \| null` | — | não (`null`) |

- **R1 (teto OS):** validada em `Contract.create`/`createPending` — `classification === 'ServiceOrder' && originalValue.cents > 999_999` → err `'service-order-exceeds-cap'`. Erro vive em `domain/contract/errors.ts`.
- **Persistência (`ctr_*`, ADR-0018/0020):** colunas novas — `classification`/`contract_model`/`category`/`cost_center` como `varchar` curto (sem `ENUM` nativo — ADR-0020), `observations` como `varchar`/`text`. Migration Drizzle Kit (`db:generate`); enums obrigatórios com backfill (mesmo padrão do `contractorRef`; sem dado de produção a preservar). Mapper row↔domínio rejeita valor fora do conjunto.
- **Borda HTTP (ADR-0027):** `createContractBodySchema` ganha os campos (strings cruas → 422 via smart constructor, padrão do `contractorType`); `registrationShape` (response) ganha os 5 → aparecem em list, detalhe e respostas de escrita.
- **CLI:** comandos de criação ganham `--classification`/`--contract-model`/`--category`/`--cost-center`/`--observations`; formatter PT-BR exibe os rótulos.

**Edição (F2) — PATCH:** use case `updateContractMetadata` sobre `updateContract` (helper intra-variante já existente em `types.ts:156`), restrito aos campos mutáveis de cadastro. Rota `PATCH /api/v2/contracts/:id` (writer pool, ADR-0026; `authorize('contract:write')`). Emite `ContractMetadataUpdated` (evento EN passado) → aparece na timeline (`GET /:id/history`). Campos imutáveis ficam fora do `ContractMetadataPatch` por tipo (reusa `ContractImmutableField`).

**Download (F3):** rota `GET /api/v2/contracts/:id/documents/:documentId` (reader pool; `authorize('contract:read')`). Storage já guarda `bucket`/`storageKey` (`domain/document/types.ts`); a borda gera **URL assinada** (S3/MinIO, ADR-0019) ou faz stream. Ownership: `:documentId` deve pertencer a `:id` (mesma guarda do supersede/delete).

**Mapa rota→use case (novas):**

| Rota | Use case | Pool | Authz |
| :-- | :-- | :-- | :-- |
| `POST /contracts` (estendido) | `createContract`/`createPendingContract` | writer | `contract:write` |
| `PATCH /contracts/:id` | `updateContractMetadata` (novo) | writer | `contract:write` |
| `GET /contracts/:id/documents/:documentId` | `getDocumentDownload` (novo, leitura) | reader | `contract:read` |

## 7. Constitution check (aderência aos ADRs/regras)

| Fonte | Exigência | Como a spec adere |
| :-- | :-- | :-- |
| `ADR-0032` | atributo do próprio contrato → evolui o agregado; dado de outro módulo → composição na borda | os 5 campos são intrínsecos → entram no agregado (F1); `email`/banco/PIX do contratado ficam na composição (§4) |
| `ADR-0023` | 4 estados; valor/prazo só por aditivo homologado | metadados valem em todas as variantes (estão no `ContractRegistration`); F2 não toca valor/prazo/status |
| `ADR-0018` | UUID varchar(36), sem JSON, Period decomposto | enums → `varchar` curto; `observations` → `varchar`/`text`; sem JSON |
| `ADR-0020` | MySQL único; **sem `ENUM` nativo** | enums persistidos como `varchar`; validação no domínio/mapper, não no schema SQL |
| `ADR-0014` | isolamento por módulo; sem dado de outro módulo | zero campo de Parceiros/Orçamento no agregado (CA6) |
| `ADR-0019` | storage S3/MinIO; sem hard-delete | F3 usa URL assinada/stream do storage existente |
| `ADR-0027` | Zod na borda; OpenAPI gerado | F1/F2/F3 validam shape por Zod; data/valor inválidos → 422 no domínio |
| `ADR-0026` | reads no reader, writes no writer | PATCH→writer; download→reader |
| `ADR-0006` | cross-módulo só via public-api | nenhuma leitura de Parceiros aqui (fica no ticket de composição) |
| `.claude/rules/domain.md` | `Result<T,E>`, branded, discriminated union, erros EN kebab-case, sem `class` | enums via smart constructor; erros `'service-order-exceeds-cap'` etc. |

## 8. Riscos & mitigações

| Risco | Severidade | Mitigação |
| :-- | :-- | :-- |
| Migration de coluna obrigatória sobre linhas existentes | média | backfill explícito na migration (padrão do `contractorRef`); sem dado de produção nesta fase; confirmar sentinela com a P.O. se houver dado real |
| `PATCH` virar brecha para editar valor/prazo | alta | `ContractMetadataPatch` exclui campos imutáveis **por tipo** (reusa `ContractImmutableField`); code-review (W2) valida CA4 |
| Vocabulário PT vazar para o domínio | baixa | literais EN no domínio; rótulo PT só no formatter/DTO (regra de idioma) |
| Conflito com `CTR-HTTP-CONTRACT-DETAIL-CONTRACTOR` (mesma área do DTO) | média | F1 só adiciona campos do cabeçalho (`registrationShape`); a composição do contratado é ortogonal (aninha `contractor`); coordenar ordem de merge |
| URL assinada expor documento sem authz | alta | rota sob `requireAuth` + `authorize('contract:read')` + ownership `:documentId`↔`:id`; TTL curto na URL |

## 9. Definition of Done (épico)

- [ ] CA1–CA6 cobertos por teste (W0) e verdes (W3) em cada fatia.
- [ ] Os 5 campos no agregado, persistidos, expostos em list/detalhe/escrita; R1 ativa.
- [ ] `PATCH` edita só metadados; emite `ContractMetadataUpdated`; imutáveis barrados por tipo.
- [ ] `GET .../documents/:documentId` baixa com authz + ownership.
- [ ] Cada fatia `closed-green` com sua `001-spec/SPEC.md`; constitution check sem conflito aberto.
- [ ] Não-objetivos (program/budget, vocabulário BFF, hard-delete, PDF) registrados como diferidos/fora.

## 10. Fatiamento em tickets (ordem por dependência)

| # | Ticket | Size | Entrega | Depende |
| :-- | :-- | :-- | :-- | :-- |
| F1 | `CTR-CONTRACT-REGISTRATION-METADATA` | M | 5 campos (`classification`/`contractModel`/`category`/`costCenter`/`observations`) em `ContractRegistration` + VOs/enums (smart constructor) + **R1** (`'service-order-exceeds-cap'`) + migration (`ctr_*`, backfill) + mapper + CLI (flags + formatter PT-BR) + expor no `POST`/`GET` (Zod + DTO) | — |
| F2 | `CTR-CONTRACT-METADATA-PATCH` | M | use case `updateContractMetadata` (só metadados de cadastro) + `PATCH /api/v2/contracts/:id` (writer, `contract:write`) + evento `ContractMetadataUpdated` na timeline + Zod body excluindo imutáveis | F1 |
| F3 | `CTR-HTTP-DOCUMENT-DOWNLOAD` | S | `GET /api/v2/contracts/:id/documents/:documentId` (reader, `contract:read`) → URL assinada/stream (S3/MinIO, ADR-0019) + ownership `:documentId`↔`:id` | — (independente; pode rodar em paralelo a F1) |

**Caminho crítico:** F1 → F2. F3 é independente (paralelizável). Cada fatia abre seu ticket com `001-spec/SPEC.md` derivada desta spec-mãe e roda W0→W3.

---

## Recursos por fatia (agentes · skills)

- **Transversais:** `contratos-orchestrator` + `pipeline-maestro`; waves `tdd-strategist` (W0) · `code-reviewer` (W2) · `ts-quality-checker` (W3).
- **F1:** `ts-domain-modeler` (enums/VOs + campos no agregado + R1) · `drizzle-schema-author` (colunas + migration) · `application-cli-builder` (flags + formatter).
- **F2:** `ts-domain-modeler` (use case + evento) · `fastify-server-expert` (rota PATCH + Zod) · `security-backend-expert` (authz; impedir edição de imutáveis).
- **F3:** `fastify-server-expert` (rota + URL assinada) · `security-backend-expert` (ownership + TTL + authz) · `docker-compose-expert` se precisar de MinIO no E2E.
