# language: pt
Funcionalidade: Export de fornecedores e catálogo de categorias (US-003/US-004, P2)
  Como gestor
  Quero exportar fornecedores em CSV e consultar o catálogo de categorias
  Para análise externa e para popular filtros a partir da fonte canônica

  Contexto:
    Dado que existe uma sessão autenticada com a permissão "supplier:read"

  # CT-201 — export respeita filtros
  Cenário: Exportar fornecedores filtrados por categoria
    Dado fornecedores em categorias diferentes
    Quando faço "GET /api/v1/suppliers/export?categories=LIMPEZA"
    Então recebo um CSV (Content-Type text/csv) só com fornecedores de "LIMPEZA"
    E a resposta tem header Content-Disposition attachment

  # CT-202 — segurança: CSV/formula injection na saída
  Cenário: Célula que começa com caractere de fórmula é neutralizada
    Dado um fornecedor cujo nome começa com "="
    Quando exporto o CSV
    Então a célula correspondente é escapada (anti-fórmula, via shared/utils/csv.ts)

  # CT-203 — export sem permissão
  Cenário: Export sem "supplier:read"
    Dado uma sessão SEM "supplier:read"
    Quando faço "GET /api/v1/suppliers/export"
    Então a resposta tem status 403

  # CT-204 — catálogo canônico (resolve FR-017 do front)
  Cenário: Listar as categorias de serviço
    Quando faço "GET /api/v1/suppliers/service-categories"
    Então recebo exatamente 39 códigos legados
    E os typos legados ("ONGANIZACAO_DE_EVENTOS", "TRASPORTE") aparecem literais

  # CT-205 — filtros descartados (US-005)
  Cenário: Query param não suportado em colaboradores
    Quando faço "GET /api/v1/collaborators?programa=x&idade=30"
    Então os parâmetros "programa" e "idade" são ignorados/rejeitados (não filtram)
    E o contrato/OpenAPI não anuncia esses filtros
