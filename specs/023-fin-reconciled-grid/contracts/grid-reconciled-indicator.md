# Contrato — Grid de Contas a Pagar reflete CONCILIADO (023 / #204)

> Rota **já existente** `GET /api/v2/financial/documents`. Sem rota nova; o item da lista preserva os campos atuais. Mudam: o **valor** do campo `status` (passa a poder ser `Reconciled` derivado) e os **valores aceitos** no filtro `status`.

## Resposta — campo `status` do item da lista

Derivado em tempo de leitura (não persiste em `fin_documents`):

| Situação do documento                                            | `status` retornado |
| ---------------------------------------------------------------- | ------------------ |
| Pago e **todos** os títulos pagáveis `Reconciled` (≥1 título)    | **`Reconciled`**   |
| Pago e **nem todos** os títulos reconciliados (parcial / nenhum) | `Paid`             |
| Demais estados (Draft/Open/Approved/…)                           | inalterado         |

O front já consome `status` e exibe o chip "Conciliado" — nenhuma mudança de shape.

## Filtro — query param `status`

Hoje aceita `Draft|Open|Approved`. Passa a aceitar também `Paid` e `Reconciled`:

| `?status=`                | Retorna                                                                    |
| ------------------------- | -------------------------------------------------------------------------- |
| `Reconciled`              | documentos derivados-reconciliados (Pago + todos os títulos reconciliados) |
| `Paid`                    | documentos `Paid` **não** totalmente reconciliados                         |
| `Draft`/`Open`/`Approved` | inalterado (`eq(status, valor)`)                                           |
| ausente                   | todos (inalterado)                                                         |

Entrada inválida (fora do enum estendido) → **400** (validação Zod), como hoje.

## Comportamento de conciliação/undo (observável)

| Ação                                                | Efeito no grid                                                         |
| --------------------------------------------------- | ---------------------------------------------------------------------- |
| Conciliar **todos** os títulos de um documento Pago | documento passa a aparecer como **Conciliado** na releitura            |
| Desfazer a conciliação                              | documento volta a **Pago** (reversão automática — derivação read-time) |
| Conciliar **parte** dos títulos                     | documento **permanece Pago** (FR-004)                                  |

## Invariantes

- Nenhuma escrita em `fin_documents` (FR-007); fonte única do estado de conciliação é `fin_payables`.
- Sem regressão dos demais estados/filtros do grid.
- Cobertura com o fluxo real (conciliar/undo/filtrar) — read store (in-memory + drizzle) + HTTP.
