---
name: pre-voo-e-emissor-divergentes-queimam-nsa
description: Régua de aptidão mais permissiva que o emissor produz título que passa no pré-voo e derruba a remessa depois do NSA alocado — o custo é sempre NSA queimado + lote inteiro
metadata:
  type: project
---

Toda vez que `checkPayoutReadiness` ficar **mais permissiva** que o emissor do registro, o título
passa no pré-voo, entra na seleção que o operador confirma, e só é recusado depois de
`generate-remittance.ts:133` ter consumido o NSA sob lock — que não volta. Como o reader é
tudo-ou-nada, um título derruba a remessa inteira, e o operador lê um erro que **não nomeia campo
nem título**.

**Why:** medido em 25/08/2026 no laudo da #788, em dois caminhos independentes: linha digitável de 47
dígitos (barrada tarde em `multipag-segments.ts:329`) e guia de 48 (barrada tarde em
`batch-profile.ts:261-263`). Em ambos nenhum byte errado sai — o prejuízo é operacional, não
financeiro. `remittance-file.ts:313-317` já nomeia essa classe: pior que não ter pré-voo, porque o
operador confirma acreditando ter conferido.

**How to apply:** antes de afrouxar a régua para aceitar um formato novo, verifique se o **emissor
daquela rota existe e aceita o mesmo formato**. Se não existir emissor, afrouxar a régua é regressão,
não melhoria — o formato antes era corretamente excluído.

**Precedente para conversão dupla, e é (b):** `PayoutReadiness` (`types.ts:84-87`) é predicado, não
transportador — o caso `ready` é `{status, route}` e mais nada. A rota `transfer` já resolve isso
chamando a função do domínio **duas vezes**: `remittance-payment-reader.drizzle.ts:96` (via régua) e
`:113-114` (direto), com guarda "Inalcançável" explícita em `:121-124`. O cabeçalho em `:16-18`
proíbe uma segunda *implementação*, não uma segunda *chamada*. Seguir esse molde, não inflar o tipo.

Ver [[g059-fixa-layout-interno-do-codigo-de-barras]].
