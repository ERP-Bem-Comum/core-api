# Visão Geral das Virtual Machines da Magalu Cloud

As Virtual Machines (VMs) da Magalu Cloud são "ambientes computacionais isolados criados por software de virtualização." Cada máquina funciona como um computador independente, executando seu próprio sistema operacional, vCPU, memória e armazenamento.

## Funcionamento

A infraestrutura de virtualização permite que múltiplos sistemas operacionais e aplicativos rodem em um único servidor físico, mantendo cada VM isolada e independente.

## Recursos Disponíveis

- **Sistemas operacionais:** Distribuições Linux e Windows Server
- **Computação escalável:** Provisionar vCPUs, memória e armazenamento conforme necessário
- **Armazenamento:** Block Storage (dados persistem mesmo após exclusão) e Object Storage
- **Configurações de rede:** Redes privadas/públicas, regras de segurança, IPs, DNS e gateways
- **Acesso remoto:** SSH (Linux) e RDP (Windows)
- **Snapshots:** Cópias pontuais para backup e restauração
- **Resize/Retype:** Modificação de recursos sem perda de dados (tipos BV e DP)
- **Importação de imagens customizadas:** Migração de ambientes existentes

## Regiões Disponíveis

- São Paulo (Brasil - Sudeste): `SE1` - zonas `br-se1-a`, `br-se1-b`, `br-se1-c`
- Fortaleza (Brasil - Nordeste): `NE1`

## Contratação e Faturamento

O serviço é gerenciado via Cloud Console, CLI ou Terraform, com "faturamento realizado com base no consumo por hora."
