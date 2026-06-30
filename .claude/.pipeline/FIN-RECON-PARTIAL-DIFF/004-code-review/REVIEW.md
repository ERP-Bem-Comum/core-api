# W2 REVIEW — FIN-RECON-PARTIAL-DIFF (round 1)

**Skill/agente:** code-reviewer (read-only audit)
**Veredito: APPROVED**

## Checklist
- Domínio puro: sem throw/class/this; Result em toda operação. ✓
- Switch exausto: `isSignCoherent` cobre os 5 DifferenceTreatment sem default (enforced por switch-exhaustiveness-check). ✓
- Branded/imutabilidade: `immutable<>`, `Readonly<>`, `ReconciliationAllocation` com PayableId branded. ✓
- Invariante R3 dependente do tratamento: Partial → Σ itens === transação (saldo aberto fora do balanço); demais → Σ itens + difference === transação. Correto. ✓
- Derivação de status: fonte única = soma das conciliações ATIVAS; `deriveReconciledStatus` puro; in-memory + drizzle derivam (não hardcode) e permitem transição Paid|PartiallyReconciled (CA6). ✓
- Atomicidade (ADR-0015): drizzle confirm/undo em UMA db.transaction (estado + ManualEntry + outbox append); in-memory espelha (append-before-mutate). ✓
- Reuso ManualEntry (decisão b): sem agregado novo; reusa VO + manualEntryToRow; Partial não gera lançamento. ✓
- ADR-0020: CHECK manual (sem ENUM/JSON); migration DROP+ADD CHECK. ✓
- Application: factory function; mapAllocations é tradução (string→branded), não regra de negócio. ✓

## Observação (não-bloqueante)
- `reconciliation.mapper.toDomain` mantém `manualEntry: null` no rehydrate (comportamento pré-existente, documentado): undo não lê e nenhum use-case desta fatia precisa do boundary pós-criação. HTTP test valida o ManualEntry via a conciliação in-memory persistida. Fora do escopo deste ticket.

## Gates desta wave
```
pnpm run lint → eslint .  (0 problems após correção de 3 erros: no-unnecessary-type-conversion x2, init-declarations x1)
pnpm run typecheck → tsc --noEmit (0 erros)
```

## Próximo passo: W3 QUALITY (gate final).
