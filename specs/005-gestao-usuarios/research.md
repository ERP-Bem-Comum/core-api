# Research — Gestão Administrativa de Usuários (Fase 0)

Resolução das decisões de design. Cada decisão-chave segue o formato Decisão / Rationale /
Alternativas, e as de fronteira citam o cânone (Princípio IX).

---

## D1. Fronteira de Bounded Context — estender `auth` vs novo módulo `users`

**Decisão**: **Estender o módulo `auth`**. Os novos use cases administrativos, os VOs de perfil
(`Cpf`, `Telephone`, `ProfilePhotoRef`) e a extensão do agregado `User` vivem em
`src/modules/auth/`. **Não** se cria um módulo `users`.

**Rationale**: O agregado `User` já existe e é propriedade do BC `auth` (`auth/domain/identity/user`),
que já modela `email`, credencial, sessão, papéis e o conceito `ActiveUser`. "Gestão de perfil
administrativo" é **outra faceta do mesmo agregado**, não um modelo distinto. Criar um módulo
`users` separado obrigaria dois contextos a compartilhar/duplicar o mesmo agregado `User` — exatamente
o acoplamento que Evans classifica como perigo:

> "People on other teams won't be very aware of the CONTEXT bounds and will unknowingly make changes
> that blur the edges or complicate the interconnections. When connections must be made between
> different contexts, they tend to bleed into each other. **Code reuse between BOUNDED CONTEXTS is a
> hazard to be avoided.** Integration of functionality and data must go through a translation."
> — Eric Evans, _Domain-Driven Design_, p. 211 (`shared-references/ddd/ddd--evans-livro-azul.md:4757`)

Manter um **único dono** do agregado `User` preserva a coesão do BC e evita a tradução/anti-corrupção
que dois módulos exigiriam para o mesmo conceito. Respeita o isolamento do ADR-0014 (tudo em `auth_*`)
sem introduzir um 6º Bounded Context.

**Alternativas consideradas**:

- _Novo módulo `users` com agregado próprio_: rejeitado — duplica `User`, gera bleeding entre `auth` e
  `users`, e força sincronização (status/identidade) entre dois donos do mesmo dado.
- _Módulo `users` lendo tabelas de `auth`_: rejeitado — viola ADR-0006/0014 (leitura cruzada de tabelas).

---

## D2. Primeiro acesso ao criar usuário — convite por email

**Decisão**: Criar usuário **não** define senha; emite o evento `UserCreated`, que dispara um **convite
de ativação por email**. O usuário define a própria senha pelo fluxo existente
(`request-password-reset` / `confirm-password-reset`) via **EmailPort** (ADR-0010).

**Rationale**: Reusa fluxo e canal já implementados no `auth`; nenhuma senha é definida pelo admin nem
trafega fora do fluxo de ativação (melhor postura de segurança). Decisão registrada no `/speckit-clarify`.

**Alternativas**: senha temporária (exige canal seguro de entrega; rejeitada); sem credencial (deixa o
usuário sem acesso até passo extra; rejeitada).

---

## D3. `collaboratorId` — referência opaca read-only

**Decisão**: Persistir e exibir `collaboratorId` como `varchar` opaco, **sem** FK cross-módulo e **sem**
chamada a `partners`. Não há gestão de vínculo nesta feature.

**Rationale**: Evita acoplar 005 ao módulo `partners`/RH e manter a fronteira limpa (ADR-0006/0014).
Caso o vínculo se torne gerenciável, será feature futura via `public-api`/evento de `partners`.

---

## D4. "Aprovador em massa" — permissão RBAC (escopo da 006)

**Decisão**: `massApprovalPermission` é uma **Permission** do RBAC (modelo `resource:action` já existente,
ex.: `contract:mass-approve`), gerida na `006-gestao-acessos`. A 005 apenas **exibe** o estado efetivo
(read-only) no detalhe do usuário.

**Rationale**: O `auth` já modela `Permission`/`Role`/`authorize` (ADR-0024). Tratar "aprovador em massa"
como atributo solto duplicaria o conceito de permissão fora do RBAC.

---

## D5. Paginação, busca e ordenação

**Decisão**: Paginação por **offset** (`page` + `pageSize` ∈ {5,10,25}); busca por nome com
correspondência parcial **case-insensitive**; ordenação default alfabética por nome.

**Rationale**: Espelha o comportamento observado no legado (`page`/`limit`) e o volume (milhares) não
exige cursor. Read model dedicado (`UserQuery` port) para a listagem, separado do repositório de escrita.

**Alternativas**: cursor/keyset (melhor em volumes muito grandes; desnecessário agora).

---

## D6. Normalização e validação de CPF/telefone

**Decisão**: Armazenar **somente dígitos** (`varchar`). `Cpf` valida dígitos verificadores (não só
máscara); `Telephone` valida quantidade/forma de dígitos BR. Formatação só na apresentação.

**Rationale**: Evita corrupção por dados legados mascarados/irregulares (SC-006); validação forte no
smart constructor do VO (Princípio V).

---

## D7. Foto de perfil — storage de objetos

**Decisão**: Foto via **StoragePort** sobre S3/MinIO (ADR-0019, `@aws-sdk/client-s3`). O agregado guarda
uma `ProfilePhotoRef` (chave do objeto), não o binário. Validar tipo (`image/jpeg|png|webp`) e tamanho
(limite a definir no contrato, ex.: ≤ 5 MB).

**Rationale**: Mantém o domínio livre de binário; reusa o cliente de storage único do projeto.

---

## Itens deferidos ao `/speckit-tasks` / implementação

- Nomes exatos das permissions por operação (coordenar com `006`).
- Limite preciso de tamanho/tipos de imagem (definir no contrato HTTP).
- Política de proteção de auto-desativação / último administrador (regra fina no agregado).
