---
name: review-heuristic-comment-that-argues-away-hazard
description: Comentário do diff que nomeia um risco e em seguida o descarta por argumento é o ponto onde construir input adversarial — e o contador de reincidência NUNCA vira prior
metadata:
  type: feedback
---

Quando um comentário do próprio diff **nomeia** um efeito colateral e depois argumenta
que ele é inofensivo ("aceitar letras faz o regex alcançar o texto vizinho… mas o
checksum decide sem ambiguidade"), tratar isso como convite a construir um input
adversarial, nunca como prova.

**Why:** na revisão de `native-pdf.ts` (CNPJ alfanumérico, ADR-0044) o comentário
descrevia com precisão o risco de alargar a classe de caracteres da captura, e a
justificativa cobria só o **ramo novo** (checksum). O ramo **legado**, logo abaixo,
continuava aplicando `digits.slice(0, 14)` sobre o `raw` agora mais largo — e passou a
concatenar dígitos do texto vizinho num CPF de 11, devolvendo 14 caracteres errados.
O autor viu o perigo e fechou metade dele.

**How to apply:** a pergunta operacional é sempre *"o argumento cobre todos os
caminhos de saída da função, ou só o que foi acrescentado?"*. Em mudança de regex,
enumerar cada `return`/ramo que consome a captura, não só o que o diff tocou.
Complementa [[review-method-replicate-head-logic-in-scratch]],
[[review-method-vary-neighbor-text-in-regex-widening]] e
[[falsos-positivos-native-pdf-taxid-preexistente]].

## Ciclo 2 (2026-08-04) — reincidência idêntica

O **mesmo** diff voltou ao working tree com o ramo legado intacto; o achado se
reproduziu idêntico. Lição: **memória acerta o alvo, mas não substitui a prova** —
reapresentar sem reexecutar a comparação HEAD × atual seria papagaiar.

## Ciclo 3 (2026-08-04) — o achado foi CORRIGIDO, e o contador quase me traiu

Na terceira volta o autor estreitou o consumidor (o ramo legado passou a recortar o
`raw` à corrida inicial de dígitos/máscara, `ATÉ` a primeira letra) e escreveu o teste
que o parecer anterior pediu. **O achado não existia mais.**

O risco desta vez era o inverso do ciclo 2: eu tinha nota dizendo "se aparecer uma
terceira vez, proponha o teste em vez de reportar de novo" — e seguir essa nota **sem
reler o diff** teria produzido um falso positivo construído a partir da própria
memória. O contador de reincidência é um **alvo de busca**, jamais um prior sobre o
resultado.

Regra operacional que fica: memória de achado recorrente autoriza *olhar primeiro
naquele lugar*; a única coisa que autoriza *reportar* é a execução lado a lado. E vale
o simétrico — quando o defeito some, dizer explicitamente no parecer **qual** regressão
foi verificada como fechada; é o que impede o ciclo seguinte de reabrir o assunto.
