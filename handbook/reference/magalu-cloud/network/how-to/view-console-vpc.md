# Como Visualizar suas VPCs

Esta funcionalidade permite que você visualize a topologia de rede da sua conta, incluindo **VPCs**, **Sub-redes** e **Blocos CIDR**, diretamente pelo console da Magalu Cloud.

## 1. Listar VPCs

👣 _Inicio > Menu > Network > Virtual Private Cloud_

Na página da **Virtual Private Cloud**, você encontrará uma lista com todas as VPCs provisionadas em sua conta. As seguintes informações são exibidas para cada uma:

*   **Nome:** O nome identificador da sua VPC.
*   **Descrição:** Descrição customizada da VPC, definida pelo usuário.
*   **Criado em:** Data em que a VPC foi criada.

## 2. Visualizar Detalhes de uma VPC

Na listagem de VPCs, clique no **Nome** da VPC que deseja inspecionar. Você será direcionado para uma página de detalhes com três abas: **Geral**, **Subnet** e **CIDR Blocks**.

### Aba Geral

Esta aba exibe as informações gerais e os metadados da VPC.

*   **VPC Padrão:** Indica com "Sim" ou "Não" se esta é a VPC padrão da sua conta.
*   **Descrição:** A descrição customizada associada à VPC.
*   **Criado Em:** A data e hora exatas da criação da VPC.

### Aba Subnet

Aqui você encontra a lista de todas as sub-redes (subnets) provisionadas dentro desta VPC, com as seguintes colunas:

*   **Nome:** O nome da sub-rede.
*   **Tipo de IP:** Se a sub-rede é para `IPv4` ou `IPv6`.
*   **CIDR:** O bloco de endereçamento específico da sub-rede.
*   **Zona:** A Zona de Disponibilidade (ex: `br-se1-a`) onde a sub-rede reside.
*   **Criado em:** A data de criação da sub-rede.

### Aba CIDR Blocks

Esta aba detalha todos os blocos de endereçamento CIDR associados à VPC.

*   **CIDR Blocks:** O bloco de endereçamento.
*   **Tipo de IP:** O tipo de protocolo (`IPv4` ou `IPv6`).
*   **Criado em:** A data em que o bloco foi associado à VPC.
*   **CIDR Block Padrão:** Indica se o bloco é o primário da VPC.

> **Atenção: Interface Read-Only**
>
> Nesta versão, a interface é **apenas para visualização** (read-only). A criação, edição ou exclusão de VPCs e Sub-redes deve continuar sendo realizada via CLI ou Terraform.

Para listar ou visualizar detalhes de suas VPCs via linha de comando, consulte a documentação completa dos comandos da CLI para VPC.
