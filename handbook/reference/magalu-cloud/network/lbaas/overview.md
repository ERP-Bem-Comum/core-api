# Visão Geral

## Restrição de Disponibilidade

Atualmente, o produto **LBaaS** está disponível **exclusivamente** para uso integrado ao **Magalu Kubernetes Service**.

A criação, o provisionamento e o gerenciamento de Load Balancers devem ser realizados **apenas através do Kubernetes**. A criação de recursos de Load Balancer de forma isolada (standalone) ou dissociada de um cluster não é suportada para uso em produção neste momento.

## Introdução

O **LBaaS (Load Balancer as a Service)** é a solução de balanceamento de carga na nuvem da MGC. Ele atua como a infraestrutura fundamental para distribuir automaticamente o tráfego de entrada, garantindo alta disponibilidade, escalabilidade e desempenho para suas aplicações.

Nesta fase de General Availability (GA) do produto de Kubernetes, o LBaaS é o motor que viabiliza a exposição externa dos seus serviços e aplicações conteinerizadas.

## Principais Funcionalidades

Embora o gerenciamento seja feito via Kubernetes, o LBaaS oferece nativamente as seguintes capacidades:

### 1. Tipos de Load Balancers

O serviço suporta o **General Purpose Load Balancer (GPLB)**: Um balanceador de carga de camada 4 (TCP), projetado para alto desempenho e baixa latência, ideal para suportar os serviços do seu cluster.

### 2. Recursos da Infraestrutura

Ao provisionar um Load Balancer via Kubernetes, a MGC orquestra automaticamente os seguintes recursos:

a) **Ciclo de Vida Gerenciado**
Provisionamento automático de IPs e instâncias de balanceamento conforme a definição dos seus serviços no cluster.

b) **Listeners**
Configuração de escuta em portas específicas (mapeadas a partir das portas do seu Service Kubernetes), com suporte a protocolos TCP e TLS.

c) **Backends Dinâmicos**
Registro automático dos Nodes do seu cluster como backends, garantindo que o tráfego chegue aos seus Pods corretamente.

d) **Health Checks (Monitoramento de Saúde)**
Monitoramento contínuo da saúde dos nós do cluster. O LBaaS verifica a disponibilidade antes de rotear o tráfego, garantindo que requisições não sejam enviadas para nós indisponíveis.

e) **Certificados TLS**
Suporte para terminação SSL/TLS, permitindo que a criptografia seja gerenciada no nível do balanceador para conexões seguras.

f) **Segurança e Controle**
Capacidade de aplicação de regras de acesso (ACLs) baseadas em endereços IP para proteger a exposição dos seus serviços.

### 3. Benefícios

- **Integração Nativa:** Funciona de forma transparente com o Kubernetes Controller da Magalu Cloud.
- **Alta Disponibilidade:** Distribui cargas de trabalho entre múltiplos nós do cluster.
- **Escalabilidade:** Permite o crescimento da aplicação sem configurações manuais complexas de rede.
- **Eficiência Operacional:** Reduz a complexidade da infraestrutura de rede, permitindo que você foque na definição dos serviços da aplicação.

---

## Nota de Suporte

Para solicitar ajustes de cotas ou dimensões especiais para atender sua volumetria no Kubernetes, contate o time de suporte da Magalu Cloud.

## Conclusão

O **LBaaS** é o componente essencial que habilita a conectividade externa robusta para o seu cluster Kubernetes. Ele oferece um conjunto sólido de funcionalidades que otimizam o desempenho e a segurança das suas aplicações cloud-native.
