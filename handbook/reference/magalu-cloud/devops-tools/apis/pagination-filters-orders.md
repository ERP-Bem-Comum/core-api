# Paginação e Ordenação

## Paginação

| Parâmetro | Descrição | Valor Padrão | Exemplo |
|-----------|-----------|--------------|---------|
| `_limit` | Determina a quantidade de registros a serem retornados | 50 | `GET /v1/intances?_limit=50` |
| `_offset` | Posição do registro de referência, a partir dele serão retornados os próximos N registros | 0 | `GET /v1/intances?_offset=0` |

## Ordenação

| Ordem | Parâmetro | Exemplo |
|-------|-----------|---------|
| `?_sort=campo:asc` | Ordena de forma Ascendente | `GET /v1/intances?_sort=shipping.date:asc` |
| `?_sort=campo:desc` | Ordena de forma Descendente | `GET /v1/intances?_sort=shipping.date:desc` |
