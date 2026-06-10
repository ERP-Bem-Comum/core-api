# Request — USR-PASSWORD-POLICY

> Handoff do **front (web-app v2)** para o **core-api**. Padrão `000-request.md`.
> Origem: Gestão de Usuários → **Minha Conta** → modal **Redefinir Senha**. Verificado contra
> `core-api@dev` em 2026-06-09.

## Título
Alinhar a **política de senha** (design × backend) e expor as regras/erros de forma consumível

## Size
S

## Contexto
O modal "Redefinir Senha" mostra um **checklist** de requisitos (design do legado):
- No mínimo **8** e no máximo **15** caracteres
- Uma letra **maiúscula**, uma **minúscula**, um **número**, um **símbolo especial**

A troca em si funciona: `POST /api/v2/auth/change-password` `{ currentPassword, newPassword }` → **204**
(revoga todas as sessões; o front faz logout + redirect `/login`).

## Estado atual (verificado)
- A policy do core-api (`password-policy.ts`) é **min 8 / máx 128**, **sem regras de complexidade**
  (NIST 800-63B: comprimento + blocklist > complexidade), **mais** uma **blocklist** de senhas comuns.
- Erros do endpoint: `invalid-credentials` (401, senha atual incorreta), `user-disabled` (403),
  `password-too-short` / `password-too-long` / `password-too-common` (422).

## Divergência
- O checklist do design é **mais rígido** (máx 15 + complexidade) que o backend (máx 128 + sem
  complexidade). Como é mais rígido, **toda senha aprovada no client é aceita no backend** — então não
  bloqueia, mas as duas fontes da verdade podem confundir.
- O backend tem uma regra que o checklist **não** mostra: **blocklist** (`password-too-common`). O front
  trata como tag `users.error.password-weak` ("Senha muito comum ou fraca").

## Pedido ao backend
Definir qual é a **política canônica** e alinhar:
1. Se a regra oficial for a do design (máx 15 + complexidade), implementar no core-api (a UI já reflete);
2. Se a regra oficial for a atual (máx 128, sem complexidade, com blocklist), **confirmar** para
   ajustarmos o checklist do front (e expor a blocklist como aviso, não como regra do checklist).
3. (Nice-to-have) expor a policy num formato consumível (ex.: `GET /auth/password-policy`) para o front
   não duplicar as regras.

## Impacto no front (hoje)
- O checklist (client-side) gateia o botão Salvar conforme o **design** (máx 15 + complexidade).
- `invalid-credentials` → "Senha atual incorreta."; `password-too-common` → "Senha muito comum ou fraca.".
- Sucesso (204) → **logout automático** + redirect `/login` (sessões revogadas pelo backend).
