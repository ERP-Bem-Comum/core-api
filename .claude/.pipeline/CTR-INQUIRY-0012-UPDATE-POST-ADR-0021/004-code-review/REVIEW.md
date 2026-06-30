# W2 — Code Review CTR-INQUIRY-0012-UPDATE-POST-ADR-0021

> Read-only audit. Outcome: APPROVED.

## Achados

### ✅ Preservação cirúrgica do conteúdo histórico

Padrão de "strikethrough + nota explicativa" foi aplicado consistentemente em três lugares (§4.2 título, §6 pergunta 4, §7 último bullet). Em todos, o conteúdo original permanece legível abaixo da marcação. Isso é importante porque a Inquiry-0012 documenta raciocínio Newman canônico que continua válido — apagar o conteúdo eliminaria a justificativa de tudo que foi decidido em cima dela.

### ✅ Honestidade sobre o que NÃO muda

§9.3 explicitamente delimita o que continua pendente: Hipótese A/B/C, Gap 1 (legado sem prefix), perguntas 1/2/3/5 da §6, fundamentação Newman §3 e §5. Isso evita que um futuro leitor veja "Inquiry-0012 atualizada em 2026-05-22" e assuma que está resolvida — Status `Open` continua justificado.

### ✅ Resposta direta à pergunta da P.O.

§9.5 é o coração da revisita. Cita literalmente a pergunta ("existe alguma maneira de DENTRO do sistema da MAGALU simularmos uma VAN?") e responde com o material que **já existia** no projeto (Inquiry-0013:62), em vez de inventar solução nova. Esse aproveitamento é correto — `fake-stcpclt` + `fake-bradesco` foram desenhados como ACL-respeitadora (o `gateway_van` no `core-api` é um port; adapter troca conforme ambiente), então naturalmente roda em qualquer runtime.

### ✅ Honestidade sobre o que o PBE NÃO valida

§9.5 tem duas tabelas espelhadas — o que o PBE valida (geração CNAB, parsing, fluxo de assinatura, idempotência, handshake SSH) e o que NÃO valida (protocolo OFTP real, latência real, erros reais Bradesco, licenciamento STCPCLT). Não vende ilusão de paridade total — explicita que "uma camada do fluxo é exclusivamente AWS", exatamente o que a P.O. delineou.

### ✅ Descoberta empírica documentada: MGC sem managed API Gateway

§9.4 vai além da revisita reativa — faz inspeção real do `handbook/reference/magalu-cloud/` e descobre que MGC oferece **VPC + Security Groups + LBaaS** mas **não tem managed API Gateway equivalente ao AWS API Gateway**. Isso é informação nova que não estava em lugar nenhum no handbook antes. Documentar três opções (MGC-i/ii/iii) com tabela de fidelidade vs custo é valor agregado real, não cosmético.

### ✅ Anchors para navegação

§9 é longa (8 sub-seções). O bloco de aviso no topo da inquiry tem link `#9-atualização-2026-05-22--impacto-do-adr-0021` que aponta diretamente para lá. Cada marcação superseded também aponta para §9 com âncora. Reader experience cuidada.

### ✅ Cross-references válidos

Verificados:
- §9 → ADR-0021 (`../architecture/adr/0021-aws-primary-magalu-pbe-supersedes-0007.md`) ✅
- §9 → ADR-0007 (mesma pasta) ✅
- §9 → ADR-0008 (mesma pasta) ✅
- §9 → Inquiry-0013 (`./0013-local-dev-simulator-and-ci.md`) ✅
- §9 → Inquiry-0003 (`./0003-multi-cloud-strategy.md`) ✅
- §9.8 → `handbook/reference/magalu-cloud/network/overview.md` e `security/` ✅
- Bloco aviso topo → §9 anchor ✅
- §4.2 superseded → §9 anchor ✅
- §6 pergunta 4 → §9 anchor ✅

### 🟡 Observação não-bloqueante

§9.7 menciona "provavelmente nova Inquiry-0017 ou apêndice de Inquiry-0013" para ratificar o reaproveitamento dos fakes em PBE. Sugestão de inquiry futura, não compromisso — bem posicionado.

### 🟡 Observação não-bloqueante

`architecture/02-system-topology.md` (mencionado na §1 da inquiry original) tem o diagrama com "legacy-api (GCP)" que agora está desatualizado. Não foi tocado neste ticket conforme escopo. Cabe ticket separado quando alguém revisitar o doc de topologia.

## Veredito

**APPROVED** em round 1/3.

Atualização cirúrgica, preserva decisões válidas, marca o que evaporou, adiciona §9 substantiva respondendo à pergunta direta da P.O. e descobrindo gap empírico (MGC sem managed API Gateway). Status `Open` da inquiry continua justificado.
