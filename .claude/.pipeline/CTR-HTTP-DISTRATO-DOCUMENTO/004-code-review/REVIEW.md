# 004 — W2 Review (especialistas) — CTR-HTTP-DISTRATO-DOCUMENTO

> Mudança invasiva (primeiro evento de domínio enriquecido). Revisada por **dois especialistas**
> em paralelo. **Veredito final: APPROVED.**

## `typescript-language-expert` — domínio/aplicação → APPROVED (sem ações)

- Discriminated union sã: `TerminatedContract` ganha o campo; `ExpiredContract` não — narrowing por
  `status` intacto; acessar `terminationReason` em Expired continua erro de compilação.
- `exactOptionalPropertyTypes` seguro: `reason?: string` é parâmetro opcional (não propriedade
  `undefined`); a normalização colapsa undefined/vazio → null antes de qualquer atribuição.
- Exaustividade: só `expire`/`terminate` constroem `ContractEnded` no domínio; ambos preenchem o campo.
- Normalização no domínio (lugar canônico); imutabilidade preservada (`immutable`); zero `any`/`throw`/cast.

## `drizzle-orm-expert` — persistência → APPROVED com 2 ações

- **P1 (requerido) — ENDEREÇADO**: migration `0009` recebeu `CHARACTER SET utf8mb4 COLLATE
  utf8mb4_unicode_ci` explícito no `ADD COLUMN` (padrão documentado do projeto). Re-validado:
  `test:integration` 88 pass.
- **P2 (consistência) — ANALISADO E DISPENSADO**: guarda de comprimento no `contractFromRow`. A coluna
  é `varchar(1000)` — o MySQL nunca retorna valor > 1000 (constraint física já garante o limite).
  Diferente de `status`/`money` (formato validável), `terminationReason` é texto livre sem "valor
  inválido" possível além do comprimento já limitado. A guarda seria código morto redundante. Dispensada.
- CHECK lenient: direção correta (`reason NOT NULL → Terminated`); não quebra legado. ✅
- Retrocompat outbox (v1 sem campo → null): correto; silenciar payload corrompido é aceitável (campo
  informativo, não discriminador). ✅
- ADR-0020: `varchar`+CHECK (não ENUM), sem índice (sem query-alvo), CHECK nomeado. ✅

## Conclusão

Nenhum bloqueador remanescente. Pode seguir para W3.
