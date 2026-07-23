# W1 — REPORT (GREEN) · PARTNERS-BATCH-READER-ISOLATION (#521)

## Fix (test-only)

`suppliers-batch-reader.drizzle.test.ts`:
- linha ~35: `delete(t).where(inArray(t.id,[A,B,MISSING]))` → `delete(t)` (tabela inteira, na entrada) + comentário PT explicando o resíduo/UNIQUE.
- linha 9: removido `import { inArray } from 'drizzle-orm'` (órfão após a troca).

Alinha ao contrato do #535 (limpar por tabela, nunca por PK quando há UNIQUE natural). Forward-compatible: vira `resetPartnersTables(handle)` quando o #535 entrar.

## RED→GREEN contra MySQL 8.4 real (x99 isolado) — suíte partners COMPLETA

- ANTES: 50 tests · 49 pass · **1 cancelled** (batch-reader CA7, `Duplicate '11222333000181'` na UNIQUE de CNPJ) · exit 1.
- DEPOIS: **50 tests · 50 pass · 0 fail · 0 cancelled · exit 0**.

A prova é a suíte na ORDEM NATURAL (supplier-repository antes do batch-reader) — a mesma ordem que falhava. O resíduo não quebra mais.

## Não-afrouxamento

Limpeza por tabela é mais robusta, não mais fraca: o teste segue inserindo A/B e exercitando o WHERE IN real (`getSuppliersView([A,B,MISSING])` → 2 items + 1 missing). Só a estratégia de limpeza mudou; nenhuma asserção afrouxada.

## Gates estáticos

`typecheck` ✅ · `format:check` ✅ · `lint` ✅ (import órfão removido). Só o módulo `partners` (ADR-0014).
