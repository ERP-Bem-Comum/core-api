# ADR-0069: A alçada de aprovação segue o `AUTH_RBAC_MODE=bypass` — o bypass deixa de ser aplicado pela metade

- **Status:** Accepted
- **Date:** 2026-09-09
- **Deciders:** Tech Lead (Gabriel — decisão do dono do sistema, 2026-09-09)
- **Supersedes (parcial):** [ADR-0052](./0052-rbac-bypass-flag.md) — mantém tudo, e estende o alcance do `bypass`: ele deixa de parar na borda HTTP e passa a alcançar a permissão `payable:approve` lida pela `approval-policy` do domínio. O ADR-0052 segue vigente em todo o resto.
- **Relates:** #609 (alçada enforçada no ato de aprovar) · #299 (alçada opt-in, regra binária) · #634 (bypass fixado em código, inclusive em produção)

## Contexto

O ADR-0052 desligou a autorização por permissão na borda: `authorize` vira no-op e `hasPermission`
devolve `true`. Duas consequências dele são visíveis ao usuário e foram desenhadas juntas:

1. a rota deixa de exigir permissão nomeada — só *"está logado"*;
2. o `GET /me` passa a anunciar o **catálogo inteiro** (`list-user-permissions.ts:35`), porque a
   lista alimenta o `can()` do front e, sem isso, o front esconderia módulos que o backend liberaria
   (bug `AUTH-BYPASS-ME-PERMISSIONS`, "financeiro oculto com o bypass ligado").

O que ninguém reconciliou é que existe uma **terceira** camada que decide sobre permissão, e ela não
é de rota: a `approval-policy` do domínio do `financial` (`approval-policy.ts:27`) recusa com
`approver-missing-permission` quando `canApprove` é falso, e `canApprove` é lido do banco cru —
`user-read.drizzle.ts:105`, o JOIN que procura `payable:approve` nos papéis do usuário.

O resultado medido em 2026-09-09, no ambiente local, com o bypass ligado: o `/me` de um usuário
provisionado pelo ETL legado devolvia **47 permissões, incluindo `payable:approve`**; o banco lhe dava
**uma**, e não era essa. Ao aprovar, ele tomava uma recusa que **contradizia o que o `/me` acabara de
lhe dizer** — e o `authorize` da rota, sendo no-op, o deixara entrar até o fundo para morrer lá.

O bypass estava sendo aplicado pela metade: duas camadas o honravam, a terceira o ignorava. O usuário
não tem como distinguir isso de um defeito, porque, do lado dele, o sistema promete e nega a mesma
coisa.

## Decisão

**Sob `bypass`, a `approval-policy` deixa de barrar por PERMISSÃO.** `canApprove` é tratado como
verdadeiro para qualquer usuário que exista no `auth`.

A aplicação é um **decorator** do `ApproverAuthorityReader` — `withRbacBypass`
(`financial/adapters/read/approver-authority-reader.rbac-bypass.ts`) —, composto num ponto só, no
composition root do `financial`. O `server.ts` traduz `rbacMode === 'bypass'` num booleano; o
`financial` não passa a conhecer `RbacMode`, que é vocabulário do `auth`.

⚠️ **O decorator envolve o reader que vai ao `approveDocument`, e só ele** (`depsForApprove` em
`composition.ts`). O mesmo port responde a duas perguntas diferentes, e apenas a primeira é controle
de acesso:

| Consumidor | Pergunta | Sob bypass |
| :--- | :--- | :--- |
| `approveDocument` | o **chamador autenticado** pode aprovar este valor? (#609) | **afrouxada** |
| `saveDocument` · `submitDraft` | o `approverRef` **indicado** tem alçada? (#289/#297) | **enforçada** |

Compor o decorator no `deps` compartilhado — que é o caminho óbvio, e foi o primeiro escrito —
afrouxa também a segunda. O efeito não é simétrico ao da primeira: a indicação **grava**
`approverRef` apontando para quem não é aprovador, e a linha **sobrevive ao religar da flag**. Seria
dano que o #634 não desfaz. `tests/…/approve-document-rbac-bypass.http.test.ts` cobra a recusa, e a
prova invertida está medida: devolvendo o decorator ao `deps`, o `POST /documents` responde 201 com
o `approverRef` inválido persistido.

Três limites são parte da decisão, e não detalhe de implementação:

| Continua valendo sob bypass | Por quê |
| :--- | :--- |
| `approver-not-found` para usuário inexistente | O bypass afrouxa **permissão**, nunca a existência do sujeito. |
| O **teto** (`limit`), quando o papel tem um | É o #299/#609: alçada por valor não é RBAC de rota, e quem tem papel com teto continua limitado por ele. |
| `list` intacto (candidatos da cascata) | `escalate` é **roteamento de negócio** — para quem o documento é encaminhado —, não controle de acesso. |

## Consequências

### A que precisa estar escrita, porque é o custo aceito

⚠️ **Sob bypass, todo usuário autenticado aprova qualquer valor.** O teto continua sendo lido, mas
quem **não tem papel aprovador** tem teto `null` — `maxLimit` devolve `null` para conjunto vazio
(`user-read.drizzle.ts:42`) e `null` é **SEM TETO** pela regra binária do #299
(`approval-policy.ts:28-31`). Então a linha "o teto continua valendo" **não protege** exatamente a
população que esta decisão libera.

Isso reabre, enquanto o bypass estiver ligado, o buraco que o #609 fechou: antes dele "a alçada era
roteamento, não controle de acesso, e qualquer um com `payable:approve` aprovava qualquer valor".
A diferença é que agora nem `payable:approve` é necessária.

E **isso vale em produção**: o `server.ts` fixa o modo em `bypass` por código — a linha marcada
`← religar` logo abaixo de `resolveRbacMode` —, e o comentário que a precede registra a decisão do
dono de 2026-08-24, com o risco assumido por escrito até o aceite da VAN (#634). O comentário do
`vanSandbox`, no array de rotas, diz o mesmo textualmente.

> Citação por **marcador**, e não por número de linha, de propósito: a primeira versão deste ADR
> dizia `server.ts:165`, e as duas linhas que o próprio commit acrescentou empurraram o alvo para a
> `:166` — a `:165` passou a ser justamente o `resolveRbacMode` que a instrução manda voltar a usar.
> Quem seguisse a citação apagaria a leitura da env e deixaria o hardcode de pé.

**O gatilho de reversão é o #634 — e ele custa duas linhas, não zero.** São **duas** marcas
`← religar` no `server.ts`: o `rbacMode` fixado e o `rbacBypass: true` da composição do `financial`.
Apagar só a primeira religa a rota e o `/me` e **deixa a policy do domínio afrouxada**, com o RBAC já
enforçado — o pior dos dois mundos, e **nada mecânico acusa**: não há erro de tipo, teste vermelho
nem lint. O literal não é derivado de `rbacMode` porque o ESLint recusa comparação que o compilador
prova sempre verdadeira (a mesma razão que impede envolver o banner num `if`); o preço dessa
restrição é esta nota, e ela é o único guarda que existe.

Feitas as duas, o #609 volta a valer integralmente e nada mais precisa ser desfeito **no código**.
No banco, ver o aviso sobre a indicação acima: o que foi gravado durante a janela não se corrige
sozinho — mas, com o decorator restrito ao ato de aprovar, não há gravação a corrigir.

### As demais

- O `/me` **não muda**. Continua anunciando o catálogo inteiro sob bypass, como o ADR-0052 quer. A
  contradição foi resolvida do lado que estava desalinhado com a decisão do dono, não do lado que a
  implementava.
- O front **não precisa mudar** para o defeito sumir. Medido em 2026-09-09 no web-app:
  `payable:approve` não gateia rota, menu nem botão (8 ocorrências em `src/`, todas comentário). A
  tela de Contas a Pagar abre por `fiscal-document:read` e o menu por `fiscal-document:read` /
  `reconciliation:read` — nenhum deles tocado aqui.
- **A alternativa recusada** foi consertar o `/me`: subtrair `payable:approve` do catálogo anunciado
  sob bypass, mantendo a policy a barrar. Ela também elimina a contradição, e tinha precedente no
  próprio repositório (`getUserPermissions` não recebe `rbacMode` de propósito; `revoke-role.ts:88`
  chama `authorize` direto para sobreviver ao bypass). Foi recusada pelo dono: sob bypass, a promessa
  é *"todo autenticado é super-usuário"*, e uma regra de domínio que continua cobrando permissão é
  uma exceção a essa promessa, não uma correção dela. Quem for reabrir, a análise está aqui.
- ⚠️ **Esta decisão não alcança as outras policies de domínio que leem permissão do banco.** Hoje a de
  aprovação é a única identificada. Uma nova nasceria com a mesma assimetria — e o `financial` já
  recebe o booleano, então o custo de segui-la é baixo, mas é deliberado.
