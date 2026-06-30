# Como Adicionar e Configurar uma Nova Interface de Rede (VNIC)

Adicionar múltiplas interfaces de rede (VNICs - Virtual Network Interface Cards) a uma instância permite segmentar o tráfego, conectar-se a diferentes sub-redes ou aplicar políticas de segurança distintas para cada interface.

## Entendendo o Processo

A ativação de uma nova VNIC envolve duas etapas distintas e obrigatórias:

1. **Na Plataforma Magalu Cloud:** Criar a interface de rede (VNIC) e anexá-la à sua instância de VM.
2. **No Sistema Operacional da VM:** Configurar a nova interface para que ela seja reconhecida, ativada e possa receber um endereço IP.

Este guia cobre ambas as etapas em detalhes.

## Etapa 1: Provisionar a Máquina Virtual (VM)

Caso ainda não tenha uma VM, crie uma utilizando um dos métodos abaixo.

### Via Console

1. No menu principal, acesse **Virtual Machines**.
2. Clique no botão **\+ Criar instância**.
3. Preencha os campos obrigatórios:
   - **Zona de Disponibilidade:** Escolha a zona onde a VM será criada.
   - **Imagem:** Selecione o sistema operacional, como **Ubuntu 24.04 LTS**.
   - **Tipo de instância:** Escolha o tamanho da VM (ex: Balanced Value).
   - **Chave SSH:** Selecione uma chave SSH já existente para acesso seguro.
   - **Nome da instância:** Defina um nome para sua VM (ex: `minha-vm-multinic`).
4. Clique em **Criar instância** para finalizar.

### Via CLI

A criação de uma VM via linha de comando é feita com o comando `mgc virtual-machine instances create`. O exemplo abaixo mostra os parâmetros essenciais para provisionar uma instância Ubuntu.

```bash
# Exemplo de criação de uma VM Ubuntu
mgc virtual-machine instances create \
  --name="vm-vnic-add" \
  --image.name="Ubuntu 24.04 LTS" \
  --machine-type.name="BV1-1-10" \
  --network.vpc.id="[ID_DA_SUA_VPC]" \
  --ssh-key-name="[NOME_DA_SUA_CHAVE_SSH]"
```

> O comando retornará o `id` da instância criada. Guarde este valor, pois ele será necessário na próxima etapa para anexar a interface de rede.

Para uma lista completa de todos os parâmetros e opções disponíveis, consulte a [documentação de referência do comando](https://docs.magalu.cloud/docs/devops-tools/cli-mgc/commands-reference/virtual-machine/instances/create).

## Etapa 2: Criar e Anexar a Nova VNIC (via CLI)

Atualmente, a criação e associação de VNICs adicionais é feita através da CLI.

### Criar a nova porta (VNIC)

Execute o comando abaixo, substituindo `[ID_DA_SUA_VPC]` pelo ID da VPC onde a VM está localizada e definindo um nome para a nova interface.

```bash
mgc network vpcs ports create --vpc-id="[ID_DA_SUA_VPC]" --name="vnic-secundaria"
```

> Anote o `id` retornado pelo comando. Ele é **essencial** para vincular a nova interface à sua VM no passo seguinte.

### Anexar a VNIC à instância

Use o comando a seguir para associar a VNIC à sua VM. Substitua `[ID_DA_SUA_VM]` e `[ID_DA_VNIC]` pelos valores obtidos anteriormente.

```bash
mgc virtual-machine instances network-interface attach \
  --instance.id="[ID_DA_SUA_VM]" \
  --network.interface.id="[ID_DA_VNIC]"
```

> Uma mensagem como `✅ Operation executed successfully` confirmará que a interface foi anexada com sucesso.

---

## Etapa 3: Configurar a Interface no Sistema Operacional

Após anexar a VNIC na plataforma, a configuração dentro da VM é necessária para ativá-la. A nova interface geralmente é configurada para obter um endereço IP via **DHCP**.

A tabela abaixo resume as ferramentas e arquivos de configuração para os sistemas operacionais disponíveis na Magalu Cloud.

| Sistema Operacional | Nome da Imagem (Exemplo) | Ferramenta Principal | Arquivo de Configuração Típico |
|---|---|---|---|
| **Ubuntu 22.04+ / Debian 12+** | `cloud-ubuntu-24.04 LTS` | `Netplan` | `/etc/netplan/*.yaml` |
| **Rocky Linux 9 / Oracle Linux 8+** | `cloud-rocky-09` | `NetworkManager` | `/etc/sysconfig/network-scripts/ifcfg-<interface>` |
| **Fedora** | `cloud-fedora-41` | `NetworkManager` | `/etc/NetworkManager/system-connections/*.nmconnection` |
| **openSUSE 15.x** | `cloud-opensuse-15.6` | `wicked` | `/etc/sysconfig/network/ifcfg-*` |
| **Windows Server** | `windows-server-2022` | Painel de Controle | (Configuração via interface gráfica ou PowerShell) |

### Ubuntu / Debian (Netplan)

O **Ubuntu 22.04+** e o **Debian 12+** utilizam o **Netplan** para gerenciamento de rede. A nova interface estará presente, mas desativada por padrão até ser configurada.

1. **Acesse sua VM** e **identifique a nova interface** (ex: `ens7`) com o comando `ip a`. Anote seu nome e endereço MAC.

2. **Edite o arquivo de configuração do Netplan** (geralmente `/etc/netplan/50-cloud-init.yaml`) com permissões de superusuário:

```bash
sudo vim /etc/netplan/50-cloud-init.yaml
```

3. **Adicione a estrofe da nova interface**, usando o endereço MAC para a correspondência:

```yaml
network:
  version: 2
  ethernets:
    # Interface primária (existente)
    ens3:
      match:
        macaddress: "fa:16:3e:62:7f:6e"
      dhcp4: true
      # ... outras configs
    # Nova interface
    ens7:
      match:
        macaddress: "fa:16:3e:4a:fd:07" # <-- Use o MAC da sua nova interface
      dhcp4: true
      set-name: "ens7"
```

4. **Aplique a configuração** e verifique o resultado:

```bash
sudo netplan apply
ip a show ens7
```

A interface agora deve estar **UP** e com um endereço IP.

### Rocky / Oracle / RHEL

Para sistemas baseados em RHEL, como **Rocky Linux** e **Oracle Linux**, a configuração é feita com o `NetworkManager` através do utilitário `nmcli`.

1. **Acesse sua VM** e **identifique o nome da nova interface** que está desconectada.

```bash
nmcli device status
```

2. **Crie e ative uma nova conexão** para a interface. O `nmcli` configurará o DHCP (`ipv4.method=auto`) por padrão.

```bash
sudo nmcli con add type ethernet con-name ens7 ifname ens7
```

3. **Verifique o resultado:**

```bash
nmcli con show ens7
ip a show ens7
```

### Fedora

O Fedora utiliza o `NetworkManager` de forma nativa e o método de configuração é idêntico ao de outros sistemas baseados em RHEL, usando `nmcli`.

```bash
nmcli device status
sudo nmcli con add type ethernet con-name ens7 ifname ens7
nmcli con show ens7
ip a show ens7
```

### openSUSE

O openSUSE utiliza o `wicked` como ferramenta padrão de gerenciamento de rede.

```bash
sudo wicked ifshow all
sudo vim /etc/sysconfig/network/ifcfg-ens7
```

Conteúdo para o arquivo:

```bash
# Conteúdo para /etc/sysconfig/network/ifcfg-ens7
BOOTPROTO='dhcp'
STARTMODE='auto'
```

```bash
sudo wicked ifup ens7
wicked ifstatus ens7
```

### Windows Server

#### Via Interface Gráfica (GUI)

1. Abra o **Menu Iniciar**, digite `ncpa.cpl` e pressione **Enter**.
2. Localize a nova interface de rede (geralmente "Ethernet 2" ou superior).
3. Clique com o botão direito sobre ela e selecione **Propriedades**.
4. Na lista, dê um duplo clique em **"Protocolo IP Versão 4 (TCP/IPv4)"**.
5. Certifique-se de que as seguintes opções estejam marcadas:
   - **Obter um endereço IP automaticamente**
   - **Obter o endereço dos servidores DNS automaticamente**
6. Clique em **OK** em todas as janelas para salvar.

#### Via PowerShell

> Execute os seguintes comandos em uma janela do PowerShell aberta como **Administrador**.

```powershell
Get-NetAdapter | Format-Table -AutoSize
Set-NetIPInterface -InterfaceIndex [INDEX] -Dhcp Enabled
Set-DnsClientServerAddress -InterfaceIndex [INDEX] -ResetServerAddresses
Get-NetIPAddress -InterfaceIndex [INDEX]
```
