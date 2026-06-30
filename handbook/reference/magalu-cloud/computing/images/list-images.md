# Usando imagens na criação de máquinas virtuais

A seleção de uma imagem é uma etapa importante durante a criação de uma máquina virtual. A imagem determina o **sistema operacional**, os **recursos pré-instalados** e o **processo de inicialização** que a instância utilizará no primeiro boot.

Esta página apresenta o fluxo completo para escolher uma imagem **pelo Console** e **pela CLI**, conectando a visão conceitual apresentada anteriormente com o uso prático dentro da plataforma.

---

## Quando uma imagem é utilizada?

Durante o processo de criação de uma VM, a imagem escolhida serve como base para o disco do sistema operacional. A partir dela, a Magalu Cloud executa rotinas automáticas de inicialização:

*   **Linux:** usando _cloud-init_ para configurar chave SSH, hostname, rede e possíveis _user-data scripts_.
*   **Windows:** usando _Cloudbase-init_, que gerencia hostname, senha/credenciais, expansão do disco e habilitação de RDP/WinRM.

Após essa etapa, a VM passa a operar como uma instância independente — mesmo que múltiplas VMs tenham sido criadas a partir da mesma imagem.

---

## Console

O Console oferece a forma mais simples e visual para selecionar a imagem desejada.

Passo a passo:

1.  Acesse o menu **Virtual Machines**.
2.  Clique em **Criar instância**.
3.  Selecione a **zona de disponibilidade**.
4.  Na seção **Escolha uma imagem**, selecione o sistema operacional desejado.

A lista de imagens disponíveis será exibida com ícones e opções de seleção.

---

## CLI

A CLI é indicada para automações, pipelines, ambientes IaC e fluxos avançados de operação.

Antes de utilizar, instale o CLI conforme sua plataforma (MacOS, Windows ou Linux). A documentação completa de instalação está em:
https://docs.magalu.cloud/docs/devops-tools/cli-mgc/how-to/download-and-install

Para verificar todas as imagens que podem ser utilizadas na criação de instâncias, execute:

```
mgc vm images list
```

O comando retorna, entre outras informações:

*   Nome da imagem
*   ID
*   Versão / release
*   Tipo de sistema operacional

Com o ID da imagem em mãos, você pode criar uma VM usando:

```
mgc vm create   --name minha-vm   --image-id   --zone br-se1-a   --vcpus 2   --ram 4
```
