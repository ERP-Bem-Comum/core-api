# W2 — REVIEW — CORE-DB-POOL-CONFIG-INVARIANT

**Skill:** `code-reviewer` + agente `mysql2-driver-expert` · **Round 1** · **Veredito: APPROVED**

## Verificações
- **Invariante garantida por construção:** `maxIdle` default sempre `< connectionLimit`; caller que força `>=` recebe `err('pool-config-idle-timeout-inert')` (config inerte impossível). Bate com a semântica do mysql2 verificada no source (`base/pool.js:50`, `pool_config.js:18`).
- **`Result` na borda** (`.claude/rules/adapters.md`): sem `throw` cruzando a borda; erros string literal union EN kebab-case. ✅
- **Duplicação eliminada:** a lógica de opções vive em 1 lugar testável; os 7 drivers delegam. O vetor que propagou o bug (cópia 7×) não existe mais. ✅
- **Não fere ADR-0014:** builder é config puro, sem acesso a DB; cada driver segue dono do seu `createPool`/schema/migrations. ✅
- **Sem regressão de tipo:** `MysqlDriverError` ganhou 1 membro por driver; nenhum caller faz switch exaustivo (só re-exporta o union) — grep confirmou. Typecheck verde.
- **Teste-símbolo corrigido:** `mysql-driver-tuning.test.ts` desempacota o Result e passou a asseverar a invariante — fecha exatamente o gap do post-mortem (§4.1).

## Achado (não-bloqueante)
- **CA-8 validado só estruturalmente** (skip sem `MYSQL_INTEGRATION`). O teste de **efeito** — o núcleo da lição — só prova valor de verdade rodando no x99. Marcado como pendência de pré-merge no REPORT do W1 e no W3. Não bloqueia o gate estrutural, mas **bloqueia o merge**.

**Veredito: APPROVED** (com a condição de x99 para o CA-8 antes do PR).
