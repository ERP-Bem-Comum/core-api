# W1 — Implementação CTR-INQUIRY-0012-UPDATE-POST-ADR-0021

> Refactor documental puro. Outcome: GREEN.

## Arquivo único modificado

`handbook/inquiries/0012-bff-managed-api-gateway-vs-fastify.md` — 5 mudanças cirúrgicas:

### 1. Cabeçalho — bloco de aviso

Acrescentado bloco `> ℹ️` no topo (após metadados de Status/Aberta/Última atualização/Aguardando/Bloqueia/Tema) explicando que premissa cross-cloud não se confirmou, apontando ADR-0021 e §9. Status mantido `Open` (decisão central da inquiry continua pendente).

### 2. §4.2 — marcada superseded

Título mudou de "Gap 2: Postura de segurança..." para "Gap 2: ~~Postura de segurança...~~ (Superseded em 2026-05-22)". Bloco `> ⚠️` inserido logo após o título, explicando que premissa "legado no GCP" deixou de valer (single-cloud AWS). Conteúdo histórico inteiro preservado abaixo do bloco para auditoria de ratio legis (mesmo padrão usado em ADR-0007 superseded).

### 3. §6 pergunta 4 — marcada resolvida

Texto original mantido com strikethrough (`~~...~~`) e adicionada nota **(RESOLVIDA em 2026-05-22)** com link para ADR-0021.

### 4. §7 último bullet — marcado N/A

Mesmo padrão: strikethrough + nota **(N/A em 2026-05-22)** explicando que Inquiry-0013 ainda existe mas com escopo diferente (simulador local Devbox+Tilt, não conectividade cross-cloud).

### 5. §9 nova — Atualização 2026-05-22

8 sub-seções:

- **§9.1** — Topologia revisada (diagrama Domain → APIGW (AWS) → todas as rotas intra-VPC AWS).
- **§9.2** — Tabela do que evapora (§4.2, §6.4, §7 último bullet, custo egress).
- **§9.3** — O que NÃO muda (decisão Hipótese A/B/C, Gap 1, fundamentação Newman §3, §5, §6 perguntas 1/2/3/5).
- **§9.4** — Novo eixo: fidelidade do PBE MagaluCloud. Inspeção do `handbook/reference/magalu-cloud/network/` revelou que MGC tem VPC + Security Groups + LBaaS mas **não tem managed API Gateway equivalente ao AWS**. Três opções tabuladas (MGC-i: LBaaS+auth na aplicação; MGC-ii: container `gateway-emulator` tipo Kong/Tyk; MGC-iii: PBE sem ponto de entrada unificado).
- **§9.5** — VAN bancária Bradesco exclusiva AWS. Três razões canônicas (binário proprietário, endpoint regulado, reverse engineering rejeitado em ADR-0008:118). Resposta à pergunta da P.O.: simulação MagaluCloud já está desenhada em Inquiry-0013:62 — `fake-stcpclt` + `fake-bradesco` reaproveitáveis em qualquer container runtime. Tabela do que o PBE valida vs não valida. Aceitação explícita de "uma camada do fluxo Bradesco é exclusivamente AWS".
- **§9.6** — Impacto residual na decisão Hipótese A/B/C: nenhum. Newman segue válido.
- **§9.7** — Próximos passos atualizados (1-3 sem mudança; novos 4 e 5: decidir MGC-i/ii/iii + ratificar reaproveitamento dos fakes em PBE).
- **§9.8** — Referências adicionais usadas nesta §9.

## CAs

| CA | Status | Evidência |
| :--- | :---: | :--- |
| CA1 — bloco de aviso no topo apontando atualização + ADR-0021 | ✅ | Bloco `> ℹ️` logo após metadados |
| CA2 — §4.2 conteúdo histórico preservado com marca superseded | ✅ | Título com `~~...~~ (Superseded)` + bloco `> ⚠️` + conteúdo abaixo intacto |
| CA3 — §6 pergunta 4 explicitamente resolvida | ✅ | Strikethrough + nota **(RESOLVIDA em 2026-05-22)** + link ADR-0021 |
| CA4 — §7 último bullet marcado N/A | ✅ | Strikethrough + nota **(N/A em 2026-05-22)** |
| CA5 — §9 cobre topologia + fidelidade PBE + VAN exclusiva AWS + simulação fakes + gap MGC | ✅ | §9.1-9.8 cobre tudo + tabela MGC-i/ii/iii + resposta literal à pergunta da P.O. |
| CA6 — Status `Open` preservado | ✅ | Linha 5 do header |
| CA7 — zero código tocado | ✅ | Arquivo único em `handbook/inquiries/` |

## Outcome

GREEN. Inquiry-0012 atualizada cirurgicamente, preserva decisões intactas que não dependiam da premissa multi-cloud, marca claramente o que evaporou, e adiciona §9 nova respondendo à pergunta direta da P.O. sobre simulação VAN em MagaluCloud.
