---
inquiry: 0033
title: "O que o Bradesco realmente exige — bisseção de 18 remessas contra o Validador Universal"
state: decided
opened: 2026-08-25
last_reviewed: 2026-08-25
---

# Inquiry-0033: O que o Bradesco realmente exige — bisseção de 18 remessas contra o Validador Universal

- **Status:** Decided
- **Opened:** 2026-08-25
- **Closed/Decided:** 2026-08-25
- **Opened by:** Gabriel (sessão assistida, worktree `fix-862`)
- **Asked to:** **Validador Universal do Bradesco** — 18 submissões em 25/08/2026
- **Impact:** `.claude/rules/cnab.md` · `batch-profile.ts` (CA2) · issues #812, #817, #815, #858

---

## 1. Contexto

Até 24/08/2026 o repositório operava sob duas afirmações que se sustentavam mutuamente e
**nenhuma das duas era verificável**:

1. A tabela de layout do manual marca obrigatoriedade por asterisco no código do campo. Campo
   sem asterisco foi tratado como opcional.
2. `.claude/rules/cnab.md` registrava, literalmente: _"Não existe `.REM` de referência que o
   banco tenha aceitado. Não há base de diff."_

A consequência é que toda recusa virava inferência. A rule já nomeava o custo disso — _"perdê-la
transforma o próximo diagnóstico em inferência, que foi o que aconteceu com a recusa de 25/08"_.

O que mudou o cenário foi o Gabriel ter em mãos, simultaneamente:

- um arquivo **aceito** pelo validador (`PAG-GOLDEN_TESTE_AJUSTADO.REM`);
- o arquivo **recusado** que o originou;
- um pacote de 9 cenários de bisseção já submetidos, **com os relatórios de recusa**.

Pela primeira vez existia base de diff. A investigação partiu daí.

---

## 2. Pergunta(s) feita(s)

```
Qual é a receita exata de um arquivo CNAB 240 Multipag que o Bradesco aceita —
provada pelos binários, não inferida do manual?
```

E as decorrentes, que definem o custo da resposta:

- Quais campos o **validador** exige que o **layout** não marca como obrigatórios?
- Quais hipóteses de recusa que o time carregava são **falsas**?
- Das exigências reais, quais o gerador já atende e quais exigem mudança — e de que tamanho?

---

## 3. Diário de bordo — 25/08/2026

### 03:24–03:37 — Inventário e desduplicação

Três artefatos entregues; **dois eram o mesmo arquivo** (SHA-256 idêntico do zip). Restaram o
pacote de bisseção (9 `.REM` + `PROTOCOLO.md` + `MANIFESTO.md` + `gerar_cenarios.py`), o golden
aceito e o arquivo recusado.

### 03:40–06:52 — Análise forense em paralelo

Dois agentes `cnab240-bradesco`, escopos disjuntos: um fatiando os binários campo a campo contra
o PDF (Versão 08, julho/2025), outro confrontando o resultado com
`src/modules/financial/adapters/cnab/`.

Achados que reorientaram tudo:

- **O golden não deriva do melhor cenário da bisseção.** Ele tem o mesmo header do arquivo
  recusado — NSA e hora inclusive. Foi **editado por cima** dele, com 5 grupos de diferença. O
  par recusado→aceito era um diff direto, e ninguém tinha percebido.
- **Duas das 5 correções do golden não tinham crítica associada** (nome da empresa no header de
  lote; endereço do cedente). São correções de qualidade, **não requisitos de aceitação** — e
  seriam facilmente promovidas a lenda de "campo que o banco exige".
- **`remittance-inspector.ts` aprova, com zero defeitos, o arquivo que o banco recusou.** Das 5
  críticas reais, ele pega zero. Não é falha: ele valida forma, e as cinco são conteúdo.
- **Três das cinco críticas não têm código G059.** Varridos os 136 códigos das pp.106-115. O
  relatório do validador vem em prosa porque **não existe código para elas na tabela**.
- ⚠️ **`referencias/02-layout-registros.md:125` da skill listava `P005` (218-219) como campo
  obrigatório.** Esse campo foi **excluído do manual** com a descontinuidade do DOC
  (fev/2024); a posição hoje é `G004`/CNAB, default brancos. **Foi essa linha que induziu o
  script de bisseção a escrever `07` ali** — e cada cenário que o fez levou 2 críticas. Oito
  das críticas do experimento foram causadas por uma referência desatualizada **nossa**.

### 06:48 — Correção de premissa: só 3 das 5 críticas eram do gerador

O baseline `v00` **é** o output do nosso gerador. As críticas de 218-219 e do trailer de moeda só
aparecem em arquivos que o script Python modificou. **O gerador já estava certo nesses dois
pontos.**

### 06:52 — Placar do backlog antes de propor

Nenhum dos três defeitos reais era inédito: **#812** (nominais do Segmento B) e **#817**
(tipo de conta) já os rastreavam, ambas descobertas pela mesma recusa. Nada a criar.

### 04:01–04:19 (26/08, madrugada) — Rodada 1: 11 arquivos gerados

Gerador próprio em Bun, por patch posicional sobre o golden, com **todos** os derivados
reescritos (lote, sequencial, `Seu Número`, os quatro totalizadores). Corrigiu de propósito o
defeito do script Python, que totalizava por arquivo e não por lote.

### Rodada 1 — resultado

| Cenário | Testava | Veredito |
| :--- | :--- | :--- |
| controle (golden, NSA novo) | a receita | ✅ aceito |
| 3 pagamentos / 1 pagamento | sequencial e totais | ✅ aceitos |
| `PP` em 225-226 | poupança na forma TED | ✅ **aceito** |
| vencimento ≠ data de pagamento | 128-135 exige igualdade? | ✅ aceito |
| 218-219 = `00` | "brancos" é literal? | ✅ **aceito** — previsão de recusa refutada |
| valor nominal ≠ valor pago | 136-150 exige igualdade? | ❌ **recusado** |
| forma `01`, 225-226 branco | P013 vale fora de TED? | ❌ recusado (220-224) |
| forma `01`, 225-226 = `CC` | idem, preenchido | ❌ recusado (220-224 **e** 225-226) |
| endereço no Segmento B | preencher quebra? | ⚠️ **site travou** |
| multi-lote `41`+`01` | envelope duplo | ⚠️ **site travou** |

### Rodada 2 — 7 arquivos, bisseção do que sobrou

Todos os pares foram desenhados para isolar uma metade do que travou.

| Cenário | Isolava | Veredito |
| :--- | :--- | :--- |
| forma `01` com 220-224 **e** 225-226 em brancos | a regra de crédito em conta | ✅ **aceito** |
| endereço com CEP real vs. só logradouro | qual parte travou o site | ✅ **ambos aceitos** |
| multi-lote `41`+`41` vs. `41`+`01` corrigido | multi-lote em si | ✅ **ambos aceitos** |
| desconto com nominal == pago | desconto é o problema? | ✅ aceito |
| vencimento posterior ao pagamento | fecha 128-135 nos dois sentidos | ✅ aceito |

**7 de 7.** Placar final: **18 arquivos submetidos, 13 aceitos.**

---

## 4. Análise interna

### 4.1 A receita — provada, não inferida

Correlação perfeita, sem contraexemplo em 18 submissões.

| Campo | TED (`41`) | Crédito em conta (`01`) |
| :--- | :--- | :--- |
| A 220-224 `P011` | finalidade (`00005`) | **brancos** — zeros é recusa |
| A 225-226 `P013` | `CC` **ou** `PP` | **brancos** — preenchido é recusa |
| A 018-020 `P001` câmara | `018` | `000` |

| Campo | Regra em ambas as formas |
| :--- | :--- |
| A 218-219 | brancos **ou** zeros; só código do domínio DOC recusa |
| A 105-119 `G041` / trailer 042-059 `G058` | zeros |
| B 128-135 `G044` | data válida `DDMMAAAA` — anterior **ou** posterior ao pagamento |
| B 136-150 `G042` | **exatamente igual** a A 120-134 |
| B 166-180 `G046` desconto | livre, informativo |
| B 033-127 endereço | opcional — vazio e preenchido aceitos |
| multi-lote, formas mistas | aceito |

### 4.2 Hipóteses refutadas — o que o time carregava e é falso

| Hipótese | Como morreu |
| :--- | :--- |
| Endereço do favorecido causava a recusa (a "aposta principal" do protocolo) | preenchê-lo não mudou **nada**; o arquivo **aceito** o tem vazio |
| Instrução `09` era suspeita | trocar por `00` não mudou nada — o invariante #804/#805 está a salvo |
| Finalidade da TED `00005` era suspeita | `00007` produziu resultado idêntico |
| DV das agências (a "contradição G009 × G059") | vazio em 3 cenários, **nunca criticado** — o cenário que testaria isso nunca precisou existir |
| Quantidade de moeda zerada era defeito | preenchê-la **acrescentou** crítica; zeros é a norma |
| 218-219 exige brancos | `00` foi aceito; só código DOC recusa |

### 4.3 Divergências entre fontes — o achado de maior valor

| # | Divergência | Quem vence |
| :--- | :--- | :--- |
| D1 | `G058` (p.105) manda **somar** a quantidade de moedas; o validador exige **zeros**. `G059 'AQ'` (p.107) agrava, chamando moeda zerada de inválida | validador |
| D2 | 225-226 (`P013`), 128-135 (`G044`) e 136-150 (`G042`) aparecem no layout **sem asterisco** e sem código G059 dedicado — e são crítica de recusa | validador |
| D3 | `P005` (218-219) foi **excluído do manual** em fev/2024, mas a referência da skill ainda o listava como obrigatório | manual |
| D4 | Endereço do Segmento B tem 5 códigos G059 dedicados (`AU`–`AY`) e o validador **não usou nenhum** | validador |
| D5 | `CF` (p.110) descreve o valor do documento só no Segmento J; a crítica veio no B | — (cosmético) |

**A leitura defensiva que fica:** campo sem asterisco **e** sem código G059 é território não
mapeado, não território livre.

### 4.4 Dois bugs do Validador Universal

Descobertos por eliminação, e ambos **escondem defeito real**:

1. **CEP inexistente trava o validador.** O cenário com CEP inventado travou; os com CEP real e
   com CEP zerado passaram.
2. **Crítica em lote secundário trava o validador.** Ele sabe criticar forma `01` em lote único
   (provou duas vezes), mas o multi-lote com crítica no lote 2 travou — enquanto multi-lote sem
   crítica passou.

⚠️ **"Quebrou" nunca significa "arquivo válido".**

### 4.5 Alternativas avaliadas para `P013` (225-226)

| Alternativa | Prós | Contras | Veredito |
| :--- | :--- | :--- | :--- |
| Derivar do tipo de conta real do favorecido | correto por construção | o dado **não existe** em nenhuma das 4 tabelas de `partners`; exige migration, ETL, evento e backfill | ✅ alvo final (#817) |
| Constante `'CC'` do emissor, derivada da forma | destrava a emissão hoje; molde de `tedPurposeFor` | afirma conta corrente sobre conta alheia | ⚠️ **decisão da P.O., não técnica** — é a saída "não bloquear" que a #817 já submete |
| Aceitar como parâmetro do adapter | flexível | reabre o caminho do default silencioso pela **sexta** vez (#711/#751/#752/#813/#858) | ❌ rejeitada |

O experimento **removeu o risco técnico** da primeira: `PP` foi aceito. O que falta é o dado.

---

## 5. Decisão final

**A receita da §4.1 é a norma vigente**, com precedência sobre o PDF e sobre a tabela G059 onde
divergirem — hierarquia que a skill `cnab240-bradesco` já declarava e que agora tem 18 medições.

Três decisões diretas:

1. **A CA2 de `batch-profile.ts:112-118` está respondida.** O comentário pedia literalmente
   _dois arquivos de crédito em conta, um com 220-224 em branco e outro preenchido_. Foram
   submetidos: preenchido (zeros) → recusado; branco → aceito. **`tedPurposeFor` retornando
   `null` fora de TED estava certo.** Deixa de ser empate não decidido e passa a ser regra com
   fonte.
2. **`P013` (225-226) deriva da forma do lote**, irmão gêmeo de `tedPurposeFor`, com a mesma
   semântica de `null` = "esta rota não tem o campo". Em TED é obrigatório; fora de TED é
   **proibido**.
3. **Os nominais do Segmento B são derivação pura** de `A 094-101` e `A 120-134`, dentro de
   `paymentRecords`. Não entram como parâmetro.

**Escopo desta inquiry encerra aqui.** A implementação é das issues abaixo.

---

## 6. Saídas (outputs concretos)

- [ ] `.claude/rules/cnab.md` — a afirmação _"Não existe `.REM` de referência que o banco tenha
      aceitado"_ ficou falsa; existem 13. Registrar a receita da §4.1 e os dois bugs do validador.
- [ ] `batch-profile.ts:112-118` — remover o ⚠️ CA2 e citar esta inquiry como fonte.
- [ ] `referencias/02-layout-registros.md:125` — remover o `P005` fantasma; marcar `P013` como
      crítico (D3).
- [ ] **#812** — corrigir o parágrafo que atribui a obrigatoriedade à "coluna Obrigatório da p.25",
      que não existe. É divergência PDF × validador, e descrevê-la como norma do manual apaga o
      achado.
- [ ] **#817** — anexar o resultado: `PP` aceito, `CC` aceito, e fora de TED **proibido**. O risco
      técnico caiu; resta a decisão da P.O. e o dado.
- [ ] **#858** — endereço sai do caminho crítico da emissão. Não fecha a issue (mede uma
      submissão, numa forma, num convênio), mas deixa de bloquear.
- [ ] `remittance-inspector.ts` — estender com as checagens desta inquiry, na mesma mudança que
      passar a preencher os campos.
- [ ] Issue nova: `AO`/`AQ`/`AR` (nome do favorecido vazio, moeda vazia, valor zerado) — estrutura
      pura, sem dado faltando, sem cobertura hoje.

---

## 7. Referências

- **#804** — laudo do Validador Universal de 21/08/2026, a fonte anterior de "como o banco fala".
- **#812**, **#815**, **#817**, **#858**, **#863** — issues tocadas por esta investigação.
- Manual Multipag Nº 4008.523.687, **Versão 08, julho/2025** — pp. 15, 16, 23, 24, 25, 29,
  103-105, 107-113, 133, 139. Fonte de acesso restrito
  (`handbook/guidelines/`, no `.gitignore`): **citada por âncora, nunca transcrita**.
- Binários, relatórios do validador e o gerador em Bun: fora do repositório, por carregarem dado
  de cadastro. Os repositórios são públicos.

⚠️ **Nenhum dado de cadastro aparece neste documento** — convênio, agência, conta, CNPJ, CPF e
nomes de parceiro foram deliberadamente omitidos, inclusive dos nomes de arquivo citados.
