# W0 — Testes RED

**Estratégia:** reescrita vertical única (ver `000-request.md`). O RED é conduzido **por camada**
dentro da W1 macro (RED→GREEN incremental, commit por camada). Este REPORT cobre o **núcleo do
domínio**, que ancora toda a vertical.

## Camada de domínio (núcleo)

`tests/modules/partners/domain/act/act.test.ts` reescrito para o agregado **Acordo de Cooperação
Técnica** (instituição parceira, CNPJ). Cobre:

- registro do acordo sem CPF/vínculo/início/registrationStatus;
- ausência dos campos de pessoa-física no agregado;
- VO `actNumber` (branco → `act-number-required`);
- `cnpj` inválido → `invalid-cnpj`; `corporateName`/`email` validados;
- `validity` (`endDate < startDate` → `period-end-before-start`);
- **regra de repasse condicional** (`hasFinancialTransfer=true` ⇒ ≥1 payment target;
  `=false` ⇒ opcional) — CA2;
- ciclo de vida com evento (`deactivate`/`reactivate`, guards já-inativo/já-ativo);
- `edit` (troca campos, preserva id/estado, `ActEdited`).

## Resultado

```
node --test tests/modules/partners/domain/act/act.test.ts
→ RED (esperado): TypeError em isBlank(input.name) / API nova (actNumber/cnpj/validity/eventos)
  ainda inexistente no agregado pessoa-física.
```

**Próximas camadas (RED→GREEN na W1):** persistência (`par_acts` schema/mapper/repos), application
(use cases), HTTP (`acts.routes`), export (`act-csv`), contractor-view (cross-módulo), seed.
