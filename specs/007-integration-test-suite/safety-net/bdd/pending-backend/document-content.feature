# language: pt

# Módulo: Contratos · Dimensão: segurança (ownership) + acesso a recurso
# Tipo: FEATURE PENDENTE (backend) — ticket CTR-HTTP-DOCUMENT-CONTENT.
#       Descreve o comportamento DESEJADO. DEVE REPROVAR até existir rota de conteúdo/URL.
#
# Estado atual (core-api@dev): há upload/supersede/delete de documento, mas NENHUMA rota devolve
#   bytes nem URL. getDocument retorna só metadados. Preview/download ficam desabilitados no front.
#
# Origem: handoff do front web-app v2 (tela de detalhe, 2026-06-08). Storage MinIO (ADR-0019).

Funcionalidade: Obter o conteúdo do documento anexado (preview e download)
  Como operador/leitor de contratos (contract:read)
  Quero obter os bytes (ou uma URL) do PDF anexado ao contrato ou aditivo
  Para pré-visualizar em modal e baixar o arquivo, via BFF (o browser nunca fala com o storage direto)

  Contexto:
    Dado um contrato com um documento assinado anexado
    E um operador autenticado com a permissão "contract:read"

  Cenário: DOC-1 — pré-visualizar o PDF (conteúdo inline)
    Quando o operador faz GET /contracts/:id/documents/:documentId/content
    Então a resposta tem status 200
    E o Content-Type é "application/pdf"

  Cenário: DOC-2 — baixar com o nome original
    Quando o operador faz GET /contracts/:id/documents/:documentId/content
    Então a resposta tem status 200
    E o header "Content-Disposition" indica o nome original do arquivo

  Cenário: DOC-3 — documento de aditivo também é acessível
    Dado um aditivo homologado com documento assinado
    Quando o operador obtém o conteúdo do documento do aditivo
    Então a resposta tem status 200 com o PDF

  Cenário: DOC-4 — ownership: documento de OUTRO contrato é negado
    Quando o operador pede o conteúdo de um documentId que pertence a outro contrato (via :id alheio)
    Então a resposta tem status 404 ou 403 (sem vazar o documento)

  Cenário: DOC-5 — exige contract:read
    Dado um usuário autenticado SEM "contract:read"
    Quando ele tenta obter o conteúdo do documento
    Então a resposta tem status 403 (fail-closed)

  Cenário: DOC-6 — sem sessão é negado
    Quando um cliente sem token pede o conteúdo do documento
    Então a resposta tem status 401
