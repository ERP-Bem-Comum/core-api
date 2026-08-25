# language: pt

# Módulo: Contratos · Dimensão: ciclo de vida + consistência
# Tipo: FEATURE PENDENTE (backend) — ticket CTR-HTTP-DISTRATO-DOCUMENTO.
#       Estes cenários descrevem o comportamento DESEJADO. DEVEM REPROVAR até o backend
#       enriquecer POST /contracts/:id/end. Fail-first: o vermelho dirige a implementação.
#
# Estado atual (core-api@dev): endContractBodySchema = z.object({ kind: z.enum(['Expire','Terminate']) }).
#   - endedAt = clock now (ignora data efetiva); sem documento; sem motivo.
#
# Origem: handoff do front web-app v2 (validação em tela 2026-06-08). ADR-0023 (ciclo de vida).

Funcionalidade: Distrato com documento assinado, data efetiva e motivo
  Como operador de contratos (contract:write)
  Quero distratar um contrato Em Andamento anexando o PDF assinado, a data efetiva e o motivo
  Para que o encerramento reflita a realidade (data correta + documento + justificativa)

  Contexto:
    Dado um operador autenticado com a permissão "contract:write"
    E um contrato em estado "Em Andamento" (Active)

  Cenário: DIST-1 — distratar com documento + data efetiva + motivo
    Dado um PDF de distrato assinado (magic bytes %PDF, ≤20 MiB)
    Quando o operador efetiva o distrato com data efetiva não-futura e um motivo
    Então a resposta tem status 200 com o contrato em status "Terminated"

  Cenário: DIST-2 — endedAt é a data efetiva informada, não o now
    Quando o operador distrata com data efetiva "2026-06-01" (passada)
    Então o contrato fica "Terminated"
    E o "endedAt"/data de encerramento é "2026-06-01" (a data informada, não a data de hoje)

  Cenário: DIST-3 — documento de distrato fica vinculado e visível no detalhe
    Quando o operador distrata anexando o documento assinado
    E em seguida consulta GET /contracts/:id
    Então o documento de distrato (categoria signed_termination) aparece vinculado ao contrato

  Cenário: DIST-4 — distratar sem documento assinado é rejeitado
    Quando o operador tenta efetivar o distrato SEM o documento assinado
    Então a resposta tem status 422
    E o code do erro é "terminate-no-signed-document" (mapeável em i18n)

  Cenário: DIST-5 — data efetiva futura é rejeitada
    Quando o operador tenta distratar com data efetiva no futuro
    Então a resposta tem status 422
    E o code do erro é "terminate-invalid-date"

  Cenário: DIST-6 — distrato exige contract:write
    Dado um usuário autenticado SEM a permissão "contract:write" (perfil reader)
    Quando ele tenta distratar o contrato
    Então a resposta tem status 403 (fail-closed)
