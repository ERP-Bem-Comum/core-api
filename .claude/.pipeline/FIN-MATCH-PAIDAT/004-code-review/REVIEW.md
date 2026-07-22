# Code Review — FIN-MATCH-PAIDAT — Round 1

**Veredito:** APPROVED

**Reviewers (painel adversarial, 3 independentes):**
- `code-reviewer` (skill) — clean code + regras de camada
- `drizzle-orm-expert` (agente) — projeção/JOIN/tipo/ADR-0020
- `security-backend-expert` (agente) — superfície de exposição do read-model

**Data:** 2026-07-09 · **Escopo:** match-score.ts, suggestion-view.ts, suggestion-view.drizzle.ts, suggest-matches.ts + 4 arquivos de teste (verificação cruzada em dto.ts, schemas.ts, plugin.ts, get-statement-suggestions.ts, document.ts, mapper.ts, mysql-driver.ts).

---

## Consolidação dos vereditos

| Reviewer | Veredito | Blocker | Major | Minor |
| --- | --- | --- | --- | --- |
| code-reviewer | APPROVED | 0 | 0 | 0 |
| drizzle-orm-expert | APPROVED | 0 | 0 | 1 |
| security-backend-expert | APPROVED | 0 | 0 | 2 |

**Nenhum achado bloqueante.** Merge do hotfix recomendado pelos três.

## Confirmações-chave

- **Tipo/timezone (drizzle):** `date('paid_at', { mode: 'date' })` → `Date | null` via `mapFromDriverValue = new Date(value)`; driver fixa `timezone: 'Z'` (`mysql-driver.ts:62`), mesmo padrão de `dueDate`. Validado em runtime no teste de integração (round-trip MySQL real).
- **JOINs (drizzle):** `paidAt` vem da tabela-base `finPayables`; `innerJoin`(finDocuments) e `leftJoin`(finSupplierView) são ambos N:1 (FK→PK) — não duplicam linhas nem tornam a coluna nullable espúria.
- **Exposição (security):** rastreamento completo do fluxo — `paidAt` colapsa em `dateD0: boolean` dentro do domínio (`match-score.ts:160`) **antes** de qualquer serialização; `dto.ts`/`get-statement-suggestions.ts` (únicos consumidores) não expõem o campo. Não cruza a borda HTTP. CWE-200 não aplicável.
- **Custo/ADR:** SELECT de 1 coluna escalar, filtro `status='Paid'` já indexado — sem plano novo. Sem violação de ADR-0020 nem das regras de adapters (try/catch→Result preservado).

## Achados Minor (não bloqueiam — follow-up opcional)

1. **CHECK de consistência `status='Paid' ⇒ paid_at NOT NULL`** (`mysql.ts:259`, drizzle-orm-expert) — invariante hoje garantido no domínio (`payPayableManually` seta status+paidAt atomicamente); nenhum writer cria `Paid` sem `paid_at`. Coluna pré-existente (#231), fora do escopo. Fallback `paidAt ?? dueDate` já blinda o consumidor. Registrável como issue.
2. **`.strict()` nos schemas Zod de resposta financeiros** (`schemas.ts`, security-backend-expert) — defesa em profundidade contra vazamento futuro; não é regressão deste diff. Registrável como issue.
3. **Doc do domínio** (`match-score.ts:153-154`, security) — apenas registro positivo: razão de negócio (#272 ponto 2) documentada adequadamente.

## Próximo passo
APPROVED → W3 (gate: typecheck + format:check + lint + test). CA4 validado no x99 (MySQL real).
