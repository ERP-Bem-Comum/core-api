# Zod — Referencia de uso no core-api

## O que e Zod

Zod e uma biblioteca de validacao e inferencia de tipos para TypeScript. A partir de um schema declarativo (`z.object(...)`, `z.string()`, etc.) ela realiza tres coisas ao mesmo tempo:

1. **Validacao de runtime:** verifica se um valor desconhecido satisfaz o shape esperado.
2. **Inferencia de tipo:** gera o tipo TypeScript correspondente (`z.infer<typeof schema>`), eliminando a necessidade de declarar o tipo manualmente e evitando drift tipo↔schema.
3. **Geracao de documentacao:** com `zod-openapi`, os schemas Zod se tornam a fonte de um documento OpenAPI — nunca escrito a mao.

Site oficial: https://zod.dev

## Fronteira invariante (ADR-0027)

> Zod vive **exclusivamente em `src/http/`** (adapter de borda HTTP).
> Dominio e application **nunca** importam Zod.

A divisao de responsabilidade e intencional:

| Camada | Ferramenta | O que valida | Resposta HTTP |
| :--- | :--- | :--- | :--- |
| Borda HTTP (`src/http/`) | Zod | Shape do request (campos presentes, tipos primitivos) | 400 imediato |
| Dominio (`src/modules/**/domain/`) | Smart constructors + `Result<T,E>` | Invariante de negocio (ex.: `Email`, `Money`, `Vigencia`) | 4xx apos mapeamento |

Violar essa fronteira — importar Zod fora de `src/http/` — acopla logica de negocio ao framework de borda, ofendendo o ADR-0006 (dominio sem framework) e o ADR-0027.

## Versao em uso

```
zod          4.4.3
zod-openapi  5.4.6  (bridge Zod → OpenAPI 3.1.1)
```

## Padrao fastify-zod-openapi

O plugin `fastify-zod-openapi` conecta Zod ao Fastify v5 em tres pecas:

```ts
import {
  serializerCompiler,
  validatorCompiler,
  fastifyZodOpenApiPlugin,
  fastifyZodOpenApiTransformers,
  type FastifyZodOpenApiTypeProvider,
} from 'fastify-zod-openapi';

// 1. Registra os compilers (validador de entrada + serializador de saida)
app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

// 2. Ativa o type-provider (inferencia de tipos nas rotas)
const app = Fastify().withTypeProvider<FastifyZodOpenApiTypeProvider>();

// 3. Registra o plugin (conecta schemas Zod ao @fastify/swagger)
await app.register(fastifyZodOpenApiPlugin);

// 4. Conecta os transformadores ao @fastify/swagger
await app.register(swagger, {
  openapi: { openapi: '3.1.1', info: { ... } },
  transform: fastifyZodOpenApiTransformers.transform,
  transformObject: fastifyZodOpenApiTransformers.transformObject,
});
```

Com isso, qualquer rota que declare `schema: { body: z.object(...) }` recebe:
- Validacao automatica (400 em payload invalido).
- Tipos inferidos no handler (`req.body` tem o tipo correto, sem cast).
- Entrada automatica no documento OpenAPI em `/docs/json`.

## Fluxo de validacao

```
Request JSON
  │
  ▼
Zod (shape) ──── invalido ──→ 400 { error: { code: 'validation', ... } }
  │
  ▼ valido
Smart constructors (dominio) ── invalido ──→ 4xx (mapeado via sendResult)
  │
  ▼ ok
Use case → Result<T,E> ──→ sendResult(reply, result, { ok, errors })
```

## OpenAPI 3.1.1

O documento e gerado automaticamente dos schemas Zod registrados nas rotas.
Disponivel em `/docs/json` (JSON) e `/docs` (Swagger UI).
A versao-alvo e **3.1.1** — alinhada ao JSON Schema 2020-12 (ADR-0027).
O `openapi.yaml` legado em `handbook/api_documentations/` e referencia de migracao apenas, nao e mantido como contrato vivo.

## Referencias

- [ADR-0027](../../architecture/adr/0027-zod-openapi-contract-first-http-edge.md) — decisao de adocao (contrato, fronteiras, alternativas rejeitadas).
- [ADR-0025](../../architecture/adr/0025-http-server-fastify-core-api.md) — Fastify como adapter de borda.
- [zod-openapi](https://github.com/samchungy/zod-openapi) — bridge Zod → OpenAPI.
- [fastify-zod-openapi](https://github.com/samchungy/fastify-zod-openapi) — integracao com Fastify v5.
- `src/http/app.ts` — uso canonico no projeto.
