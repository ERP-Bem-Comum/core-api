# Code Review — FIN-CEDENTE-ACCOUNT-PERSIST — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer · **Data:** 2026-06-18T13:28Z · **Branch:** `016-fin-remessa-cnab240`

**Escopo revisado (read-only):**

- `schemas/mysql.ts` (tabela `fin_cedente_accounts` + coluna `fin_documents.debit_account_ref`)
- `migrations/mysql/0004_freezing_nekra.sql`
- `mappers/cedente-account.mapper.ts`
- `repos/cedente-account-store.drizzle.ts`
- `tests/.../mappers/cedente-account.mapper.test.ts` + `tests/.../cedente-account-store.drizzle-mysql.test.ts`
- `package.json` (`test:integration:financial`)

---

## Issues encontradas

### 🔴 Crítica (bloqueia approval)

Nenhuma. Migration gerada por `db:generate:financial` (não à mão, exceto CHARSET/COLLATE — exceção
sancionada). Adapter converte `throw`→`Result`. Schema segue ADR-0018/0020 (varchar+CHECK, int, PK UUID).
**Integração verde** contra MySQL real (23/23). `tsc`/`lint` verdes.

### 🟡 Importante (não-bloqueia)

Nenhuma.

### 🔵 Sugestão (estilo / clareza)

1. **`save` (upsert) sobrescreve `next_nsa`** no `ON DUPLICATE KEY UPDATE`. Para um save de
   **configuração** está correto (replace completo). Quando a **016** implementar a alocação de NSA
   (incremento monotônico), o update do contador deve ser **separado** deste save de config — senão um
   re-save da config poderia regredir o NSA. Registrar p/ o ticket de remessa (016). Não bloqueia.
2. **`debit_account_ref`** é nullable e sem FK física (ref lógica — ADR-0014, igual `supplier_ref`).
   Correto; a integridade conta-↔-documento é validada no domínio/use-case da remessa.

---

## Verificação por categoria

| Cat | Item | Resultado |
| :-- | :-- | :-- |
| Schema (VI) | `fin_cedente_accounts`: PK UUID sem AUTO_INCREMENT; `status` varchar+CHECK ∈ {Active,Closed} (EN, C1); `next_nsa` int+CHECK ≥1; sem JSON/ENUM/trigger | ✅ |
| Migration | `0004` gerada por `db:generate:financial`; CHARSET/COLLATE manual (id/debit_account_ref `utf8mb4_bin`; tabela `utf8mb4_unicode_ci`); **aplica limpa** (integração) | ✅ |
| Mapper (D) | `toRow`/`toDomain` puros; `toDomain` retorna `Result` e rejeita status/id inválidos; param `Readonly<CedenteAccountRow>` | ✅ |
| Adapter (D) | `createDrizzleCedenteAccountStore`; try/catch→`Result` (sem `throw` na borda); `ON DUPLICATE KEY UPDATE` (ADR-0020); SELECT por id | ✅ |
| E (isolamento) | toca só `financial` (`fin_*`); `debit_account_ref` ref lógica sem FK cross | ✅ |
| Compat | `ALTER ... ADD debit_account_ref` nullable → backward-compat; testes de `document-repository` seguem verdes (23/23) | ✅ |
| H (testes) | mapper no gate (4/4) + integração gated (`MYSQL_INTEGRATION`) **verificada** (save/findById/upsert) | ✅ |

---

## O que está bom

- **`db:generate` correto** (`:financial`) — incidente `repos-dir-moved` não recorreu; diff inspecionado.
- **Integração verificada de verdade** (Docker + MySQL): migration aplica, adapter funciona ponta-a-ponta.
- Mapper rejeita estado inválido do banco (`Result`) — `.claude/rules/adapters.md` cumprido.
- Fundação D-CEDENTE entregue: `fin_cedente_accounts` + `debit_account_ref` destravam #120/#123 (017) e a remessa (016).

## Próximo passo

**APPROVED (round 1).** Avançar para **W3** (`ts-quality-checker`) — gate sem Docker. A integração já
foi validada à parte (verde). 🔵 #1 (NSA no upsert) é handoff p/ a 016.
