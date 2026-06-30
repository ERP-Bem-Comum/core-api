# Forma de Cobrança

O modelo de cobrança do Object Storage é baseado no uso real do serviço (pay-as-you-go). Este modelo proporciona flexibilidade e transparência, permitindo que você pague apenas pelo que utilizar, seja em termos de armazenamento ou transferência de dados.

## Armazenamento de Dados

O custo do armazenamento de dados é calculado com base na quantidade de dados armazenados em nossos servidores. A cobrança é feita por gibibytes (GiB) de armazenamento por mês.

*   **Classe de Armazenamento Standard**: Acesso imediato e baixo custo por leitura, ideal para dados utilizados com frequência.
*   **Classe de Armazenamento Cold Instant**: Armazenamento muito mais econômico, com latência ligeiramente maior, indicado para dados acessados ocasionalmente.

## Transferência de Objetos

A transferência de dados é medida pelo volume em GiB trafegado.

*   **Tráfego de Saída de Dados (Egress)**: Cobramos pela transferência de dados para fora do nosso serviço de armazenamento, incluindo transferências entre diferentes regiões e para a internet. A taxa é calculada com base na quantidade de dados transferidos, medida em gibibytes (GiB).
*   **Tráfego de Entrada de Dados (Ingress)**: A transferência de dados para o armazenamento Standard não possui custo. A cobrança ocorre apenas para transferências destinadas ao armazenamento Cold Instant. Neste caso, a taxa é calculada com base na quantidade de dados transferidos, medida em gibibytes (GiB).

## Transparência

Para garantir total transparência sobre seus custos e controle sobre seus recursos, você pode monitorar seus gastos através da página de Faturamento do Console da Magalu Cloud. Nesta página, você terá acesso detalhado às informações sobre o uso de armazenamento e transferência do Object Storage.

Para ter acesso aos valores, acesse a [página de preços](https://magalu.cloud/precos/object-storage/) do Object Storage.
