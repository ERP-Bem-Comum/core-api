# 🧪 Especificação de Testes BDD (Backend) - Módulo de Contratos V2

Este documento descreve os cenários de teste baseados em comportamento (BDD) com foco exclusivo na lógica de backend, integridade de dados e core do domínio.

---

## 1. Bounded Context: Gestão de Contratos (Core)

**Objetivo:** Validar o motor de cálculo e a imutabilidade do "Contrato Mãe".

### Funcionalidade: Persistência e Numeração

**Cenário: Geração automática de identificador único**

- **Dado** que o `ContratoService` recebe um comando de criação válido
- **Quando** o método `salvarContrato` for executado com sucesso
- **Então** o registro no banco de dados deve possuir um `numeroSequencial` no formato "XXX/AAAA"
- **E** o `valorVigente` deve ser preenchido com o mesmo valor do `valorOriginal`.

### Funcionalidade: Motor de Cálculo (Estado Vigente)

**Cenário: Atualização de saldo após consumo de evento de aditivo**

- **Dado** que existe um contrato no banco com `valorVigente` de R$ 100.000,00
- **Quando** o serviço de integração consumir o evento `AditivoHomologado` com `valorImpacto` de R$ 25.000,00 (Acréscimo)
- **Então** a entidade `Contrato` deve atualizar o `valorVigente` para R$ 125.000,00
- **E** o `valorOriginal` deve permanecer R$ 100.000,00 (Imutável)
- **E** o sistema deve disparar um evento `EstadoContratualAtualizado` para a Timeline.

---

## 2. Bounded Context: Aditivos e Alterações (Core)

**Objetivo:** Validar as invariantes e regras de transição de status.

### Funcionalidade: Regras de Homologação

**Cenário: Impedir homologação sem evidência documental**

- **Dado** que existe um objeto `Aditivo` com status `PENDENTE`
- **E** a propriedade `arquivoAssinadoRef`/`signedDocumentRef` está nula (null)
- **Quando** o comando `homologarAditivo(id)` for invocado
  - via API (Fase HTTP): retorna `422 Unprocessable Entity`
  - via CLI (Fase atual): exit code `1` + mensagem em `stderr`
- **Então** a mensagem ao usuário deve indicar — texto literal do dicionário PT-BR (`src/modules/contracts/cli/formatters/error.ts`):
  > "Aditivo precisa ter documento assinado anexado para ser homologado."
- **E** o código interno propagado pelo domínio é `'amendment-without-signed-document'`.

> 📎 **Atualizado em 2026-05-14** após sessão QA: texto reformulado para o que está implementado na CLI (objetivamente equivalente em significado; mantém o termo "documento assinado anexado"). Manter o texto literal do dicionário como **fonte de verdade**.

**Cenário: Validação de magnitude por tipo de aditivo (modelagem: magnitude + kind)**

> 📎 **Decisão arquitetural (2026-05-14):** o domínio modela aditivos como **(kind, magnitude ≥ 0)** em vez de **delta assinado**. O sinal algébrico é inferido do `kind` (`Addition` soma, `Suppression` subtrai). `Money` é sempre não-negativo por invariante do VO. Documentado em [`handbook/domain/contratos/04-aditivos-context.md`](../../../handbook/domain/contratos/04-aditivos-context.md).

- **Dado** que um comando de criação de aditivo é enviado com o tipo `Suppression`
- **Quando** o `impactValueCents` for negativo
- **Então** o sistema retorna o erro `'money-negative-value'`
  - mensagem CLI: "Valor monetário não pode ser negativo."
- **Quando** o `impactValueCents` for zero
- **Então** o sistema retorna o erro `'amendment-impact-value-zero'`
  - mensagem CLI: "Valor de impacto não pode ser zero."
- **Quando** o `impactValueCents` for positivo (magnitude)
- **Então** o aditivo é criado em status `Pendente`. Na homologação, o `kind` `Suppression` faz o `Contract.applyHomologatedAdjustment` invocar `Money.subtract(currentValue, impactValue)`, que retorna `'money-negative-result'` (mensagem: "A operação resultaria em valor negativo.") se a supressão exceder o valor vigente.

**Justificativa do modelo:** preserva o invariante "Money é não-negativo" (sem necessidade de `SignedMoney`); o efeito algébrico está garantido pela operação executada na homologação, não pelo sinal do input. Vide testes `Money — subtract` e `Contract.applyHomologatedAdjustment — ValueDecrease`.

---

## 3. Bounded Context: Memória Operacional (Timeline)

**Objetivo:** Garantir que o histórico seja uma lista "Append-only" e auditável.

### Funcionalidade: Integridade Cronológica

**Cenário: Garantia de imutabilidade de eventos registrados**

- **Dado** que um evento de tipo `CONTRATO_CRIADO` existe na base de dados de Timeline
- **Quando** uma requisição `PUT` ou `DELETE` for enviada para o endpoint deste evento
- **Então** o servidor deve retornar `405 Method Not Allowed`
- **E** o registro original não deve sofrer qualquer alteração no banco.

---

## 4. Segurança e Compliance (Cross-cutting)

**Objetivo:** Validar permissões de execução e proteção de dados (LGPD).

### Funcionalidade: Controle de Acesso (RBAC)

**Cenário: Bloqueio de ação crítica por perfil insuficiente**

- **Dado** que a requisição de API está autenticada com um JWT contendo a role `OPERADOR`
- **Quando** tentar acessar o endpoint de `POST /api/v1/contratos/{id}/distratar`
- **Então** o sistema deve retornar `403 Forbidden`
- **E** nenhum registro de alteração de status deve ser persistido.

---

## 5. Integração Externa

**Cenário: Notificação para o sistema de Contas a Pagar**

- **Dado** que um contrato teve seu `EstadoContratualAtualizado`
- **Quando** o evento de domínio for publicado com sucesso no Broker (RabbitMQ/Kafka)
- **Então** o payload deve conter o `novoSaldoVigente` e o `idContrato` para sincronização com o financeiro.
