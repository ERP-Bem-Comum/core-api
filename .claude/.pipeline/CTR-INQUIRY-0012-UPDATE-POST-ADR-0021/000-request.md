# 000 — Request CTR-INQUIRY-0012-UPDATE-POST-ADR-0021

> **Atualização documental da Inquiry-0012 após ADR-0021. Size XS.**
> Adiciona §9 nova refletindo o impacto do [ADR-0021](../../handbook/architecture/adr/0021-aws-primary-magalu-pbe-supersedes-0007.md). Marca §4.2 (cross-cloud security) como superseded com nota explicativa. Atualiza §6 e §7 removendo premissas que evaporaram. Inquiry permanece `Open` — Gap 1 (legado sem prefix) e decisão Hipótese A/B/C seguem pendentes da banca.

## Justificativa

A [Inquiry-0012](../../handbook/inquiries/0012-bff-managed-api-gateway-vs-fastify.md) foi escrita em 2026-05-07 sob a premissa do ADR-0007 Proposed (AWS legado + GCP novo). Vários blocos da inquiry decorrem dessa premissa:

- **§4.2** ("Postura de segurança do legado é incompatível com exposição cross-cloud") — gap derivado de "legado no GCP, API Gateway no AWS".
- **§6 pergunta 4** ("Conectividade cross-cloud até o legado no GCP?") — decisão pendente.
- **§7 último bullet** ("Inquiry-0013 — Conectividade cross-cloud AWS↔GCP abrir como follow-up") — sugestão de novo trabalho.

Com o [ADR-0021](../../handbook/architecture/adr/0021-aws-primary-magalu-pbe-supersedes-0007.md) (Accepted em 2026-05-22), a topologia mudou para **AWS-único produção + MagaluCloud PBE-only interno**. Os três pontos acima ou evaporam ou mudam de forma. A Inquiry-0012 precisa refletir isso para que decisões futuras não rodem em cima de premissa morta.

Adicionalmente, a P.O. levantou pergunta nova relevante:

> "MagaluCloud reproduz FIELMENTE tudo até a chegada da VAN bancária... onde essa SIM só terá exclusivamente dentro do sistema da AWS, a não ser que exista ALGUMA maneira de DENTRO do sistema da MAGALU simularmos uma..."

Resposta curta: **sim, simulação já está desenhada**. [Inquiry-0013](../../handbook/inquiries/0013-local-dev-simulator-and-ci.md):62 documenta `fake-stcpclt` (container Linux com SSH simulando `stcpclt.exe`) + `fake-bradesco` (listener OFTP/STCP minimalista). Foram desenhados para dev local Docker Compose, mas o padrão arquitetural roda em qualquer container runtime — incluindo MagaluCloud Kubernetes. O `gateway_van` no `core-api` é uma **ACL** (Anti-Corruption Layer) já abstraída como port — adapter aponta para fake em PBE, para STCPCLT real em AWS produção.

Essa explicação cabe naturalmente na §9 nova da Inquiry-0012.

## Escopo

### Arquivo a modificar

| Arquivo | Mudança |
| :--- | :--- |
| `handbook/inquiries/0012-bff-managed-api-gateway-vs-fastify.md` | (1) Bloco de aviso no topo apontando atualização 2026-05-22. (2) §4.2 ganha marca `~~Superseded~~` com explicação preservando conteúdo histórico. (3) §6 pergunta 4 marcada resolvida com ponteiro para ADR-0021. (4) §7 último bullet (Inquiry-0013 cross-cloud) marcado como N/A. (5) §9 nova "Atualização 2026-05-22 — Impacto do ADR-0021" com: topologia revisada, fidelidade do PBE MGC, VAN exclusiva AWS + reaproveitamento dos fakes da Inquiry-0013, gap de fidelidade (MGC não tem managed API Gateway equivalente). |

### Não-escopo

- **Fechar a Inquiry-0012** — segue `Open`. Gap 1 (legado sem `setGlobalPrefix('api/v1')`), decisão formal Hipótese A/B/C, perguntas 1/2/3/5 da §6, ADR-0018 candidato — tudo continua pendente da banca interna.
- **Atualizar ADR-0005** ou abrir ADR-0018 — fora deste escopo. Continua aguardando a banca.
- **Tocar `architecture/02-system-topology.md`** — esse doc tem o diagrama "Domain → APIGW (AWS) → ... → legacy-api (GCP)" que está desatualizado. Atualização cabe em ticket separado focado no doc de topologia.
- **Provisionar PBE MagaluCloud** — operacional, fora do `core-api`.

## Critérios de aceitação

- **CA1** — Inquiry-0012 ganha bloco de aviso no topo apontando o documento atualizado em 2026-05-22 com link para ADR-0021.
- **CA2** — §4.2 mantém conteúdo histórico mas fica claramente marcada como superseded (texto preservado para auditoria de ratio legis, igual ao padrão usado em ADR-0007 superseded).
- **CA3** — §6 pergunta 4 explicitamente resolvida (resposta "N/A — produção é single-cloud AWS"; PBE não chama legacy AWS).
- **CA4** — §7 último bullet (sugestão de Inquiry-0013 cross-cloud) marcado N/A com explicação curta.
- **CA5** — §9 nova cobre: (a) topologia revisada com tabela cross-cloud → intra-VPC AWS; (b) fidelidade do PBE MGC (até onde reproduz fielmente, onde diverge); (c) VAN bancária Bradesco exclusiva AWS produção; (d) simulação MGC via fakes da Inquiry-0013; (e) gap MGC (sem managed API Gateway equivalente ao AWS — precisa LBaaS + auth em outro lugar, ou proxy/gateway containerizado).
- **CA6** — Status da Inquiry-0012 permanece `Open` — Gap 1 + decisão Hipótese ainda pendentes.
- **CA7** — Zero código de produção tocado. Zero teste novo. Zero impacto em typecheck.

## Risco

Mínimo. Refactor documental sobre arquivo único. Risco de cross-reference: §9 cita ADR-0021, ADR-0008, Inquiry-0013, handbook/reference/magalu-cloud/ — verificar paths.
