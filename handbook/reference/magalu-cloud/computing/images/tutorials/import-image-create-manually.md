# Criando sua Imagem de Cloud do Zero Manualmente

Este método é ideal para quem está começando e deseja entender o processo fundamental por trás da criação de uma imagem, antes de importá-la através da Importação de Imagens Customizadas na Magalu Cloud. Ele utiliza ferramentas de virtualização de baixo nível, como o QEMU e o KVM.

## Passo 1: Criar o arquivo de disco virtual

O primeiro passo é criar um arquivo de disco virtual no formato QCOW2. Você pode usar o comando `qemu-img` para isso, especificando o tamanho desejado para a imagem. Exemplo:

```bash
qemu-img create -f qcow2 minha-imagem.qcow2 10G
```

## Passo 2: Instale o sistema operacional

Use uma ferramenta como o `virt-install` ou a interface gráfica do `virt-manager` para instalar o sistema operacional no arquivo de disco criado. Obs.: Este processo é similar a uma instalação padrão de SO, mas você estará instalando-o em um disco virtual.

## Passo 3: Configurar e limpar a imagem

Após a instalação, reinicie a máquina virtual e realize as configurações necessárias. Este é o momento de aplicar a prática de "manter a imagem enxuta":

*   Instale o agente de inicialização (`cloud-init` para Linux).
*   Configure o servidor SSH.
*   Remova arquivos desnecessários (temporários, caches e logs).

## Passo 4: Generalizar a imagem

*   **Linux**: use `virt-sysprep` para remover configurações específicas (rede, logs, etc.).

> **Importante**
>
> Para garantir que sua imagem esteja compatível com a plataforma revise os Pré-requisitos obrigatórios de importação. Para otimizar desempenho, segurança e manutenção das suas imagens, consulte também o Guia de Boas Práticas de Imagens Customizadas.
