# Code Review — FIN-RECON-DEBIT-ACCOUNT-FK (#160) — Round 1

**Veredito:** APPROVED · **Data:** 2026-06-19

**Escopo:** guard de integridade no import use-case + error-mapping + fixtures (3 testes) + teste RED.

## Decisão de design (Princípio IX) — guard por identidade, NÃO FK cross-aggregate

O #160 pediu FK física `debit_account_ref → fin_cedente_accounts`. Investigação:

1. **Zero precedente:** todas as 8 FKs do schema financial são **intra-agregado** (root→filhos). A FK pedida seria a 1ª **cross-aggregate** (`statement` e `cedente` são agregados distintos).
2. **Convenção canônica** (citação literal):
   > *"Prefer references to external Aggregates only by their globally unique identity, not by holding a direct object reference (or 'pointer')."* — Vaughn Vernon, *Implementing Domain-Driven Design*, **p. 460**.

   Uma FK física é o "direct object reference" entre agregados que a regra evita. O próprio schema comenta (linha 597): *"sem FK cross-aggregate — D-AGGREGATES/Evans"*.
3. **ADR-0020** permite FK como *feature* SQL, mas não decide o boundary de agregado — isso é design (DDD).

**Decisão (humano, AskUserQuestion):** guard por identidade no use-case de import. Mesma garantia de integridade do intent do #160 (extrato não referencia cedente inexistente), **consistente com a convenção** + sem ADR novo + sem migration/Docker. O use-case já carregava o cedente (guard #123); só faltava rejeitar `null`.

## Issues

- 🔴 nenhuma. Guard na sequência canônica (validar→fetch→domain); erros por Result; sem throw/class. Ordem: ref→existência→encerrada (account guards antes do parse, como o guard #123 original).
- 🟡 nenhuma.
- 🔵 `account-not-found` cobre tanto ref malformada quanto inexistente (a borda HTTP já valida uuid via Zod; o caminho não-uuid só é atingível fora do HTTP). Status 422 (referência pendente), alinhado a `cedente-account-not-found`.

## O que está bom

- Fecha o gap real do #160 (linha 103 antiga: `!== null && isClosed` deixava inexistente passar) pela via DDD-limpa.
- Fail-first honrado (RED no caso inexistente) + 3 fixtures corrigidos (regressão zero: 3003 pass / 0 fail).
- Zero schema novo; integração intacta (guard é app-layer).

**APPROVED** → W3.
