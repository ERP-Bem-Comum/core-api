# Request — PAR-COLLABORATOR-PREREGISTRATION-FLOW

> Handoff do **front (web-app v2)** para o **core-api**. Padrão `000-request.md`.
> Origem: Gestão de Colaboradores → fluxo **Pré-cadastro → Autocadastro (link por e-mail) → Cadastrado**,
> replicando o legado. Verificado contra `core-api@dev` em 2026-06-12.

> ---
> **🔄 Estado verificado no core-api — 2026-06-15** · revisão pós-handoff (o conteúdo abaixo reflete a visão do front em 2026-06-09/14).
>
> - **Já implementado:** o esqueleto AUTENTICADO. (1) `registrationStatus: 'PreRegistration' | 'Complete'` existe no agregado, nascendo `PreRegistration` (`src/modules/partners/domain/collaborator/types.ts:22` + `collaborator.ts:61`). (2) `PATCH /api/v1/collaborators/:id/complete-registration` está wired, porém **autenticado** (`requireAuth` + `authorize(collaborator:write)` — `src/modules/partners/adapters/http/plugin.ts:223-240`), chamando o use-case `complete-collaborator-registration.ts` (sem token/CPF). (3) O use-case `complete-collaborator-registration-public.ts` (revalida prefixo do CPF via `verify-cpf-prefix.ts` — defense-in-depth contra IDOR) **existe mas está órfão**: não é importado por `composition.ts` nem por `plugin.ts` (grep confirma uso só dentro do próprio arquivo) — **não há rota pública, token nem e-mail**.
> - **Escopo real restante:** (A) Território UF/município no colaborador — ver `PAR-COLLABORATOR-TERRITORY` (NÃO FEITO). (B) Dados bancários/PIX no pré-cadastro — ver `PAR-FINANCIER-COLLAB-BANK` (`POST /collaborators` em `plugin.ts:205-221` não os aceita). (C) Autocadastro PÚBLICO seguro — todo o miolo: geração/persistência de token uso-único + TTL, envio de e-mail ao colaborador (a infra de e-mail/invite vive só no módulo **auth**, não em partners — grep por `invite`/`mailer` em partners = vazio), rota pública `GET`/`POST` sem auth (validar token, pré-popular, submeter → `Complete`), rate-limit/CSRF/anti-enumeração, e **wirar** o use-case público já existente.
> - **Veredito:** PARCIAL (~25% feito)
> ---

## Título
Fluxo de **pré-cadastro + autocadastro seguro** do colaborador (e-mail + link tokenizado) + **território**
(UF/município) + **dados bancários** no pré-cadastro

## Size
L (provável quebrar em fatias no backend)

## Contexto (fluxo desejado, do legado)
1. O operador preenche o **pré-cadastro** do colaborador (dados básicos + **território** + **dados
   bancários**) e salva como **Pré-cadastro**.
2. O sistema **envia um e-mail** ao novo colaborador com um **link seguro** (tokenizado) para uma **tela
   pública de autocadastro**, onde os **demais campos** ficam habilitados para o **próprio colaborador**
   preencher.
3. O colaborador preenche e salva; o sistema registra e muda o status **Pré-cadastro → Cadastrado**.
4. Tudo com as **barreiras de segurança** necessárias (token uso-único, expiração, validação, etc.).

## Estado atual (verificado no core-api #32)
- ✅ **Status existe**: `registrationStatus: 'PreRegistration' | 'Complete'` no agregado (criado como
  `PreRegistration`). É o Pré-cadastro→Cadastrado.
- ✅ **Completar cadastro existe, porém AUTENTICADO**: `PATCH /api/v1/collaborators/:id/complete-registration`
  com `requireAuth` + `authorize(collaborator:write)` (comentário: "Autenticado (decisão do dono)"). Há um
  use-case `complete-collaborator-registration-public.ts` (revalida prefixo do CPF — defense-in-depth contra
  IDOR), **mas não há rota pública wired, nem token, nem e-mail** para o autosserviço do colaborador.
- 🔴 **Território (UF + município)**: **não existe** no agregado/schema/HTTP do colaborador.
- 🔴 **Dados bancários/PIX do colaborador**: **gated** — `POST /collaborators` não aceita (ticket
  `PAR-FINANCIER-COLLAB-BANK`). Devem entrar no **pré-cadastro**.
- 🔴 **E-mail + link tokenizado de autocadastro**: a infra de e-mail (nodemailer, InviteMailer) existe no
  módulo **auth** (convite de usuário), **não** para colaborador. Falta o fluxo de convite/autocadastro.

## Pedido ao backend

### A) Território no colaborador
- Adicionar **UF** (sigla do estado) e **município** (campo livre) ao agregado/schema/HTTP do colaborador
  (no `POST`/`PUT`/detalhe e, idealmente, filtro). Confirmar nomes/format (UF 2 letras; município string).

### B) Dados bancários no pré-cadastro
- Conforme `PAR-FINANCIER-COLLAB-BANK`: aceitar `bankAccount {bank,agency,accountNumber,checkDigit}` e
  `pixKey {keyType,key}` no colaborador (no **pré-cadastro**). (Front já tem os campos gated + o helper de
  auto-PIX prontos.)

### C) Autocadastro seguro (o ponto crítico — todo no backend)
1. **Geração de convite/token** ao salvar o pré-cadastro: token **uso-único**, com **TTL** (ex.: 7 dias,
   como o invite de usuário), vinculado ao colaborador. Persistir hash do token (não o token cru).
2. **Envio de e-mail** ao colaborador com o **link** para a tela pública (`/colaboradores/autocadastro?token=…`
   no front — confirmar o formato da URL/param).
3. **Rota pública** de autocadastro:
   - `GET` para **validar o token** e devolver os campos já preenchidos do pré-cadastro (sem PII sensível
     além do necessário) — para a tela pré-popular;
   - `POST/PATCH` para **submeter** os demais campos → `registrationStatus: Complete`.
   - **Barreiras**: token uso-único + TTL + invalidação após uso; **rate-limit**; CSRF/origem; validação
     de payload; sem enumeração; não exigir login do colaborador. (Reaproveitar o que o `invite-mailer`/
     reset de senha já fazem no auth, se possível.)
4. **Reenvio/expiração**: (opcional) endpoint para reenviar o convite; tratar token expirado/usado com
   mensagens claras.

### Critérios de aceite
1. Salvar um pré-cadastro (com território + banco) cria o colaborador `PreRegistration` e **dispara o e-mail**
   com link tokenizado.
2. O link abre a tela pública, valida o token (uso-único/TTL), o colaborador preenche e envia → status vira
   `Complete` (Cadastrado).
3. Token inválido/expirado/já usado → erro claro, sem vazar dados; sem acesso a outros colaboradores (IDOR).

## Impacto no front (quando atendido)
- **Pré-cadastro**: habilitar **território (UF + município)** e **banco/PIX** no form de Novo Colaborador
  (hoje gated/inexistente) + ligar no mapeador.
- **Tela pública de autocadastro**: nova rota pública que recebe o token, valida (via server fn → BFF),
  pré-popula e submete os demais campos. A **segurança do token/e-mail é do backend**; o front só consome.
- Tudo via Spec Kit quando o contrato estiver definido.

## Dependências
- `PAR-FINANCIER-COLLAB-BANK` (banco/PIX do colaborador) — pré-requisito do item B.
