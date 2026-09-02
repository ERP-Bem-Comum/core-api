# Triagem do core-api — 02/09/2026

Saída de uma sessão que conferiu as **160 issues abertas** do `ERP-Bem-Comum/core-api`
contra o código, e não contra o título. Repositório clonado no `571a14d7`
(HEAD da `main`, release `1.0.0-rc.2`).

**Resultado até aqui: 160 → 133 abertas.** 27 fechadas com comentário de evidência.

> ## ⚠️ Leia o posfácio antes de agir por este documento
>
> Uma segunda sessão, na **mesma tarde de 02/09**, executou o que está aqui e mediu de novo contra
> um HEAD mais novo. **A urgência do resgate acabou** e parte dos vereditos envelheceu — inclusive
> um que dizia o oposto do que o código passou a dizer, quatro horas depois de escrito.
>
> O relato está em [`POSFACIO.md`](./POSFACIO.md), com o que foi executado, o que mudou de veredito
> e por quê. **Este README descreve o estado das 14h; o posfácio, o das 21h.** Os dois ficam,
> porque a diferença entre eles é o achado mais útil do conjunto.

## Comece por aqui

**Urgente, e não é limpeza:** três correções existem fora do histórico da `main`. A da **#879**
— bloqueio P1 em produção — teve a branch **apagada do remoto durante a sessão**; o commit está
solto e o GC do GitHub apaga isso sem avisar. Leia `resgate/RESGATE.md` antes de qualquer outra
coisa. Os patches e o bundle estão ao lado; nada se perde mesmo que o objeto suma.

> ✅ **Resolvido no mesmo dia.** Os três estão na `dev` ou em PR: a #879 pelo **#944** (mergeado),
> a #517 pelo **#950** e a #487 pelo **#951**. Os patches e o bundle permanecem aqui como registro
> — e porque foi deles que o resgate saiu.

## O que tem aqui

```
triagem.html                        painel das 160, filtrável, com veredito e evidência
dados/
  issues-classificadas.csv|json     as 160 com ação, veredito e evidência (arquivo:linha)
  needs-triage-a-remover.tsv        55 issues já triadas que ainda carregam o label
  sem-label.tsv                     16 issues sem label + sugestão a revisar
resgate/
  RESGATE.md                        os 3 fixes órfãos: o que fazem e como recuperar
  000{1..4}-*.patch                 os commits, aplicáveis com git am
  resgate-3-fixes.bundle            os mesmos commits como bundle git
reescritas/
  reescritas.md                     a proposta comentada (bloco A/B/C)
  titulos.tsv                       6 títulos novos, prontos para gh issue edit
  comentarios/NNN.md                12 comentários prontos, para gh issue comment --body-file
registro/
  fechadas-02-09.md                 as 27 fechadas e por quê
scripts/
  00-verificar.sh                   confere o que mudou desde 02/09
  01-reescritas.sh                  aplica os 6 títulos + os 12 comentários
  02-labels.sh                      PROPOSTA de higiene de labels (não aprovada)
```

Todo script roda em **dry-run por padrão**. `--apply` executa.

## Como a classificação foi feita

Quatro agentes leram o código clonado em paralelo, um por cluster, e devolveram por issue um
veredito com arquivo e linha. Nada foi classificado pelo título. Os vereditos:

| Veredito | Significa |
| --- | --- |
| `RESOLVIDO` | o problema não existe mais no HEAD; a evidência diz o que resolveu |
| `PARCIAL` | parte entregue; a evidência diz o que sobrou |
| `VALIDO` | reencontrado no código de hoje, com arquivo e linha |
| `INCERTO` | decisão de produto, infra externa ou pergunta operacional |

## O que ficou pendente de decisão

1. **Os 6 títulos do bloco B** em `reescritas/reescritas.md` — aprovar antes de rodar o `01`.
2. **Os 8 épicos.** #481, #480, #479 e #478 são casca de organização sem um rastro em código ou
   git log; #64 cumpriu o ciclo; #769, #170 e #866 ainda carregam trabalho real.
3. **As 3 de outro repositório** — #349, #352 e #353 viraram BFF pela ADR-0049.
4. **Higiene de labels** — o `02` está pronto e não foi aprovado.

## Duas issues deliberadamente não fechadas

- **#826** — do lado do core não há trabalho pendente, mas ela é o único registro escrito de uma
  coordenação com o web-app que ainda não aconteceu. Recebeu `BlockedBy`.
- **#915** — parece ruído por ser pergunta, mas o corpo registra que *aquele deploy inclui uma
  migration*, e isso não está em nenhum outro lugar. Recebeu `question`.
