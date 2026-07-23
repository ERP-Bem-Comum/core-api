# FIN-STATUS-VARCHAR-WIDTH — escopo

> Size **S** · Issue **#519** (P1, **bug de PRODUÇÃO**). Módulo `financial` **apenas** (ADR-0014, um módulo
> por sessão). Proposta de correção ancorada em `.claude/.planning/519-status-width/SOL-519.md`
> (drizzle-orm-expert, com refman 8.4 citado). Este arquivo é o resumo executável.

## Problema (bug de produção)

`fin_documents.status` e `fin_payables.status` são `varchar(16)`
(`src/modules/financial/adapters/persistence/schemas/mysql.ts:116` e `:249`), mas o CHECK das duas
tabelas admite `'PartiallyReconciled'` — **19 caracteres** (`:186`, `:274`). Sob
`sql_mode=STRICT_ALL_TABLES` (ADR-0020), qualquer `UPDATE`/`INSERT` com esse status estoura
**errno 1406 / SQLSTATE 22001** (Data too long) e **reverte a transação inteira** de conciliação
parcial (#141/#247).

**Contradição estrutural:** a migration `0024` gravou um CHECK que _lista_ um literal que a própria
coluna não comporta. O CHECK aceita, o tipo da coluna rejeita — e sob STRICT o rejeito vence.

**Por que passou despercebido:** só o caminho **parcial** dispara. Conciliação **total** grava
`'Reconciled'` (10 chars, cabe em 16); o CA11 existente só testa total. E a suíte de integração
nunca rodou em CI até o #523 (o workflow que acabou de entrar é o que **expôs** este bug).

## Alvo

`varchar(16)` → `varchar(24)` nas duas colunas.

**Por que 24 e não 19:** o piso é 19; **24 alinha à família de enums "largos" do próprio `fin_`**
(`payment_method`=24, `manual_entries.type`=24) e dá folga sã. O `varchar(19)` justo é o
**anti-padrão que originou o bug** — encaixe exato quebra de novo no próximo status. Custo de storage
idêntico (InnoDB cobra pelo conteúdo). **Decisão de largura fica com o revisor/P.O.** — 24 recomendado,
20 é a alternativa mínima, 19 rejeitado.

## ⚠️ Restrição crítica — a migration NÃO leva hint de ALGORITHM

O drizzle-kit emite `ALTER TABLE ... MODIFY COLUMN status varchar(24) NOT NULL` **sem hint** — e deve
ficar assim. O refman diz que estender VARCHAR é INPLACE, mas nesta versão (mysql 8.4.9, memória
`mysql84-alter-varchar-no-algorithm-hint`, verificada no fix #274) **forçar** `ALGORITHM=INPLACE/INSTANT`
estoura **ERROR 1845** — o unhinted cai para **COPY**. Adicionar hint passaria os gates unit (que não
aplicam migration) e só quebraria no apply real. **NÃO adicionar hint.**

**Lock em produção:** `ALGORITHM=COPY` roda sob `LOCK=SHARED` — leituras OK, **escritas bloqueadas** por
duração ∝ nº de linhas. Contagem de prod desconhecida. **Validar o ALTER real num MySQL 8.4 da mesma
versão (x99) com dataset formato-prod ANTES do merge**, medir a duração do COPY, e coordenar janela se
as tabelas forem grandes. FK `fin_payables_document_id_fk` ON DELETE CASCADE é revalidada no rebuild.

## Critérios de aceite

- [ ] **CA1** — `fin_documents.status` e `fin_payables.status` comportam `'PartiallyReconciled'` (19).
- [ ] **CA2** — Sob MySQL real, `UPDATE fin_payables SET status='PartiallyReconciled'` + read-back devolve
      o valor íntegro, sem 1406. Idem `fin_documents`.
- [ ] **CA3** — Migration `0039_*.sql` contém **apenas** os 2 `MODIFY COLUMN varchar(24)`, **sem** hint de
      algoritmo; o CHECK permanece (não re-emitido, ou DROP+ADD idêntico — auditar linha a linha).
- [ ] **CA4** — A conciliação parcial (#141/#247) volta a funcionar: `test:integration:financial` verde,
      incluindo os CA2/CA4 de `realized-provisioned` que falhavam de tabela.
- [ ] **CA5** — Regressão zero: largura só aumenta; valores existentes seguem válidos; CHECK ativo.

## Definition of Done

W0 RED (1406 contra MySQL real) → W1 widen + `db:generate:financial` + migration auditada →
**validação do ALTER real no x99** → W2 review → W3 gate (`typecheck` + `format:check` + `lint` +
`test` + `test:integration:financial`) verde.

## Fora de escopo (follow-up separado, ADR-0014)

`contracts.ctr_documents.status varchar(16)` com `'LogicallyDeleted'` = **exatos 16 chars** (cabe hoje,
margem 0) — **mesma classe de anti-padrão, mas outro módulo e não quebra hoje**. Registrar issue própria
(uniformizar statuses de domínio a `varchar(24)`, relacionada a #274). NÃO entra neste ticket.

## Rastreio

Issue #519 · proposta em `.claude/.planning/519-status-width/SOL-519.md` · exposto pelo #523/`integration.yml`.
