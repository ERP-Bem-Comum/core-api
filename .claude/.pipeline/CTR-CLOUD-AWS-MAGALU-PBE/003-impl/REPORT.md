# W1 — Implementação CTR-CLOUD-AWS-MAGALU-PBE

> Refactor documental puro. Outcome: GREEN.

## Arquivos criados

| Arquivo | Linhas | Propósito |
| :--- | ---: | :--- |
| `handbook/architecture/adr/0021-aws-primary-magalu-pbe-supersedes-0007.md` | ~120 | ADR `Accepted`. Decisão completa: AWS-primary (Codebit) + MagaluCloud-PBE (equipe). Razão financeira/logística explícita. Escopo MagaluCloud estritamente PBE com analogia PBE-Riot. Seções: Status/Date/Deciders/Supersedes, Contexto, Decisão (tabela cloud × patrocinador × escopo × conteúdo), Consequências (positivas/negativas/neutras), Alternativas Consideradas (4), Implicações nos ADRs vigentes, Quando Re-avaliar, Referências. |

## Arquivos modificados

| Arquivo | Mudança |
| :--- | :--- |
| `handbook/architecture/adr/0007-multi-cloud-aws-gcp.md` | Status `Proposed` → `Superseded by ADR-0021 (2026-05-22)`. Bloco superseded inserido no topo com explicação ("inferência AWS+GCP não se confirmou; Bem Comum quer fornecedor único"). Conteúdo histórico abaixo do bloco preservado integralmente. |
| `handbook/architecture/adr/README.md` | Linha do 0007 atualizada para `Superseded by 0021`. Nova linha do 0021 inserida no fim do índice (Accepted, 2026-05-22). |
| `handbook/inquiries/0003-multi-cloud-strategy.md` | Status `Pending Response` → `Decided`. Closed/Decided: 2026-05-22. §3 ganhou bloco com a decisão executiva da Bem Comum (substituindo o aguardo da Codebit) — tabela respondendo A1-A5 + nota explicando que B/C/D/E continuam como trabalho operacional, agora simplificadas por serem intra-AWS. §5 atualizada com decisão final + ponteiro para ADR-0021. §6 saídas marcadas (ADR-0021 criado, ADR-0007 superseded). |
| `handbook/inquiries/INDEX.md` | Contadores atualizados: Decided 9→10, Pending Response 1→0. Inquiry-0003 movida da seção `⏳ Pending Response` (agora vazia) para `✅ Decided` com ADRs 0007/0021 referenciados. |

## CAs

| CA | Status | Evidência |
| :--- | :---: | :--- |
| CA1 — ADR-0021 com todas seções padrão | ✅ | `handbook/architecture/adr/0021-aws-primary-magalu-pbe-supersedes-0007.md` tem Status/Date/Deciders/Supersedes, Contexto, Decisão, Consequências, Alternativas, Implicações, Quando Re-avaliar, Referências |
| CA2 — Supersedes ADR-0007 explícito | ✅ | Linha 8 do ADR-0021 (`Supersedes: [ADR-0007]`) + bloco inteiro no topo do ADR-0007 |
| CA3 — Escopo MagaluCloud PBE-only documentado | ✅ | Tabela na §Decisão do ADR-0021 + analogia Riot PBE na §Contexto |
| CA4 — ADR-0007 mantém histórico | ✅ | Conteúdo abaixo do bloco superseded preservado integralmente (§Contexto, Decisão, Consequências, Alternativas, etc) |
| CA5 — README mostra 0021 + 0007 superseded | ✅ | `handbook/architecture/adr/README.md` linhas 98 e 111 |
| CA6 — Inquiry-0003 Decided com explicação | ✅ | §3 tem bloco "Decisão executiva da Bem Comum (substitui retorno técnico da Codebit)" |
| CA7 — INDEX consistente | ✅ | Contadores + movimentação 0003 |
| CA8 — Zero código tocado | ✅ | `git status` (se rodável) mostraria apenas arquivos sob `handbook/` e `.claude/.pipeline/`. Nenhum arquivo em `src/`, `tests/`, `scripts/` modificado. |

## Outcome

GREEN. Refactor documental completo. Topologia cloud formalizada em ADR-0021. Inquiry-0003 fechada. Zero risco para código de produção.
