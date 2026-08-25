---
paths:
  - 'src/modules/financial/adapters/cnab/**/*.ts'
  - 'tests/modules/financial/adapters/cnab/**/*.ts'
verify:
  - claim: 'a instrução 09 (pagamento retido) é constante do emissor, não parâmetro'
    root: 'src/modules/financial/adapters/cnab'
    pattern: "MOVEMENT_INSTRUCTION_BLOCKED = '09'"
    expect:
      - 'src/modules/financial/adapters/cnab/multipag-segments.ts'
  - claim: 'a câmara tem valor explícito para fora das formas de TED — não há default'
    root: 'src/modules/financial/adapters/cnab'
    pattern: "CLEARING_NONE = '000'"
    expect:
      - 'src/modules/financial/adapters/cnab/batch-profile.ts'
  - claim: 'o port do tradutor ainda NÃO modela endereço do favorecido (#858) — corrigir aqui obriga a atualizar esta rule'
    root: 'src/modules/financial/application/ports'
    pattern: 'street'
    expect: []
  - claim: 'o inspetor JÁ acusa não-ASCII — e acusa DEPOIS do NSA consumido, por isso normalizar é de alpha()'
    root: 'src/modules/financial/adapters/cnab'
    pattern: "'non-ascii-character'"
    expect:
      - 'src/modules/financial/adapters/cnab/remittance-inspector.ts'
  - claim: 'a transliteração para ASCII vive só na primitiva — uma segunda cópia no montador é o drift (#862)'
    root: 'src/modules/financial/adapters/cnab'
    pattern: 'TRANSLITERATIONS'
    expect:
      - 'src/modules/financial/adapters/cnab/positional.ts'
---

Emissor e parser do CNAB 240 Multipag Bradesco. É **ACL** ([ADR-0006](../../handbook/architecture/adr/0006-modular-monolith-core-api.md)): recebe dado resolvido, não conhece agregado nem repositório. A norma do banco vive na skill [`cnab240-bradesco`](../skills/cnab240-bradesco/SKILL.md) e o procedimento no agente [homônimo](../agents/cnab240-bradesco.md) — nada dos dois se repete aqui.

**A fonte é o PDF, e a edição importa.** `handbook/guidelines/bradesco_guideline/jun-19-layout-multipag.pdf` — Nº 4008.523.687, **Versão 08, julho/2025**. Localize a página por [`00-indice-campos.md`](../skills/cnab240-bradesco/referencias/00-indice-campos.md), derivado do próprio PDF por `pnpm run cnab:index`. ⚠️ Citação de página vinda de outra edição **não converte por fórmula**: o deslocamento varia por seção (+13 em `G009`, +17 em `G059`), e uma revisão anterior das referências afirmou por semanas páginas de um manual que não é este.

- **Como o banco fala está na [#804](https://github.com/ERP-Bem-Comum/core-api/issues/804), e é a única fonte disso.** É o laudo literal do Validador Universal (21/08/2026), com as seis recusas transcritas — _"Densidade de gravação do arquivo inválida. 01600 ou 06250"_, _"Alinhar a esquerda 033 a 038 e 039 a 052 deixar em branco"_. Nem o PDF nem o código contam o que o validador de fato responde, e **o validador vence os dois**: ele já recusou campo aderente ao layout. Antes de supor o que o banco aceita, leia a #804; depois de submeter um arquivo, **capture a mensagem** — perdê-la transforma o próximo diagnóstico em inferência, que foi o que aconteceu com a recusa de 25/08.

- **Código do Bacen não se cita de memória — consulte, e leia a vigência.** Finalidade da TED (`P011`), moeda, país, canal e meio de pagamento carregam domínio do **SPB**, não do Multipag. A consulta é local e responde em microssegundos: `bun .claude/skills/cnab240-bradesco/dominios/dominio.ts <tipo> <dominio>` (modos e proveniência na skill §"Tabela de Domínio do SPB"). ⚠️ **43% dos 9.474 domínios já foram desativados**, e há código que só entra em produção adiante — um código extinto produz arquivo bem formado que o banco recusa, e o `remittance-inspector.ts` **não pega**, porque não é defeito de forma. Só `vig: "vigente"` vai num arquivo. E nada dessa tabela é posição do manual Bradesco: tratá-la como layout repete o erro de propagar tabela de um universo para outro.

- **Parâmetro opcional é o defeito, não a solução — e já custou cinco vezes.** A forma de lançamento saiu de parâmetro para derivada do conteúdo (#711); a câmara, da forma (#751); o `yourNumber`, do NSA (#752); a finalidade da TED, do lote (#813). Enquanto havia uma rota só, quem chamava e quem pagava concordavam por acidente; com formas mistas, um parâmetro de entrada vira **uma afirmação que o conteúdo do arquivo pode contradizer**. Antes de aceitar um campo novo na borda, pergunte de onde o chamador tiraria o valor: se a resposta for "do que ele já passou", o campo é derivado.

  ⚠️ O quinto caso é pior e está aberto: `address?: PayeeAddress` (`multipag-segments.ts:107`) não produz valor errado — produz **silêncio**. O port não modela endereço, ninguém tem o que passar, e `?? ''` vira branco em 100% das remessas ([#858](https://github.com/ERP-Bem-Comum/core-api/issues/858)). O opcional foi a peça que deixou as duas metades concordarem sobre um arquivo incompleto: o adapter compila perfeitamente sem o dado que o layout exige.

- **`09` na instrução e `000` na câmara são decisões, não descuidos.** A instrução (`016-017`) fixa pagamento retido para liberação master no Net Empresa — quem monta a remessa não é quem autoriza o pagamento (P.O., #804/#805), e vale para Segmento A **e** J: até 24/08 o boleto saía com `00` e contornava a checagem que a transferência exige. A câmara sai `000` fora das formas de TED, crédito em conta inclusive, porque um default só acerta uma modalidade e a que ele erra o banco recusa. As duas parecem hardcode a corrigir, e reverter qualquer uma abre porta que já foi fechada.

- **Não conte caracteres dentro de corrida homogênea para afirmar deslocamento.** Um bloco de zeros ou brancos não tem marco: contar posição dentro dele produz laudo confiante e falso. Foi assim que os 83 zeros das posições `128-210` do Segmento B — que são o layout não-Pix correto (vencimento 8 + valor 15 + abatimento 15 + desconto 15 + mora 15 + multa 15) — viraram diagnóstico de "offset de 10 posições" numa análise que ninguém conseguiu refutar de cabeça. **A testemunha honesta é a borda**: onde a classe de caractere muda, e o que o layout diz que muda ali. Toda afirmação de deslocamento cita as duas.

- **`remittance-inspector.ts` valida FORMA, e a lista do que ele não vê é curta o bastante para caber aqui.** Ele cobre comprimento, sequência, par A+B, os quatro totalizadores **e — desde a mesma mudança que escreveu esta rule — ASCII e caixa alta**, acumulando todos os defeitos numa passada. Fora do alcance dele: **campo Alfa preenchido com zeros**, **DV de CPF/CNPJ**, e o **endereço do Segmento B** (#858). Um arquivo que ele aprova pode ser recusado por qualquer um desses — e "zero defeitos" no inspetor nunca significou "o pagamento está correto", só "o banco não recusa por forma".

  ⚠️ **A checagem de ASCII acende TARDE, e essa é a parte que o código não conta.** `generate-remittance.ts` consome o NSA sob lock **antes** de mandar montar o arquivo, e o número não volta por desenho — gap na sequência é inofensivo, reusar número é retransmissão aos olhos do banco. Então um caractere não-ASCII vindo do cadastro não vira aviso: vira `cnab-malformed-file` **com um NSA já queimado**, e a mensagem ao operador não aponta campo nenhum. **A consequência para quem escreve campo novo:** normalizar é responsabilidade de `alpha()`, na ENTRADA — o inspetor é a rede de segurança contra regressão, nunca o lugar onde o dado sujo é tratado. Foi assim que `º ª – ½` viveram meses atravessando `alpha()` inteiros ([#862](https://github.com/ERP-Bem-Comum/core-api/issues/862)): `normalize('NFD')` decompõe letra + diacrítico **combinante**, e eles são caracteres próprios, sem decomposição canônica. Dizer "o `alpha` tira acento" é a descrição que deixou o defeito passar; o invariante é **todo caractere fora de `\x20-\x7E`**.

- **Não existe `.REM` de referência que o banco tenha aceitado.** Não há base de diff, e procurar uma custa tempo. Também não há ambiente de homologação para remessa de pagamento: a única conexão é produção, no convênio real, onde arquivo de teste vira pagamento de verdade ([ADR-0061](../../handbook/architecture/adr/0061-van-bucket-contract-supersedes-0060-pendencies.md)). Validar a forma é o mais longe que se vai sem mover dinheiro — **nunca transmita para "testar"**.

- ⚠️ **Fixture de CNAB não recebe dado real de cadastro.** Convênio, agência, conta, CPF, CNPJ, endereço de parceiro. Os repositórios são **públicos**, e fixture é o caminho por onde esse dado entra — um convênio copiado de arquivo recebido do banco já viveu aqui em 16 ocorrências. `tests/cleanup/bank-fixture-masking.test.ts` barra o convênio (reservados `000000` e `999999`); **o resto depende de julgamento**. E o valor não vai na mensagem de commit, no assert nem na issue — explicar a correção citando o dado a repete.

Layout, domínios e a tabela G059: [`referencias/`](../skills/cnab240-bradesco/referencias/) da skill. Máquina de estados da remessa e elegibilidade do título: [`financial-module.md`](./financial-module.md) + [ADR-0065](../../handbook/architecture/adr/0065-remittance-responsibility-boundary-supersedes-0060-0061-transmitted.md). O transporte à VAN não vive neste repositório.
