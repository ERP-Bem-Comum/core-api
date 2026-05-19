# 📘 Introdução ao Domínio: ERP Financeiro - Módulo de Contratos (V2)

## 1. Por que o sistema existe?
Atualmente, a organização enfrenta um cenário de **cegueira operacional** em relação ao ciclo de vida dos contratos. Os dados são estáticos, a gestão documental é inexistente e as informações de valor e vigência estão frequentemente desatualizadas para o cliente final. A edição manual de campos críticos gera inconsistências financeiras e falta de compliance, tornando auditorias processos lentos e pouco confiáveis.

## 2. O que o sistema faz, em uma frase?
O sistema automatiza o ciclo de vida contratual, transformando registros estáticos em um **Estado Contratual Vigente** dinâmico, auditável e baseado em eventos formais de alteração (aditivos).

## 3. Quem são os "clientes" do sistema?
* **Gestor ⭐**: O "dono" do dado. É responsável por cadastrar o contrato, anexar documentos e, crucialmente, homologar aditivos que alteram o valor ou prazo.
* **Operador**: Consumidor da informação. Realiza consultas, visualiza o estado atual e faz download de documentos para suporte operacional.
* **Auditor**: Observador externo. Necessita de acesso irrestrito (leitura) às trilhas de auditoria e à cronologia de eventos para garantir o compliance.
* **Administrador**: Gestor de infraestrutura de negócio. Define perfis de acesso e parâmetros globais do sistema.

## 4. Como funciona o fluxo do dia na prática?
1.  **Nascimento**: O Gestor cadastra o **Contrato Mãe** com valores e prazos iniciais. O contrato nasce com o status `Vigente`.
2.  **Mutação (Aditivos)**: Sempre que houver alteração, o Gestor cria um **Aditivo**. Este pode ser de:
    * **Acréscimo**: Aumenta o valor global.
    * **Supressão**: Reduz o valor global.
    * **Prazo**: Estende ou reduz a data de término.
    * **Variado**: Altera cláusulas ou objeto sem afetar o financeiro/tempo.
3.  **Formalização**: O Aditivo permanece `Pendente` até que o arquivo assinado seja incluído.
4.  **Homologação**: Ao homologar, o sistema recalcula automaticamente o **Estado Vigente** e registra o evento na **Timeline**.
5.  **Encerramento**: O contrato pode evoluir para `Encerrado` (fim da vigência) ou `Distratado` (interrupção prematura).

## 5. Como o sistema lida com exceções?
* **Aditivos Pendentes**: Nunca impactam o valor exibido ao cliente ou ao financeiro até serem homologados.
* **Arquivos de Aditivos**: A homologação é bloqueada caso o documento comprobatório não seja anexado.
* **Conflito de Datas**: O sistema impede que a vigência seja retroagida para uma data anterior à assinatura do contrato mãe sem um aditivo de retificação.

## 6. O que está dentro do MVP?
* ✅ Cadastro de Contrato e Aditivos.
* ✅ Motor de Cálculo de Valor e Prazo Vigente.
* ✅ Timeline Cronológica de Eventos.
* ✅ Repositório Documental (Upload/Download).
* ✅ Migração de Dados Legados.

## 7. Principais métricas (Kpis)
* ⏱️ **Tempo Médio de Ciclo**: Do cadastro do aditivo à homologação.
* ✅ **Índice de Conformidade**: Percentual de contratos com documentação completa.
* 🔁 **Saúde da Vigência**: Alerta para contratos próximos do vencimento sem aditivo de prazo.
* 🚫 **Taxa de Erro de Cálculo**: Redução de divergências entre o contrato e o Contas a Pagar.

## 8. Em resumo, o que o gestor precisa guardar?
> O valor e a vigência de um contrato não são campos editáveis; são o resultado da soma do Contrato Mãe com todos os seus Aditivos homologados. A **Timeline** é a única fonte da verdade para auditoria.