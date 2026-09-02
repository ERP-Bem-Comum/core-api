# Posfácio — o que foi executado, e o que envelheceu no caminho

Sessão de sanitarização da mesma tarde de **02/09/2026**, medindo contra `d7373585` (HEAD da `dev`
depois do PR #944) em vez de `571a14d7` (HEAD da `main`, que o [README](./README.md) usou).

Entre uma medição e outra passaram-se **cerca de quatro horas**. Foi o bastante para três vereditos
mudarem — e é isso que este documento registra.

## O que foi executado

| Frente | Resultado |
| --- | --- |
| Resgate dos fixes órfãos | #879 → PR **#944** (mergeado) · #517 → **#950** · #487 → **#951** |
| Issues fechadas | **2** — #879 (resolvida) e #947 (premissa falsa) |
| Transferidas para o `web-app` | **3** — #349, #352, #353 → #393, #394, #395 |
| `needs-triage` removido | **55** |
| `priority:*` atribuído | **66** |
| Labels de natureza aplicadas | **15** |
| Títulos reescritos | **12** |
| Comentários de evidência publicados | **22** |

Backlog: **135 → 132** abertas · `needs-triage` **58 → 3** · sem `priority:*` **70 → 4** ·
sem label nenhuma **16 → 0**.

## Os três vereditos que mudaram, e por quê

### 1. #879 — de "fix órfão, nunca mergeado" para resolvida

O README media `mapper.ts:69` e encontrava `convenio: 'LEGADO'`. Correto às 14h. Às 18h a única
ocorrência de `LEGADO` no arquivo era o **comentário da própria correção**, porque o commit órfão
tinha sido integrado pelo #944 nesse intervalo.

**Nada estava errado na triagem.** O repositório mudou embaixo dela.

### 2. #947 — a issue estava errada, e aplicá-la teria regredido o emissor

Aberta durante a triagem, afirmava que a fonte primária do CNAB era de **junho/2019** e propunha
adotar a "v6, jul/2023". As quatro referências da skill dizem, todas, `Versão 08 – julho/2025`, e
as páginas já tinham sido reancoradas pela **#924** (fechada), com gate em
`tests/cleanup/cnab-reference-pages.test.ts`.

A origem do engano: **o nome do arquivo mente.** `jun-19-layout-multipag.pdf` contém a Versão 08 de
julho/2025 — o `jun-19` é resíduo do nome com que entrou no repositório. Quem lê o nome conclui 2019.

Executar a issue teria trocado a fonte por uma **duas edições mais antiga**. Fechada como
`not planned`.

### 3. #856 — o escopo encolheu de quatro campos para três

A evidência citava `documentType`, `agencyDigit`, `accountAgencyDigit` e `bankName` como hardcoded.
O `bankName` **já não é**: `generate-remittance.ts:185` lê `account.value.bankName ?? ''` desde os
PRs #857/#870. Os outros três seguem em `:172`, `:176` e `:179`.

## O que a amostragem das 100 "manter" achou

Três filtros, e só o terceiro separa alguma coisa:

| Filtro | Resultado | Serve? |
| --- | --- | --- |
| O arquivo citado ainda existe? | **60 de 60 existem** | ❌ não separa nada |
| Foi tocado depois da issue abrir? | 22 de 57 | 🟡 bom ranking, não é veredito |
| A linha citada ainda fala do mesmo assunto? | 21 verificadas, **todas no tema** | ✅ |

**Nenhuma segunda #879 apareceu.** As duas que caíram eram exceções, e cada uma por um motivo que
esta varredura não teria pego: a #879 porque foi corrigida no intervalo, a #947 porque a premissa
vinha de um **nome de arquivo**, não do código.

Uma correção saiu daí: a **#819** cita `edit-cedente-account.ts:64-68`, e a trava que ela descreve
está hoje em `:58-68` — o comentário que o #944 acrescentou empurrou o código. A issue continua
válida; a numeração é que não.

⚠️ **43 das 100 não têm `arquivo:linha` na evidência** e ficaram fora do método. Não são as mais
confiáveis: são as que não dá para perguntar barato.

## A lição que atravessa os três casos

**Evidência com `arquivo:linha` não impede envelhecer — torna o envelhecimento barato de detectar.**

A #879 caiu em segundos porque bastou reler a linha citada. A #947 se revelou falsa porque a fonte
primária estava a um `grep` de distância. A #819 teve a numeração corrigida pelo mesmo caminho.
As 43 sem referência resistem à verificação não por estarem certas, mas por não haver o que perguntar.

O corolário prático, e menos óbvio: **referência de linha desloca sem avisar.** Toda mudança num
arquivo empurra as linhas que outras issues citam. O `arquivo` sobrevive; o `:NN` não.
