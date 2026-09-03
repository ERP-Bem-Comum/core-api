---
inquiry: 0037
title: 'A aprovação que o bypass não alcança — o gate lê a tabela, e produção não tem a linha'
state: blocked
opened: 2026-09-03
last_reviewed: 2026-09-03
open_outputs: 3 # a escolha A/B/C, o inventário do ADR-0052 e o teste do CA4 — ver §6
---

# Inquiry-0037: A aprovação que o bypass não alcança — o gate lê a tabela, e produção não tem a linha

- **Opened by:** Claude Code, na branch `fix/approve-bypass-fail-closed-881`
- **Asked to:** dono do sistema (Gabriel) — a escolha **libera ou trava pagamento em produção**
- **Impact:** [ADR-0052](../architecture/adr/0052-rbac-bypass-flag.md) (inventário de exceções incompleto) · issue [#881](https://github.com/ERP-Bem-Comum/core-api/issues/881) · esteira de Contas a Pagar em produção

---

## 1. Contexto

Em produção, **100 % dos usuários** recebem `422 approver-missing-permission` ao aprovar um título.
Como aprovar é pré-requisito de `Transmitido`/remessa, a esteira inteira de Contas a Pagar está
parada. A issue [#881](https://github.com/ERP-Bem-Comum/core-api/issues/881) documentou o mecanismo
com precisão e apresentou três opções. Esta inquiry existe porque **a escolha entre elas não é
técnica pura** — ela decide se o controle de acesso à aprovação de pagamento vale ou não durante a
janela de bypass — e porque a investigação encontrou material que **reordena o peso das opções**.

O mecanismo, em uma frase: o `AUTH_RBAC_MODE=bypass` neutraliza o guard de rota e o `/me`, mas
**não** alcança a regra de domínio do `approveDocument`, que lê `payable:approve` da junção real no
MySQL — e essa junção está vazia em produção.

---

## 2. Pergunta(s) feita(s)

> **Entre as Opções A, B e C da #881, qual adotar — e sob qual guarda-corpo?**

Subordinadas, que a investigação precisou responder antes:

1. O diagnóstico da #881 continua válido contra `origin/dev` **e** contra `origin/main` (produção)?
2. O ADR-0052 de fato autoriza a Opção A, ou a issue está apoiada em paráfrase?
3. Existe precedente interno — a #299 e o ADR-0053 — e para que lado ele aponta?
4. Por que a suíte, com 785 arquivos de teste, não pegou isto?

---

## 3. Respostas / Investigação

### 2026-09-03 — verificação do diagnóstico contra `origin/dev` e `origin/main`

**Baseline:** `origin/dev` = `5739410f`, `origin/main` = `571a14d7`.

**A `main` (produção) tem exatamente o mesmo código.** Os seis arquivos do diagnóstico são
byte-a-byte idênticos entre as duas branches, e o commit que introduziu o gate é ancestral de ambas:

```console
$ for f in <os 6 arquivos>; do git diff --quiet origin/main origin/dev -- "$f" && echo "IDENTICO $f"; done
IDENTICO  src/modules/financial/application/use-cases/approve-document.ts
IDENTICO  src/modules/financial/domain/document/approval-policy.ts
IDENTICO  src/modules/financial/adapters/http/composition.ts
IDENTICO  src/modules/auth/adapters/persistence/repos/user-read.drizzle.ts
IDENTICO  src/modules/financial/adapters/http/error-mapping.ts
IDENTICO  src/modules/auth/application/use-cases/create-user-by-admin.ts

$ git merge-base --is-ancestor ed4bf578 origin/main && echo SIM
SIM
```

Nenhuma atenuação: a severidade da #881 vale integralmente para produção.

**O `rbacMode` não chega ao `financial` — e o escopo é maior do que a issue diz.** A #881 afirma
zero ocorrências no `composition.ts`; a medição em todo o módulo é mais forte:

```console
$ git grep -c "rbacMode" origin/dev  -- src/modules/financial/
0 ocorrências em todo src/modules/financial/
$ git grep -c "rbacMode" origin/main -- src/modules/financial/
0 ocorrências em todo src/modules/financial/
```

O módulo `financial` **inteiro** desconhece o modo de operação do RBAC. Não é um esquecimento num
composition root: é uma fronteira que a informação nunca cruzou.

**Nenhum seed ou migration concede `payable:approve`:**

```console
$ git grep -n "payable:approve" origin/dev -- scripts/ drizzle/ migrations/
ZERO em scripts/ drizzle/ migrations/
```

**A tela de Perfis/Permissões no front — NÃO VERIFICADO.** O repositório do front não está
disponível nesta worktree. A afirmação da #881 (*"a API existe inteira, a UI não"*) **não foi
conferida** e permanece como premissa herdada. É a única alegação do diagnóstico que esta inquiry
não mediu — e ela é decisiva para a Opção B (ver §4).

### 2026-09-03 — ponteiros de `arquivo:linha` da #881, conferidos um a um

Cinco derivaram desde 27/08; seis continuam exatos. O do `composition.ts` derivou ~92 linhas.

| Referência da #881                     | Linha na issue | **Real em `5739410f`** | Situação      |
| :------------------------------------- | :------------- | :--------------------- | :------------ |
| `financial/…/approve-document.ts`      | `69-74`        | `69-74`                | ✅ exato      |
| `financial/…/approval-policy.ts`       | `26`           | **`27`**               | ⚠️ +1         |
| `auth/…/user-read.drizzle.ts`          | `59-83`        | **`62-82`**            | ⚠️ +3         |
| `financial/…/composition.ts` (makeDeps) | `870-891`      | **`962-984`**          | ⚠️ +92        |
| `auth/…/create-user-by-admin.ts`       | `161`          | `161`                  | ✅ exato      |
| `financial/…/error-mapping.ts`         | `361`          | **`378`**              | ⚠️ +17        |
| `auth/…/list-user-permissions.ts`      | `35`           | `35`                   | ✅ exato      |
| `auth/…/composition.ts` (guard no-op)  | `609`          | `609`                  | ✅ exato      |
| `auth/…/dev-seed.ts`                   | `17`           | `17`                   | ✅ exato      |
| `auth/…/approvers-plugin.ts`           | `26`           | `26`                   | ✅ exato      |
| `auth/…/authorize-actor.ts`            | `17`           | `17`                   | ✅ exato      |

### 2026-09-03 — o ADR-0052, lido literalmente

A #881 parafraseia o ADR-0052 como *"todo autenticado é super-usuário em TODA rota"*. **A expressão
"em TODA rota" não está no ADR — mas ela existe, é literal, e está num lugar que pesa mais: o
código, escrita pelo dono, e mais recente que tudo o mais neste dossiê.** Ver a subseção seguinte.

O que o ADR diz é mais específico — e, para esta decisão, já suficiente:

> **A decisão: operar com todo usuário autenticado como super-usuário** — a rota exige apenas _"está
> logado"_, não _"tem a permissão X"_.
>
> — [`0052-rbac-bypass-flag.md:19-20`](../architecture/adr/0052-rbac-bypass-flag.md)

E, na seção **Consequências → Aceitas (o dono ciente)**, o ADR **nomeia o caso de uso desta issue**:

> Em produção com `bypass`, **qualquer usuário autenticado executa qualquer operação** — **aprovar
> pagamento**, excluir plano, gerir usuários, desfazer conciliação.
>
> — [`0052-rbac-bypass-flag.md:66-67`](../architecture/adr/0052-rbac-bypass-flag.md)

O ADR está `Accepted` ([`:3`](../architecture/adr/0052-rbac-bypass-flag.md)). **"Aprovar pagamento"
sob bypass não é uma consequência que alguém tolerou por omissão: é uma consequência que o dono
declarou por escrito ter aceitado.** O comportamento de produção hoje é o oposto do que o ADR
aceito descreve.

**Mas o ADR também delimita o próprio alcance, e é aqui que ele falha.** Ele declara o ponto de
aplicação e enumera as exceções conhecidas:

> O ponto de aplicação principal é `buildAuthHttpDeps` […]. **Exceção coberta (W2/M1):** quatro use
> cases do próprio auth fazem `authorize` **embutido** […] então esses quatro também recebem o
> `rbacMode` (via o helper `authorizeActor`) e liberam em `bypass`.
>
> — [`0052-rbac-bypass-flag.md:34-41`](../architecture/adr/0052-rbac-bypass-flag.md)

O inventário tem **quatro** entradas. O gate do `approveDocument` é um **quinto** ponto fora do
wrapper — de natureza diferente (não chama `authorize`, lê a permissão do banco), com o mesmo
efeito prático — e **não está no inventário**. O ADR-0052 não decidiu manter esse gate sob bypass;
ele **não sabia que esse gate existiria**, porque ele ainda não existia.

**A regra que o #609 violou já estava escrita.** Não é norma a inventar — é norma vigente do
harness, em `.claude/rules/auth-module.md`:

> **RBAC não é ponto único, e o wrapper não alcança quatro use cases.** […] **Use case novo que
> autorize por conta própria precisa receber o `rbacMode` — senão o modo `bypass` fica
> inconsistente** ([ADR-0052]).
>
> — [`.claude/rules/auth-module.md`](../../.claude/rules/auth-module.md)

### 2026-09-03 — a decisão de 25/08 está no código, e é a mais recente de todas

A frase que a #881 atribui ao ADR-0052 **existe literalmente** — em
`src/modules/auth/adapters/http/composition.ts:599-603`, três linhas acima do guard que o bypass
neutraliza:

```ts
// ⚠️ SEM EXCEÇÃO — nem para a rota que move dinheiro. Decisão do dono (Gabriel, 25/08/2026):
// enquanto o modelo de permissões não for validado com a gerência e o time de negócio, TODO
// usuário autenticado é super-usuário em TODA rota, inclusive `POST /financial/remittances`.
// Colocar permissão numa rota antes desse acordo é fixar em código um desenho que ainda vai
// mudar. O gatilho para reabrir é o aceite de negócio, não uma decisão técnica.
```

Escrita no commit `1411e673` (**25/08/2026**), ela é **posterior ao ADR-0052** (16/07), **posterior
à #609** (29/07) e datada de **dois dias antes** da abertura da #881 (27/08). É a manifestação mais
recente do dono sobre o alcance do bypass — e ela é enfática exatamente onde esta issue dói:
_"nem para a rota que move dinheiro"_, _"inclusive `POST /financial/remittances`"_.

Note-se que ela cita a **remessa**, não o **approve** — porque, do ponto de vista de quem escreveu,
os dois obedeciam ao mesmo guard. O `approveDocument` não foi excluído dessa decisão: ele **escapou**
dela, por um caminho de leitura que ninguém sabia existir (ver a subseção do wiring, adiante).

### 2026-09-03 — o ADR-0053: a P.O. já rejeitou um carve-out do bypass

O [ADR-0053](../architecture/adr/0053-sensitive-data-carve-out-rbac-bypass.md) propunha recortar uma
classe de permissão do alcance do bypass — dado sensível na acepção do **Art. 5º II da LGPD** (raça,
identidade de gênero). Está **`Rejected`** ([`:3`](../architecture/adr/0053-sensitive-data-carve-out-rbac-bypass.md)),
por decisão da P.O. em 20/07/2026:

> Durante a fase de **aceitação do sistema recém-entregue**, o acesso fica **liberado para todos os
> usuários autenticados** (`AUTH_RBAC_MODE=bypass`, **sem exceções**).
>
> — [`0053-…:110-112`](../architecture/adr/0053-sensitive-data-carve-out-rbac-bypass.md)

A justificativa (2) da P.O. descreve, com outro nome, exatamente o defeito da #881:

> Para o cliente **testar todos os módulos**, todos precisam estar visíveis. Um RBAC parcial durante
> os testes produziria falsos negativos (_"não aparece"_ confundido com _"não funciona"_) — exatamente
> o incidente `AUTH-BYPASS-ME-PERMISSIONS` (módulo financeiro oculto de 17/07 a 20/07).
>
> — [`0053-…:120-121`](../architecture/adr/0053-sensitive-data-carve-out-rbac-bypass.md)

**O peso disto é alto e assimétrico.** A P.O. recusou um carve-out para proteger dado sensível
**irreversível** — e o próprio ADR-0053 argumenta que dado sensível seria o caso *mais* defensável
de exceção, justamente porque as demais permissões controlam **ação**, cujo dano é reversível:

> Note-se a assimetria com o resto do bypass: as demais permissões controlam **ação** (aprovar
> pagamento, excluir plano). O dano de uma ação indevida é reversível — re-`enforced`, estorna,
> reprova, audita via `updatedByRef`. **Vazamento de dado sensível é irreversível.**
>
> — [`0053-…:25-28`](../architecture/adr/0053-sensitive-data-carve-out-rbac-bypass.md)

Se o carve-out **irreversível** foi rejeitado, um carve-out **reversível** — que é o que o gate do
`approveDocument` é hoje, de facto — sobrevive com respaldo ainda menor. E ele nasceu **nove dias
depois** dessa rejeição, sem passar por decisão alguma.

### 2026-09-03 — a #299 é o mesmo defeito, uma linha acima

O commit `a5ba9a6a` (30/06/2026) descreve, na própria mensagem, o padrão da #881:

> **Go-live blocker:** a regra fail-closed da feature 028 (limit null → `approver-limit-exceeded`)
> **recusava 100% das aprovações**, pois todos os papéis nascem com `approval_limit_cents` NULL. Por
> decisão da P.O., a aprovação é binária (`payable:approve`) e a alçada é opt-in.

O diff removeu o ramo fail-closed **e deixou intacta a linha imediatamente anterior** — que é o gate
da #881:

```diff
   if (authority === null) return err('approver-not-found');
   if (!authority.canApprove) return err('approver-missing-permission');   ← o gate da #881
-  // FR-008 fail-closed: aprovador sem alçada definida não aprova nada.
-  if (authority.limit === null) return err('approver-limit-exceeded');
+  // #299: alçada OPT-IN. `limit === null` = sem limite configurado = aprova […]
```

**A #299 estava certa em não tocar nela**, e a razão importa para a decisão. Em 30/06 o
`checkApprover` só rodava na **indicação/escalação** (`submit-draft.ts`, `save-document.ts`), onde o
sujeito é o `approverRef` indicado — e ali exigir `canApprove` é correto. O `approve-document.ts:22-23`
registra a virada:

> `#609`: alçada enforçada no ATO de aprovar, **contra o USUÁRIO AUTENTICADO que chama** — não
> contra o `approverRef` indicado no documento (essa é a diferença em relação ao `submitDraft`).

**A função não mudou; o sujeito dela mudou.** Foi isso que converteu uma regra de _roteamento_ em
_controle de acesso_ — e um controle de acesso pertence ao inventário do ADR-0052, que não foi
atualizado.

**Cronologia consolidada:**

| Data      | Evento                                                                          | Efeito                                                       |
| :-------- | :------------------------------------------------------------------------------ | :----------------------------------------------------------- |
| 30/06     | **#299** (`a5ba9a6a`) — alçada vira opt-in                                       | remove um fail-closed sobre dado ausente em produção         |
| 16/07     | **ADR-0052** `Accepted` — bypass                                                 | inventaria **4** pontos fora do wrapper                      |
| 20/07     | **ADR-0053** `Rejected` — P.O.: bypass "sem exceções"                            | recusa carve-out até para dado sensível LGPD                 |
| **29/07** | **#609** (`ed4bf578`) — `checkApprover` passa a valer contra o **chamador**       | cria o **5º** ponto, 9 dias após o "sem exceções"            |
| **25/08** | **`1411e673`** — o dono escreve no código: _"SEM EXCEÇÃO — nem para a rota que move dinheiro… TODO usuário autenticado é super-usuário em TODA rota"_ | reafirma o bypass total **depois** da #609, sem saber do 5º ponto |
| 27/08     | **#881** aberta                                                                  | o defeito é diagnosticado                                    |

Lida em ordem, a cronologia mostra que **o gate nunca foi objeto de decisão**. Ele não sobreviveu a
uma deliberação sobre segregação de funções sob bypass — ele nasceu depois do ADR-0052, escapou do
inventário, e continuou de pé por baixo de uma reafirmação do dono que o teria alcançado se alguém
soubesse que ele existia.

### 2026-09-03 — o "precedente da remessa" invocado pela #881 não existe como descrito

A #881 sustenta a Opção A dizendo que ela é coerente *"com o precedente da remessa, que trata o
bypass explicitamente"*. **A remessa não trata o bypass** — `rbacMode` tem zero ocorrências no
módulo inteiro (medição acima). O que a remessa faz é outra coisa: consome `payable:approve` como
permissão de **rota** (`financial/adapters/http/plugin.ts:12-13`, que passa pelo guard embrulhado e
portanto **obedece** ao bypass) e como invariante de **estado** de domínio
(`remittance-approval.ts:5` — só documento já aprovado entra na remessa), que não é checagem de
permissão.

O argumento da #881 aponta para o lado certo pela razão errada: a remessa é precedente de que o
consumo **correto** de `payable:approve` no `financial` passa pelo guard — e é justamente por isso
que ela funciona sob bypass, enquanto o `approveDocument` não.

### 2026-09-03 — o gate entrou por herança de wiring, e a #609 registrou isso sem perceber

A pergunta "por que ninguém notou que o `rbacMode` não chegava?" tem resposta literal na mensagem do
próprio `ed4bf578`:

> E `composition.ts` **não precisou de wiring**: o objeto `deps` já injeta `approverAuthorityReader`
> condicionalmente (porque o `submitDraft` consome) e `approveDocument(deps)` recebe o mesmo objeto.
> **É também a explicação de por que o furo passou despercebido** — a dependência esteve disponível o
> tempo todo.

O reader foi injetado pela **#289**, para a _indicação_ do aprovador (`composition.ts:969-974`, cujo
comentário ainda diz "#289"). A #609 reaproveitou o mesmo objeto `deps` para um propósito novo —
controle de acesso do chamador — **sem tocar o composition root**. E o composition root é exatamente
o lugar onde o `rbacMode` teria entrado, como entrou nos quatro use cases do `auth`.

O mesmo commit registra que a revisão olhou para o risco oposto:

> O W2 verificou que isso **não vira no-op silencioso** em produção — `buildAuthUserReadPort` usa o
> mesmo `writerUrl` do financial (ADR-0014) e falha no boot […]

Verificou-se que o gate **não seria pulado** em produção. Ninguém perguntou se ele **deveria** ser
pulado sob `bypass`. A revisão foi competente na pergunta que fez; a pergunta é que estava invertida.

### 2026-09-03 — "os dois furos que a #609 fechou" são, na verdade, um

A #881 avalia o custo da Opção A dizendo que ela _"reabre os dois furos que a #609 fechou"_. O commit
`ed4bf578` diz o contrário, em texto:

> **FORA DE ESCOPO:** o furo de **identidade** (usuário com alçada própria aprovando documento
> indicado a outro) exige decisão de produto — 3 opções no CA4 da #609.

- **Furo de valor — fechado.** Antes da #609, `Document.approve` só trocava o status; um aprovador
  com alçada de R$ 1.000 aprovava R$ 500.000.
- **Furo de identidade — nunca fechado.** `approve-document.ts` não compara `cmd.approvedBy` com o
  `approverRef` gravado no documento, **nem sob `enforced`**. Segue aberto hoje, e **nenhuma das três
  opções da #881 o toca.**

Portanto a Opção A não "reabre dois furos": ela suspende **um**, o de valor, e apenas enquanto o
`bypass` durar. O outro já está aberto em qualquer modo, e é dívida de produto independente desta
decisão.

**E o furo de valor, sob bypass, já está aberto por outro caminho.** O `checkApprover` embutido e o
guard de rota fazem **a mesma pergunta** — `payable:approve` na mesma junção
(`user-read.drizzle.ts:62-82` vs. `authorize` sobre `UserReader`) — por dois caminhos de leitura, um
bypassável e outro não. Não é defesa em profundidade contra ameaça distinta; é a mesma checagem
sobrevivendo por acidente de wiring. E como a alçada é **opt-in** desde a #299
(`approval-policy.ts:28-30`: `limit === null` ⇒ aprova), a mitigação que a própria #881 documenta —
`POST /api/v1/roles` + `POST /api/v1/users/<self>/roles`, ambas liberadas sob bypass por
`authorize-actor.ts:17` — entrega a qualquer autenticado **aprovação sem teto**, em duas chamadas,
hoje, com o gate de pé.

> **A consequência é desconfortável e precisa estar escrita:** como controle de segurança, o gate
> atual **barra o uso honesto e não barra o malicioso**. Quem não sabe do self-grant não aprova nada;
> quem sabe aprova qualquer valor. O que ele efetivamente produz não é segregação de funções — é uma
> barreira de conhecimento.

### 2026-09-03 — por que a suíte não pegou (o CA4, refinado)

A #881 atribui o escape à *"ausência de um teste sem o seed de dev"*. A medição mostra um mecanismo
**diferente e mais preocupante**: o teste de borda existe, roda no gate, e **não pode falhar por
construção**.

`tests/modules/financial/adapters/http/approve-document-authority.http.test.ts:48-55` injeta um fake
que devolve `canApprove: true` **hardcoded, para qualquer id**, parametrizando apenas `limitCents`:

```ts
const fakeAuthorityPort = (limitCents: number | null) => ({
  getUserName: () => Promise.resolve(ok(null)),
  getApproverAuthority: (userId: string) =>
    Promise.resolve(ok({ userId, canApprove: true, limitCents })), // ← nunca false
  listApproversWithAuthority: () => Promise.resolve(ok([])),
});
```

A linha `if (!authority.canApprove)` (`approval-policy.ts:27`) é **estruturalmente inalcançável**
nesse arquivo. Não é um teste que faltou: é um _double_ que **codifica a premissa errada** — a de
que quem chega ao approve já tem a permissão. O teste prova a alçada e é cego ao gate binário.

Some-se a isso que o reader é **opt-in por driver** (`composition.ts:971-974`): ele só é construído
quando `pools.authUserReadPort !== null`. No driver `memory` o gate **não roda**. A combinação —
gate ausente em memória, e mascarado pelo fake na borda — é o que produziu verde em todos os
ambientes que não são produção.

---

## 4. Análise interna

### O que a evidência estabelece antes de escolher

1. **Produção = `main` = `dev`** neste código. Sem atenuação.
2. **O ADR-0052 `Accepted` nomeia "aprovar pagamento"** como operação que qualquer autenticado
   executa sob bypass. O estado atual **contradiz um ADR aceito**.
3. **A decisão mais recente do dono (25/08, `composition.ts:599-603`) é ainda mais enfática** —
   _"SEM EXCEÇÃO — nem para a rota que move dinheiro"_ — e é **posterior** à #609.
4. **O inventário de exceções do ADR-0052 está incompleto** — 4 entradas, e existe um 5º ponto.
   Isto é defeito do registro, independente da decisão.
5. **O gate nunca foi decidido: entrou por herança de wiring** (`ed4bf578`, em texto), reaproveitando
   um reader que a #289 injetara para outro fim, sem passar pelo composition root.
6. **A P.O. já rejeitou um carve-out do bypass** (ADR-0053), e o rejeitado protegia dano
   *irreversível*. O gate atual protege dano *reversível*, e nunca foi decidido.
7. **O precedente da #299 é o mesmo padrão** — fail-closed sobre dado que produção não tem — e foi
   resolvido removendo o fail-closed.
8. **A #881 superestima o custo de A:** a #609 fechou **um** furo (valor), não dois; e esse furo,
   sob bypass, já está aberto pelo self-grant em duas chamadas HTTP.
9. **A suíte não pode pegar isto hoje**, e a causa é um fake, não uma lacuna.

### Alternativas avaliadas

| Alternativa                                       | Prós                                                                                                                                                                                                        | Contras                                                                                                                                                                                                                                              | Veredito                    |
| :------------------------------------------------ | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------- |
| **A** — `rbacMode` chega ao `financial`; sob `bypass`, pula o `checkApprover` | Restaura o que o ADR-0052 `:66-67` e a decisão de 25/08 (`composition.ts:599-603`) **já declaram**. Corrige a violação da `auth-module.md`. Fecha o inventário do 0052. Só backend, `S`. Destrava produção sem depender de terceiros. Reversível por env. Segue padrão existente (`authorizeActor`), sem mecanismo novo. | Suspende — enquanto o bypass durar — o furo de **valor**, que **já está aberto** pelo self-grant. Exige atravessar `rbacMode` por uma fronteira de módulo que hoje não o carrega. **Dois riscos reais:** virar pulo silencioso (o ADR-0052 `:48-52` proíbe) e apagar da trilha a distinção entre aprovação checada e aprovação sob bypass. | ✅ **Recomendada, com C**    |
| **B** — manter o gate e provisionar papéis de verdade | É o que a #609 quis. Preserva a separação de funções. Não mexe em código.                                                                                                                                    | **Depende de duas coisas fora de alcance:** um ato em produção (que eu não posso executar nem verificar) e uma **tela de Perfis no front** cuja ausência **não pude confirmar**. Enquanto não existir, conceder aprovação depende de `curl`/SQL manual. Mantém produção parada no intervalo. Contraria o "sem exceções" da P.O. | ❌ **Não como solução única** |
| **C** — recusa cedo, com recado acionável         | Corrige o defeito real da mensagem (acusa o `approverRef` quando o barrado é o chamador). Vale em qualquer cenário. Barato.                                                                                  | **Sozinha não destrava nada** — o operador continua sem aprovar, apenas passa a ler um erro melhor.                                                                                                                                                    | ✅ **Complemento, não saída** |

### Recomendação — **A + C**, com guarda-corpo; **B como estado-alvo**, não como desbloqueio

**A**, porque é a única que restaura o comportamento que um ADR **aceito** descreve, e a única que
destrava produção sem depender de terceiro que não pude verificar. Não é "abrir mão de um controle":
é **parar de aplicar um controle que nunca foi decidido** e que contradiz duas decisões registradas
(ADR-0052 `:66-67` e o desfecho do ADR-0053 `:110-112`).

O argumento de custo da #881 — *"reabre os dois furos que a #609 fechou"* — **não sobrevive à
medição**, por duas razões independentes. Primeiro, os furos eram dois mas só **um** foi fechado: o
de identidade está declarado "FORA DE ESCOPO" no próprio commit e segue aberto em qualquer modo.
Segundo, o furo de valor **já está aberto sob bypass**: a própria mitigação sem deploy da #881 é a
prova — duas chamadas HTTP liberadas por `authorize-actor.ts:17`, e a alçada é opt-in desde a #299,
então o self-grant entrega aprovação **sem teto**. O gate sobrevivente não impede aprovar; **apenas
torna o caminho mais longo, manual e mudo**. É custo de disponibilidade cobrado sem contrapartida de
segurança — e o que ele de fato seleciona é quem conhece o contorno, não quem tem alçada.

**C junto**, porque a mensagem errada é defeito próprio e independente: no caminho do `approve` o
sujeito é o chamador, não o `approverRef` (`error-mapping.ts:378`).

**Guarda-corpo obrigatório para A** — e esta é a condição da recomendação, não um adorno. O
ADR-0052 tem uma seção inteira intitulada *"Guardas invariantes — o bypass NÃO pode ser silencioso"*
(`:48-52`), motivada por `#456`/`#462`/`#474`. Uma Opção A implementada como um `if (rbacMode ===
'bypass') return ok()` mudo seria **a mesma classe de defeito que o ADR existe para impedir**.
Portanto:

1. O pulo é **explícito e observável** — log estruturado no ato, dizendo que a checagem de alçada foi
   dispensada por modo de operação.
2. **CA2 preservado e provado:** sob `enforced`, o gate volta integralmente. Sem isso, A vira
   remoção do controle, não suspensão.
3. **A trilha registra que a checagem foi dispensada.** `approve-document.ts:88-95` já monta as
   entries da timeline; a aprovação sob bypass precisa carregar um marcador próprio. **Este é o único
   dano de A que seria permanente:** o ADR-0052 `:77-78` assume que _"a trilha de quem fez continua;
   o que se perde é a restrição"_ — mas sem o marcador, quando o `enforced` voltar, ninguém
   distinguirá "aprovado com alçada checada" de "aprovado sob bypass". Perde-se rastreabilidade, que
   nenhum `re-enforced` recupera.
4. **O inventário do ADR-0052 é fechado** por ADR novo que o `supersede` — não por edição (ADR
   aceito não se edita). O registro precisa passar a dizer que existem **cinco** pontos, e que o
   quinto é de natureza diferente: lê a permissão do banco em vez de chamar `authorize`.

**B permanece o estado-alvo**, e o ADR-0053 `:133-141` já a nomeia — o *"redesenho completo do RBAC"*.
O que a evidência não sustenta é usar B como **desbloqueio agora**: ela depende de um front que não
pude verificar e de um ato em produção que não me cabe.

### Qual evidência mudaria esta recomendação

| Se for verdade que…                                                                              | Então…                                       |
| :------------------------------------------------------------------------------------------------ | :------------------------------------------- |
| **a tela de Perfis/Permissões existe no front** (não verificado — §3)                              | **B** vira viável de imediato e A perde urgência: bastaria conceder o papel. |
| o `bypass` está prestes a ser desligado (fim da aceitação)                                        | **B** direto; A seria trabalho descartável.  |
| há exigência contratual/auditoria de segregação de funções na aprovação **durante** a aceitação     | **B**, e a parada de produção passa a ser custo aceito conscientemente. |
| a P.O. reviu o "sem exceções" do ADR-0053                                                          | o precedente cai, e A perde o respaldo principal. |

---

## 5. Decisão final

**PENDENTE.** Bloqueador: **decisão do dono do sistema** entre A, B e C — ela libera ou trava
pagamento em produção, e não é decisão de quem investiga.

A investigação está concluída: não há medição adicional que eu possa fazer sem acesso a produção ou
ao repositório do front.

---

## 6. Saídas (outputs concretos)

- [ ] **(a)** **Decisão A / B / C** pelo dono do sistema. Recomendação desta inquiry: **A + C**, com
      os **quatro** guarda-corpos de §4. Destrava a #881 e a esteira de Contas a Pagar.
- [ ] **(b)** **ADR novo que `supersede` o ADR-0052**, fechando o inventário de pontos fora do
      wrapper — hoje ele declara **quatro** e existem **cinco**, sendo o quinto de natureza distinta
      (lê a permissão do banco, não chama `authorize`). Vale **independente** de A, B ou C: é defeito
      do registro, não da implementação. _ADR aceito não se edita._
- [ ] **(c)** **O teste que falta (CA4 da #881)**, descrito abaixo. Não commitado de propósito —
      enquanto (a) não sair, **não existe assert correto a escrever**: um teste que asseverasse o 422
      atual cristalizaria o bug como esperado, e um que asseverasse o comportamento correto ficaria
      vermelho, contra a política de regressão zero.

### O teste do CA4 — onde vive, o que monta, o que assere

- **Onde:** `tests/modules/financial/adapters/http/approve-document-bypass-no-role.http.test.ts`
  (mirror de `src/modules/financial/adapters/http/`, ao lado do `approve-document-authority.http.test.ts`
  que ele complementa). Borda HTTP, driver `memory`, **sem** `MYSQL_INTEGRATION` — o defeito não
  depende do MySQL, depende do que o port devolve.
- **O que monta:** idêntico ao vizinho, com **uma** diferença — o `fakeAuthorityPort` devolve
  `canApprove: false` (produção: junção vazia), em vez do `true` hardcoded de `:53`. O usuário
  autenticado continua vindo do `adminDevPermissions`, porque o ponto do teste é justamente que **o
  seed do `auth` não influencia o gate do `financial`**: são fontes distintas, e é essa distinção que
  o teste registra.
- **A segunda montagem, que é o coração do caso:** o app é construído com `rbacMode: 'bypass'`, para
  que o teste exerça a combinação que produção vive — bypass ligado **e** junção vazia.
- **O que assere:** depende de (a), e é por isso que ele ainda não existe.
  - Sob **A** → `200`, documento `Approved`, e o log do pulo emitido.
  - Sob **B/C** → status e corpo do erro **acionável** (não `approver-missing-permission`).
  - Em **qualquer** cenário, o par de controle: com `rbacMode: 'enforced'` e `canApprove: false`, a
    recusa é preservada (CA2 — o controle da #609 não regride).
- **Sobre `{ todo: true }`:** avaliado e **descartado**. `node:test` imprime `todo` **dentro da seção
  `✖ failing tests`** sem ser falha — já enganou leitura neste repositório. Deixar um marcador que
  parece vermelho num gate cujo contrato é "vermelho não fecha turno" troca uma dívida visível por um
  ruído recorrente. O registro fica aqui e na #881, que é onde se procura.

### Sub-achado: a mensagem de erro — **não abrir issue** (avaliado)

`error-mapping.ts:378` traduz `approver-missing-permission` como _"O aprovador informado não tem
permissão de aprovação."_ — e no caminho do `approve` **o sujeito é o chamador**, não o `approverRef`.
A mensagem acusa a pessoa errada, e o operador não tem como agir sobre ela.

Avaliado pela skill `issue-report` e **não registrado como issue nova**: a #881 já o descreve no corpo
e a **Opção C é exatamente a correção dele**. Abrir issue aqui criaria duplicata de um item que já
está sob decisão. **Ressalva registrada:** se (a) resolver por **A pura**, sem C, a correção da
mensagem fica **órfã** — nenhum CA da #881 a cobre isoladamente (os CA1–CA6 tratam do comportamento,
não do texto) — e **aí** ela merece issue própria. A condição está aqui para não se perder.

---

### Sub-achado que nenhuma das três opções toca: o furo de identidade

`approve-document.ts` **não compara** `cmd.approvedBy` com o `approverRef` gravado no documento —
nem sob `enforced`. Um usuário com alçada própria aprova documento indicado a outro. Está declarado
"FORA DE ESCOPO" em `ed4bf578` ("exige decisão de produto — 3 opções no CA4 da #609") e **continua
aberto**. Não foi registrado como issue nova aqui porque já tem endereço: é o CA4 da **#609**.
Fica anotado para que a escolha de A/B/C não seja lida como tendo fechado a segregação de funções —
ela não fecha, em nenhuma das três.

---

## 7. Referências

- Issue [#881](https://github.com/ERP-Bem-Comum/core-api/issues/881) — o diagnóstico original.
- Issue [#609](https://github.com/ERP-Bem-Comum/core-api/issues/609) / commit `ed4bf578` — introduziu o gate; a mensagem explica o wiring herdado e declara o furo de identidade fora de escopo.
- Commit `1411e673` (25/08/2026) — a decisão do dono em `auth/adapters/http/composition.ts:599-603`.
- Issue [#299](https://github.com/ERP-Bem-Comum/core-api/issues/299) / commit `a5ba9a6a` — o mesmo padrão, uma linha acima.
- [ADR-0052](../architecture/adr/0052-rbac-bypass-flag.md) — `Accepted`; `:19-20`, `:34-41`, `:48-52`, `:66-67`.
- [ADR-0053](../architecture/adr/0053-sensitive-data-carve-out-rbac-bypass.md) — `Rejected`; `:25-28`, `:110-112`, `:120-121`, `:133-141`.
- [`.claude/rules/auth-module.md`](../../.claude/rules/auth-module.md) — a norma vigente que o #609 violou.
- Baselines medidos: `origin/dev@5739410f`, `origin/main@571a14d7`, em 2026-09-03.
