---
name: review-method-vary-neighbor-text-in-regex-widening
description: Revisão de alargamento de classe de caracteres — variar o TEXTO VIZINHO, provar NOVO ⊇ HEAD por construção, e parar com um lote de vizinhos plausíveis em vez de caçar mais um caso
metadata:
  type: feedback
---

Quando um diff alarga a classe de caracteres de uma captura (`[\d.\-/\s]` → `[0-9A-Za-z.\-/\s]`),
o defeito **não** aparece variando o payload (o identificador). Aparece variando o **texto
vizinho** — porque o que agora entra na captura é o que vem depois.

**Why:** na revisão do `native-pdf.ts` (CNPJ alfanumérico), 3 de 6 inputs adversariais **não**
divergiram de HEAD, e o motivo era acidental:

- a fixture real do repo (`danfse-fortaleza.txt`) traz `Inscrição` logo após o identificador, e
  o `ç` **não** está na classe nova → a captura para em `Inscri`, sem dígitos, e o bug não
  dispara;
- em outro caso a janela do quantificador (`{9,24}`) se esgotava **antes** dos dígitos vizinhos.

Ou seja: a suíte inteira passava (`fail 0`) enquanto o defeito era real. "Todos os testes
passam" não é evidência num diff de regex — a fixture pode estar imunizando por acidente
ortográfico.

**How to apply:** três passos, nessa ordem.

1. Enumerar quais caracteres **entraram** na classe e quais ainda a terminam (acento, `(`, `:`
   costumam ser os terminadores que salvam a fixture existente).
2. Fazer a **aritmética da janela**: com `{n,m}`, contar quantos caracteres do vizinho cabem
   depois do payload. Payload sem máscara sobra mais janela que mascarado — testar as duas
   formas quando o diff declara suportar ambas.
3. Construir o vizinho no formato *letras → dígitos* (`IM 0012345`, `Nome ACME 2026`), que é o
   que faz dígitos alheios entrarem na normalização.

## Provar NOVO ⊇ HEAD por construção — e só então parar

Achar um caso ruim é fácil; decidir que **não há** caso ruim é o passo que faltava. Com
`RegExp.exec` **não-global**, a classe alargada só pode divergir de HEAD por dois mecanismos,
e ambos são enumeráveis:

- **mesma posição de match, captura maior** → comparar o que cada ramo consumidor faz com o
  `raw` mais largo. Se o ramo legado recorta o `raw` à classe ANTIGA (`/^[\d.\-/\s]*/`), ele
  reproduz o prefixo de HEAD caractere a caractere, com o mesmo teto de janela → equivalente.
- **posição de match ALTERNATIVA** — este é o mecanismo esquecido. HEAD, com a classe estreita,
  **falhava** no 1º casamento do literal-âncora e o motor seguia procurando a ocorrência
  seguinte; a classe larga casa logo na 1ª e a consome. Só morde com **2+ ocorrências da
  âncora** no trecho pesquisado — verificar se o recorte de bloco (ex.: `emitBlock` entre
  `EMITENTE` e `TOMADOR`) garante ocorrência única. A degradação aqui é para `undefined`
  (perde dado), não para valor errado.

**Critério de parada:** rodar um **lote** de vizinhos plausíveis do domínio (para DANFSe:
`Inscrição Municipal`, `IM 0012345`, `CEP`, `Telefone`, `E-mail`, `LTDA 2026`, `Nº 1366/2024`,
razão social com número…) × cada forma do payload (bare/mascarado), imprimindo HEAD × NOVO.
`0 divergências em ~100 combinações plausíveis` + os dois mecanismos acima fechados = aprovar
e dizer isso no parecer. Continuar caçando depois disso é o modo de falha "revisor instruído a
achar lacuna encontra alguma".

Complementa [[review-heuristic-comment-that-argues-away-hazard]],
[[review-method-replicate-head-logic-in-scratch]] e
[[falsos-positivos-native-pdf-taxid-preexistente]].
