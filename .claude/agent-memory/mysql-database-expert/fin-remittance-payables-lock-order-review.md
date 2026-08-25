---
name: fin-remittance-payables-lock-order-review
description: Laudo sobre deadlock fin_documents/fin_payables/fin_remittance_payables — releitura sob lock proposta reabriria o padrão da #803 num terceiro recurso
metadata:
  type: project
---

Sessão de 2026-08-23: revisão read-only de uma proposta do team-lead pra fechar um deadlock medido
em MySQL 8.4.11 real entre `document-repository.drizzle.ts` `save()` (hard replace de `fin_payables`)
e `remittance-repository.drizzle.ts` `save()` (INSERT em `fin_remittance_payables`, que dispara FK
checks contra `fin_payables` e `fin_documents`).

**Achado central:** a proposta original incluía uma "releitura sob lock" de `findHeldPayableIds`
DENTRO da transação de `adjust-document`, antes do hard replace. Analisei que isso reintroduz — num
terceiro recurso (`fin_remittance_payables_payable_idx`, índice secundário NÃO-único) — o MESMO
mecanismo de gap lock que a #803 já pagou uma vez em `fin_retentions_document_id_idx`: buscar por um
`payable_id` que ainda NÃO existe na tabela, sob REPEATABLE READ, toma gap lock na posição onde o
valor entraria; o INSERT concorrente da remessa precisa de insert-intention lock na MESMA posição →
ciclo novo.

**Alternativa recomendada, sem lock novo:** deixar a FK `RESTRICT`
(`fin_remittance_payables_payable_id_fk`) ser a autoridade — ela já roda DENTRO do `DELETE FROM
fin_payables` do hard replace (`document-repository.drizzle.ts:332-337`), na MESMA ordem relativa
(`documents → payables → remittance_payables`) que a TX de remessa usa. Só falta classificar errno
1451 em `driver-error.ts` (hoje só tem 1213/1205/1062) e devolver um erro de domínio nomeado no catch
do `save()`, no molde do `isVersionConflict` já existente. Confirmei que `fin_payables.id` tem UMA
ÚNICA FK apontando pra ele em todo o schema — 1451 nesse DELETE é sinal inambíguo de "preso por
remessa".

**Outro achado:** a ordem de aquisição de lock do lado da remessa (`payables` antes de `documents`)
não é decidida por código nenhum — é decidida pela ordem em que as 3 `FOREIGN KEY` de
`fin_remittance_payables` foram criadas na migration (`0051_charming_scream.sql:1-3`: remittance →
payable → document). O Refman 8.4 §15.7.1 garante QUE um shared lock é tomado no check de FK, mas
NÃO documenta EM QUE ORDEM quando há múltiplas FKs no mesmo INSERT — é comportamento observado, não
contrato. Recomendei substituir por lock explícito de aplicação (`SELECT ... FOR UPDATE` em
`fin_documents` no início da TX de criação de remessa), no molde que `document-repository.drizzle.ts`
já estabelece como convenção.

**Por que isso importa em geral (padrão reutilizável):** antes de propor "reler sob lock" como fix de
TOCTOU neste repo, verificar se a leitura é por um índice NÃO-único e se o valor buscado
TIPICAMENTE NÃO EXISTE no momento da leitura (é o caso de toda checagem "isto já está
preso/vinculado?"). Se sim, ela vai gap-lockar sob RR, e a pergunta seguinte é sempre "essa mesma
verificação já é feita, de graça, por uma FK RESTRICT dentro de um statement que já ia rodar mesmo
assim?" — se sim, prefira capturar o errno em vez de adicionar uma query+lock nova. Ver também
[[adr-0020-prohibitions]] para o pano de fundo de por que este módulo confia em constraint do banco
(CHECK/FK) como defesa em profundidade em vez de só validação em TS.

Laudo completo (com file:line de cada lock, tabela dos 8 write-paths varridos e as 3 lacunas
declaradas) foi entregue por mensagem ao team-lead — não replicado aqui.
