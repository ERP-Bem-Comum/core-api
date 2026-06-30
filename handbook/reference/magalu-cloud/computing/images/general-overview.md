# Visão Geral de Imagens na Magalu Cloud

## O que são imagens?

Imagens funcionam como "modelos pré-configurados de sistemas operacionais" para criar máquinas virtuais. Cada imagem inclui o kernel, pacotes essenciais e compatibilidade com ferramentas de inicialização automática como cloud-init (Linux) e Cloudbase-init (Windows).

## Para que servem as imagens?

As imagens permitem criar VMs rapidamente de forma padronizada, garantir consistência entre ambientes diferentes, utilizar sistemas operacionais atualizados mantidos pela Magalu Cloud, e replicar configurações via snapshots.

## Tipos de imagens

### 1. Imagens públicas (catálogo oficial)

A plataforma oferece imagens mantidas pela Magalu Cloud:

- Ubuntu
- Oracle Linux
- Rocky Linux
- Debian
- openSUSE
- Fedora
- Windows Server 2022
- RedHat Enterprise Linux (em breve)

### 2. Instâncias derivadas de snapshots

Você pode criar snapshots de discos de VMs e restaurá-los como novas instâncias, preservando o mesmo estado do sistema operacional e disco.

### 3. Imagens customizadas sob demanda

Atualmente, customizações especiais são realizadas com apoio do time de arquitetura da Magalu Cloud para cenários como sistemas legados ou hardening específico.

## Como as imagens funcionam na criação de VMs

1. **Seleção**: Escolha uma imagem do catálogo
2. **Provisionamento**: A plataforma gera o disco raiz
3. **Primeira inicialização**: Ferramentas como cloud-init (Linux) ou Cloudbase-init (Windows) aplicam configurações de chave SSH, hostname, rede e scripts personalizados
4. A VM opera como instância independente após a inicialização
