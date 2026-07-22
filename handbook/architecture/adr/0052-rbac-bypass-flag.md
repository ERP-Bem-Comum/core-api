# ADR-0052: Modo de operação `AUTH_RBAC_MODE=bypass` — desligar a autorização por permissão, mantendo a autenticação

- **Status:** Accepted
- **Date:** 2026-07-16
- **Deciders:** Tech Lead (Gabriel — decisão do dono do sistema, 2026-07-16; bypass total ratificado no W2/M1)
- **Complementa:** [ADR-0024/0025](./) (borda HTTP + hooks de auth) · não substitui a decisão de RBAC (DD-USER-02) — a adiciona um modo de operação alternativo, com o enforcement como **default**.
- **Relates:** #462 (seed de permissões em prod) · #466 (dev-seed drift) · #456 (fallback silencioso)

## Contexto

O core-api aplica **RBAC fail-closed**: cada rota protegida exige uma permissão nomeada, e a função
pura `authorize(user, required)` (`domain/authorization/authorize.ts`) nega por padrão. O enforcement
tem um **ponto de estrangulamento único**: os dois hooks que todos os módulos consomem via
`buildAuthHttpDeps` — `authorize` (preHandler) e `hasPermission` (checagem condicional em handler).

O dono do sistema decidiu que, **no estágio atual do produto**, o RBAC por permissão não agrega valor
proporcional ao custo operacional que vem cobrando: o seed de permissões não chega a ambientes
provisionados (#462), o dev-seed congela (#466), e o sintoma recorrente é **403 mudo** — o sistema
nega acesso a quem deveria ter, sem sinal claro. A decisão: operar com **todo usuário autenticado
como super-usuário** — a rota exige apenas *"está logado"*, não *"tem a permissão X"*.

## Decisão

Introduzir a env **`AUTH_RBAC_MODE`** com dois valores:

| Valor | Efeito |
| :--- | :--- |
| `enforced` (**default**, e qualquer valor inválido) | Comportamento atual — RBAC fail-closed. |
| `bypass` | `authorize` vira no-op (passa direto) e `hasPermission` retorna sempre `true`. |

**A autenticação NÃO muda:** `requireAuth` continua obrigatório — sem `Bearer` válido é **401**. O
bypass afeta só a **autorização por permissão** (o **403** deixa de existir).

O ponto de aplicação principal é `buildAuthHttpDeps`, que embrulha `authorize`/`hasPermission`
conforme o modo — nenhum plugin de módulo muda, todos herdam por injeção. **Exceção coberta (W2/M1):**
quatro use cases do próprio auth fazem `authorize` **embutido** (DD-USER-07 — auto-gestão de RBAC:
`assignRole`, `revokeRole`, e a concessão da alçada de aprovação em `createUserByAdmin`/
`updateUserProfile`), fora do wrapper. O bypass é **total** — a decisão do dono é *"todo autenticado é
super-usuário"*, o que **inclui gerir papéis** —, então esses quatro também recebem o `rbacMode` (via
o helper `authorizeActor`) e liberam em `bypass`. É o que permite **se auto-recuperar do #462**: no
bypass, um usuário sem permissão dá a si mesmo as roles e depois religa o `enforced`.

**Uma proteção de INTEGRIDADE sobrevive ao bypass:** o `revokeRole` impede o ator de revogar de si a
própria capacidade de gestão (`cannot-self-lockout`) — isso protege o **estado persistido** (não
deixar o sistema sem gestor quando o `enforced` voltar), não a autorização do ator, então continua
valendo em qualquer modo.

## Guardas invariantes — o bypass NÃO pode ser silencioso

Esta é a condição da decisão. O sistema passou a sessão inteira combatendo **fallback silencioso**
(#456/#462/#474 — driver/e-mail que degrada sem avisar). Desligar autorização em produção sem sinal
seria a pior instância dessa classe. Portanto:

1. **Valor explícito.** Só `AUTH_RBAC_MODE=bypass` liga. Não é um `1`/`true` que entra por typo de
   copy-paste de env. Valor desconhecido → `enforced` (**fail-secure**: erro de config NUNCA abre o
   sistema por acidente).
2. **Banner gritante no boot.** Quando `bypass`, o `server.ts` escreve em stderr um aviso
   inconfundível: *"⚠️ AUTORIZAÇÃO RBAC DESLIGADA — TODO USUÁRIO AUTENTICADO É SUPER-USUÁRIO"*, com o
   `NODE_ENV`. Quem sobe o processo vê, sempre.
3. **Default seguro.** Ausência da env = `enforced`. Um ambiente que não sabe da flag opera com RBAC.

## Consequências

**Aceitas (o dono ciente):**

- Em produção com `bypass`, **qualquer usuário autenticado executa qualquer operação** — aprovar
  pagamento, excluir plano, gerir usuários, desfazer conciliação. A superfície de dano é toda a API
  de escrita. Isto é abrir mão do controle de acesso por papel; a autenticação (quem é o usuário)
  permanece.
- **Escalação persistida (aceita pelo dono, W2/M1):** como o bypass inclui a gestão de papéis, um
  usuário pode, durante o bypass, atribuir a si uma role administrativa **que sobrevive ao desligar o
  bypass**. Ou seja, o modo — que é reversível — pode deixar um rastro de privilégio permanente. Isso
  foi a escolha explícita entre (a) bypass total, que permite auto-recuperação do #462, e (b) manter a
  gestão de papéis sempre protegida. O dono escolheu (a): a consistência (*"super-usuário de verdade"*)
  e a capacidade de recuperação valem o risco do rastro. Reverter uma escalação indevida é re-`enforced`
  + revogar as roles concedidas no período.
- Trilha de auditoria de *quem fez* continua (via `updatedByRef`/JWT); o que se perde é a **restrição
  de o que cada um pode fazer**.

**Mitigadas pelos guardas:**

- Ligar por acidente → improvável (valor explícito + fail-secure em valor inválido).
- Ligar sem perceber → o banner de boot torna o estado visível.

## Reversão

Remover a env (ou `AUTH_RBAC_MODE=enforced`) + restart. Sem migração, sem dado. O código do RBAC
permanece intacto — é só um modo desligado.

## Alternativas descartadas

- **Remover o RBAC do código** — irreversível, e apaga a capacidade caso o produto volte a precisar.
  A flag preserva o RBAC como default e permite voltar com um restart.
- **Limpar `auth_permission` no banco** — como `authorize` é fail-closed, isso daria **403 em tudo**
  (o oposto do desejado).
- **Bypass como default (sem flag)** — contradiz DD-USER-02 sem registro e abriria todos os ambientes,
  inclusive os que não tomaram a decisão. Rejeitado: o default tem de ser seguro.
