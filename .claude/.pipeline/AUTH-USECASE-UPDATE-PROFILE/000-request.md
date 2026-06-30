# AUTH-USECASE-UPDATE-PROFILE — Editar perfil de usuário (US4)

**Size:** M · **Spec:** `specs/005-gestao-usuarios/` (US4, FR-007/008/009, tasks T033–T034) · **Branch:** `005-gestao-usuarios`

> Este ticket = camada **domínio + application** (extensão do agregado + use case). A **rota HTTP**
> `PUT /api/v1/users/:id` é o ticket seguinte `AUTH-HTTP-UPDATE-USER`.

## Decisões

1. **Edição atômica (FR-009).** A sequência valida → fetch → checa unicidade → domain → persist garante
   tudo-ou-nada: nenhuma validação parcial persiste. Sem rollback transacional (single `save`).
2. **Email editável com unicidade (FR-007).** O `update-user-profile` aceita email opcional; se mudou,
   checa `findByEmail` (SELECT-then-UPDATE, ADR-0020). Conflito com OUTRO usuário → `email-already-registered`.
   Mesmo email do próprio usuário → no-op (não dispara conflito).
3. **Patch parcial.** Campo ausente (`undefined`) preserva o valor atual; presente sobrescreve. Reusa o
   `User.updateProfile` existente (Foundational T011), estendido com `email?: Email`.
4. **Edita usuário ativo OU desativado.** `updateProfile` aceita `User` (não exige `ActiveUser`) — admin
   pode corrigir cadastro de inativo. Preserva `status`/`disabledAt`.
5. **CPF/telefone normalizados (FR-008)** via VOs `Cpf`/`Telephone` (já fazem o strip de dígitos).
6. **Evento `UserProfileUpdated`** (já existe) — só metadados (`userId`, `occurredAt`), nunca os valores.

## Arquivos

| Ação | Arquivo |
|---|---|
| Modificar | `domain/identity/user/user.ts` — `UpdateProfileInput` + `updateProfile` (campo `email?`) |
| Criar | `application/use-cases/update-user-profile.ts` |
| Criar (teste) | `tests/modules/auth/application/use-cases/update-user-profile.test.ts` |

## Critérios de aceite (W0 — RED)

- **CA1**: altera nome/telefone → `save` recebe o user com os novos valores; demais campos preservados.
- **CA2**: id inexistente → `err('user-not-found')`; `save` não chamado.
- **CA3**: email igual ao de OUTRO usuário → `err('email-already-registered')`; `save` não chamado.
- **CA4**: email igual ao do PRÓPRIO usuário (sem troca real) → sucesso, sem conflito.
- **CA5**: campo inválido (cpf/email/telefone) → erro específico do VO; `save` não chamado (atomicidade).
- **CA6**: patch parcial — só nome presente → cpf/telephone/email atuais preservados.
- **CA7**: `UserProfileUpdated` emitido com `userId` correto; sem valores de perfil no payload.
