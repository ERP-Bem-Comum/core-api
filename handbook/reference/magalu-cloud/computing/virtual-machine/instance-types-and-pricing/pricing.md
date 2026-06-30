# Preço

A estrutura de preços das Virtual Machines é baseada no modelo de cobrança por uso (pay-as-you-go), garantindo flexibilidade para ajustar seus custos conforme suas necessidades. O preço é calculado com base no tipo da instância escolhida e no tempo de uso.

## Instâncias de Virtual Machines:

O preço das instâncias é determinado pelo tipo de máquina (vCPU, memória RAM, Disco Local (NVMe) e desempenho) e pelo tempo em que a instância existe.

Atualmente, não há cobrança para instâncias **desligadas**. Nos demais estados, a cobrança é aplicada normalmente.

## Licenças de Sistemas Operacionais:

Para sistemas operacionais que exigem licenças pagas, como o Windows, a cobrança é feita separadamente. No caso do Windows, as licenças são cobradas com base no número de pares de vCPUs e pelo período de uso da máquina.

## Serviços Adicionais:

Além das instâncias, outros serviços como volumes de Block Storage, IPs Públicos e Tráfego de Saída (Egress) de Network também são cobrados separadamente.

## Snapshots:

Atualmente, não estão sendo cobrados, mas isso pode ser por tempo indeterminado. Qualquer mudança nesta política será comunicada previamente.

## Preços

Os preços para cada tipo de volume podem ser consultados diretamente na página de preços do website da Magalu Cloud.

## Exemplo de Cálculo de Custos:

### Caso 1:

Suponha que você crie uma instância do tipo BV2-4-40 com 2 vCPUs, 4 GB de RAM e 40 GB de disco local (NVMe), utilizando-a por 730 horas (equivalente a um mês), e com sistema operacional Windows.

A cobrança seria:

* Instância Windows BV2-4-40: 730 horas x preço do tipo BV2-4-40 com sistema Windows

### Caso 2:

Suponha que você crie uma instância do tipo BV4-8-100 com 4 vCPUs, 8 GB de RAM e 1000 GB de disco local (NVMe), utilizando-a por 730 horas (equivalente a um mês), e com sistema operacional Ubuntu. Além disso, você adicionou um IPv4 e trafegou externamente 200 GiB durante esse mês. Ainda, adicionou um volume de 5.000 IOPS com 100 GiB.

A cobrança seria:

* **Instância Ubuntu BV4-8-100:** 730 horas x preço do tipo BV4-8-100
* **IPv4 Público:** 730 horas x preço do IPv4 por hora
* **Egress de Transferência de Dados:** 200 GiB x preço por GiB transferido de saída
* **Volume de Block Storage:** 100 GiB x 730 horas x preço por GB/hora do tipo de volume de 5.000 IOPS

Note que neste exemplo:

* A máquina com sistema operacional Ubuntu não gera custos de licença adicional.
* O volume de armazenamento, o IP público e a transferência de dados de saída (egress) são cobrados separadamente com base no uso.
* A transferência de dados egress inclui o tráfego de saída da sua instância para a internet ou outras redes, e o valor é calculado conforme o volume de dados transferidos.
