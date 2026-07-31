# W2 — code review · FIN-APPROVE-AUTHORITY-ENFORCE (#609)

**Revisor:** `security-backend-expert` (read-only) · **Round 1: APPROVED**

---

## O que o revisor verificou por conta própria

| # | Verificação | Resultado |
| --- | --- | --- |
| 1 | **Existe caminho paralelo que aprove sem alçada?** `grep -rn "Document.approve\b"` em todo `src/` | **Uma única ocorrência** — `approve-document.ts:76`. Nenhum bulk/batch, worker ou use case alternativo. As rotas `:batch` são só leitura |
| 2 | **O gate opt-in vira no-op silencioso em produção?** | **Não.** `composition.ts:571-587`: no driver `mysql`, falha de `buildAuthUserReadPort` **lança no boot**. E ele usa o **mesmo `writerUrl` do financial** (ADR-0014), então não depende de env separada — não há combinação onde o financial suba em `mysql` e o reader fique `undefined`. A guarda do #456 impede `memory` silencioso em produção |
| 3 | **Ordem da validação** | Após `parseOpen` (precisa do `netValue`), antes de `Document.approve`/`repo.save`. O teste de `version` inalterada é prova válida |
| 4 | **`netValue` é o valor certo?** | Mesmo campo usado por `submit-draft.ts:63` e `save-document.ts:265` — sem divergência |
| 5 | **422 vs 403** | Confirmado que `writeErrorStatus` não tem 403 e que os três erros de alçada já caem em 422 pelo submit. Usar 403 só aqui criaria inconsistência pior. **Defensável** |
| 6 | **Vazamento** | Mensagens genéricas, sem revelar o valor do limite; `toPublicCode` colapsa para `unprocessable`. Sem leak |
| 7 | **O spy pegaria a implementação errada?** | **Sim.** `seedOpen` cria documento **sem** `approverRef` (→ `null`); uma implementação que lesse `document.approverRef` produziria `vistos = [null]`, não `[CALLER]` |
| 8 | **Regressão** | Rodou typecheck/lint/format + suíte HTTP relacionada: **42/42** verde |
| 9 | **Escopo do furo de identidade** | Corretamente delimitado. O risco residual (outra pessoa **com alçada legítima** aprova no lugar do indicado) é **materialmente menor** que o original ("qualquer um aprova qualquer valor") |

---

## Achados

### 🟡 M1 — faltava teste HTTP da rota `/approve` com o gate ativo

Classificado pelo revisor como **fast-follow, não bloqueante** — ele de-riscou manualmente lendo a
composição e rodando a suíte HTTP existente. Mas as CAs da issue estão escritas em linguagem de
borda (*"quando ele chama approve"*), e a prova existia só no use case.

**✅ Endereçado neste ticket, não adiado.** Novo arquivo
`tests/modules/financial/adapters/http/approve-document-authority.http.test.ts` — 4 casos, molde de
`document-approver-limit.http.test.ts` (#289):

- alçada insuficiente → **422**, mensagem PT, slug interno **não** vaza no body
- documento permanece `Open` após a recusa (verificado por `GET` subsequente)
- alçada suficiente → **200**, `Approved`
- `limitCents: null` (opt-in não configurada) → **200** (regra binária #299 preservada na borda)

O documento é criado **sem `approverRef`** de propósito: assim a criação não dispara o gate do #289
e o único caminho exercitado é o do approve.

### 🟢 M2 (Minor) — 422 sem diferenciação programática

Um cliente não distingue "sem alçada" de outra recusa de negócio via `status`/`code` — só pela
mensagem PT-BR. **Aceito:** é o padrão de todo o módulo, não inconsistência nova. Débito conhecido.

### 🟢 M3 (Nit) — sem teste dedicado para `approver-authority-unavailable`

Repasse de uma linha (`if (!authority.ok) return err(...)`), mesmo padrão sem teste próprio em
`submit-draft.ts`/`save-document.ts`. Baixo risco, não é regressão deste ticket.

### 🔵 M4 (Nota) — ETL legado grava `status: 'Approved'` direto

`scripts/etl/financial/main.ts`. Ferramenta de migração one-shot, offline, sem superfície HTTP —
fora do modelo de ameaça (usuário autenticado abusando de `payable:approve`). Não é bypass ao vivo.

---

## Conclusão do revisor

> "Nenhum caminho vivo aprova sem checar a alçada do chamador. A ordem de validação está correta
> (antes de qualquer escrita), o valor comparado é consistente com o resto do módulo, não há
> vazamento de informação, e o gate opt-in é seguro em produção porque a guarda de boot impede o
> driver `memory` silencioso e o `authUserReadPort` do financial não depende de configuração externa
> adicional."

## Estado após o M1

```
typecheck      limpo
lint           limpo
format:check   limpo
ticket         12 casos (8 use case + 4 borda HTTP) · 0 fail
```
