# W1 — implementação · FIN-APPROVE-AUTHORITY-ENFORCE (#609)

**Resultado: GREEN.** 8/8 no ticket · suíte **4602 · 0 fail** (baseline 4594).

## Arquivos

**Um único arquivo de produção alterado:** `src/modules/financial/application/use-cases/approve-document.ts`

- `ApproveDocumentDeps` ganha `approverAuthorityReader?` (opcional — gate opt-in)
- `ApproveDocumentError` ganha `ApprovalError | ApproverAuthorityReadError`
- validação inserida **depois** do `parseOpen` e **antes** do `Document.approve`

```ts
if (deps.approverAuthorityReader !== undefined) {
  const authority = await deps.approverAuthorityReader.get(cmd.approvedBy);
  if (!authority.ok) return err(authority.error);
  const check = checkApprover(open.value.netValue, authority.value);
  if (!check.ok) return err(check.error);
}
```

## A composição já estava ligada

**Nenhuma mudança em `composition.ts` foi necessária.** O objeto `deps` (`composition.ts:642-648`)
já injeta `approverAuthorityReader` condicionalmente — porque o `submitDraft` o consome — e
`approveDocument(deps)` recebe **o mesmo objeto**. Ou seja: assim que o use case passou a ler o
campo, ele passou a receber o reader em produção, sem wiring novo.

Isso também explica por que o defeito passou despercebido: a dependência estava disponível o tempo
todo, apenas não era usada no caminho de aprovar.

## Reuso, não invenção

Nada foi criado. `checkApprover` (função pura, testada), o port `ApproverAuthorityReader`, o tipo
`ApprovalError` e as mensagens PT-BR (`error-mapping.ts:230-231`) já existiam — o ticket só chamou
o que estava lá.

## Decisões

- **Valida o chamador, não o indicado.** É a diferença em relação ao `submitDraft`, que valida o
  `approverRef`. Aqui a pergunta é "quem está aprovando pode aprovar isto?", e coberto por spy.
- **Gate opt-in** (`!== undefined`), espelhando `submit-draft.ts:59`. Preserva o CA5 e não quebra
  nenhum teste que monta `approveDocument({ repo, clock })`.
- **Antes de qualquer escrita.** A validação fica após o `parseOpen` (precisa do `netValue`) e antes
  do `Document.approve` — na recusa, a `version` do documento não muda.
- **422, não 403.** `writeErrorStatus` (`error-mapping.ts:109-116`) não tem categoria 403, e
  `approver-limit-exceeded` **já sai como 422** pelo `submitDraft`. Usar 403 aqui produziria o mesmo
  slug com status diferente conforme a rota. Registrado no `000-request.md`; a issue #609 pedia 403
  e foi corrigida.

## Evidência

```
typecheck      limpo
lint           limpo
format:check   limpo
ticket         ℹ tests 8 · pass 8 · fail 0
suíte          ℹ tests 4602 · pass 4582 · fail 0 · skipped 20
```

## Fora de escopo (confirmado intocado)

O **furo de identidade** — usuário A aprovando documento cujo `approverRef` é B — **não** foi
tratado. Exige decisão de produto (CA4 da issue #609): só o indicado aprova / qualquer um com alçada
e a trilha registra / `approverRef` é sugestão. Nenhuma linha deste ticket muda esse comportamento.
