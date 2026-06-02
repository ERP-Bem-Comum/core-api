# Estrutura de uma Análise Teórica

Use este template para responder qualquer pergunta filosófica/comparativa.

---

## 1. Tese (1 frase)

A posição que você vai sustentar. Exemplo:

> "Tese: ACID e BASE não são opostos. São pontos num espectro de garantias, e a indústria pós-2015 mostra isso ao trazer ACID de volta via NewSQL."

## 2. Citação literal (≥4 linhas)

Antes da análise, mostre o livro. Use Ramakrishnan para teoria; refman MySQL para evidência operacional.

```bash
bun run shared-tools/buscar.ts ../../shared-references/database/sgbd--ramakrishnan-gehrke.md "<termo>" --top 5
bun run shared-tools/citar.ts  ../../shared-references/database/sgbd--ramakrishnan-gehrke.md --linha N --contexto 6
```

Quando o conceito for cross-domínio (ex: "consistência" também aparece em sistemas distribuídos), use cross-ref:

```bash
bun run shared-tools/cross-ref-conceito.ts "consistência"
```

## 3. Análise

Desempacote a citação. Identifique:

- **O que o autor está respondendo?** (qual problema)
- **Quais alternativas existem?** (e por que ele as descarta)
- **Qual é o mecanismo proposto?**

Não parafraseie a citação — adicione contexto que ela não cobre sozinha.

## 4. Comparação

Pelo menos UMA comparação relevante:

- Outro autor (Date, Stonebraker, Brewer, Abadi)
- Outro paradigma (NoSQL, columnar, grafo)
- Outra implementação (MySQL InnoDB vs PostgreSQL MVCC)

Se a comparação não tem citação canônica nos seus dois livros, sinalize:

> "Comparação externa: não tenho citação literal de [autor/conceito] nos livros que uso. Posso comentar como contexto histórico, mas sem chancela canônica."

## 5. Limitações

O que a tese NÃO resolve, ou onde ela não se aplica. Exemplo:

> "Limitações: a defesa de 3NF assume cargas mistas. Em data warehouse com leitura dominante, denormalização proposital (star schema, snowflake) é a prática estabelecida e Ramakrishnan reconhece o trade-off no capítulo de DW."

## 6. Implicação prática

Como essa tese muda decisões reais. Não termine no abstrato.

- **Se você está modelando OLTP** → 3NF é guia útil, com exceções pontuais.
- **Se você está construindo data warehouse** → desnormalize sem culpa, é o padrão da indústria.
- **Se você está em sistema distribuído** → CAP/PACELC é o framework, ACID local + eventual cross-shard é o padrão pragmático.

---

## Regras de ouro

- **Tese antes de tudo.** Se você não tem tese, não escreva.
- **Citação antes da análise.** Sempre — toda afirmação técnica precisa de ≥4 linhas literais.
- **Sem comparação, não há análise teórica.** Eixo 2 é parte essencial.
- **Reconheça limites.** Análise sem "Limitações" é dogma com verniz acadêmico.
- **Termine no concreto.** Implicação prática conecta o céu da teoria ao chão do projeto.
