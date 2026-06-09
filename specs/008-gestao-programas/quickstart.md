# Quickstart — Gestão de Programas

> Como desenvolver, rodar e testar o módulo `programs` seguindo o pipeline W0→W3.

## Pré-requisitos

```bash
pnpm install                 # respeita pnpm-lock + corepack (NUNCA npm — ADR-0012)
pnpm run secrets:setup       # gera ./secrets/*.txt para docker-compose (MySQL/MinIO)
```

## Fluxo de implementação (pipeline)

```bash
# 1. Abrir ticket L (BC novo)
pnpm run pipeline:state init PRG-PROGRAMS-MODULE --size L

# 2. W0 RED — escrever testes que falham por inexistência da API
pnpm run pipeline:state wave-start PRG-PROGRAMS-MODULE W0 --agent tdd-strategist
pnpm test                    # vermelho esperado (módulo ainda não existe)

# 3. W1 GREEN — implementar mínimo (domínio → app → adapters → http)
#    Após editar schemas/mysql.ts:
pnpm run db:generate         # gera migration em adapters/persistence/migrations/mysql/
#    editar o SQL gerado: ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci

# 4. W3 — gate de qualidade (tem de estar TODO verde)
pnpm run typecheck && pnpm run format:check && pnpm run lint && pnpm test
```

## Rodar a borda HTTP localmente

```bash
# sobe MySQL + MinIO e o servidor (porta conforme server.ts)
pnpm run test:integration    # ou o script de dev do servidor HTTP

# exemplos (após autenticar e obter <token>):
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/v1/programs

curl -X POST http://localhost:3000/api/v1/programs \
  -H "Authorization: Bearer <token>" -H 'content-type: application/json' \
  -d '{"name":"EPV","sigla":"EPV","director":"Vinícius Basílio"}'
```

## Testes por camada

```bash
# unit de domínio + use cases + rotas HTTP (driver memory) — rápidos
pnpm test

# persistência real (Drizzle/MySQL) + integração — opt-in
pnpm run test:integration
```

| Camada               | Local                                           | Driver                      |
| -------------------- | ----------------------------------------------- | --------------------------- |
| Domínio              | `tests/modules/programs/domain/`                | — (puro)                    |
| Use cases            | `tests/modules/programs/application/use-cases/` | InMemory                    |
| HTTP                 | `tests/modules/programs/adapters/http/`         | `memory` (`fastify.inject`) |
| Persistência         | `tests/modules/programs/adapters/persistence/`  | InMemory + Drizzle/MySQL    |
| Integração HTTP real | coleção Bruno (ADR-0034)                        | servidor + MySQL            |

## Checklist de aceite (DoD)

- [ ] Permissões `program:read|write|deactivate` no catálogo de `auth`.
- [ ] `GET/POST/PUT /programs`, `:id`, `:id/deactivate`, `:id/reactivate` verdes.
- [ ] Sigla única (case-insensitive) → 409; nome/sigla obrigatórios → 422.
- [ ] `program_number` crescente e único sob concorrência.
- [ ] optimistic-lock: `PUT` com `version` obsoleta → 409.
- [ ] desativar inativo → 409; reativar ativo → 409.
- [ ] logo ≤ 5 MB, só imagem (ou sub-ticket P3 explicitamente diferido).
- [ ] eventos `Program*` gravados em `prg_outbox` na tx do `save`.
- [ ] Gate W3 verde + citações das decisões-chave registradas (Princípio IX).
