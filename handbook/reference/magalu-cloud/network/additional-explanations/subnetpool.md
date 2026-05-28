# Subnetpool

## O que é Subnetpool?

Um **Subnetpool** é um conjunto de endereços IPs disponíveis dentro de uma região e que são utilizados para criar subnets. O objetivo principal de um subnetpool é garantir que cada subnet tenha um intervalo único de endereços IP, evitando sobreposições e conflitos de endereçamento dentro da infraestrutura de rede.

Subnetpools não pertencem a uma VPC específica. Elas são alocadas por tenant e são utilizadas para criação de subnets, essas sim pertencentes a uma VPC.

### Hierarquia:

```
Tenant
└── Subnet Pool
    └── VPC (Virtual Private Cloud)
        ├── Subnet 1
        ├── Subnet 2
        ├── Subnet 3
        └── Subnet N
```

## Como o Subnetpool Funciona?

Quando você cria uma nova subnet dentro de uma VPC, os endereços IP que serão atribuídos à subnet são alocados através de um subnetpool associado ao tenant em questão. Isso garante que os endereços IP dentro de cada subnet sejam únicos e não entrem em conflito com outras subnets, mesmo em diferentes zonas de disponibilidade (AZs).

## Passo a Passo para Usar Subnetpool

### 1. Criação de Subnetpool:

* Ao criar um subnetpool, é necessário definir o intervalo de endereços IP (CIDR) que estará disponível para as subnets. Esse intervalo pode variar dependendo das necessidades da sua rede, mas deve estar entre as máscaras de rede /2 e /29.
* Cada subnetpool é associado a um Tenant e não a uma VPC específica, permitindo maior flexibilidade na gestão dos recursos de rede.
* Subnetpool default é criado com máscara de rede /16
* Subnet default é criada com máscara de rede /20

### 2. Criação de Subnet:

* Durante a criação de uma subnet, o usuário deve informar o ID do subnetpool do qual essa subnet irá derivar seus endereços IP.
* O usuário pode optar por definir uma máscara de rede específica ou deixar que o sistema escolha automaticamente um intervalo de IPs do subnetpool.
* O sistema verifica se o intervalo escolhido não se sobrepõe com subnets já existentes no subnetpool e procede com a criação.

### 3. Gerenciamento de Subnets:

* É possível criar várias subnets a partir de um mesmo subnetpool, garantindo que todas tenham intervalos de endereços IP únicos.
* O subnetpool também permite a expansão da infraestrutura de rede, pois novas VPCs ou subnets podem ser adicionadas utilizando os intervalos de IP disponíveis no subnetpool.

## Benefícios do Uso de Subnetpool

* **Gestão Eficiente de IPs**: O subnetpool permite um gerenciamento centralizado e eficiente dos endereços IP dentro de uma região, evitando sobreposição de endereços entre subnets.
* **Flexibilidade**: Clientes podem criar e gerenciar múltiplos subnetpools, ajustando-os conforme suas necessidades específicas de rede.

## Casos de Uso

### 1. Redes Multi-AZ:

* Garante que subnets criadas em diferentes zonas de disponibilidade dentro da mesma região não tenham sobreposição de IPs, crucial para arquiteturas de alta disponibilidade.

### 2. Segregação de Ambientes:

* Permite a criação de subnets isoladas para diferentes ambientes (desenvolvimento, teste, produção), garantindo que esses ambientes não interfiram uns com os outros.

### 3. Conectividade com Serviços Externos:

* Simplifica a configuração de conectividade com serviços externos, como VPNs, garantindo que os IPs das subnets internas não se sobreponham com IPs de outras redes.

## Considerações Finais

O uso de subnetpools no contexto de uma cloud pública, como o Magalu Cloud, proporciona um controle robusto sobre a alocação de endereços IP e a organização da infraestrutura de rede, permitindo que os clientes configurem suas redes de forma segura, eficiente e com alta flexibilidade.
