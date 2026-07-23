# W1 — REPORT (implementação) · FIN-STATUS-VARCHAR-WIDTH (#519)

> Bug de PRODUÇÃO. Módulo `financial` apenas (ADR-0014). Skill: `drizzle-schema-author` / `drizzle-orm-expert`.
> Premissa do W0: widen `varchar(16)` → `varchar(24)` nas DUAS colunas `status`, CHECK intacto, migration
> SEM hint de ALGORITHM. Mudança mínima e conservadora.

## Resultado: GREEN. Migration `0039_huge_firelord.sql`. RED→GREEN provado contra MySQL 8.4.10 real.

## 1. Diff do schema (2 linhas)

`src/modules/financial/adapters/persistence/schemas/mysql.ts`
- `:116` `fin_documents.status` — `length: 16` → `24`
- `:249` `fin_payables.status` — `length: 16` → `24`

Só o literal. Nenhuma outra coluna/CHECK/índice/tabela tocado. `git status src/` confirma: só `financial`.

## 2. Migration gerada (SQL cru, colado)

`migrations/mysql/0039_huge_firelord.sql`:
```sql
ALTER TABLE `fin_documents` MODIFY COLUMN `status` varchar(24) NOT NULL;--> statement-breakpoint
ALTER TABLE `fin_payables` MODIFY COLUMN `status` varchar(24) NOT NULL;
```

## 3. Auditoria (verificada na sessão principal, não só pelo agente)

- **Exatamente 2× `MODIFY COLUMN status varchar(24)`** (documents + payables). Nenhum terceiro statement.
- **SEM hint de ALGORITHM** — unhinted, confirmado por grep. Correto (ver §5).
- **CHECK `*_status_chk` NÃO re-emitido** — zero statement de CONSTRAINT no diff. Widening não invalida o
  CHECK; literais não mudaram → kit não gerou nada. Não caiu no caso-bug (só-DROP-sem-re-ADD).
- **Meta `0039_snapshot.json`** reflete só as 2 larguras; `_journal.json` ganhou a entrada idx 39.

## 4. Prova RED→GREEN contra MySQL 8.4.10 real (x99, isolado)

Container MySQL 8.4.10 dedicado no x99 (porta 13306, isolado do túnel do usuário; removido após). O teste do
W0 aplica as migrations (`applyMigrations: true`) e faz o UPDATE.

| Schema | Resultado do teste W0 |
| --- | --- |
| `varchar(16)` (pré-migration, 0001–0038) | **RED** — 2 fail, errno 1406 / SQLSTATE 22001 |
| `varchar(24)` (com a 0039 aplicada) | **GREEN** — 2 pass, UPDATE sucede, read-back íntegro |

O ALTER da 0039 aplicou **sem ERROR 1845** — confirma a decisão de não forçar hint.

## 4b. Validação de REGRESSÃO numa VM Incus isolada (MySQL 8.4.10 nativo) — a pedido do P.O.

Além do container Docker, o P.O. pediu validação numa **VM Incus dedicada** (mais fiel a um servidor
real como o RDS de prod). Criada `fin519-vm` (Ubuntu 24.04 + MySQL **8.4.10 nativo**, `STRICT_ALL_TABLES`),
isolada das VMs `acdg-*`; deletada após. Dois eixos de regressão:

### (A) Sobrevivência de dado — o widen é não-destrutivo

Réplica fiel de `fin_payables` (`varchar(16)` + o CHECK dos 8 status) semeada com uma linha por status
existente. `CHECKSUM TABLE` **antes** do ALTER = `1561723521`; **depois** do `ALTER ... varchar(24)` =
`1561723521` — **idêntico**. Cada linha sobrevive byte a byte. O CHECK segue ativo (`INSERT` inválido →
**ERROR 3819**). O `'PartiallyReconciled'` passa a entrar (bug corrigido). **Zero perda/alteração de dado.**

### (B) Regressão comportamental — a suíte financial inteira passa

Suíte de integração `financial` completa (31 arquivos) rodada contra a VM com a migration `0039` aplicada:
**119 tests · 119 pass · 0 fail · 0 skipped**. Inclui o caso que era RED pelo #519 —
`CA4 (⊻): um título parcialmente conciliado entra no realizado e NUNCA no provisionado` (agora GREEN) — e
o teste de largura do W0 (2 casos GREEN). **Nenhuma regressão no módulo.**

**Conclusão:** o fix não causa regressão — dado preservado (checksum idêntico), constraints íntegras, e
todos os 119 testes do financial verdes contra MySQL 8.4.10 real.

## 5. ⚠️ Medição do risco de lock em produção (ALTER numa tabela com dados) — ACHADO IMPORTANTE

Medido numa tabela sintética de **262.144 linhas** (`status varchar(16)`) no MySQL **8.4.10**:

| ALTER | Resultado no 8.4.10 |
| --- | --- |
| `MODIFY ... varchar(24), ALGORITHM=INSTANT` | **ERROR 1845** (rejeitado) |
| `MODIFY ... varchar(24), ALGORITHM=INPLACE` | **✅ sucesso** — metadata-only |
| `MODIFY ... varchar(24)` (unhinted, o que a 0039 faz) | **✅ ~40ms** para 262k linhas → cai em INPLACE |

**Isto REFINA a premissa do SOL-519** (que assumia COPY, com base na memória `mysql84-alter-varchar-no-algorithm-hint` validada no **8.4.9**):

- No **8.4.9**: `INPLACE`/`INSTANT` estouram 1845; unhinted cai em **COPY** (bloqueia escrita ∝ linhas).
- No **8.4.10** (medido aqui): `INSTANT` estoura 1845, mas **`INPLACE` funciona** (metadata-only, ~instantâneo, não bloqueia DML); unhinted cai em **INPLACE**.

**Conclusão operacional:**
1. **A migration unhinted continua CORRETA** — adapta-se à versão: INPLACE no 8.4.10 (rápido), COPY no ≤8.4.9
   (lento mas funciona). **Forçar hint quebraria** na versão que não o suporta. Não adicionar hint.
2. **O risco de lock depende da versão exata de patch do MySQL de PRODUÇÃO** (não medida aqui):
   - Prod **≥ 8.4.10** → widen é metadata-only → **lock negligível, sem janela de manutenção necessária**.
   - Prod **≤ 8.4.9** → widen é COPY → escritas em `fin_documents`/`fin_payables` **pausam** ∝ nº de linhas →
     **janela de manutenção advisável**; considerar pt-osc/gh-ost se as tabelas forem grandes.
3. **Ação antes do deploy:** confirmar a versão de patch do MySQL de produção (RDS). Se ≥8.4.10, deploy
   direto; se ≤8.4.9, coordenar janela. FK `fin_payables_document_id_fk` ON DELETE CASCADE só é revalidada
   no caminho COPY.

> Sugestão de refino da memória `mysql84-alter-varchar-no-algorithm-hint`: a regra "não forçar hint" segue
> válida, mas o comportamento do INPLACE **mudou de 8.4.9 → 8.4.10** (passou a funcionar para widening). A
> memória fala em 8.4.9; vale anotar a dependência de versão.

## 6. Gates (unit, local)

`typecheck` ✅ · `format:check` ✅ · `lint` ✅ · `pnpm test` (unit, sem `MYSQL_INTEGRATION`) → **4343 · 0 fail**
(teste do W0 skipa limpo). Sem regressão.

## 7. Pendências (W2/W3)

- W2 review read-only (conferir a migration + o widen).
- W3 gate final + `test:integration:financial` verde (o RED do W0 vira GREEN; os CA2/CA4 de
  `realized-provisioned` voltam de brinde).
- **Operacional (fora do código):** confirmar versão do MySQL de prod (§5) antes de aplicar.
- Follow-up ADR-0014 (ticket próprio): `contracts.ctr_documents.status varchar(16)` — não tocado.
