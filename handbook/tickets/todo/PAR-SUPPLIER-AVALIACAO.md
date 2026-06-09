# Request — PAR-SUPPLIER-AVALIACAO

> Handoff do **front (web-app v2)** para o **core-api**. Padrão `000-request.md`.
> Origem: form de criação/edição de **Fornecedor** alinhado ao legado. Verificado em 2026-06-09.

## Título
Fornecedor — campos **Avaliação de Serviço** e **Comentário da Avaliação**

## Contexto
O form de Fornecedor foi alinhado ao legado, que tem dois campos de **avaliação** do prestador. Eles **não
existem** no agregado Supplier do core-api, então estão no front como **placeholders desabilitados (gated)**.

## Estado atual (verificado)
Agregado Supplier: `name`, `corporateName`, `fantasyName`, `email`, `cnpj`, `serviceCategory`,
`bankAccount?`, `pixKey?`, `activation`. **Sem** campos de avaliação.

## Gap (o que falta no backend)
- **`serviceRating`** — Avaliação de Serviço. Definir domínio: nota (1–5)? enum (Ruim/Regular/Bom/Ótimo)?
  → o front renderiza como **select** (hoje desabilitado, sem opções).
- **`ratingComment`** — Comentário da Avaliação (texto livre, opcional).

## Critérios de Aceitação
1. `serviceRating` e `ratingComment` no agregado Supplier (create/update/detail/list-item se fizer sentido).
2. Domínio do rating definido (escala/enum) e exposto no contrato para o front popular o select.

## Notas (front)
- Campos já posicionados na seção "Dados básicos" do form e no detalhe (como `—`).
- Quando o contrato existir: trocar os placeholders por `<select>`/`<input>` ligados ao controller + schema.
