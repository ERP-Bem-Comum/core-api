# language: pt
# Dimensão: Segurança da informação
# Fundamento canônico — OWASP AI Exchange (p.89), Implementation de Access Control:
#   "Apply least privilege […]; Reduce the risk of multi-account abuse: Attackers may
#    create or use multiple accounts to avoid per-user rate limits."
#   (atribuição: OWASP AI Exchange, p.89)
# Reforço (requirements-engineer): cada cenário é um critério de aceitação testável
#   em Given-When-Then (Histórias de Usuário 4ª ed.); cada Cenário cobre UM caso novo.
# Status: MELHORIA (testes novos — rota não exercitada hoje; baseline = 0 testes de 429).
# Política: WRITE_RATE_LIMIT = 30/min nas rotas de escrita.

Funcionalidade: Rate-limit de escrita (429) na borda HTTP administrativa
  Como guardião da borda HTTP
  Quero que rajadas de escrita acima de 30/min sejam recusadas com 429 + Retry-After
  Para mitigar abuso multi-conta e proteger o backend (OWASP least privilege / multi-account abuse)

  Cenário: Burst de escrita em POST /api/v1/users excede o limite e retorna 429
    Dado que estou autenticado como admin
    E que a política WRITE_RATE_LIMIT permite 30 escritas por minuto
    Quando disparo 35 requisições POST /api/v1/users dentro do mesmo minuto
    Então as primeiras 30 requisições retornam 200 ou 201
    E a partir da 31ª requisição recebo 429
    E a resposta 429 inclui o header Retry-After
    E nenhuma requisição retorna 500

  Cenário: Burst de escrita em POST /api/v1/roles excede o limite e retorna 429
    Dado que estou autenticado como admin
    E que a política WRITE_RATE_LIMIT permite 30 escritas por minuto
    Quando disparo 35 requisições POST /api/v1/roles dentro do mesmo minuto
    Então as primeiras 30 requisições retornam 200 ou 201
    E a partir da 31ª requisição recebo 429
    E a resposta 429 inclui o header Retry-After
    E nenhuma requisição retorna 500

  Cenário: Burst de escrita em POST /api/v1/users/:id/roles excede o limite e retorna 429
    Dado que estou autenticado como admin
    E que existe um usuário alvo :id e papéis atribuíveis
    E que a política WRITE_RATE_LIMIT permite 30 escritas por minuto
    Quando disparo 35 requisições POST /api/v1/users/:id/roles dentro do mesmo minuto
    Então as primeiras 30 requisições retornam 200 ou 201
    E a partir da 31ª requisição recebo 429
    E a resposta 429 inclui o header Retry-After
    E nenhuma requisição retorna 500

  Cenário: Reads sob o mesmo burst NÃO são limitados pela política de escrita
    Dado que estou autenticado como admin
    E que a política WRITE_RATE_LIMIT vale apenas para escrita
    Quando disparo 35 requisições GET /api/v1/users dentro do mesmo minuto
    Então todas as requisições retornam 200 até o teto global de leitura
    E nenhuma requisição de leitura retorna 429 pela política de escrita
