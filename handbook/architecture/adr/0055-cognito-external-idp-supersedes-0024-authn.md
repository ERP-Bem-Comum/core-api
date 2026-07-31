[← Voltar para ADRs](./README.md)

# ADR-0055: Amazon Cognito como autoridade de autenticação — supersede parcial do ADR-0024 (authN), autorização permanece no `core-api`

- **Status:** Accepted
- **Date:** 2026-07-29
- **Deciders:** **Diretoria** (decisão de negócio) · Tech Lead (Gabriel) — registro técnico e condições de execução
- **Supersedes (parcial):** [ADR-0024](./0024-identity-and-rbac-auth-module.md) — §§ "fonte de identidade", "emissão de token", "refresh opaco server-side" e a invariante `:128`. **Todo o resto do ADR-0024 (RBAC, catálogo de permissões, autorização pura, schema de papéis) permanece vigente e inalterado.**
- **Relacionado:** [ADR-0005](./0005-thin-bff-gateway.md) (BFF não acessa banco) · [ADR-0027](./0027-zod-openapi-contract-first-http-edge.md) (contrato de borda) · [ADR-0028](./0028-http-edge-shell-location.md) (onde o verificador mora) · [ADR-0030](./0030-valkey-shared-store-deferred.md) (store compartilhado, `Proposed`) · [ADR-0052](./0052-rbac-bypass-flag.md) (bypass de RBAC) · [ADR-0011](./0011-supply-chain-hardening.md) (nova dependência)
- **Insumo:** `handbook/inquiries/0024-cognito-vs-identidade-propria-seguranca.md` · runbook de infra `ERP-Bem-Comum/ERP-INFRA` PR #23 (`docs/runbooks/cognito-auth.md`) · issue #603 (briefing de implementação)

---

## Contexto

O ADR-0024 estabeleceu identidade própria no `core-api`: Argon2id, JWT ES256 emitido localmente,
refresh token opaco com rotação e detecção de reúso, lockout progressivo. A implementação foi
construída, testada (126 arquivos de teste no módulo `auth`) e está em produção.

Ela tem **uma lacuna**: não existe segundo fator. Num sistema que movimenta recursos financeiros,
é a exposição mais relevante — e é agravada pelo fato de que, com `AUTH_RBAC_MODE=bypass` ativo
(ADR-0052/0053), **a autenticação é hoje o único controle de acesso efetivo**.

A **diretoria decidiu** adotar o Amazon Cognito como autoridade única de autenticação, com identidade
nativa (sem federação), MFA obrigatório por aplicativo autenticador (TOTP) e Threat Protection ativo.
A infraestrutura já provisionou User Pool, app client e SES.

Este ADR **não é o registro de uma escolha técnica em aberto** — é o registro de uma decisão tomada,
com as condições que a execução precisa respeitar. A análise técnica prévia
(`inquiries/0024-cognito-vs-identidade-propria-seguranca.md`) chegou à conclusão oposta e recomendava
manter a identidade própria acrescida de TOTP; ela permanece no handbook como registro de due
diligence, e sua conclusão **não reabre este ADR**.

O próprio ADR-0024 previu este caminho em `:117`:

> "Se um **IdP corporativo** entrar em cena → ativar o `OidcAuthenticator` (**gera ADR de federação**)."

E deixou o schema preparado (`:68`):

> "`password_hash` nullable **já abre espaço para usuário federado sem migration futura**."

---

## Decisão

### 1. O Cognito é a autoridade de autenticação. A autorização permanece integralmente no `core-api`.

O Cognito responde **quem é você**. O `core-api` responde **o que você pode fazer**.

**Invariante inegociável:** nenhuma claim de autorização trafega no token. `authorize()`,
`hasPermission()`, o `PermissionCatalog` e as tabelas `auth_role*`/`auth_user_role` permanecem
exatamente como estão. O claim `cognito:groups` **não é** fonte de autorização e não deve ser lido.

Isso é o que torna a migração de baixo risco: o token atual já tem payload vazio
(`token-issuer.es256.ts:30` — só `sub`, `iat`, `iss`, `exp`), e toda decisão de permissão já é tomada
contra o banco a cada requisição. Trocar o emissor não altera o modelo de autorização.

### 2. Vínculo de identidade — coluna neutra ao fornecedor, JIT no primeiro acesso

Nova coluna em `auth_user`: **`external_subject VARCHAR(36) NULL UNIQUE`** (`COLLATE utf8mb4_bin`),
acompanhada de `identity_provider VARCHAR(32) NULL` quando houver mais de uma origem.

**O nome não carrega o fornecedor.** O ADR-0024 desenhou um port `Authenticator` abstrato justamente
para que a identidade externa não amarrasse o schema; nomear a coluna `cognito_sub` desfaria essa
abstração sem ganho. Segue o precedente de `legacy_id` (int, UNIQUE, nullable), já usado para
identidade de sistema externo.

**Algoritmo de resolução, em ordem obrigatória:**

1. `findByExternalSubject(sub)` → se encontrar, autentica. **Fim.**
2. Só então `findByEmail(email)`, com o e-mail normalizado por `Email.parse()` — nunca a string crua
   da claim.
3. Encontrou **e** `external_subject IS NULL` → vincula e emite evento de auditoria.
4. Encontrou **e** `external_subject` já preenchido com outro valor → **erro**. Nunca sobrescreve.
5. **Não** encontrou → **erro tipado**. O sistema **nunca** cria usuário automaticamente.

O passo 5 é o que impede que qualquer identidade válida no pool vire usuário local — risco que se
torna crítico sob `AUTH_RBAC_MODE=bypass`, onde um usuário criado por acidente seria super-usuário.

**Escrita atômica:** `db.transaction` + `SELECT ... FOR UPDATE` por e-mail. Precedente direto:
`provisioned-user-store.drizzle.ts:87-108` (o ETL faz exatamente isso com `legacy_id`).
**Não usar `ON DUPLICATE KEY UPDATE`** — `auth_user` terá três UNIQUEs concorrentes, e o ODKU do
MySQL dispara em qualquer uma delas, sem ser dirigível a uma coluna
(razão documentada em `contract-repository.drizzle.ts:67-76`).

### 3. Transição com dois emissores isolados

Durante o rollout, o `core-api` aceita tokens de ambos os emissores, sob as flags
`AUTH_COGNITO_ENABLED` e `AUTH_LEGACY_ENABLED`.

- **Dois verificadores completamente isolados**, sem compartilhar chave, configuração ou allowlist de
  algoritmo. O legado assina **ES256**; o Cognito assina **RS256**.
- Roteamento por `iss` decodificado (sem verificar assinatura) **apenas para selecionar** o
  verificador. `iss` desconhecido → 401. **Nunca** um verificador default, nunca "tentar os dois".
- **Proibido** passar uma lista combinada `['ES256','RS256']` a uma única chamada de verificação —
  reabre a classe de vulnerabilidade que `token-issuer.es256.ts:6` já evita explicitamente.

As flags seguem o molde fail-secure de `rbac-mode.ts:11-12` (igualdade estrita de string; qualquer
valor ausente ou malformado cai no lado seguro). Configuração ausente ou inválida **impede a
inicialização** (`exitCode = 78`, molde de `module-driver-config.ts`), nomeando a variável faltante.

**O desligamento do legado cobre três superfícies**, não uma: login, **renovação** e verificação.
Gatear apenas o login deixa refresh tokens válidos por até 30 dias emitindo novos access tokens após
o corte. A revogação em massa das sessões legadas ocorre **no mesmo passo lógico** do desligamento.

### 4. Estado da transação OAuth vive em cookie selado, não em store compartilhado

O `state`, o `code_verifier` (PKCE) e o `nonce` são gravados no BFF antes do redirect e lidos no
callback. **Eles vão num cookie próprio selado** (`__Host-oauth-tx`, AEAD, `HttpOnly`, `Secure`,
`Path=/`, **`SameSite=Lax`**, TTL ~10 min), não num store server-side.

**Por quê:** o cookie viaja com o browser e chega íntegro a qualquer réplica, o que torna o fluxo
correto por construção, sem infraestrutura nova. O TanStack Start já oferece selagem de cookie
nativamente (via H3), e o slot `SESSION_SECRET` já está reservado no BFF.

⚠️ **`SameSite` diverge entre os dois cookies, e isso é deliberado.** O `__Host-session` é e continua
`Strict`. O `__Host-oauth-tx` **precisa** ser `Lax`, porque o callback é navegação de topo
**cross-site** vinda do domínio do IdP — um cookie `Strict` não seria enviado, e o login falharia
100% das vezes, deterministicamente. Como o código atual usa `'Strict'` como literal de tipo, copiar
o padrão existente para o cookie novo é o erro mais provável desta implementação.

Pelo mesmo motivo, **`/auth/callback` não pode reaproveitar o helper `isSameOriginRequest`**
(`csrf-origin.ts`) usado hoje em `loginFn`/`logoutFn`: no callback, `Sec-Fetch-Site` é legitimamente
`cross-site`.

### 5. Store de sessão compartilhado — dívida registrada, com gatilho

A sessão pós-login (tokens server-side, cookie opaco) permanece no `SessionStore` in-memory do BFF.
Isso é **funcionalmente correto enquanto o BFF for single-instance** — que é o estado verificado hoje
(QA roda serviço único; produção não tem taskdef versionado do web-app).

**Gatilho:** antes de subir a 2ª réplica do BFF, adotar store compartilhado por trás do port
`SessionStore<T>` já existente (3 métodos; a implementação é o único ponto de troca).

**Condição obrigatória do pacote:** o single-flight de refresh é hoje um `Map` **em processo**, e
existe para evitar que dois refreshes concorrentes com o mesmo token disparem a detecção de reúso do
`core-api` e revoguem a cadeia. Com store compartilhado e N réplicas, esse `Map` deixa de coordenar.
**Qualquer adoção de store compartilhado inclui um guard distribuído** — caso contrário a troca
*introduz* um defeito de revogação em cascata.

A escolha de tecnologia fica condicionada a um fato ainda não estabelecido: **onde o BFF roda em
produção**. Dentro da VPC AWS, ElastiCache Serverless for Valkey é a opção coerente com o ADR-0030.
Fora dela, ElastiCache é inviável e a escolha recai sobre alternativa com endpoint público ou
self-hosted.

**O MySQL está fora** — não por carga (o volume é trivial nesta escala), mas porque o **ADR-0005:60
proíbe o BFF de acessar banco**, e o ADR-0024:130-132 já rejeitou explicitamente esse caminho. Vale
registrar que a justificativa do ADR-0030 para rejeitar MySQL (argumento de alta frequência) está mal
fundamentada para este caso; a razão correta é arquitetural.

### 6. Invariantes de verificação de token

| # | Invariante |
|---|---|
| 1 | `token_use === 'access'`. **É o único check cujo esquecimento passa em silêncio** |
| 2 | `client_id` — o access token do Cognito **não tem `aud`**. Validar `aud` quebra sempre |
| 3 | `iss` por igualdade exata, vindo **da configuração**, nunca derivado do próprio token |
| 4 | Algoritmo fixado por verificador. Nunca inferido do header, nunca lista combinada |
| 5 | JWKS indisponível → **401**. Falha fechada, sempre |
| 6 | Configuração ausente/inválida → **boot falha**, nomeando a variável |
| 7 | `email_verified !== true` → vínculo recusado |
| 8 | Todo vínculo de identidade gera evento de auditoria |
| 9 | O cookie de sessão do BFF permanece **opaco, com tokens server-side** |

### 7. Biblioteca

**`aws-jwt-verify`** (recomendação oficial da AWS; `tokenUse` e `clientId` obrigatórios por design;
zero dependências transitivas), com **`jose` em devDependencies** para fabricar tokens de teste.
`jose` permanece em produção servindo o emissor legado até sua remoção. Entrada sob o checklist do
ADR-0011.

Testes de verificação rodam **sem rede**, com JWKS local e `verifySync()` — a variante assíncrona
ainda faz fetch quando encontra um `kid` desconhecido, o que transformaria teste unitário em teste de
integração silencioso.

---

## Consequências

### Positivas

- **Segundo fator obrigatório** — fecha a lacuna mais relevante do sistema atual, agravada pelo
  estado atual do RBAC.
- **Manutenção de primitivas criptográficas terceirizada** para serviço gerenciado.
- **Custo de licença nulo** na escala de operação (faixa gratuita perpétua até 10.000 usuários ativos).
- **Raio de mudança pequeno** — `makeRequireAuth` é instanciado uma única vez (`server.ts:273`) e
  injetado por referência; os 25 arquivos consumidores não mudam.
- **Schema já preparado** — `password_hash` nullable desde o desenho original.

### Negativas

- **Login passa a depender de serviço externo e de rede.** SLA de 99,9%; numa indisponibilidade
  regional, ninguém entra mesmo com a aplicação íntegra.
- **Recuperação de dispositivo perdido deixa de ser nossa.** Com MFA obrigatório não é possível
  desabilitar o segundo fator do usuário, e **não existe operação de API para remover o segredo
  TOTP**. Sem um segundo método de MFA habilitado, a única saída documentada é excluir e recriar a
  conta. O sistema atual **não tem** essa limitação — o reset administrativo já é coberto pelo RBAC.
- **Revogação deixa de ser imediata do lado do IdP.** Um token revogado continua válido para
  verificação por assinatura, e o encerramento global de sessões não limpa o cookie do IdP no
  navegador. Mitigado pelo padrão BFF (tokens server-side, cookie opaco), que preserva revogação
  instantânea local — **e é por isso que o item 6.9 é invariante**.
- **Perda de testabilidade offline do fluxo real.** Não existe emulador oficial.
- **Configurações irreversíveis** na criação do pool (atributos de login, sensibilidade a
  maiúsculas, atributos obrigatórios, SMS uma vez ativado).
- **Rotas de autenticação do `core-api` deixam de existir** pós-corte — mudança de contrato para o BFF.

### Neutras

- O módulo `auth` **não desaparece**: papéis, permissões, perfis, alçadas e catálogo permanecem.
- `jose` continua em produção até a remoção do emissor legado.

---

## Alternativas consideradas

### A. Manter identidade própria e adicionar TOTP
**Não adotada — decisão de diretoria.** Registrada por completude: era a recomendação da
`inquiry/0024`, com esforço estimado menor e preservação do controle sobre recuperação e revogação.
Não atende a eventual requisito de terceirização de credenciais nem a um roadmap de SSO corporativo.

### B. Federação via provedor externo (Google/Entra)
**Fora de escopo.** A decisão é por identidade **nativa** no Cognito, sem federação.

### C. Injetar papéis no token (`cognito:groups`)
**Rejeitada.** Colocaria autorização num artefato que só é reavaliado no refresh, tornando a
revogação de papel dependente do ciclo do token. Contraria o desenho do ADR-0024, que mantém a
autorização server-side, e nenhuma razão técnica justifica a mudança.

### D. Criar usuário local automaticamente no primeiro acesso
**Rejeitada.** Transformaria qualquer identidade válida no pool em usuário do sistema, sem revisão
humana — inaceitável sob `AUTH_RBAC_MODE=bypass`.

### E. Sessão selada no próprio cookie (stateless)
**Rejeitada.** Elimina a revogação instantânea, que é a propriedade que o padrão BFF preserva; e
tokens do Cognito não cabem no limite de 4 KB de um cookie.

### F. Afinidade de sessão no balanceador
**Rejeitada** como solução para estado distribuído: não sobrevive a deploy nem a reciclagem de
instância, converte correção em configuração de infraestrutura invisível ao código, e mascara o
problema em vez de resolvê-lo.

---

## Dependências bloqueantes

| # | Bloqueante | Trava |
|---|---|---|
| 1 | Issue **#515** — inicialização silenciosa com chave efêmera | **Fase 3.** Sem isso, remover `AUTH_JWT_*` do gerenciador de segredos não produz erro: o sistema sobe gerando par novo, mascarando o sinal de que o legado foi desativado |
| 2 | Criação de contas restrita a administradores no pool | **Fase 1.** Sem isso, o vínculo JIT entrega as permissões de um usuário privilegiado a quem cadastrar seu e-mail |
| 3 | Segundo método de MFA habilitado | **Fase 2.** Sem isso, perda de dispositivo não tem recuperação |
| 4 | Cherry-pick da `inquiry/0024` para a linha de integração | Rastreabilidade — as issues #514/#515 a referenciam |

---

## Quando re-avaliar

- Se a dependência externa no caminho de login produzir indisponibilidade recorrente.
- Se o custo por usuário ativo deixar de ser desprezível (escala muito acima da atual).
- Se surgir requisito de federação corporativa que o desenho nativo não atenda.
- Em qualquer caso: **ADR novo que supersede este**.

---

## Referências

- [ADR-0024](./0024-identity-and-rbac-auth-module.md) — superseded parcialmente (authN); RBAC vigente
- [ADR-0005](./0005-thin-bff-gateway.md) `:57-67` — o BFF não acessa banco
- [ADR-0030](./0030-valkey-shared-store-deferred.md) — store compartilhado (`Proposed`)
- [ADR-0052](./0052-rbac-bypass-flag.md) · [ADR-0053](./0053-sensitive-data-carve-out-rbac-bypass.md) — estado do RBAC
- `handbook/inquiries/0024-cognito-vs-identidade-propria-seguranca.md` — análise prévia (due diligence)
- Issue **#603** — briefing de implementação · Issues **#514**, **#515**
- `ERP-Bem-Comum/ERP-INFRA` PR #23 — runbook de infraestrutura
- AWS — verificação de JWT de User Pool:
  <https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-tokens-verifying-a-jwt.html>
- RFC 7636 (PKCE) · RFC 9700 (OAuth 2.0 Security BCP)
