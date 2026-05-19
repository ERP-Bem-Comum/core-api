# **Especificação de Domínio**

## **Reestruturação do Módulo de Contratos**

**Escopo inicial:** Cadastro Contratual, Aditivos, Gestão Documental e Timeline de Eventos  
**Versão:** 1.0  
**Status:** Especificação de Domínio  
**Base:** Relatório de Requisitos Funcionais Módulo de Contratos

**Módulos abrangidos nesta fase:**  
· Cadastro de contratos  
· Gestão de aditivos contratuais  
· Gestão documental contratual  
· Timeline de eventos e histórico  
· Cálculo dinâmico de valor e vigência  
· Migração de dados legados  
· Auditoria, segurança e controle de acesso

## **1\. Visão de Domínio**

### **1.1. Objetivo**

Reestruturar o módulo de contratos para sair de um modelo centrado em cadastro estático e adotar um modelo centrado em estado contratual vigente, no qual o Contrato representa a entidade principal, os Aditivos representam os eventos formais de alteração e a Timeline representa a memória operacional e documental do ciclo de vida contratual.

**1.2. Resultado esperado**

**O módulo deverá permitir:**  
· consulta rápida e precisa de contratos;  
· numeração sequencial padronizada;  
· cálculo automático e auditável de valor atual e vigência atual;  
· bloqueio de edição direta de campos derivados;  
· gestão cronológica de aditivos e documentos em timeline;  
· rastreabilidade integral de uploads, exclusões, homologações e alterações;  
· segregação de acessos por perfil;  
· migração segura de contratos e aditivos legados;  
· observabilidade operacional e trilha imutável de auditoria.

### **1.3. Problema de negócio que a solução resolve**

No modelo atual, o módulo tende a concentrar cadastro e consulta em uma estrutura que não representa adequadamente os efeitos dos aditivos sobre o contrato, o que aumenta o risco de leitura de dados obsoletos, dificulta a conferência documental, enfraquece a rastreabilidade e gera dependência de interpretação manual.

**2\. Escopo Funcional**

### **2.1. Dentro do escopo**

· cadastro e manutenção do contrato mãe;  
· geração automática de numeração sequencial anual;  
· reestruturação do grid principal de contratos;  
· exibição de valor atual e vigência atual derivados;  
· bloqueio de edição direta de campos calculados;  
· cadastro, homologação e histórico de aditivos;  
· exibição cronológica de eventos e arquivos;  
· gestão documental com preview, retenção e controle de acesso;  
· trilha de auditoria append-only;  
· controle de acesso por perfil;  
· migração em lote de contratos e aditivos legados;  
· observabilidade, métricas e monitoramento de latência.

### **2.2. Fora do escopo desta fase**

· fluxo financeiro de contas a pagar, exceto herança ou referência contratual necessária;  
· assinatura eletrônica nativa dentro do ERP, quando a solução for terceirizada;  
· portal externo de fornecedores;  
· gestão completa de licitações, compras ou requisições;  
· módulo jurídico autônomo;  
· publicação automática em portais de transparência.

## **3\. Princípios de Arquitetura de Domínio**

O relatório de requisitos funcionais já fixa como pilares a organização da consulta, o cálculo confiável de valor e vigência, a governança de arquivos e a separação de responsabilidades. Esta especificação amplia esses pilares em linguagem de domínio para orientar produto, backend, frontend, QA, UX, segurança e operações.

### **3.1. Contrato como entidade principal**

O Contrato é a entidade mãe do domínio. Aditivos, documentos, eventos e estados vigentes derivam do contrato e não podem existir sem vínculo formal com ele.

### **3.2. Estado vigente derivado de eventos homologados**

Valor atual, vigência atual e status vigente do contrato não devem depender de edição manual redundante. Esses atributos devem ser derivados do contrato original e dos aditivos homologados.

### **3.3. Imutabilidade orientada ao histórico**

O histórico contratual deve ser preservado como evidência. Exclusão funcional de documento ou inativação operacional não pode apagar a trilha do que ocorreu.

### **3.4. Rastreabilidade obrigatória**

Toda alteração em contrato, aditivo, documento, status, valor, vigência, exclusão, upload, preview e migração deve gerar evidência histórica preservando origem, autor, data, valor anterior, valor novo e motivo da alteração.

### **3.5. Separação de responsabilidades**

Cadastro, homologação, exclusão, parametrização e auditoria devem respeitar segregação de perfis. A mesma ação não deve concentrar de forma irrestrita criação, aprovação e eliminação de rastros.

### **3.6. Segurança documental por padrão**

Arquivos contratuais devem ser tratados como ativos sensíveis, com validação de integridade, retenção, auditoria e acesso condicionado ao perfil.

## **4\. Modelo Conceitual do Domínio**

### **4.1. Entidade: Contrato**

Representa o instrumento contratual principal.

**Campos principais:**  
`· contratoId`  
`· numeroContrato`  
`· anoContrato`  
`· numeroSequencial`  
`· codigoLegado`  
`· tipoContrato`  
`· contratadoId`  
`· contratadoNome`  
`· contratadoCnpjCpf`  
`· objeto`  
`· programaId`  
`· programaNome`  
`· unidadeGestoraId`  
`· centroResponsabilidadeId`  
`· valorOriginal`  
`· dataInicioOriginal`  
`· dataFimOriginal`  
`· statusContrato`  
`· origemCadastro`  
`· manual`  
`· migracao`  
`· integração`  
`· usuarioCriacao`  
`· usuarioAtualizacao`  
`· dataCriacao`  
`· dataAtualizacao`

### **4.2. Entidade: AditivoContratual**

Representa cada alteração formal vinculada ao contrato.

**Campos principais:**  
`· aditivoId`  
`· contratoId`  
`· numeroAditivo`  
`· tipoAditivo`  
`· prazo`  
`· acrescimo_valor`  
`· supressao_valor`  
`· reajuste`  
`· reequilibrio`  
`· escopo`  
`· outro`  
`· resumoAditivo`  
`· dataAssinatura`  
`· dataInicioEfeito`  
`· dataFimEfeito`  
`· valorAcrescimo`  
`· valorSupressao`  
`· statusAditivo`  
`· rascunho`  
`· pendente`  
`· homologado`  
`· rejeitado`  
`· cancelado`  
`· documentoPrincipalId`  
`· usuarioCriacao`  
`· usuarioHomologacao`  
`· dataHomologacao`

### **4.3. Entidade: DocumentoContratual**

Representa documentos vinculados ao contrato ou ao aditivo.

**Campos principais:**  
`· documentoId`  
`· entidadePaiTipo`  
`· entidadePaiId`  
`· categoriaDocumento`  
`· contrato_assinado`  
`· aditivo_assinado`  
`· parecer`  
`· certidao`  
`· justificativa`  
`· anexo_tecnico`  
`· publicacao`  
`· outro`  
`· nomeArquivo`  
`· mimeType`  
`· tamanhoArquivo`  
`· hashSha256`  
`· storageKey`  
`· versaoDocumento`  
`· assinadoEletronicamente`  
`· assinaturaValidada`  
`· dataUpload`  
`· usuarioUpload`  
`· statusDocumento`  
`· ativo`  
`· substituido`  
`· excluido_logicamente`  
`· motivoExclusao`  
`· retencaoAte`

### **4.4. Entidade: EventoContratual**

Representa o histórico cronológico do ciclo de vida do contrato.

**Campos principais:**  
`· eventoId`  
`· contratoId`  
`· tipoEvento`  
`· criacao_contrato`  
`· assinatura`  
`· upload_documento`  
`· aditivo_incluido`  
`· aditivo_homologado`  
`· exclusao_documento`  
`· encerramento`  
`· cancelamento`  
`· outro`  
`· descricaoEvento`  
`· dataEvento`  
`· origemEvento`  
`· referenciaEntidadeTipo`  
`· referenciaEntidadeId`  
`· usuarioEvento`  
`· metadataJson`

### **4.5. Entidade: MemoriaCalculoContratual**

Estrutura persistida para explicar como valor atual e vigência atual foram obtidos.

**Campos principais:**  
`· memoriaId`  
`· contratoId`  
`· valorOriginal`  
`· somaAditivosAcrescimo`  
`· somaAditivosSupressao`  
`· valorAtualCalculado`  
`· dataFimOriginal`  
`· dataFimAtualCalculada`  
`· quantidadeAditivosHomologados`  
`· regraCalculoVersao`  
`· observacoesCalculo`

### **4.6. Entidade: EventoAuditoria**

Registra toda ação crítica sobre contratos, aditivos e documentos.

**Campos principais:**  
`· eventoId`  
`· entidadeTipo`  
`· entidadeId`  
`· acao`  
`· antesJson`  
`· depoisJson`  
`· motivo`  
`· origemAcao`  
`· usuarioId`  
`· perfilOrigem`  
`· ipOrigem`  
`· dataHora`  
`· correlationId`

## **5\. Regras de Negócio**

**RN-01. Contrato é a origem da gestão contratual**  
Todo aditivo, documento e evento deve nascer vinculado a um contrato válido. O contrato é a entidade principal do módulo.

**RN-02. Chave lógica única do contrato**  
Não pode existir mais de um contrato com a mesma combinação número \+ ano.

**RN-03. Numeração sequencial anual**  
O número do contrato deve seguir padrão sequencial anual no formato 000/AAAA, conforme critério do backlog funcional.

**RN-04. Preservação do valor original**  
O valor original do contrato é referência histórica e não deve ser sobrescrito por aditivos.

**RN-05. Preservação da vigência original**  
As datas originais do contrato devem permanecer preservadas como base histórica.

**RN-06. Valor atual é derivado**  
O valor atual do contrato deve seguir a composição:  
**valorAtual** \= **valorOriginal** \+ **somaAditivosAcrescimoHomologados** \- **somaAditivosSupressaoHomologados**  
A nota técnica do anexo já estabelece essa lógica de cálculo dinâmico.

**RN-07. Vigência atual é derivada**  
A vigência atual deve considerar a maior data final entre os aditivos de prazo homologados. Na ausência desses aditivos, deve ser utilizada a data final original do contrato. Essa regra também está explicitada na nota técnica do anexo.

**RN-08. Campos derivados são somente leitura**  
Valor atual, vigência atual e demais campos derivados devem ser bloqueados para edição direta na tela de contrato. Alterações devem ocorrer apenas por fluxo formal de aditivo, conforme o item de fonte da verdade do documento-base.

**RN-9. Inclusão é o gatilho de atualização**  
A atualização do estado vigente do contrato deve ocorrer apenas após a inclusão do aditivo.

**RN-10. Timeline é obrigatória**  
Toda alteração relevante deve gerar evento cronológico vinculado ao contrato.

**RN-11. Exclusão de documento não apaga o histórico**  
A exclusão de documento deve ser lógica ou controlada, preservando auditoria, motivo e usuário executor.

**RN-12. Documento obrigatório por tipo de aditivo**  
Aditivos que alterem valor, prazo ou condição material do contrato devem exigir documento principal vinculado para homologação.

**RN-14. Migração deve respeitar atomicidade por conjunto**  
Na importação legada, o contrato e seus respectivos aditivos devem respeitar persistência consistente, sem gravação parcial indevida.

## **6\. Regras de Compliance, Segurança e Governança**

### **6.1. Premissa geral**

O módulo deve tratar contratos e documentos como registros formais de alto valor operacional e institucional, exigindo proteção de dados, rastreabilidade, integridade documental, segregação de funções e retenção controlada. O blueprint técnico do anexo já orienta RBAC, logs imutáveis, anonimização em ambientes não produtivos e rollout controlado.

### **6.2. LGPD e proteção de dados**

Se houver dados pessoais em contratos, anexos, representantes legais, fiscais ou procuradores, o sistema deve controlar acesso, exposição e retenção em conformidade com a Lei Geral de Proteção de Dados. ([planalto.gov.br](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm?utm_source=chatgpt.com))

**RN-LGPD-01**  
Campos e documentos que contenham dados pessoais devem respeitar regra de necessidade e minimização de acesso. ([planalto.gov.br](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm?utm_source=chatgpt.com))

**RN-LGPD-02**  
Ambientes de desenvolvimento e homologação devem utilizar anonimização ou mascaramento de dados sensíveis, alinhado à diretriz já prevista no documento-base. ([planalto.gov.br](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm?utm_source=chatgpt.com))

### **6.3. Assinatura eletrônica e integridade documental**

Quando houver documento eletrônico assinado, o sistema deve ser capaz de armazenar evidências técnicas e metadados compatíveis com o regime jurídico aplicável às assinaturas eletrônicas. ([planalto.gov.br](https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2020/lei/l14063.htm?utm_source=chatgpt.com))

**RN-AS-01**  
O sistema deve registrar se o documento foi assinado eletronicamente.

**RN-AS-02**  
O sistema deve permitir armazenar hash, versão e evidências de validação do documento assinado.

### **6.4. Segurança de acesso**

O módulo deve implementar controle de acesso baseado em perfis, conforme a arquitetura sugerida no anexo.

**RN-SEG-01**  
O sistema deve suportar, no mínimo, os perfis:  
· administrador;  
· gestor;  
· operador;

**RN-SEG-02**  
Apenas gestor e administrador podem excluir documentos, conforme regra expressa no backlog funcional.

**RN-SEG-03**  
O operador deve operar em modo de consulta, fazer download e preview.

## **6\. Fluxos de Negócio**

### **6.1. Fluxo 01: Cadastro de contrato**

1. Usuário acessa tela de cadastro de contrato.  
2. Sistema gera numeração sequencial/anual 000/ano.  
3. Usuário informa contratado, objeto, programa, valor original e datas originais.  
4. Usuário anexa documento principal, obrigatório.  
5. Sistema valida obrigatoriedade e chave lógica.  
6. Para registros com valor geral de até R$10.000,00 o sistema deve informar ao usuário e dar opção de continuar ou não para, assim, salvar o arquivo.  
7. Contrato é salvo com status inicial configurado.

### **6.2. Fluxo 02: Consulta e leitura do contrato**

1. Usuário acessa o grid de contratos.  
2. Sistema aplica filtros, ordenação e indexação.  
3. Usuário seleciona um contrato.  
4. Sistema exibe tela de detalhe com cabeçalho dinâmico, dados originais, dados vigentes, documentos e timeline.  
5. Campos derivados são exibidos como somente leitura.

### **6.3. Fluxo 03: Cadastro de aditivo**

1. Usuário acessa o contrato.  
2. Usuário adiciona novo aditivo, funcionalidade para perfis autorizados tipo (gestor).  
3. O sistema deve gerar numeração sequencial seguindo o padrão da numeração do contrato ex: AD 01-001/2026;  
4. Usuário seleciona tipo, resumo, datas, impacto financeiro e documento principal.  
5. Usuário realiza upload do arquivo.  
6. Usuário salva o aditivo.

### **6.4. Fluxo 05: Gestão documental**

1. Usuário acessa a área de documentos do contrato ou do aditivo.  
2. Sistema valida tipo, integridade, segurança e armazenamento.  
3. Documento fica disponível para preview, download e rastreabilidade conforme perfil.  
4. Exclusão, quando permitida, exige justificativa e preserva histórico.

### **6.6. Fluxo 06: Migração legada**

1. Usuário técnico inicia ferramenta de importação.  
2. Sistema executa validações de estrutura, unicidade e vínculo.  
3. Sistema processa lote em modo simulado ou persistente.  
4. Gera relatório de sucesso e falhas por linha.  
5. Permite rollback controlado em staging ou conforme estratégia definida.

## **7\. Casos de Uso**

### **UC-01. Cadastrar contrato com numeração sequencial**

**Atores:** Operador, Gestor  
**Objetivo:** Criar contrato com estrutura válida e número padronizado.  
**Pré-condições:** parâmetros anuais disponíveis; perfil com permissão de cadastro.  
**Pós-condições:** contrato salvo com identificador válido.

**Critérios de aceite:**

· sistema armazenar o arquivo;  
· sistema deve gerar o número do contrato;  
· não deve permitir duplicidade número \+ ano;  
· deve gravar valor e vigência originais;  
· deve permitir vínculo de documento principal.

### **UC-02. Visualizar contrato com estado vigente**

**Atores:** Operador, Gestor, Auditor  
**Objetivo:** Consultar o contrato com distinção entre dado original e dado vigente.  
**Pré-condições:** contrato existente.  
**Pós-condições:** usuário visualiza cabeçalho, dados derivados, histórico e documentos.

**Critérios de aceite:**  
· cabeçalho deve exibir número/status;  
· valor atual e vigência atual devem refletir o cálculo vigente;  
· campos derivados devem estar bloqueados para edição;  
· deve haver acesso ao histórico de composição.

### **UC-03. Adicionar aditivo de prazo**

**Atores:** Gestor  
**Objetivo:** Atualizar formalmente a vigência do contrato.  
**Pré-condições:** aditivo existente, completo e com documento obrigatório.  
**Pós-condições:** vigência atual recalculada e refletida no contrato.

**Critérios de aceite:**  
· o sistema deve registrar a nova data de vigência  
· a nova vigência deve refletir a maior data válida;  
· a alteração deve gerar evento e auditoria.

### **UC-04. Adicionar aditivo de valor**

**Atores:** Gestor  
**Objetivo:** Registrar alteração contratual.  
**Pré-condições:** aditivo existente e válido.  
**Pós-condições:** manter informações de vigência e valor inalterados.

**Critérios de aceite:**  
· o sistema deve registrar o aditivo e mantê-lo no histórico;  
· deve persistir memória de cálculo;

### **UC-05. Adicionar aditivo de tipo variado**

**Atores:** Gestor  
**Objetivo:** Registrar e expor o tipo de alteração contratual do aditivo.  
**Pré-condições:** aditivo existente e válido.  
**Pós-condições:** valor atual e data vigente mantidos.

**Critérios de aceite:**  
· o sistema deve manter valor original, data de vigência e demais informações registradas;

### **UC-06. Gerenciar documento contratual**

**Atores:** Operador, Gestor, Auditor  
**Objetivo:** Anexar, visualizar e controlar documentos do contrato.  
**Pré-condições:** contrato ou aditivo existente.  
**Pós-condições:** documento disponível conforme permissão.

**Critérios de aceite**  
· upload deve validar integridade;  
· preview deve funcionar sem download forçado, quando suportado;  
· exclusão deve ser restrita a perfis autorizados;  
· ação deve ficar registrada em auditoria.

### **UC-07. Importar contratos legados**

**Atores:** Equipe técnica  
**Objetivo:** Realizar carga inicial do legado com segurança.  
**Pré-condições:** arquivo válido e mapeamento definido.  
**Pós-condições:** contratos e aditivos importados ou rejeitados com relatório.

**Critérios de aceite**  
· sistema deve aceitar CSV e JSON em UTF-8;  
· deve validar CNPJ, datas e duplicidade;  
· deve permitir dry-run;  
· deve gerar relatório de falhas por linha;  
· deve respeitar atomicidade do conjunto contrato \+ aditivos.

## **9\. Requisitos de Interface e Experiência**

### **9.1. Tela de listagem de contratos**

A tela de listagem deverá funcionar como o hub operacional de consulta contratual, permitindo:  
· localização rápida de contratos;  
· leitura de status vigente;  
· diferenciação entre contratos em vigor, vencidos, encerrados ou com atenção;  
· acesso ágil ao detalhe do contrato;  
· leitura de dados em cenários de alta densidade.

### **9.1.1. Estrutura geral da tela**

A tela deverá ser composta por quatro grandes blocos:

1. Cabeçalho e ações globais  
2. Filtros avançados  
3. Grid de contratos  
4. Rodapé com paginação e totais

### **9.1.2. Cabeçalho e ações globais**

Elementos esperados:  
· campo de busca global;  
· botão de exportação;  
· botão de novo contrato, quando permitido;  
· ação futura para relatórios ou atalhos.

**Regras:**  
· a busca global deve localizar por número, contratado, CPF/CNPJ e objeto;  
· a exportação deve respeitar os filtros aplicados;  
· ações devem respeitar perfil.

### **9.1.3. Bloco de filtros avançados**

Campos mínimos recomendados:  
· nº contrato;  
· contratado;  
· CPF/CNPJ;  
· status;  
· programa;  
· vigência de/até;  
· faixa de valor;  
· possui aditivos;  
· possui documento assinado.

**Regras de experiência:**  
· filtros devem ser combináveis;  
· datas devem suportar intervalo;  
· a busca deve atualizar o grid sem recarregamento integral, idealmente;  
· filtros devem persistir durante a navegação.

### **9.1.4. Grid de contratos**

O grid é o coração da tela. Cada linha representa um contrato.

**Colunas mínimas do grid:**  
· Nº Contrato  
· Contratado  
· Objeto  
· Vigência  
· Programa  
· Valor Atual  
· Status

Essa estrutura está diretamente alinhada ao critério de aceite do item US.CT.01.

**Regras de UX para o grid:**  
· deve permitir ordenação simples e múltipla;  
· deve manter cabeçalho fixo;  
· deve permitir redimensionamento de colunas;  
· deve usar tooltip para textos truncados;  
· o valor exibido deve ser o valor atual, e não apenas o valor original.

### **9.2. Tela de detalhe do contrato**

A tela de detalhe deverá funcionar como o raio-X do contrato, consolidando em uma visão única os dados originais, os dados vigentes, a documentação, os aditivos e a timeline.

### **9.2.1. Cabeçalho do contrato**

O cabeçalho deverá apresentar identificação clara do contrato no padrão:  
**\[Nº CONTRATO\] / \[STATUS\]**  
conforme o requisito funcional do anexo.

Também poderá exibir:  
· contratado;  
· programa;  
· badges de contrato assinado, vencendo, encerrado ou com pendência.

### **9.2.2. Seção “Dados do Contrato”**

Deverá exibir:  
· número;  
· ano;  
· contratado;  
· CPF/CNPJ;  
· objeto;  
· programa;  
· datas originais;  
· status base;  
· origem do cadastro.

### **9.2.3. Seção “Dados Vigentes”**

Deverá exibir:  
· valor atual;  
· vigência atual;  
· status vigente;  
· histórico de composição acessível.

**Regras:**  
· os campos devem ser somente leitura;  
· a edição direta deve ser bloqueada;  
· o usuário deve compreender de onde veio o valor exibido.

### **9.2.4. Seção “Timeline”**

A timeline deverá exibir os eventos em ordem cronológica descendente, com novos itens no topo, conforme o anexo.

**Cada item deve apresentar:**  
· tipo do evento;  
· data;  
· resumo;  
· impacto em valor e/ou vigência, quando aplicável;  
· ações disponíveis por perfil.

### **9.3. Tela de inclusão e edição de aditivos**

A tela de aditivos deverá priorizar clareza jurídica-operacional, baixa ambiguidade e vínculo explícito com o contrato pai.

### **9.3.1. Cabeçalho do aditivo**

Deverá apresentar:  
· número do contrato pai;  
· contratado;  
· tipo do aditivo;  
· status do aditivo.

### **9.3.2. Bloco “Identificação do Aditivo”**

Campos mínimos:  
· número do aditivo;  
· tipo;  
· data de assinatura;  
· data de início de efeito;  
· data fim, quando aplicável;  
· resumo/objeto da alteração.

### **9.3.3. Bloco “Impacto Contratual”**

Campos mínimos:  
· valor de acréscimo;  
· valor de supressão;  
· nova data de vigência, quando aplicável.

**Regras:**  
· a tela deve deixar claro se o aditivo afeta valor, prazo ou ambos;  
· o impacto deve ser refletido no contrato apenas após a inclusão.

### **9.3.4. Bloco “Documento Principal”**

Deverá exigir o vínculo com o documento formal do aditivo.

**Regras:**  
· aditivo sem documento obrigatório não deve ser incluído;  
· preview e integridade devem estar disponíveis.

### **9.3.5. Rodapé operacional da tela**

Ações esperadas:  
· salvar rascunho;  
· enviar para validação;  
· homologar, quando perfil permitir;  
· cancelar.

## **10\. Requisitos Não Funcionais**

O documento-base já estabelece cobertura mínima de testes automatizados, acessibilidade, observabilidade, RBAC, logs imutáveis, anonimização e metas de performance para grid e migração.

**RNF-01. Auditoria**  
Toda alteração relevante deve gerar trilha de auditoria persistida e imutável.

**RNF-02. Segurança por perfil**  
O sistema deve implementar RBAC com segregação mínima entre:  
· operador;  
· gestor;  
· auditor;  
· administrador.

**RNF-05. Performance de migração**  
A carga inicial deve suportar meta de 10 mil contratos e 30 mil aditivos em menos de 10 minutos, conforme a especificação-base.

**RNF-06. Idempotência**  
Rotinas de importação, recálculo e reprocessamento não devem gerar duplicidades indevidas.

**RNF-07. Ambientes**  
Ambientes não produtivos devem utilizar dados anonimizados ou mascarados, alinhados ao blueprint técnico e à LGPD. ([planalto.gov.br](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm?utm_source=chatgpt.com))

**RNF-08. Integridade documental**  
Todo arquivo deve possuir hash de verificação de integridade.

**RNF-09. Observabilidade**  
Latência, falhas de upload, falhas de permissão, inconsistências de migração e eventos críticos devem ser monitorados.

**RNF-10. Acessibilidade**  
A interface deve atender critérios de acessibilidade e navegação coerente para telas densas.

## **11\. Critérios Gerais de Aceite por Bloco**

### **11.1. Contrato e consulta**

· deve permitir cadastro com chave lógica única;  
· deve gerar ou validar numeração anual;  
· deve exibir grid estruturado com valor atual e status;  
· deve permitir busca por número, contratado e CPF/CNPJ.

### **11.2. Cálculo contratual**

· valor atual deve refletir valor original \+ acréscimos \- supressões homologadas;  
· vigência atual deve refletir o prazo homologado mais recente;  
· campos calculados devem estar bloqueados para edição direta;  
· a composição deve ser explicável ao usuário.

### **11.3. Aditivos**

· deve permitir cadastro e homologação por fluxo controlado;  
· aditivos pendentes não devem afetar estado vigente;  
· homologação deve gerar evento e auditoria;  
· documento obrigatório deve ser exigidol.

### **11.4. Documentos**

· deve permitir upload e preview seguro;  
· deve validar integridade;  
· exclusão deve exigir justificativa;  
· exclusão deve ser restrita a perfis autorizados;  
· retenção deve ser suportada por categoria.

### **11.5. Timeline e histórico**

· deve exibir eventos em ordem cronológica descendente;  
· deve registrar inclusões, homologações, uploads e exclusões;  
· deve permitir leitura operacional do histórico sem ambiguidade.

### **11.6. Migração**

· deve aceitar CSV/JSON UTF-8;  
· deve validar CNPJ, datas e duplicidade;  
· deve gerar relatório de erro por linha;  
· deve permitir dry-run e rollback testado.

## **12\. Cenários de Teste de Homologação**

**CT-01. Contrato com aditivo de acréscimo homologado**  
Dado um contrato com valor original cadastrado  
Quando um aditivo de acréscimo for homologado  
Então o sistema deve recalcular o valor atual considerando o novo valor homologado.

**CT-02. Contrato com aditivo de supressão pendente**  
Dado um contrato com aditivo de supressão ainda pendente  
Quando o usuário consultar o contrato  
Então o sistema não deve refletir esse aditivo no valor atual exibido.

**CT-03. Contrato com aditivo de prazo homologado**  
Dado um contrato com data final original  
Quando um aditivo de prazo for homologado  
Então a vigência atual deve exibir a maior data válida entre os aditivos homologados.

**CT-04. Edição de campo derivado na tela do contrato**  
Dado um contrato com valor atual calculado  
Quando o usuário tentar editar diretamente o campo de valor atual  
Então o sistema deve bloquear a ação e informar que a alteração ocorre somente via aditivo.

**CT-05. Exclusão de documento por perfil não autorizado**  
Dado um usuário sem permissão de exclusão  
Quando tentar excluir documento contratual  
Então o sistema deve negar a ação e registrar a tentativa, conforme política de controle de acesso.

**CT-06. Importação legada com duplicidade**  
Dado um arquivo de migração contendo contrato duplicado por número \+ ano  
Quando a importação for processada  
Então o sistema deve rejeitar o registro e apontar o motivo da falha.

**CT-07. Importação em modo dry-run**  
Dado um lote válido de contratos e aditivos  
Quando o usuário executar a simulação  
Então o sistema deve validar os registros e gerar relatório sem persistir dados.

## **13\. Recomendação Técnica para o Time de Desenvolvimento**

### **13.1. Organização de backend**

Sugere-se separar o módulo em:

1. camada de domínio;  
2. camada de aplicação;  
3. camada de infraestrutura;  
4. camada de storage documental e auditoria.

### **13.2. Serviços de domínio recomendados**

`· GeradorNumeroContratoService`  
`· CalculadoraEstadoVigenteContratoService`  
`· HomologadorAditivoService`  
`· TimelineContratualService`  
`· GestorDocumentalContratoService`  
`· ValidadorIntegridadeMigracaoContratoService`  
`· AuditoriaContratualService`  
`· PolicyEnforcementContratoService`

### **13.3. Eventos de domínio sugeridos**

`· ContratoCriado`  
`· ContratoAtualizado`  
`· AditivoCriado`  
`· ValorContratoRecalculado`  
`· VigenciaContratoRecalculada`  
`· DocumentoContratualAnexado`  
`· DocumentoContratualExcluido`  
`· TimelineAtualizada`  
`· MigracaoContratoExecutada`

## **14\. Riscos que a implementação deve evitar**

· tratar valor atual como campo manual e não como resultado de regra;  
· confundir valor original/global com valor atual;  
· permitir edição direta de vigência ou valor calculado;  
· permitir exclusão documental sem trilha;  
· deixar upload documental sem verificação de integridade;  
· perder histórico de homologações e mudanças;  
· deixar migração persistir contratos de forma parcial;  
· concentrar permissões críticas em perfis inadequados;  
· expor dados pessoais reais em ambientes não produtivos.

## **15\. Complementação técnica de transição**

### **15.1. Itens técnicos de transição**

· definição de estratégia de rollout com feature flag;  
· piloto controlado para grupo de gestão contratual;  
· validação da migração assistida antes do go-live;  
· desligamento controlado de rotinas legadas;  
· configuração de storage documental seguro;  
· configuração de trilha append-only;  
· definição de checklist de transição;  
· validação de perfis e matriz de acesso antes da liberação geral.