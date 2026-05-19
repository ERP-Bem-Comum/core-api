# 🧩 Bounded Context: Aditivos e Alterações

## 1. Papel do Contexto no Mapa
Este é um **Core Domain ⭐**. Sua função é isolar a complexidade das regras de alteração contratual. Enquanto o contexto de *Gestão de Contratos* mantém o estado atual, este contexto gerencia o "voto de mudança". Ele garante que um aditivo só impacte o financeiro após a anexação do documento assinado e a homologação formal.

## 2. Atores
* **Gestor**: Cria a proposta de aditivo, anexa o arquivo assinado e executa a homologação.
* **Operador**: Consulta o histórico de aditivos pendentes ou assinados.

## 3. Agregados e Entidades
```ts
interface Aditivo {
  id: AditivoID;
  contratoId: ContratoID; // Referência ao Contrato Mãe
  tipo: TipoAditivo;
  status: StatusAditivo; // Pendente, Homologado

  // Dados da Alteração
  valorImpacto: Moeda; // Positivo (Acréscimo) ou Negativo (Supressão)
  novaDataFim: Date | null; // Preenchido apenas se tipo for Prazo
  descricaoAlteracao: string;

  // Comprovação
  arquivoAssinadoRef: ArquivoID | null;
  dataHomologacao: Date | null;
}
```

> **Raciocínio**: O Aditivo é uma entidade independente que "aponta" para um contrato. Ele carrega consigo a intenção da mudança e a prova documental.

## 4. Value Objects e Enums

* **TipoAditivo**:
  * `Acrescimo`: Aumenta o valor financeiro.
  * `Supressao`: Reduz o valor financeiro.
  * `Prazo`: Altera a vigência temporal.
  * `Variado`: Alterações textuais/cláusulas (sem impacto financeiro ou prazo).
* **StatusAditivo**: `Pendente` (criado mas sem documento/homologação), `Homologado` (formalizado e aplicado).

## 5. Comandos / Casos de Uso Principais

### Registrar Intenção de Aditivo
* **Quem chama**: Gestor.
* **Pré-condições**: Contrato alvo deve estar com status `Vigente`.
* **Efeitos**: Cria o registro com status `Pendente`.
* **Evento publicado**: `AditivoRegistrado`.

### Anexar Documento Assinado
* **Quem chama**: Gestor.
* **Pré-condições**: Aditivo deve existir e estar `Pendente`.
* **Efeitos**: Vincula a referência do arquivo ao aditivo.
* **Evento publicado**: `DocumentoAditivoAnexado`.

### Homologar Aditivo
* **Quem chama**: Gestor.
* **Pré-condições**: Documento assinado deve estar presente.
* **Efeitos**:
  1. Muda status para `Homologado`.
  2. Registra data da homologação.
* **Evento publicado**: `AditivoHomologado` (Este evento dispara o cálculo no contexto de Gestão de Contratos).

## 6. Eventos de Domínio

| Evento | Gatilho | Descrição |
| :---- | :---- | :---- |
| AditivoRegistrado | Criação do aditivo no sistema | Indica que uma alteração está em negociação ou preparo. |
| AditivoHomologado | Clique no botão "Homologar" com documento presente | É o gatilho principal para atualizar o saldo do contrato. |

## 7. Invariantes e Regras de Negócio

* **R1 (Bloqueio de Cálculo)**: Um aditivo com status `Pendente` **nunca** deve somar ou subtrair do valor vigente do contrato.
* **R2 (Obrigatoriedade de Arquivo)**: É impossível homologar um aditivo sem que o `arquivoAssinadoRef` esteja preenchido.
* **R3 (Integridade de Tipo)**: Se o tipo for `Acrescimo`, o `valorImpacto` deve ser obrigatoriamente positivo. Se `Supressao`, obrigatoriamente negativo.
* **R4 (Cronologia)**: Não se pode homologar um aditivo com data retroativa ao início do Contrato Mãe.

## 8. Fluxo Exemplar ("Filminho")

O Gestor percebe que o contrato `2024-001` precisa de mais R$ 50.000,00. Ele cria um aditivo de **Acréscimo**. O sistema salva como `Pendente` e o valor do contrato continua o original. O Gestor faz o upload do PDF assinado e clica em **Homologar**. Nesse instante, o sistema dispara um evento, o valor do contrato é atualizado para o novo montante e a Timeline registra a subida do arquivo e a mudança de valor.

## 9. Glossário Específico

* **Supressão**: Ato formal de reduzir o valor total do contrato (ex: redução de escopo).
* **Homologação**: Ato administrativo no sistema que valida o aditivo e torna seus efeitos financeiros reais.
