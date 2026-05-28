# Como Definir um Endereço IP Privado na Criação de VNIC

A Magalu Cloud permite a criação de **Portas (VNICs – Virtual Network Interface Cards)** para conectar instâncias de Máquinas Virtuais às sub-redes de uma **VPC (Virtual Private Cloud)**.

Por padrão, é atribuído um endereço IP aleatório disponível na sub-rede automaticamente. No entanto, para cenários que exigem previsibilidade, é possível **definir explicitamente o endereço IP privado** no momento da criação da interface.

## Disponibilidade da Feature

A funcionalidade de definição manual de IP Privado está disponível a partir da **CLI v0.52.0**. Certifique-se de que sua MGC CLI esteja atualizada na versão correspondente antes de prosseguir.

## Casos de Uso

A atribuição manual de IP (IP estático na VNIC) é recomendada para arquiteturas que necessitam de persistência de endereço, tais como:

* **Bancos de Dados e Clusters:** Serviços que dependem de configurações fixas de IP para replicação ou conexão.
* **Appliances Virtuais:** Firewalls, Proxies e Gateways que atuam como pontos fixos de roteamento.
* **Integrações Legadas:** Sistemas que não suportam descoberta de serviço baseada em DNS.
* **Regras de Firewall:** Ambientes onde as listas de controle de acesso (ACLs) são baseadas em IPs específicos.

## Pré-requisitos e Regras

1. **Pertencimento ao CIDR:** O IP solicitado deve estar dentro do intervalo de endereços da subnet escolhida.
2. **Disponibilidade:** O IP deve estar **livre** no momento da criação. Se estiver em uso, a operação falhará.
3. **Persistência:** Uma vez definido, o IP fica permanentemente associado à VNIC enquanto ela existir, independentemente da VM à qual ela for anexada.

### Comportamento de Multi-Subnets

Embora o comando aceite uma lista de subnets, a API da Magalu Cloud considera **apenas a primeira subnet informada** para a alocação do IP.

**Sempre garanta que a subnet alvo seja o primeiro item da lista.** Subnets adicionais listadas no comando serão ignoradas para fins de atribuição de IP.

## Passo a Passo: Criando a VNIC com IP Fixo

```bash
mgc network vpcs ports create [VPC_ID] \
  --name "vnic-app-db" \
  --subnets "[SUBNET_ID]" \
  --ip-address "10.0.1.25"
```

### Resultado Esperado

O comando retornará os detalhes da VNIC criada, incluindo o `id` da interface. O campo de endereço IP deverá refletir exatamente o valor `10.0.1.25`.

### Funcionalidade Indisponível no Console

Atualmente, a definição explícita de um endereço IP privado durante a criação de uma VNIC está disponível **apenas via CLI**.

Pelo Console da Magalu Cloud, a criação de interfaces é feita apenas na criação dos recursos, onde atribui IPs automaticamente sem a opção de definição manual neste momento.
