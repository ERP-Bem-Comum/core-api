# As 17 "defasadas" — revisão depois de ler os corpos

Ao abrir issue por issue, a conta mudou. Cinco não precisam de nada, seis precisam de
nota de estado, e só seis têm corpo que hoje **diz coisa errada**. Segue a proposta para
você aprovar, recusar ou ajustar antes de eu comentar qualquer uma.

Sigo a convenção que já existe no repo (o bloco `✏️ Reescrita em …` da #112 e da #169):
comentário de atualização, corpo preservado. Só proponho editar o corpo onde a primeira
frase da issue virou falsa.

---

## A. Não precisam de nada — retiro da lista (5)

| Issue | Por quê |
| --- | --- |
| **#856** | O corpo já diz "este é o resto do mesmo bloco, deixado fora daquele escopo". A razão social ter sido corrigida no #857/#870 é exatamente o que ele descreve. Está certo. |
| **#327** | Corpo descreve a cascata existindo e o DTO sem `effectiveApprover`. É o estado de hoje. |
| **#265** | Corpo já registra que `/payable-titles` expõe `paidAt` e que esta rota não. Continua verdade. |
| **#169** | Reescrito em 18/08 medindo o código. Ainda bate. |
| **#112** | Idem — a reescrita de 18/08 já mede os dois KPIs que faltam. |

---

## B. Corpo virou falso — proponho comentar E corrigir o título (6)

### #787 — remessa `Queued` para sempre
O corpo diz que nada varre e nada acusa. Depois dele veio o **descarte** (ADR-0065 §4,
PR #850): `remittance.ts:170-172` cobre o caso de `Queued` **sem** arquivo no bucket.
O buraco que resta é mais estreito e mais difícil: `Queued` **com** arquivo cujo `status/`
nunca chega — os workers `van-status-scan` e `van-return-scan` só reagem a objeto que existe.

- Título hoje: `remessa transmitida que nunca confirma fica Queued para sempre, e ninguém varre`
- **Proposto:** `remessa Queued com arquivo no bucket e sem envelope de status não é varrida por ninguém — o descarte do #850 cobre só o caso sem arquivo`

### #497 — assimetria de permissão em relatórios
O corpo pede alinhar duas permissões. **A assimetria já não existe** — mas ela foi
eliminada por *nivelamento para baixo*: `reports/plugin.ts:223` pôs
`/reports/team/demographics` sob `collaborator:read`, o mesmo gate do nominal. O
`read-sensitive` segue existindo no catálogo e **não guarda rota nenhuma**.

O comentário no próprio código (linhas 218-222) declara que a segregação real ficou para o
redesenho de RBAC. Ou seja: a issue como está pede algo que foi resolvido, e não pede o que
sobrou de verdade.

- Título hoje: `assimetria de permissão: agregado sob read-sensitive, por-pessoa nominal sob read`
- **Proposto:** `dado demográfico nominal ficou sob collaborator:read e o read-sensitive não guarda mais nada — a assimetria sumiu por nivelamento, não por segregação`

### #407 — consolidar os 6 workers em tasks ECS
O código foi entregue: `src/workers/runner/run.ts:26` tem `WORKER_GROUP` e o
`compose.yaml:451-544` já roda 4 grupos, não 6 processos. O que falta é **rollout no host de
QA**, registrado em `deploy/qa/README.md:54`.

- Título hoje: `Consolidar os 6 workers em 2-3 tasks ECS por afinidade (reduzir pools contra o RDS)`
- **Proposto:** `aplicar no host de QA a consolidação de workers que já está no compose (4 grupos) — o código saiu, o rollout não`

> Nota: a #930 mediu **31 pools num boot** da borda HTTP, contra os 14 que o corpo desta issue
> cita do Incident-0001. A aritmética do corpo está desatualizada para pior.

### #61 — Fatia 6: desfazimento de pagamento e conciliação
Metade entregue. `undo-reconciliation.ts` e `undo-approval.ts` existem. **Desfazer pagamento
não existe** — não há caminho `Paid → Approved` fora do descarte de remessa, e
`remittance-repository.drizzle.ts:469` justifica por escrito não devolver o título.

- Título hoje: `Fatia 6 — desfazimento de pagamento e conciliação`
- **Proposto:** `Fatia 6 — falta desfazer PAGAMENTO (Paid → Approved); desfazer conciliação e aprovação já existem`

### #59 — Fatia 4: extrato D+1 + confirmação de pagamento
Import (OFX/CSV/PDF) e baixa manual com duas origens entregues (ADR-0065 §6, `0540daca` /
`987a2113`). **A confirmação automática D+1 não fecha**: `scan-van-returns.ts` só tria e põe em
quarentena, nunca marca título pago.

- Título hoje: `Fatia 4 — extrato D+1 + confirmação de pagamento`
- **Proposto:** `Fatia 4 — falta o D+1 fechar o ciclo: scan-van-returns tria e quarentena, mas nenhum caminho marca o título como Pago`

### #145 — importar extrato em PDF via OCR
O corpo diz "OCR não existe hoje → provável chrome no front". Hoje existe import de PDF por
gabarito sobre **texto nativo** (`pdf-parser.ts:1-8`, via `unpdf`) — o item de menu pode não
ser mais chrome. O que falta é OCR para extrato **digitalizado**, que é escopo diferente e menor.

- Título hoje: `FIN-RECON-IMPORT-PDF-OCR — importar extrato em PDF via OCR (complementa OFX/CSV)`
- **Proposto:** `FIN-RECON-IMPORT-PDF-OCR — falta OCR para extrato digitalizado; PDF de texto nativo já importa por gabarito`

---

## C. Corpo continua válido, só falta nota de estado — comentário, sem mexer no título (6)

| Issue | Nota que proponho comentar |
| --- | --- |
| **#839** | O ADR-0061 §"o que continua em aberto" (linhas 131-136) hoje registra **quatro** dos sete itens, não três como o corpo diz. Os outros três seguem sem dono e sem inquiry própria. |
| **#756** | Épico vivo. O piloto emite crédito em conta (`01`) e TED (`41`) com câmara/finalidade/P013 medidos no validador (inquiry-0033). A entrada em produção está barrada por **#879**, **#881** e **#942** — os três blocos, não o layout. |
| **#634** | O passo 2 do corpo segue pendente (`compose.yaml:369`), mas o `resolveRbacMode` **já voltou a ser fail-secure** no #870 — o default não é mais o risco, a env explícita é. |
| **#808** | Já existe gate de detecção: `tests/cleanup/schema-collation.test.ts`, que cita esta issue. A migration `0050_same_jack_power.sql:5` segue sem `COLLATE` — o gate acusa, não conserta. |
| **#406** | A reclassificação da M2 passou a entrar na trilha, mas como `DocumentSaved` (`timeline/projection.ts:98`). Conciliação e undo em si continuam fora, que é o pedido original. |
| **#291** | `registered-tax.ts:6` já admite CBS/IBS, declarado como **leitura apenas** (CHECK em `mysql.ts:391`). O motor não calcula — o pedido do corpo está de pé. |

---

## O que preciso de você

1. Aprovar/ajustar os **6 títulos propostos** no bloco B (é o único lugar onde edito conteúdo existente).
2. Dizer se o bloco C vai como comentário ou se você prefere que eu nem comente.
3. Confirmar que o bloco A sai da fila sem nenhuma ação.
