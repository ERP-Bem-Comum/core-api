# W3 — gate de qualidade · FIN-APPROVE-AUTHORITY-ENFORCE (#609)

**Resultado: VERDE nos quatro.**

```
$ pnpm run typecheck     → tsc --noEmit         (limpo)
$ pnpm run lint          → eslint .             (limpo)
$ pnpm run format:check  → All matched files use Prettier code style!
$ pnpm test
ℹ tests 4606 · suites 1319 · pass 4586 · fail 0 · skipped 20 · duration_ms 104298
```

## Regressão zero

| Momento | Testes | Fail |
| --- | ---: | ---: |
| Baseline (`dev`) | 4594 | 0 |
| Após W1 | 4602 | 0 |
| **Final (com o M1 do W2)** | **4606** | **0** |

+12 no total: 8 de use case + 4 de borda HTTP.

## Critérios de aceite

| CA | Onde provado | Status |
| --- | --- | --- |
| CA1 — alçada insuficiente do chamador → recusa, permanece `Open` | use case (2 casos, inclui spy) + **HTTP** (2 casos) | ✅ |
| CA2 — alçada suficiente → aprova | use case + **HTTP** | ✅ |
| CA3 — `limit null` (opt-in) → aprova | use case + **HTTP** | ✅ |
| CA4 — sem `canApprove` / autoridade ausente | use case (2 casos) | ✅ |
| CA5 — gate opt-in, sem reader → comportamento anterior | use case | ✅ |
| CA6 — suíte atual verde, nada passa a exigir alçada | suíte completa | ✅ |

## Definition of Done

- [x] W0 RED antes de tocar `src/`
- [x] W1 GREEN mínimo — **um único arquivo de produção**
- [x] W2 **APPROVED no round 1**; o Major (M1) foi endereçado neste ticket, não adiado
- [x] W3 verde nos quatro comandos
- [x] Contagem ≥ baseline (4606 ≥ 4594)
- [x] Decisão do furo de identidade encaminhada à P.O. — registrada na issue #609 (CA4) e no
      `000-request.md`, **não implementada aqui**

## O que este ticket fechou

Antes: qualquer usuário com `payable:approve` aprovava **qualquer valor** — a alçada era roteamento
(quem *deveria* aprovar), não controle de acesso (quem *pode*).

Depois: o usuário só aprova até o **seu próprio** limite configurado, validado **antes de qualquer
escrita**, no único caminho vivo que transiciona `Open → Approved`.

## O que permanece aberto

O **furo de identidade**: um usuário com alçada própria suficiente ainda pode aprovar um documento
cujo `approverRef` aponta para outra pessoa. É risco de segregação de funções, materialmente menor
que o corrigido, e **exige decisão de produto** — três opções registradas no CA4 da issue #609.
