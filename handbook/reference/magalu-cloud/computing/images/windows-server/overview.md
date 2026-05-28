# Visão Geral

A Magalu Cloud oferece imagens pré-configuradas do **Windows Server 2022**, projetadas para agilizar a implantação de servidores. Otimizadas para o ambiente de nuvem da Magalu, essas imagens garantem desempenho e confiabilidade desde o primeiro boot.

## Recursos e Configurações da Imagem

As imagens do **Windows Server 2022** já vêm com recursos e configurações essenciais para facilitar a implantação e o gerenciamento. A imagem base é construída de forma automatizada e inclui componentes e configurações padrão que garantem performance, segurança e compatibilidade.

* **Cloudbase-init:** Esta ferramenta de inicialização de nuvem é configurada para automatizar o ambiente. Ela cuida de tarefas como:
  * Configurar o nome do host.
  * Gerenciar usuários e injetar senhas de administrador na primeira inicialização.
  * Injetar chaves SSH para acesso seguro.
  * Estender automaticamente o disco do sistema operacional para utilizar todo o espaço alocado.
  * Executar scripts personalizados (`user-data`) fornecidos durante a criação da instância para personalização profunda.
* **Acesso Remoto:** O acesso via **Remote Desktop (RDP)** e **WinRM** já está habilitado, permitindo que você gerencie a VM de forma remota e automatizada.
* **Idioma e Fuso Horário:** O sistema é configurado com o idioma `en-US` e o fuso horário `E. South America Standard Time` (GMT-3, horário de Brasília).
* **Configurações Otimizadas:** Para garantir um melhor desempenho, a imagem vem com algumas configurações importantes:
  * Drivers **VirtIO** instalados para um melhor desempenho de rede e I/O de disco.
  * A política de execução do PowerShell está definida para `RemoteSigned`, oferecendo um bom equilíbrio entre segurança e flexibilidade para a execução de scripts.
  * A configuração de segurança aprimorada do Internet Explorer (IE ESC) está desabilitada para administradores e usuários.
* **Configuração de senha do usuário** `Administrator`: A partir de outubro de 2025, no primeiro login em VMs Windows Server criadas na Magalu Cloud, será exibido um formulário solicitando a definição de uma senha para o usuário `Administrator`.

> A senha Administrator é **única**, e de **responsabilidade exclusiva do cliente** (ou seja, não pode ser resgatada pela MGC). Portanto, recomendamos guardá-la em local seguro.

Essa senha é essencial para cenários de recuperação da VM, como:

* Perda de relação de confiança com domínios;
* Perda de privilégios administrativos do usuário `Admin`.

## Limitações Importantes

As máquinas virtuais do Windows Server são executadas na infraestrutura da Magalu Cloud baseada em **KVM (Kernel-based Virtual Machine)**. Essa arquitetura não suporta **virtualização aninhada (nested virtualization)**, um pré-requisito técnico para certas aplicações.

Isso significa que as seguintes funcionalidades **não podem ser habilitadas** dentro das VMs do Windows Server na Magalu Cloud:

* **Windows Subsystem for Linux 2 (WSL2):** O WSL2 depende do hipervisor Hyper-V da Microsoft, que requer virtualização aninhada para funcionar.
* **Docker Desktop for Windows:** Assim como o WSL2, o Docker Desktop também depende do Hyper-V.

Se sua aplicação ou fluxo de trabalho depende de ferramentas como WSL2 ou Docker Desktop, é recomendado que você utilize as **imagens Linux** da Magalu Cloud.

## Requisitos da Máquina

Para que o Windows Server 2022 funcione corretamente na Magalu Cloud, a instância precisa atender aos seguintes requisitos mínimos:

* **vCPU:** Mínimo de 2 vCPU
* **RAM:** Mínimo de 4 GB de RAM
* **Disco:** 40 GB

### Classes de VMs

As imagens do Windows Server 2022 podem ser utilizadas nas classes de instâncias da Magalu Cloud: **BV (Balanced Value)** e **DP (Dedicated Performance)**.

## Preços

Os valores do Windows Server 2022 variam de acordo com:

* Classe da VM (BV ou DP)
* Quantidade de vCPUs e memória

Para consultar os **preços atualizados**, acesse:
👉 [https://magalu.cloud/precos/virtual-machines/](https://magalu.cloud/precos/virtual-machines/)

> O custo do licenciamento do Windows Server já está integrado ao valor da máquina virtual, garantindo uma cobrança transparente e simplificada.

## Documentos Complementares

* [Como criar VM com Imagem Windows Server 2022](../../virtual-machine/how-to/create-instances/create-win-instance.md)
* [Acessar instância Windows](../../virtual-machine/how-to/create-instances/access-win-instance.md)
