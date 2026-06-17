# W2 — Code Review (read-only) · PAR-PARTNER-BANK-PIX (US1)

**Veredito:** APPROVED (round 1) · **Nota:** auto-review do implementador (idealmente `code-reviewer` dedicado em sessão separada).

## Verificado

| Critério | Status |
|----------|--------|
| Domínio puro (sem throw/class; Result<T,E>; Readonly) | ✅ helper `parsePaymentTargets` retorna Result; VO imutável |
| Erros kebab-case EN (`invalid-bank-agency`) | ✅ |
| ADR-0020 (sem JSON/ENUM nativo; payment target achatado em colunas) | ✅ |
| ADR-0014 (prefixo `par_*`) | ✅ |
| Migration gerada (não à mão) | ✅ `0010` via drizzle-kit |
| Isolamento de módulos (ADR-0006) | ⚠️ ver Achado 1 |
| Backward-compatible (fixtures legados) | ✅ inputs opcionais; suite 2671 pass |
| Borda Zod valida; erro→422 | ✅ |

## Achados

- **Achado 1 (débito pré-existente, NÃO bloqueia):** `src/modules/contracts/adapters/http/contractor-composition.ts` importa o VO de `partners/domain/shared/payment-target.ts` (cross-módulo, import direto de `domain/` — fere ADR-0006). **Já existia** antes desta US (era de `domain/supplier/`); apenas atualizei o path. Registrar issue própria (fora do escopo da US1 — anti-padrão #15). Não introduzido aqui.
- **Achado 2 (consciente):** `agency` agora é validada também em Supplier/Act (harmonização — D2). Mudança de comportamento coberta: todos os fixtures usam agência válida; suite verde.
- **Achado 3 (escopo):** PUT do Collaborator não edita banco/PIX (apenas create). Coerente com os CAs da US1 (#40: create + detail). Edit de banco/PIX do Collaborator = incremento futuro se pedido.

## Conclusão
Sem Blocker/Major. Achado 1 vira issue de débito. Aprovado para W3.
