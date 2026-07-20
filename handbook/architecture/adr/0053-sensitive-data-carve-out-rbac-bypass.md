# ADR-0053: Carve-out de confidencialidade ao `AUTH_RBAC_MODE=bypass` — dado sensível (LGPD Art. 5º II) continua exigindo permissão

- **Status:** **Rejected** (2026-07-20 — decisão da P.O.; ver §Desfecho)
- **Date:** 2026-07-16
- **Deciders:** P.O. (Alessandra — decisão de 2026-07-20) · Tech Lead (Gabriel — dono do ADR-0052)
- **Complementa:** [ADR-0052](./0052-rbac-bypass-flag.md) — **não** o substitui. Mantém a flag, o default e o banner; recorta uma classe de permissão do alcance do `bypass`.
- **Relates:** `REPORTS-TEAM-DEMOGRAPHICS` (gráficos demográficos do relatório Equipe ABC) · `REPORTS-TEAM-ABC`/#238 (projeção 9 colunas LGPD-safe)

## Contexto

O [ADR-0052](./0052-rbac-bypass-flag.md) criou `AUTH_RBAC_MODE=bypass`, em que *"todo usuário
autenticado é super-usuário"*. O bypass é **total** por decisão explícita do dono — inclusive para
gerir papéis, o que é justamente o que permite se auto-recuperar do #462.

A P.O. pediu a liberação dos 3 gráficos demográficos do relatório "Equipe ABC" (Gênero, Idade,
Raça/Cor), hoje barrados na fronteira do `partners`. A liberação seria feita sob uma permissão
dedicada (`collaborator:read-sensitive`).

**A colisão:** com `bypass` ligado, `hasPermission` retorna sempre `true` e a permissão nova protege
**nada**. Raça e identidade de gênero são **dado sensível na acepção do Art. 5º II da LGPD** —
categoria especial, com regime jurídico próprio (Art. 11). Sob o 0052 como está, esse dado passa a
depender de uma env var: `AUTH_RBAC_MODE=bypass` num ambiente qualquer expõe a distribuição racial do
quadro de colaboradores a qualquer autenticado.

Note-se a assimetria com o resto do bypass: as demais permissões controlam **ação** (aprovar
pagamento, excluir plano). O dano de uma ação indevida é reversível — re-`enforced`, estorna, reprova,
audita via `updatedByRef`. **Vazamento de dado sensível é irreversível**: não há como "desler" uma
distribuição racial já lida, e a trilha de auditoria registra *quem leu*, não desfaz a leitura.

## Decisão

Introduzir a noção de **permissão sensível** — uma classe de permissão que o `bypass` **não** libera.
`collaborator:read-sensitive` é o primeiro membro.

| Modo | Permissão comum (ex.: `budget-plan:write`) | Permissão **sensível** (ex.: `collaborator:read-sensitive`) |
| :--- | :--- | :--- |
| `enforced` | RBAC fail-closed | RBAC fail-closed |
| `bypass` | libera (0052 inalterado) | **continua exigindo a permissão** |

Ponto de aplicação: o mesmo estrangulamento do 0052 — o wrapper de `authorize`/`hasPermission` em
`buildAuthHttpDeps` consulta a classe da permissão antes de aplicar o bypass. Nenhum plugin de módulo
muda. A lista de permissões sensíveis vive junto do catálogo
(`domain/authorization/permission-catalog.ts`) — dado do domínio, não config de ambiente: **não** é
env var, não se desliga sem deploy.

**O que NÃO muda:** a flag, o default `enforced`, o fail-secure em valor inválido, o banner de boot, o
bypass total das demais permissões, o `authorizeActor` dos 4 use cases de auto-gestão (DD-USER-07). A
capacidade de auto-recuperação do #462 fica intacta — nenhuma permissão sensível governa gestão de
papéis.

## Precedente interno

O próprio ADR-0052 já abre exceção ao bypass:

> "**Uma proteção de INTEGRIDADE sobrevive ao bypass:** o `revokeRole` impede o ator de revogar de si
> a própria capacidade de gestão (`cannot-self-lockout`) — isso protege o **estado persistido** (não
> deixar o sistema sem gestor quando o `enforced` voltar), não a autorização do ator, então continua
> valendo em qualquer modo."

Este ADR aplica a **mesma estrutura de raciocínio** a um segundo eixo: o que sobrevive ao bypass é o
que o bypass não pode desfazer depois. Integridade sobrevive porque o estado persiste;
confidencialidade sobrevive porque o vazamento persiste. O 0052 já aceitou que "bypass total" admite
exceção quando o dano escapa da janela do modo — aqui o dano escapa pela mesma porta.

## Consequências

**Aceitas:**

- **O bypass deixa de ser literalmente total.** Um operador com `bypass` ligado que tente abrir os
  gráficos demográficos toma **403** — e, sem a permissão no banco (#462), não consegue se
  auto-liberar por essa via. É o preço de não fazer o dado sensível depender de env var.
  Mitigação: no `bypass` o operador pode dar a si a role que contém a permissão (a gestão de papéis
  **não** é sensível e segue liberada) e então ler. O caminho existe; deixa de ser automático e passa
  a ser um ato registrado.
- **Custo cognitivo:** passam a existir duas classes de permissão. O catálogo tem de dizer qual é
  qual, e uma permissão nova que exponha dado sensível precisa ser marcada — se esquecerem, ela cai
  no bypass. Mitigação: teste que prende a lista (uma permissão `*-sensitive` fora da lista falha o
  gate).

**Ganhas:**

- Dado sensível (LGPD Art. 5º II) não depende de configuração de ambiente para continuar protegido.
- O banner do 0052 fica **verdadeiro** — ele diz "só a permissão por rota caiu"; com o carve-out,
  passa a valer a ressalva "exceto as sensíveis". Texto a ajustar.

## Alternativas descartadas

- **Não liberar os gráficos** — o dado já foi coletado no formulário para esta finalidade; a P.O.
  tem demanda legítima e o legado já exibia. Não-decidir é decidir por não entregar.
- **Liberar sob `collaborator:read`** (permissão existente) — quem vê a lista de nomes veria a
  distribuição racial. É o achado do `GET /api/v1/collaborators` (issue à parte), não um alvo.
- **Aceitar que o bypass derrube o dado sensível** — coerente com o 0052 como está e **é a decisão
  default se este ADR for rejeitado**. Torna a proteção de categoria especial dependente de uma env
  var. Registrado aqui para que, se escolhida, seja escolha e não descuido.
- **Env var separada (`AUTH_SENSITIVE_MODE`)** — recria o problema num segundo interruptor.

## Reversão

Remover a permissão da lista de sensíveis → ela volta a obedecer o `bypass`. Sem migração, sem dado.

---

## Desfecho — REJEITADO (P.O., 2026-07-20)

O carve-out **não será implementado**. Registro da decisão e do seu contexto, para que a exposição
de dado sensível no período seja rastreável como **escolha informada**, não como descuido.

### Decisão

Durante a fase de **aceitação do sistema recém-entregue**, o acesso fica **liberado para todos os
usuários autenticados** (`AUTH_RBAC_MODE=bypass`, sem exceções). Inclui os gráficos demográficos
(gênero, idade, raça/cor) e o restante do dado de colaborador.

### Justificativa (P.O.)

1. **Paridade com o legado.** O sistema legado já funcionava assim — sem segregação de acesso. A
   migração não introduz exposição nova; mantém o statu quo enquanto o RBAC é desenhado.
2. **Necessidade da aceitação.** O sistema acabou de ser entregue. Para o cliente **testar todos os
   módulos**, todos precisam estar visíveis. Um RBAC parcial durante os testes produziria falsos
   negativos ("não aparece" confundido com "não funciona") — exatamente o incidente
   `AUTH-BYPASS-ME-PERMISSIONS` (módulo financeiro oculto de 17/07 a 20/07).
3. **O RBAC será refeito por inteiro**, com critérios de LGPD + regras internas do cliente. Um
   carve-out agora seria remendo numa regra que será substituída — e poderia enviesar o desenho novo.
4. **O cliente está ciente** da liberação total no período e do plano de configurar o RBAC em seguida.

### Consequências aceitas

- Enquanto durar o `bypass`, **qualquer usuário autenticado** vê os módulos e o dado sensível
  (raça, identidade de gênero, CPF, salário, dados de saúde) — via telas e via
  `GET /api/v1/collaborators` (ver issue #482).
- É janela **temporária**, atrelada à aceitação. Não é o estado-alvo.

### O que substitui este ADR

O **redesenho completo do RBAC** (a fazer), que deve tratar dado sensível com base legal e finalidade
explícitas por papel. Insumos já levantados:
- Catálogo real: **44 permissões**; papéis são **dado no banco** (configuráveis sem deploy).
- Issue **#482** — `GET /api/v1/collaborators` serve CPF/RG/raça/alergias sob a permissão genérica
  `collaborator:read`, e permite contagem por categoria sensível via filtro. Deve ser endereçada no
  redesenho.
- Questionário de elicitação (pessoas → tarefas → matriz ver/editar/aprovar; bloco separado de dado
  sensível com finalidade declarada).

### Quando re-avaliar

- **Ao desligar o `bypass`** (fim da aceitação) — o redesenho do RBAC assume.
- **Se a janela se estender** além do previsto, ou se o cliente admitir usuários externos ao time
  atual: reabrir a discussão, porque a premissa (1) (paridade com o legado, público conhecido)
  deixa de valer.
