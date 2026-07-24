# W2 — COMPOSE-DRIVER-MATRIX-GUARD — REVIEW — APPROVED

`docker-compose-expert` (desenhou + auditou a matriz) + `code-reviewer`.

- Cobre os 7 módulos do guard (6 own-URL + reports cascata); as 4 fontes da cascata têm `it` próprio nomeado para reports — pega quem remover `budget_plans_database_url` achando "só budget-plans usa" e quebraria reports em silêncio.
- Escopo ao bloco http evita falso-positivo; `doesNotMatch` documenta que reports não tem URL própria.
- Não muda o compose (que já estava completo); só o trava. Prova de guarda por mutação.
- Zero-dep, sempre-roda (vantagem sobre `docker compose config`, que skipa sem Docker).
