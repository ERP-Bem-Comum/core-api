# `handbook/api_documentations/` — contrato do LEGADO, não do core-api

> ⚠️ **Nada aqui documenta a API deste repositório.** São os contratos REST do **ERP legado (NestJS)**,
> capturados como insumo de migração. O contrato vivo do core-api é **gerado dos schemas Zod** e servido
> em **`/docs`** ([ADR-0027](../architecture/adr/0027-zod-openapi-contract-first-http-edge.md)) — nunca
> escrito à mão, nunca versionado aqui.

## O que existe

| Arquivo | O que é | Por que fica |
| :--- | :--- | :--- |
| [`doc.yaml`](./doc.yaml) | Contrato REST do legado — 13 rotas, OpenAPI 3.0.3. O `servers:` aponta para `localhost:3003 — Backend NestJS local` | Insumo de migração. Foi a análise deste arquivo que originou o design do módulo de **auth** do core-api |
| [`contracts/openapi.yaml`](./contracts/openapi.yaml) | OpenAPI 3.0.3 legado do módulo de contratos — 10 rotas | **Referência de migração/ACL**, função declarada pelo [ADR-0027](../architecture/adr/0027-zod-openapi-contract-first-http-edge.md) §39: *"deixa de ser alvo e passa a ser referência de migração/ACL para as rotas de contracts"* |

Último commit no diretório: **2026-05-28**. Silêncio aqui é o comportamento correto — contrato de sistema
legado não muda porque o core-api evoluiu.

## Por que este README existe

Numa triagem de higienização em 2026-08-07, o `doc.yaml` foi classificado como **documentação obsoleta do
core-api** e quase virou lápide. O raciocínio parecia sólido: contradiz o ADR-0027, que manda gerar o
OpenAPI dos schemas Zod, e cobre "13 de 159 rotas" — 8% da API.

**A comparação era sem sentido.** As 13 rotas são do legado; as 159 são do core-api. São APIs de sistemas
diferentes:

| Legado (`doc.yaml`) | core-api (gerado) |
| :--- | :--- |
| `/contracts/aditive` | `/contracts/:id/amendments` |
| `/contracts/history/{id}` | `/contracts/:id/activate` |
| `/files/contracts/signed` | … |

O erro foi possível porque o nome do diretório promete "documentação de API" sem dizer **de qual sistema**,
e não havia nada aqui declarando isso. Quem chegasse depois repetiria o veredito.

## Se você procura o contrato do core-api

- **Em execução:** `/docs` (Swagger UI) e o JSON do OpenAPI **3.1.1**, gerados por `zod-openapi` +
  `fastify-zod-openapi` a partir dos schemas Zod de cada rota.
- **No código:** os schemas são a fonte única de verdade — um por rota, em `adapters/http/` de cada módulo.
- **A decisão:** [ADR-0027](../architecture/adr/0027-zod-openapi-contract-first-http-edge.md).

Gerar YAML à mão neste repositório é o anti-padrão que aquele ADR fechou.
