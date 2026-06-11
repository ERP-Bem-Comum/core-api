# Phase 1 — Data Model: Expiração automática de contratos

**Sem entidades novas e sem mudança de schema.** Reaproveita o agregado `Contract` e o evento
`ContractEnded (kind 'Expired')` existentes. Esta seção documenta o **predicado de elegibilidade** e os estados.

## Entidades (existentes)

### Contract (agregado, `ctr_contracts`)

Campos relevantes a esta feature (já existentes):

| Campo                 | Tipo                                                                | Papel aqui                                                           |
| --------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `status`              | `'Pending' \| 'Active' \| 'Expired' \| 'Terminated' \| 'Cancelled'` | só `Active` é elegível; alvo `Expired`                               |
| `currentPeriod`       | `Period` (`Fixed{start,end}` \| `Indefinite{start}`)                | vigência **efetiva** (pós-aditivos); só `Fixed` com `end` é elegível |
| `current_period_kind` | `varchar` (`Fixed`/`Indefinite`)                                    | filtro SQL                                                           |
| `current_period_end`  | `date` (PlainDate)                                                  | comparado com o cutoff                                               |
| `endedAt`             | `datetime(3)` nullable                                              | preenchido por `Contract.expire` ao finalizar                        |

**Transição de estado** (já existente, reusada):

```
Active --(Contract.expire(active, at), at-as-instant)--> Expired   [emite ContractEnded (kind 'Expired'); popula endedAt]
```

Estados **não-elegíveis**: `Pending`, `Terminated`, `Cancelled`, e `Active` com `currentPeriod.kind =
'Indefinite'` (sem `end`).

## Predicado de elegibilidade (regra desta feature)

Dado `now: Date` (instante do tick) e `hojeBRT = plainDateInSaoPaulo(now)`:

```
elegível(contract) ⟺
    contract.status === 'Active'
  ∧ contract.currentPeriod.kind === 'Fixed'
  ∧ PlainDate.isBefore(contract.currentPeriod.end, hojeBRT)   // end < hoje_BRT  (D+1)
```

- `hojeBRT` = data-calendário de `now` deslocado para **UTC-3** (offset fixo `-03:00`):
  `plainDateInSaoPaulo(now) = PlainDate.fromDate(now - 3h)` (extrai ano/mês/dia em UTC após o deslocamento).
- **D+1 conferido**: contrato com `end = E` é válido todo o dia `E` (BRT) e elegível a partir de `E+1`
  (`E < hojeBRT`).

## Evento de domínio (existente)

`ContractEnded (kind 'Expired')` — já emitido pelo encerramento manual por expiração. Entregue via outbox (`save(contract,
[event])`). **Nenhum evento novo.**

## Read-model / leitura

Nenhuma mudança nas leituras (`GET /contracts`, `/contracts/:id`): elas já devolvem o `status` persistido —
que passará a refletir `Expired` automaticamente após o sweep.
