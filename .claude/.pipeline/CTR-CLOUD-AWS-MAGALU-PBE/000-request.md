# 000 — Request CTR-CLOUD-AWS-MAGALU-PBE

> **Atualização documental da topologia multi-cloud. Size XS.**
> Cria ADR-0021 que reformula a topologia da Fase Strangler Fig. Marca ADR-0007 como `Superseded by 0021`. Fecha Inquiry-0003 como `Decided`. Zero código de produção tocado.

## Justificativa

O **ADR-0007** (Proposed, 2026-04-28) inferiu — a partir de duas fontes independentes — que a topologia seria **AWS legado + GCP novo**. Essa inferência baseou-se em (1) e-mail do Cadu mencionando "novo ambiente GCP" e (2) ticket SGM #95026 da Codebit operando AWS legacy.

A inferência **não se confirmou**. Em 2026-05-22, decisão executiva da Bem Comum esclareceu a topologia real:

1. **AWS (Codebit) é a infra primária de produção** — legado, `core-api`, `bff-gateway`, MySQL legado, MySQL `core` todos vivem lá. Razão: financeira/logística. Bem Comum quer **fornecedor único de infra** (um contrato, uma competência operacional, sem custo dobrado). Codebit historicamente só opera AWS.

2. **MagaluCloud entra como ambiente PBE/homologação interno**, custeado **pela equipe** (nós), **não** pela Bem Comum nem pela Codebit. Escopo:
   - Servidor de homologação interno + ponte de early-access entre Bem Comum e equipe.
   - **Sem dump de DB legado, sem dados reais, sem segredos de produção.**
   - Analogia: PBE (Public Beta Environment) da Riot Games — permite Bem Comum experimentar mudanças antes de subir para produção AWS.

3. **Multi-cloud continua existindo, mas com semântica diferente do ADR-0007 original**:
   - **ADR-0007**: clouds separadas por **geração de sistema** (legado vs novo) e por **gestor** (Codebit vs ?).
   - **ADR-0021**: clouds separadas por **escopo de uso** (produção real vs PBE interno) e por **patrocinador** (cliente vs equipe).

## Escopo (refactor documental)

### Arquivos a criar

| Arquivo | Conteúdo |
| :--- | :--- |
| `handbook/architecture/adr/0021-aws-primary-magalu-pbe-supersedes-0007.md` | ADR `Accepted`, supersedes ADR-0007. Decisão: AWS (Codebit) primary + MagaluCloud PBE-only. Razão financeira explícita. Escopo MagaluCloud estritamente PBE. |

### Arquivos a modificar

| Arquivo | Mudança |
| :--- | :--- |
| `handbook/architecture/adr/0007-multi-cloud-aws-gcp.md` | Status `Proposed` → `Superseded by ADR-0021`. Adiciona bloco `> **Superseded by:** ADR-0021 (2026-05-22)` no topo. Conteúdo histórico preservado integralmente. |
| `handbook/architecture/adr/README.md` | Adiciona linha do ADR-0021 no índice. Atualiza linha do ADR-0007 para `Superseded by 0021`. |
| `handbook/inquiries/0003-multi-cloud-strategy.md` | Status `Pending Response` → `Decided`. Closed/Decided: 2026-05-22. Adiciona seção 3 ("Respostas/Investigação") com a decisão executiva da Bem Comum — substituindo o aguardo da resposta da Codebit. Atualiza seção 5 (Decisão final) e seção 6 (Saídas). |
| `handbook/inquiries/INDEX.md` | Move Inquiry-0003 da seção "⏳ Pending Response" para "✅ Decided". Atualiza contadores (Decided 10→11, Pending Response 1→0). |

### Não-escopo (fora deste ticket)

- **Inquiry-0012 (BFF managed vs Fastify)** — a §4.2 ("postura de segurança incompatível com cross-cloud") perde a premissa, mas atualizar essa inquiry é trabalho separado que pode demandar reavaliação técnica. Não cabe num ticket XS.
- **ADR-0017 (correlation keys cross-período)** — `Proposed` independente, não afetado.
- **Provisionar a infra MagaluCloud** — fora deste ticket; é trabalho operacional posterior. Este ticket só registra a decisão arquitetural.
- **Confirmar com Codebit** — a inquiry já assumia confirmação técnica; aqui temos confirmação executiva equivalente.

## Critérios de aceitação

- **CA1** — ADR-0021 criado em status `Accepted`, com seções: Status, Date, Deciders, Contexto (incluindo razão financeira), Decisão, Consequências (positivas, negativas, neutras), Alternativas Consideradas, Quando Re-avaliar, Referências.
- **CA2** — ADR-0021 menciona literalmente o supersedes do ADR-0007 e cita a Inquiry-0003 como contexto.
- **CA3** — ADR-0021 documenta o escopo MagaluCloud com a restrição PBE (sem dump legado, sem dados reais) e a analogia do PBE da Riot.
- **CA4** — ADR-0007 ganha bloco `Superseded by` no topo, mas mantém o conteúdo histórico (ratio legis) intacto para auditoria.
- **CA5** — ADR-README.md mostra ADR-0021 na lista e ADR-0007 com status atualizado.
- **CA6** — Inquiry-0003 vira `Decided` com explicação clara de que a resposta veio da Bem Comum, não da Codebit (substituição de stakeholder).
- **CA7** — Inquiry INDEX.md tem contadores e seções consistentes com o novo estado.
- **CA8** — Zero código de produção tocado. Zero teste novo. Zero typecheck regression.

## Risco

Baixo. Refactor documental puro. Único risco: links cruzados entre ADRs ficarem stale. Mitigação: spot-check manual após edits.
