---
name: edit-use-cases-skip-smart-constructor
description: PATCH use cases (ex. edit-cedente-account.ts) fazem spread direto sem chamar create() — invariante novo em create() não protege edição
metadata:
  type: project
---

Em `src/modules/financial/application/use-cases/edit-cedente-account.ts:80-95`, o objeto `updated` é
montado por spread (`{ ...found.value, ...(campo !== undefined ? {...} : {}) }`) e vai direto para
`deps.cedenteStore.save(updated)` — **sem** passar por `create()` (o smart constructor em
`domain/cedente/cedente-account.ts`). Isso vale para TODOS os invariantes de `create()`, não só um novo:
hoje mesmo `bank-code-required`/`agency-required`/etc. não são reafirmados numa edição.

Achado durante a revisão do DV do cedente (issue do Validador Universal Bradesco recusando remessa,
21/08/2026) — ver [[account-check-digit-domain-vs-borda]] se essa memória existir.

**Por quê isso importa:** qualquer regra nova adicionada só em `create()` (ex.: verificação de módulo 11
via `account-check-digit.ts`, já usada para o FAVORECIDO em `payout/payee-account.ts` mas nunca para o
CEDENTE) protege apenas o cadastro novo — uma edição que troca `accountDigit` para outro valor errado
passa batido. `wantsBankDataChange` (linha 57-62) já isola exatamente quando os campos bancários mudam;
é o ponto natural para rotear por uma validação equivalente à de `create()` antes do `save`.

**Como aplicar:** ao revisar qualquer PATCH/edit use case deste módulo, checar se ele reconstrói o
agregado via smart constructor ou só faz spread. Spread sem revalidação é o padrão atual — não assumir
que "já existe uma validação lá" só porque `create()` a tem.
