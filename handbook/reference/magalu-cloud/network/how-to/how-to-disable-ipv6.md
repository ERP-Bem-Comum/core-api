# Como Desativar o IPv6 em sua Instância

A Magalu Cloud foi projetada com uma visão de futuro, adotando o IPv6 como parte integral de sua arquitetura de rede. O IPv6 é o sucessor do IPv4 e oferece um espaço de endereçamento vastamente maior, além de melhorias em eficiência e segurança, sendo crucial para o crescimento sustentável da internet.

Por essa razão, a desativação do IPv6 não é uma funcionalidade nativa na plataforma (como a exclusão de sub-redes IPv6 ou a remoção de endereços em VNICs). Acreditamos que ambas as versões do protocolo devem coexistir para garantir a máxima compatibilidade e preparação para o futuro.

No entanto, entendemos que algumas aplicações ou sistemas legados podem ter requisitos específicos que exigem a desativação do IPv6. Para esses casos, a configuração deve ser realizada diretamente no sistema operacional da sua instância.

> Desativar o IPv6 pode ter efeitos colaterais em certas aplicações ou serviços do sistema operacional que dependem dele. Proceda com cautela e apenas se for um requisito estrito para o seu ambiente. A recomendação geral, sempre que possível, é manter o IPv6 ativado.

Este guia demonstra como desativar o IPv6 na Magalu Cloud, seja de forma automatizada via CLI durante a criação da instância, ou manualmente em uma máquina já existente.

---

## Opção 1: Desativar Durante a Criação da Instância (via CLI e User Data)

A forma mais eficiente de aplicar essa configuração é através do parâmetro `--user-data` ao criar uma instância com a **CLI da Magalu Cloud (`mgc`)**. O script fornecido será executado na primeira inicialização, garantindo que a VM já comece com o IPv6 desativado.

### Requisito: Codificação em Base64

A API da Magalu Cloud espera que o conteúdo do script `user-data` seja codificado no formato **Base64**.

### Linux (Cloud-Init)

Crie um arquivo `disable-ipv6.sh`:

```bash
#!/bin/bash
# 1. Desativa o IPv6 via parâmetro do kernel no GRUB (método definitivo)
sed -i 's/GRUB_CMDLINE_LINUX="\(.*\)"/GRUB_CMDLINE_LINUX="\1 ipv6.disable=1"/' /etc/default/grub
update-grub

# 2. Impede o cloud-init de regenerar a configuração de rede a cada boot
tee /etc/cloud/cloud.cfg.d/99-disable-network-config.cfg <<'EOF'
network: {config: disabled}
EOF

# 3. Adiciona as regras sysctl como camada complementar de segurança
tee /etc/sysctl.d/99-disable-ipv6.conf <<'EOF'
net.ipv6.conf.all.disable_ipv6 = 1
net.ipv6.conf.default.disable_ipv6 = 1
net.ipv6.conf.lo.disable_ipv6 = 1
EOF
sysctl -p /etc/sysctl.d/99-disable-ipv6.conf
```

Codifique e use:

```bash
USER_DATA_B64=$(base64 -w 0 disable-ipv6.sh)

mgc virtual-machine instances create \
  --name="minha-vm-sem-ipv6" \
  --image.name="Ubuntu 24.04 LTS" \
  --machine-type.name="BV1-1-10" \
  --ssh-key-name="[NOME_DA_SUA_CHAVE_SSH]" \
  --user-data="$USER_DATA_B64"
```

### Windows Server (PowerShell)

Crie um arquivo `disable-ipv6.ps1`:

```powershell
<powershell>
# Cria a chave de registro para desativar componentes do IPv6
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\TCPIP6\Parameters" -Name DisabledComponents -PropertyType DWord -Value 0xFF -Force

# Reinicia a máquina para aplicar a configuração
Restart-Computer -Force
</powershell>
```

```powershell
$UserDataFile = ".\disable-ipv6.ps1"
$UserDataBytes = [System.IO.File]::ReadAllBytes($UserDataFile)
$USER_DATA_B64 = [System.Convert]::ToBase64String($UserDataBytes)
```

```bash
mgc virtual-machine instances create \
  --name="meu-windows-sem-ipv6" \
  --image.name="windows-server-2022" \
  --machine-type.name="BV1-2-20" \
  --ssh-key-name="[NOME_DA_SUA_CHAVE_SSH]" \
  --user-data="$USER_DATA_B64"
```

---

## Opção 2: Desativar em uma Instância Existente (Método Manual)

### Por que usar o parâmetro do kernel?

Em ambientes cloud com **cloud-init** e **Netplan**, a abordagem apenas via `sysctl` não é suficiente para persistir entre reinicializações. A solução definitiva é passar o parâmetro `ipv6.disable=1` diretamente ao kernel via GRUB.

### Ubuntu / Debian

```bash
sudo sed -i 's/GRUB_CMDLINE_LINUX="\(.*\)"/GRUB_CMDLINE_LINUX="\1 ipv6.disable=1"/' /etc/default/grub
sudo update-grub
sudo tee /etc/cloud/cloud.cfg.d/99-disable-network-config.cfg <<'EOF'
network: {config: disabled}
EOF
sudo tee /etc/sysctl.d/99-disable-ipv6.conf <<'EOF'
net.ipv6.conf.all.disable_ipv6 = 1
net.ipv6.conf.default.disable_ipv6 = 1
net.ipv6.conf.lo.disable_ipv6 = 1
EOF
sudo sysctl -p /etc/sysctl.d/99-disable-ipv6.conf
sudo reboot
```

### Rocky / Oracle / RHEL

```bash
sudo sed -i 's/GRUB_CMDLINE_LINUX="\(.*\)"/GRUB_CMDLINE_LINUX="\1 ipv6.disable=1"/' /etc/default/grub

# Para sistemas com BIOS:
sudo grub2-mkconfig -o /boot/grub2/grub.cfg
# Para sistemas com UEFI:
sudo grub2-mkconfig -o /boot/efi/EFI/redhat/grub.cfg

sudo tee /etc/cloud/cloud.cfg.d/99-disable-network-config.cfg <<'EOF'
network: {config: disabled}
EOF
sudo tee /etc/sysctl.d/99-disable-ipv6.conf <<'EOF'
net.ipv6.conf.all.disable_ipv6 = 1
net.ipv6.conf.default.disable_ipv6 = 1
net.ipv6.conf.lo.disable_ipv6 = 1
EOF
sudo sysctl -p /etc/sysctl.d/99-disable-ipv6.conf
sudo reboot
```

### Fedora

```bash
sudo sed -i 's/GRUB_CMDLINE_LINUX="\(.*\)"/GRUB_CMDLINE_LINUX="\1 ipv6.disable=1"/' /etc/default/grub
sudo grub2-mkconfig -o /boot/grub2/grub.cfg
# ou para UEFI:
sudo grub2-mkconfig -o /boot/efi/EFI/fedora/grub.cfg
sudo reboot
```

### openSUSE

```bash
sudo sed -i 's/GRUB_CMDLINE_LINUX="\(.*\)"/GRUB_CMDLINE_LINUX="\1 ipv6.disable=1"/' /etc/default/grub
sudo grub2-mkconfig -o /boot/grub2/grub.cfg
sudo reboot
```

### Windows Server

#### Interface Gráfica (Regedit)

1. Acesse sua instância Windows via RDP.
2. Abra o **Editor do Registro** (`regedit`).
3. Navegue até a chave: `HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip6\Parameters\`
4. Crie um novo **Valor DWORD (32 bits)** com o nome `DisabledComponents`.
5. Modifique o valor de `DisabledComponents` para `FF` (Base Hexadecimal).
6. **Reinicie a instância**.

#### PowerShell

```powershell
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\TCPIP6\Parameters" -Name DisabledComponents -PropertyType DWord -Value 0xFF -Force
Restart-Computer -Force
```
