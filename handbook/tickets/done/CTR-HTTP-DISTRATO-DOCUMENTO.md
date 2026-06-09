# Request — CTR-HTTP-DISTRATO-DOCUMENTO

> Handoff do **front (web-app v2)** para o **core-api**. Escrito no padrão `000-request.md` do pipeline.
> Origem: validação em tela do fluxo de Distrato (módulo Contratos). Verificado contra `core-api@dev`
> em 2026-06-08.

## Título
Distrato com documento assinado, data efetiva e motivo (enriquecer `POST /contracts/:id/end`)

## Size
M

## Contexto
O distrato **já existe** no core-api e funciona ponta-a-ponta — este ticket **não é para criá-lo**, e sim
para **enriquecê-lo** com o que o front precisa capturar na tela.

O front modela o Distrato como um **evento de encerramento antecipado** da vigência ("distratar"), no qual
o operador anexa o **documento de distrato assinado**, informa a **data efetiva** do distrato e um **motivo**.
Hoje o endpoint de encerramento aceita apenas o `kind`, sem nenhum desses dados.

## Estado atual (verificado em `core-api@dev`)
- **Endpoint:** `POST /contracts/:id/end` — body `{ kind: 'Expire' | 'Terminate' }`
  (`Terminate` = distrato). Auth: `requireAuth` + `authorize(contract:write)`. Resposta: `contractDetail` (200).
  - `src/modules/contracts/adapters/http/plugin.ts` (rota `/contracts/:id/end`)
  - `src/modules/contracts/adapters/http/schemas.ts` → `endContractBodySchema = z.object({ kind: z.enum(['Expire','Terminate']) })`
- **Domínio/aplicação:** `application/use-cases/end-contract.ts` (`EndContractKind = 'Expire' | 'Terminate'`),
  agregado `TerminatedContract`, `endedAt` definido pelo **clock (now)**.
- **Status:** `Terminated` → rótulo "Distratado" (`cli/formatters/status.ts`).
- **CLI:** `encerrar-contrato --motivo distrato`.
- **ADR-0023** (ciclo de vida 4 estados): `Pendente → Em Andamento → Finalizado / Distrato`.

## Gap (o que falta)
O `POST /contracts/:id/end` com `kind: 'Terminate'` **não captura**:
1. **Documento de distrato assinado** (PDF) — análogo ao documento assinado do contrato (ativação) e à
   homologação de aditivo. Provável `categoria` nova de documento: `signed_termination` (ou `distrato`).
2. **Data efetiva do distrato** — hoje `endedAt = now` (clock). O operador precisa informar a data real
   do rompimento (que pode não ser "agora"), não-futura.
3. **Motivo/justificativa** do distrato (texto).

## Escopo (proposta para o core-api)
- Estender o fluxo de distrato (`kind: 'Terminate'`) para aceitar **documento assinado + data efetiva + motivo**.
  Duas formas possíveis (decisão do backend/P.O.):
  - (a) Enriquecer o body de `POST /contracts/:id/end` quando `kind = 'Terminate'`
    (ex.: `{ kind: 'Terminate', terminatedAt, reason }`) **+** rota de upload do documento de distrato
    (espelhando `POST /contracts/:id/documents?categoria=signed_termination`); **ou**
  - (b) Endpoint dedicado de distrato análogo à ativação/homologação (upload do documento → efetiva o distrato).
- `endedAt` do agregado passa a ser a **data efetiva informada** (validada: obrigatória, não-futura).
- Persistir o **motivo** e vincular o **documento** ao distrato (consultável no detalhe/timeline).
- Mapear os erros novos (ex.: `terminate-invalid-date`, `terminate-no-signed-document`, `terminate-document-*`)
  no envelope de erro padrão, para o front traduzir em tags i18n.

## Fora de Escopo
- O mecanismo base de distrato (já existe: `Terminate` → `Terminated`).
- Reversão/cancelamento de distrato.
- Regras financeiras decorrentes do distrato (módulo Financeiro).

## Requisitos da validação em tela (2026-06-08)
Ao testar o distrato, a stakeholder definiu o comportamento esperado. Estado: **religação básica feita no
front** (distrato → `POST /:id/end` Terminate → contrato vira **Distrato**, `endedAt = now`). Faltam,
**no backend**:
1. **Data efetiva** do distrato — o `/end` deve aceitar a data preenchida ("Início do Efeito"/"Data do
   Distrato") e usar como `endedAt`/interrupção da vigência (hoje usa `now`).
2. **Documento de distrato assinado** vinculado ao encerramento (upload + vínculo), análogo à homologação.
3. **`signed_at` do aditivo** — a tabela `ctr_amendments` não persiste data de assinatura (só
   `homologated_at`, `new_end_date`, `signed_document_ref`). A coluna "Assinatura" no front fica vazia.
4. **Subtipo do aditivo** — escopo/outro/distrato colapsam em `Misc` → o front não consegue rotular o
   impacto como "DISTRATO" na tabela. Precisaria de `kind` próprio (ou flag) p/ distinguir distrato.

> Nota de modelagem: o negócio QUER o distrato **como linha na tabela de aditivos** (impacto "DISTRATO"),
> que **só faz efeito ao homologar** (encerra o contrato). Isso exige o backend tratar distrato como um
> tipo de aditivo que, ao homologar, encerra o contrato.

> ⚠️ **GAMBIARRA VIVA NO FRONT (remover quando o backend tiver o kind distrato):** como o core-api
> colapsa escopo/outro/distrato em `Misc`, o BFF hoje **marca a descrição** do distrato (constante
> `DISTRATO_MARKER` em `core-api-contracts.ts`) na escrita e detecta na leitura → o front trata como
> `type: 'distrato'`. Fluxo atual no front: criar distrato → linha Pendente "DISTRATO" (sem efeito) →
> anexar doc + assinatura (não-futura) + homologar → o front encadeia `POST /:id/end` (Terminate) →
> contrato vira Distrato. **Pendências:** (a) `endedAt` continua = `now` (o `/end` ignora a data efetiva);
> (b) sem `kind` próprio, o marcador é frágil — substituir por um tipo de aditivo de verdade.

## Critérios de Aceitação
1. O operador consegue distratar um contrato **Em Andamento** anexando o **PDF de distrato assinado**,
   informando a **data efetiva** (obrigatória, não-futura) e um **motivo**.
2. Após o distrato, o contrato fica `Terminated` ("Distratado") com `endedAt` = **data efetiva informada**
   (não o `now`).
3. O documento de distrato fica vinculado ao contrato e aparece no detalhe/timeline.
4. Tentar distratar sem documento/data quando exigidos retorna erro de validação (422) com `code` mapeável.
5. Distrato continua restrito a `contract:write` e a contratos em estado que o permita (conforme ADR-0023).

## Notas técnicas (consumidor: front web-app v2)
- O front tratará Distrato como **transição de ciclo de vida** (chama o endpoint de encerramento), **não**
  como aditivo. Hoje, por ausência do fluxo rico, o front mapeia Distrato para um aditivo `Misc` —
  **isso será corrigido** para chamar `POST /contracts/:id/end` (Terminate). Ver bindle-map abaixo.
- Padrões já usados pelo front e que servem de espelho para este fluxo:
  - Upload binário: `POST /contracts/:id/documents` (octet-stream + query `categoria/fileName/mimeType/signedElectronically`).
  - Ativação por assinatura: `POST /contracts/:id/activate` (`{ signedAt }`).
  - Homologação de aditivo: `POST /contracts/:id/amendments/:amendmentId/homologate`.

### Bindle-map (front → core-api), enquanto o gap não fecha
- **Hoje (básico, sem doc):** Distrato no front → `POST /contracts/:id/end` `{ kind: 'Terminate' }`
  (distrato imediato, `endedAt = now`, sem documento/motivo).
- **Após este ticket:** Distrato no front → upload do documento de distrato + data efetiva + motivo →
  endpoint enriquecido. O front já coleta documento assinado + data + descrição na modal de distrato.

## Referências
- ADR-0023 — `handbook/architecture/adr/0023-contract-lifecycle-pending-state.md` (core-api).
- Código atual: `src/modules/contracts/adapters/http/{plugin.ts,schemas.ts}`,
  `src/modules/contracts/application/use-cases/end-contract.ts` (core-api).
