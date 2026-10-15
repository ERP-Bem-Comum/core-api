[← Voltar para ADRs](./README.md)

# ADR-0075: A transmissão da VAN foi exercitada e está em produção nas quatro formas — supersede parcial do ADR-0061 (estado da integração e pendência 2)

- **Status:** Accepted
- **Date:** 2026-10-14
- **Deciders:** Alessandra Castro (P.O.) — confirmação do estado em produção (06/09 e 14/10/2026) · Gabriel Aderaldo (Tech Lead) — registro da divergência e reescrita da regra operacional
- **Supersedes (parcial):** [ADR-0061](./0061-van-bucket-contract-supersedes-0060-pendencies.md) — §"Estado da integração em 2026-08-10" (`:23-27`), em que *"a transmissão nunca foi exercitada"*, e a **pendência 2** (`:137`), *"caixa/ambiente de homologação para pagamento"*. **Todo o contrato do bucket permanece vigente e inalterado** — os cinco prefixos, o `status/` como única janela, a caixa compartilhada por convênio, a idempotência do lado do agente e a credencial por role são premissa deste ADR.
- **Relacionado:** [ADR-0060](./0060-van-transport-via-s3-bucket-supersedes-0008-relay.md) (rota por bucket, vigente) · [ADR-0065](./0065-remittance-responsibility-boundary-supersedes-0060-0061-transmitted.md) (a responsabilidade termina no bucket; `Pago` manual) · [ADR-0066](./0066-semver-product-version-and-generated-changelog.md) (a cerimônia de validação roda em produção)
- **Insumo:** confirmação da P.O. em 06/09/2026, registrada na [#993](https://github.com/ERP-Bem-Comum/core-api/issues/993) · comentário de fechamento da [#938](https://github.com/ERP-Bem-Comum/core-api/issues/938) (12/10/2026) · mapa das formas no comentário da P.O. na [#948](https://github.com/ERP-Bem-Comum/core-api/issues/948) (05/09/2026) · laudo escrito da equipe Multipag PIX/VAN do Bradesco (05/09/2026), versionado na [inquiry-0037](../../inquiries/0037-laudo-multipag-pix-e-validador-cego.md) · confirmação da P.O. sobre o Pix em produção (14/10/2026)

---

## Contexto

O [ADR-0061](./0061-van-bucket-contract-supersedes-0060-pendencies.md) registrou, em 10/08/2026, que a conexão com o banco estava validada **apenas na recepção**, e marcou com destaque: *"a transmissão nunca foi exercitada [...] um arquivo de remessa enviado para teste vira pagamento de verdade"*. Era verdade naquela data. A pendência 2 do mesmo documento declarava que, sem caixa de homologação, a transmissão não podia ser exercitada sem virar pagamento real.

Em **06/09/2026** o primeiro pagamento real saiu e foi lido pelo banco. Nenhum dos dois textos foi revisitado por cinco semanas.

O custo disso não é hipotético e não é de documentação. As duas afirmações vivem em lugares **normativos** — uma num ADR com status `Accepted`, outra na rule `.claude/rules/cnab.md`, que entra em contexto automaticamente em toda sessão que toca o módulo. A [#993](https://github.com/ERP-Bem-Comum/core-api/issues/993) registrou a consequência medida: *"um agente que leia `rules/cnab.md` hoje recusa executar ou planejar transmissão, e argumenta contra quem pedir, citando uma regra do repositório"*. Ocorreu ao menos duas vezes, em 06/09 e em 14/10/2026, nas duas com a P.O. do outro lado da conversa.

É o modo de falha que o `handbook/` já produziu — *"onze artefatos passaram meses afirmando um layout de arquivo bancário que o banco recusa"* —, agora na direção oposta: em vez de autorizar o errado, **proíbe o certo**.

A causa-raiz é estrutural e não está no texto: **nada no repositório liga "marco atingido" ao documento que o descrevia como pendente.** Há evento para decidir (ADR), para descobrir (issue) e para entregar (commit). Não há nenhum para registrar que algo deixou de ser verdade — e é a única transição sem incentivo, porque não produz entrega.

---

## Decisão

### 1. Estado vigente: a transmissão está em produção, nas quatro formas

| Forma de pagamento | Forma do arquivo | Transmissão em produção | Fonte |
| :--- | :--- | :--- | :--- |
| TED | validada | ✅ desde **06/09/2026** | P.O., #993 · #938 |
| Transferência (crédito em conta) | validada | ✅ desde **06/09/2026** | P.O., #993 · #938 |
| Boleto (linha digitável) | validada | ✅ desde **06/09/2026** | P.O., #993 · #938 |
| Pix por chave | **arbitrada por laudo escrito do banco** (05/09/2026) | ✅ em operação contínua | P.O., 14/10/2026 |

Os arquivos são gerados pelo sistema, transmitidos pela VAN e **lidos corretamente pelo banco do cedente**, com o crédito conferido pelo cliente.

⚠️ **O desbloqueio do Pix foi ação do banco, não mudança nossa.** Os PRs [#981](https://github.com/ERP-Bem-Comum/core-api/pull/981), [#982](https://github.com/ERP-Bem-Comum/core-api/pull/982) e [#1004](https://github.com/ERP-Bem-Comum/core-api/pull/1004) são *consequência* do laudo de 05/09 — e em boa parte **remoções** de exigência (o ISPB passa a constante, o emissor deixa de exigir bloco bancário do favorecido, a recusa `payee-ispb-unknown` desaparece). O que destravou a operação foi o banco habilitá-la para o cliente. Isso tem peso técnico próprio: **o estado funcional de hoje depende de habilitação de terceiro que não controlamos nem sabemos reproduzir sozinhos.**

### 2. A proibição não cai — muda de razão

O que caducou é *"nunca houve transmissão"*. O que a regra protege continua inteiro, e passa a ser enunciado pelo que de fato é:

**Continua valendo, e não é negociável:**

- **Gravar objeto no prefixo de saída é enfileirar pagamento** ([ADR-0060](./0060-van-transport-via-s3-bucket-supersedes-0008-relay.md)). Não existe depósito de ensaio no bucket de produção: `sandbox/` só existe em homologação, e escrever no lugar errado exige trocar o **nome do bucket**, não o prefixo.
- **Quem transmite é o cliente, sobre título real, por decisão da P.O.** Nenhum agente, humano ou automático, aciona transmissão por iniciativa própria para verificar comportamento. A validação em produção é **cerimônia conduzida**, com acompanhamento e conferência — não um teste.
- **`Pago` segue manual** ([ADR-0065](./0065-remittance-responsibility-boundary-supersedes-0060-0061-transmitted.md), [#59](https://github.com/ERP-Bem-Comum/core-api/issues/59)), por decisão de produto de 24/08. Não há alarme automático: a detecção de uma falha de transmissão depende de conferência humana no portal da instituição.

**Deixou de valer:**

- A transmissão como marco pendente.
- *"Não há ambiente de homologação"* usado como razão para não transmitir. A razão correta para não transmitir por conta própria é a da primeira alínea — o arquivo **é** pagamento —, e ela não depende da existência de homologação.

### 3. A pendência 2 está respondida por duas vias, e as duas têm teto declarado

**(a) A simulação em laboratório** foi promovida a caixa de homologação por decisão registrada no épico [#756](https://github.com/ERP-Bem-Comum/core-api/issues/756): *"a decisão de validar no x99 é a resposta a essa pendência — a simulação vira a caixa de homologação que o banco não deu"*.

⚠️ **Teto, escrito no mesmo épico:** *"o cliente STCP usado na simulação é modelo nosso, não o binário do banco. Enquanto não tocarmos a instalação real, a fidelidade do simulador é o teto da confiança de tudo que afirmarmos."* E: *"isso prova o lado da recepção; transmissão pode validar diferente."*

**(b) O laudo escrito do banco** arbitra a **forma** do arquivo. Para o Pix, a equipe Multipag PIX/VAN respondeu em 05/09/2026 que o arquivo submetido *"não necessita de ajustes em sua estrutura, estando apto para transmissão"*, confirmando seis pontos de layout de uma vez.

⚠️ **Teto:** laudo é parecer sobre bytes. Ele não diz nada sobre o transporte, a instalação ou a infraestrutura — e um parecer favorável sobre a forma conviveu, no mesmo período, com uma operação que ainda não havia sido transmitida.

**Nenhuma das duas vias substitui o exercício em produção**, e é por isso que a validação foi conduzida pelo cliente, com título real. A pendência está respondida no sentido de que **existe caminho de verificação**, não no sentido de que exista ambiente equivalente ao de produção.

### 4. O que falta exercitar

**As demais contas-cedente cadastradas.** O piloto exercitou a conta em uso em produção; as outras nunca emitiram arquivo real. É a única frente de **transmissão** ainda não exercitada — distinta da confirmação que segue pendente com o banco sobre CNPJ alfanumérico ([#863](https://github.com/ERP-Bem-Comum/core-api/issues/863)), listada em §"O que continua em aberto".

### 5. Afirmação sobre estado operacional carrega data e fonte — ou não é afirmação

Este repositório **registra** o estado da operação; não o **mede**. Não há sonda, não há `/health` que responda pela VAN, e a transmissão acontece fora da nossa fronteira de observação.

Logo, toda afirmação sobre o que a VAN faz ou não faz hoje, em artefato normativo deste repositório — ADR, rule, skill —, **MUST** trazer **data** e **fonte nomeada**. Sem as duas, é lembrança apresentada como norma, que é exatamente o defeito que este ADR corrige.

É a única mitigação honesta disponível: não impede o texto de envelhecer, mas faz o envelhecimento **visível** a quem o lê, em vez de invisível.

---

## Consequências

### Positivas

- O agente que lê a rule encontra o estado vigente e para de recusar operação legítima.
- A proibição fica enunciada pela razão que a sustenta — o arquivo é pagamento —, que não caduca com o avanço da integração.
- Os dois tetos de verificação (simulador modelo, laudo sobre forma) ficam registrados onde são lidos por quem decide, em vez de viverem num épico fechado.
- A exigência de data e fonte dá à próxima divergência um sinal de idade legível, sem depender de alguém se lembrar de revisitar o texto.

### Negativas

- **Este ADR também vai envelhecer.** Ele descreve estado operacional, que é a classe de afirmação que o [ADR-0058](./0058-runtime-tracks-recommended-lts.md) já identificou como a que *"envelhece sozinha"*. A mitigação é a data e a fonte nomeadas, não a expectativa de que alguém o revisite.
- **A regra reescrita exige mais julgamento do que a anterior.** *"Nunca transmita"* é aplicável por qualquer leitor; *"quem transmite é o cliente, sobre título real, por decisão da P.O."* obriga a identificar quem autoriza. Troca-se facilidade de aplicação por correção.
- A divergência de autoria registrada no `ADR-0061:10` (`Deciders`) e `:19` (§Contexto) **não é tocada aqui** — está fora do escopo da #993 e exige registro próprio.

### Neutras

- Nenhum byte de arquivo de remessa muda. O emissor, o inspetor e o tradutor não são tocados.

---

## O que continua em aberto

1. **As demais contas-cedente** — única frente de validação em produção ainda não exercitada.
2. **Gate mecânico sobre a prosa.** O CA5 da [#993](https://github.com/ERP-Bem-Comum/core-api/issues/993) admite que pode não ser automatizável. Este ADR entra com `tests/cleanup/van-transmission-state-current.test.ts`, que verifica a **ausência** das três frases caducadas nos **quatro** artefatos que decidem sobre transmissão — a rule, o agente homônimo, o inspetor e o tradutor. Dois limites declarados: ele prende a **letra**, não o sentido (reescrita com outras palavras passa); e **a norma do §5 não é gateada** — nada verifica que toda afirmação de estado operacional traga data e fonte. O molde reutilizável já existe no repositório (`tests/cleanup/inventory-counts.test.ts` varre `.claude/rules/*.md` com janela de proximidade, separando registro datado de afirmação no presente); estendê-lo a rules, skills, agentes e ADRs é trabalho próprio, não deste ADR.

   ⚠️ **A primeira versão deste gate varria só a rule** — o arquivo que havia sido consertado — e ficava verde com o agente, o inspetor e o tradutor ainda negando a transmissão. Régua certa não se propaga sozinha: existe num lugar e falta em N, e o grep que fecha a questão é o que volta **vazio** sobre o acervo inteiro.
3. **A pergunta do CNPJ alfanumérico** ao banco ([#863](https://github.com/ERP-Bem-Comum/core-api/issues/863)) — o código já tem o guarda; a confirmação do banco não chegou.

---

## Referências

- [ADR-0061](./0061-van-bucket-contract-supersedes-0060-pendencies.md) — contrato do bucket, vigente; estado da integração e pendência 2 superseded aqui.
- [ADR-0065](./0065-remittance-responsibility-boundary-supersedes-0060-0061-transmitted.md) — fronteira da responsabilidade; `Pago` manual.
- [inquiry-0037](../../inquiries/0037-laudo-multipag-pix-e-validador-cego.md) — laudo do banco e o `.REM` aprovado.
- [#993](https://github.com/ERP-Bem-Comum/core-api/issues/993) — o registro da divergência que este ADR fecha.
- [#756](https://github.com/ERP-Bem-Comum/core-api/issues/756) — épico do piloto; decisão de validar na simulação e o teto dela.
- `.claude/rules/cnab.md` — a rule atualizada por este ADR.
