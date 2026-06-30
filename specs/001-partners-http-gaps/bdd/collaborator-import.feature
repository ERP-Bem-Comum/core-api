# language: pt
Funcionalidade: Import de colaboradores em lote (US-001, P1)
  Como gestor
  Quero importar colaboradores a partir de um arquivo CSV
  Para cadastrar muitas pessoas de uma vez, sabendo quais linhas falharam

  Contexto:
    Dado que existe uma sessão autenticada com a permissão "collaborator:write"
    E que o endpoint é "POST /api/v1/collaborators/import" (multipart, campo "file")

  # CT-001 — caminho feliz (P1)
  Cenário: Importar um CSV totalmente válido
    Dado um CSV com 3 colaboradores válidos (cabeçalho + 3 linhas)
    Quando o arquivo é enviado ao endpoint de import
    Então a resposta tem status 200
    E o corpo é { "created": 3, "failed": [] }
    E os 3 colaboradores passam a existir com situação "Pré Cadastrado"

  # CT-002 — import parcial (regra: válidas entram, inválidas não abortam)
  Cenário: Importar um CSV com linhas válidas e inválidas
    Dado um CSV com 2 linhas válidas e 1 linha com CPF inválido (linha 3)
    Quando o arquivo é enviado
    Então a resposta tem status 200
    E "created" é 2
    E "failed" contém um item com { "line": 3 } e um "error" descritivo
    E nenhuma das linhas válidas é perdida por causa da inválida

  # CT-003 — duplicidade intra-arquivo (primeira ocorrência ganha)
  Cenário: CSV com CPF repetido entre linhas
    Dado um CSV onde a linha 2 e a linha 4 têm o mesmo CPF
    Quando o arquivo é enviado
    Então a linha 2 é criada
    E a linha 4 aparece em "failed" como conflito de CPF

  # CT-004 — arquivo vazio (borda, não erro)
  Cenário: Importar arquivo vazio
    Dado um arquivo sem linhas de dados (só cabeçalho ou totalmente vazio)
    Quando o arquivo é enviado
    Então a resposta tem status 200
    E o corpo é { "created": 0, "failed": [] }

  # CT-005 — CSV malformado
  Cenário: Importar conteúdo não-parseável
    Dado um arquivo cujo conteúdo não é um CSV válido
    Quando o arquivo é enviado
    Então a resposta tem status 400
    E o envelope de erro tem code "csv-malformed" e um "requestId"
    E nenhum colaborador é criado

  # CT-006 — segurança: sem permissão (Broken Access Control)
  Cenário: Import sem a permissão necessária
    Dado uma sessão autenticada SEM "collaborator:write"
    Quando o arquivo é enviado
    Então a resposta tem status 403
    E o envelope de erro tem "requestId"

  # CT-007 — segurança: sem sessão
  Cenário: Import sem autenticação
    Dado nenhuma sessão válida
    Quando o arquivo é enviado
    Então a resposta tem status 401

  # CT-008 — segurança: upload acima do limite (DoS / resource exhaustion)
  Esquema do Cenário: Rejeitar upload abusivo
    Dado um upload que excede "<limite>"
    Quando o arquivo é enviado
    Então a resposta tem status 413 ou 400 (rejeição antes do processamento)

    Exemplos:
      | limite                       |
      | tamanho máximo de arquivo    |
      | número máximo de linhas (cap) |
