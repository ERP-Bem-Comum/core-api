# ADR-0053: Carve-out de confidencialidade ao `AUTH_RBAC_MODE=bypass` — dado sensível (LGPD Art. 5º II) continua exigindo permissão

- **Status:** Proposed
- **Date:** 2026-07-16
- **Deciders:** Tech Lead (Gabriel — dono do sistema; decisor registrado do ADR-0052) · P.O. (Alessandra — demanda de produto)
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
