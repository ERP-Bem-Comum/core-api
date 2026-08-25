---
name: fin-document-hard-replace-lock-order
description: document-repository.drizzle.ts save() — child-rows-diff já cobre fin_payables/retentions/registered_taxes; diff de linha não resolve deadlock de ordem contra fin_remittance_payables
metadata:
  type: project
---

`document-repository.drizzle.ts` (módulo `financial`) — `save()` do agregado `Document` faz *diff de
conjunto* (não hard replace puro) nas 3 tabelas filhas via `child-rows-diff.ts`: `sameRowSet`
(pula DELETE/INSERT se o multiconjunto não mudou — chave por conteúdo, sem `id` em
`taxLikeKey`, com `id` em `payableKey` desde o PR #794) + `DELETE ... WHERE id IN (...)`
(igualdade sobre PK, sem gap lock — corrigiu o deadlock cross-documento do #803). Cobertura:
`fin_payables` (`:312-342`), `fin_retentions` (`:344-370`), `fin_registered_taxes` (`:372-398`) —
as três com o MESMO tratamento, de propósito (`:309-310`). `fin_document_timeline`/
`fin_timeline_field_changes` são append-only, fora deste padrão.

Em 2026-08-23 o time-lead pediu laudo sobre ir além — trocar por diff DE LINHA (`UPDATE`
seletivo do que mudou, `INSERT` só do novo, `DELETE` só do removido) — para resolver um
deadlock NOVO e diferente do #803: inversão de ordem intra-documento contra
`fin_remittance_payables` (emissão de remessa). Trace: `INSERT INTO fin_remittance_payables`
segura S(`fin_payables`) → espera S(`fin_documents`) [ordem das 3 FK `RESTRICT`
declaradas em `mysql.ts:1273-1287`: remittance→payable→document]; `save()` do documento sempre
adquire X(`fin_documents`) via `SELECT ... FOR UPDATE` **primeiro** (`:239-243`, antes de
qualquer escrita nas filhas), depois toca `fin_payables` — ordem inversa.

**Conclusão do laudo: diff de linha REDUZ a superfície (menos linhas tocadas no caso comum —
ex.: só ajustar o valor do pai deixa de tocar os 2 filhos de retenção), mas NÃO elimina a
classe de deadlock**, porque a ORDEM de aquisição (documento-antes-de-título no save) é
estrutural ao desenho, independente de a escrita nas filhas ser `DELETE+INSERT` ou `UPDATE`.
`onDuplicateKeyUpdate` sofre da mesma limitação (não resolve remoção de linha nem muda ordem) —
mesmo `fin_payables` só tendo UNIQUE na PK, o que tornaria ODKU "seguro" ali no sentido do
ADR-0020, mas não no sentido de resolver o problema perguntado.

Armadilha registrada para quem for atacar a ORDEM (não a granularidade): travar `fin_payables`
por `document_id` (índice não-único) ANTES do `SELECT FOR UPDATE` em `fin_documents`
reintroduziria o gap lock cross-documento que o #803/E2 eliminou — travar por PK exige já
saber os ids afetados, que hoje só se descobre com um `SELECT` que roda DEPOIS do lock em
`fin_documents`. Ver [[drizzle-error-and-tx-semantics]] para semântica de erro/transação usada nessa análise.

**Por que registrar:** a pergunta "por que fin_payables ficou de fora do diff" tem premissa
falsa — não ficou. Confundir diff-de-conjunto com diff-de-linha, ou confundir granularidade de
escrita com ordem de lock entre transações, são os dois erros fáceis de repetir numa próxima
sessão sobre este mesmo código.

**Como aplicar:** antes de propor qualquer mudança em `document-repository.drizzle.ts` save()
por causa de deadlock, primeiro classificar: é cross-documento (→ já resolvido, ver `child-rows-diff.ts`
header) ou intra-documento contra outra tabela como `fin_remittance_payables` (→ é ordem de
aquisição, não granularidade — diff de linha ajuda mas não fecha o caso).
