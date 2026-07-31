# Code Review — DEADMAN-AUDIT-FALSE-FIRED — Round 4 (final)

**Veredito:** **APPROVED** ✅

**Reviewer:** `code-reviewer` (read-only) · **Implementação:** `typescript-language-expert` (R1/R2) e `security-backend-expert` (R3-A)
**Data:** 2026-07-28T13:55Z
**Autorização:** rodada excepcional liberada pelo dono do repo após o gate de 3 rounds escalar (ver `003-impl/REPORT-round4.md` §Autorização)

---

## Verificação dos 3 itens que bloqueavam

Reverifiquei cada um **por execução**, contra os mesmos insumos que produziram os bugs no round 3 — não por leitura do relato dos agentes.

| Item | Antes (round 3) | Agora | Status |
| --- | --- | --- | --- |
| **R1** — chave herdada | `THROW: last_seen inválido: function toString() { [native code] }` → step morto antes do keep-alive | `toString`/`constructor`/`valueOf` → `bootstrap`, sem exceção | **FECHADO** |
| **R2** — invariante lexicográfico | `…05:00:00Z` vencia `…05:00:00.001Z` (elegia o mais ANTIGO) | escolhe `.001Z` corretamente | **FECHADO** |
| **R3** — dedup por canal | comportamento certo, decisão não assumida | §3.2 do contrato + comentários no YAML, com o "não conserte isto" explícito | **FECHADO (opção A)** |

**Bônus não pedido:** o round-trip `new Date(v).toISOString() === v` fecha também o **R5** (🔵 do round 3) — `2026-02-30` agora é descartado em vez de virar `2026-03-02` por rollover silencioso do `Date.parse`. A ordem dos guards está correta (`NaN` antes do round-trip, senão `RangeError`).

## Gates

| Gate | Resultado |
| --- | --- |
| `tests/scripts/deadman-audit.test.ts` | **45/45** |
| `pnpm test` | `pass 4581 · fail 0 · skipped 19 · todo 5` |
| `typecheck` · `eslint` · `format:check` | verdes |

## Qualidade do que entrou

- **R1 foi resolvido pela causa, não pelo sintoma.** Validar a *forma* do valor (`!isIsoUtc`) em vez de enumerar valores ruins cobre `undefined`, `''`, função herdada e qualquer lixo futuro — e o comentário explica o mecanismo do protótipo, o que impede que alguém "simplifique" o guard de volta.
- **O comentário do R2 agora é verdade.** Era o que o round 3 apontou: a justificativa afirmava um invariante que a regex não garantia. Agora garante, e a razão (`'Z'`(90) > `'.'`(46)) está escrita.
- **R3 documenta uma armadilha, não só uma decisão.** O texto explica por que o fix "óbvio" (espelhar o reset de `delivered`) seria uma regressão — é a informação que evita o próximo engano.
- **Contrato e código voltaram a casar.** `payload_fired`, `CLOCK_SKEW_TOLERANCE_HOURS` e o clamp saíram de comentário no `.ts` para o §3.2/§5.1 do handbook, que é a fonte de verdade.

## Aberto — follow-ups recomendados (nenhum bloqueia)

1. **Verificação HMAC do `sig`** — o mais sério. O contrato §5 exige (*"Sem `sig` válido → o Auditor ignora a linha"*), não existe em lugar nenhum, e o ADR-0042 (`:55`) já o reconhece como item aberto. Este ticket tornou `ts` forjado **inofensivo**, mas não autentica a **origem** do ping: quem escreve no S3 ainda pode falsificar vida.
2. **Endurecimento de tipos** — discriminated union em `EmitterVerdict` (correlação `lastSeen`/`ageHours`, já normatizada no §3 do contrato), brand `Iso8601` em `notAfter`/`hoursBetween`, e derivar a lista de status de um `as const` para o teste do handbook virar gate mecânico. Os três foram probados como gratuitos pelo especialista; ficaram fora por serem endurecimento, não dano ativo.
3. **Teste do bash do step** — R3 nasceu ali, e continua sem cobertura.
4. **Observabilidade do descarte** — hoje linha inválida é descartada em silêncio; um Emissor com bug fica invisível. Sugerido contar descartes e emitir `::warning::` sem falhar o run.
5. **`for k in $keys` não-quotado** (`:41-50`) e `seq` não validado no self-heal (`:57-66`) — mesma classe do R1, um step antes, fora do trecho reescrito.
6. **`wave-override` na `pipeline:state`** — a CLI não tem como representar "humano autorizou rodada extra"; ver `REPORT-round4.md` §Pendência de estado.

## Próximo passo

**W3** — gate final de qualidade (`ts-quality-checker`). Os quatro comandos já estão verdes nesta verificação; o W3 os roda formalmente e produz `005-quality/REPORT.md`.
