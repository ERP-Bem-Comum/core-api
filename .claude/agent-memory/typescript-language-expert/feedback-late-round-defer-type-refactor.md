---
name: feedback-late-round-defer-type-refactor
description: No último round de W2, adiar refactor de tipo público (mesmo comprovadamente gratuito) para ticket de follow-up é a decisão certa — endossado em #368 round 3
metadata:
  type: feedback
---

Quando um achado de revisão é **defensivo** (fecha estado impossível, endurece contrato) e não corrige bug ativo, e o ticket está no **último round antes de escalar ao humano**, a decisão correta é **ticket de follow-up**, não aplicar agora — mesmo quando eu já provei que o refactor compila sem mudar o corpo das funções.

Caso concreto (DEADMAN-AUDIT-FALSE-FIRED / #368, round 3): eu havia provado com `@ts-expect-error` que transformar `EmitterVerdict` em union discriminada por `status` era gratuito (zero mudança nos literais de retorno). O coordenador adiou porque o tipo é consumido por 31 testes e pelo `jq` do workflow. **Endossei o adiamento.**

**Why:** "o refactor é gratuito no compilador" ≠ "o refactor é gratuito no round". O custo real de um round tardio é o risco de introduzir regressão sem orçamento de round para detectá-la — e um achado defensivo, por definição, não está causando dano hoje. Prioridade de round tardio é para achado com dano ativo comprovado (ex.: exceção que mata o step antes do keep-alive).

**How to apply:** ao classificar achados numa revisão, separar explicitamente **"dano ativo hoje"** de **"endurecimento de contrato"**, e dizer qual entra no round corrente. Se o coordenador adiar um endurecimento, endossar em vez de reinsistir — e registrar o achado no follow-up com o probe que o sustenta, para não ser re-descoberto do zero. Ver [[feedback-prove-green-by-merit]] para o formato do probe.
