# Code Review — CTR-DOMAIN-CONTRACT-PENDING-STATE — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer
**Data:** 2026-05-27
**Escopo revisado:** 13 arquivos (+201/-56) — domínio (`types.ts`, `contract.ts`, `repository.ts`), persistência (`mapper`, `drizzle repo`), application (`create-amendment`, `homologate-amendment`, `create-contract`), CLI (`formatters`, `state.ts`), testes (`suite`, `homologate-amendment.test`).

---

## Conformidade com regras (domínio puro)

- ✅ **Zero `throw`/`class`/`this`/`any`** no domínio. `createPending` retorna `Result`; sem `Error`.
- ✅ **Estado refinado, não optional-as-state:** `PendingContract` é um tipo (sem `signedAt`/
  `current*`), não um campo nulável — alinhado a DO C§29 e à alternativa B rejeitada no ADR-0023.
- ✅ **`EffectiveContractCore`/`ContractRegistration`** refinam o antigo `ContractCore` sem perder
  imutabilidade (`Readonly`); union `Contract` discriminada por `status`.
- ✅ **Garantia estática (CA1):** acessar `signedAt`/`current*` num `PendingContract` é erro de
  compilação — confirmado pelo próprio blast radius do `tsc` (8 consumidores).
- ✅ **`save: EffectiveContract`** impede persistir Pending **pelo tipo**, sem erro de runtime novo —
  solução elegante para a fronteira A-lean.
- ✅ **`fromRow` segue exaustivo:** `isStatus` narrowa para os status persistidos; `Pending` vindo
  do banco (corrupção) cai em `contractMapperInvalidStatus` — correto.
- ✅ **`parseActive` nos use-cases de aditivo** mantém a regra no domínio (não vaza `if` de negócio
  para application); de quebra torna **R3 explícito** (antes acessível só pelo acesso a `current*`).
- ✅ DRY: `validateRegistration` compartilha as validações de cadastro entre `create`/`createPending`.

## 🔵 Sugestões (não bloqueiam)

1. **Precedência de erro em `create` mudou.** Ao extrair `validateRegistration`, o check de
   `originalValue.cents === 0` passou a rodar **antes** de `signedAt` (antes era depois).
   **→ ENDEREÇADA (2026-05-27, a pedido do usuário):** `originalValue`-zero saiu de
   `validateRegistration`; cada construtor o checa na posição original (em `create`, após
   `signedAt`). Precedência histórica restaurada. Gate verde (typecheck/format/lint; domínio 58/58).
   Veredito permanece **APPROVED** (correção é melhoria, não muda o parecer).
2. **Labels de status inconsistentes (temporário).** `status.ts` tem `Pendente` (termo correto da
   P.O.) ao lado de `Ativo`/`Encerrado`/`Distratado` (sinônimos antigos). O realinhamento aos termos
   exatos (`Em Andamento`/`Finalizado`/`Distrato`) é o ticket de CLI/ACL — já previsto no ADR-0023.

## O que está bom

- Mudança de escopo (M→L, A-lean) bem contida: persistência de Pending corretamente **adiada** via
  tipo, sem gambiarra. Fronteira "persistência é ticket próprio" preservada.
- `createPending` espelha o padrão do `Amendment` (nasce no estado inicial) — consistência de modelagem.
- Gate antecipado no W1 (typecheck/format/lint/test) — sem rejeição neste round.

## Gate verificado (read-only)

```
pnpm run typecheck   → OK
pnpm run format:check → OK
pnpm run lint        → OK
node --test (suíte)  → tests 1216 · pass 1200 · fail 0 · skipped 16
```

## Próximo passo

**APPROVED → W3.** As 2 sugestões 🔵 ficam registradas (a #2 já tem ticket previsto no ADR; a #1 é
nota sem ação).
