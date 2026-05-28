# Como Funciona a Cobrança do SQL Server

## Estrutura de Cobrança

A cobrança na Magalu Cloud considera três componentes:

* **Infraestrutura da VM** (vCPU, memória e disco)
* **Sistema operacional**
* **Licenciamento do SQL Server** (baseado em vCPUs)

### Sistema Operacional

Em ambientes Linux, não há custo adicional do SO—você paga apenas pela infraestrutura e licenciamento SQL. Com Windows, o custo do Windows Server já vem integrado ao preço da VM, além do SQL Server.

Importante: "o uso de Linux **não isenta** o licenciamento do SQL Server."

## Regras de Licenciamento do SQL Server

### Modelo de Licenciamento

* Cada licença cobre **4 vCPUs**
* Mínimo obrigatório: **4 vCPUs** (1 licença)
* Arredondamento sempre para cima

### Exemplos

| vCPUs | Licenças |
|-------|----------|
| 4 | 1 |
| 8 | 2 |
| 16 | 4 |

## Boas Práticas

* Dimensione vCPUs conforme carga real
* Evite superdimensionamento (licenças crescem proporcionalmente)
* Para workloads críticos, escolha classes adequadas e armazenamento dedicado

## Edições Disponíveis

* **Enterprise**: Ambientes críticos com alta disponibilidade e BI avançado
* **Standard**: Equilíbrio entre custo e funcionalidades corporativas
* **Web**: Aplicações web otimizadas com custo reduzido

As VMs são provisionadas "totalmente licenciadas, configuradas e prontas para uso," com cobrança integrada.
