# W0 — testes RED · FIN-APPROVE-AUTHORITY-ENFORCE (#609)

**Resultado: RED confirmado.** Nenhum arquivo de `src/` tocado.

Arquivo: `tests/modules/financial/application/use-cases/approve-document-authority.test.ts` — 8 casos.

## Evidência

```
ℹ tests 8 · pass 3 · fail 5

✖ CA1: alçada insuficiente do CHAMADOR → recusa, documento permanece Open
✖ CA1: a alçada checada e a do CHAMADOR, nao a do aprovador indicado
    actual: []   expected: [ '2222...' ]      ← o reader NUNCA e consultado
✖ CA4: chamador sem canApprove → recusa com approver-missing-permission
✖ CA4: autoridade nao encontrada (null) → recusa com approver-not-found
✖ a validacao roda ANTES de qualquer escrita
```

**A distribuição do RED é a prova do defeito.** Os 3 que **passam** são exatamente os que deveriam
passar sem implementação nenhuma — alçada suficiente, `limit null`, sem reader. Ou seja: hoje o
comportamento é *"sempre aprova"*, e só os testes que exigem recusa falham.

O caso do spy é o mais direto: `vistos` ficou vazio. O `ApproverAuthorityReader` **não é consultado
em momento algum** no caminho de aprovar.

## Cobertura

| CA | Casos |
| --- | --- |
| CA1 — alçada insuficiente do chamador → recusa, permanece `Open` | 2 (inclui spy do argumento) |
| CA2 — alçada suficiente → aprova | 1 |
| CA3 — `limit null` (opt-in não configurada) → aprova | 1 |
| CA4 — sem `canApprove` / autoridade ausente | 2 |
| CA5 — gate opt-in, sem reader → aprova como antes | 1 |
| extra — nenhuma escrita na recusa (versão intacta) | 1 |

## Decisões de teste

- **O spy do argumento é essencial.** Sem ele, uma implementação que validasse o `approverRef`
  (aprovador indicado) em vez do `cmd.approvedBy` (quem chama) passaria por acidente. O caso assere
  que o reader recebe o **chamador**.
- **Alçadas extremas** (1 centavo / 999.999.999) em vez do valor líquido exato: o teste não depende
  do cálculo de retenções, então não quebra se a fórmula mudar.
- **Verificação de não-escrita** por comparação de `version` antes/depois — prova que a validação
  roda antes do `repo.save`, não que apenas o resultado é erro.

## Baseline

`pnpm test` na `dev`: **4594 · 0 fail**. Alvo do W3: **4602**.
