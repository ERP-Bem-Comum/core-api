# Criando sua Imagem de Cloud do Zero com Libvirt

Este tutorial orienta a criação de imagens customizadas modificando uma imagem oficial de nuvem usando Libvirt e virt-manager. O exemplo utiliza Ubuntu 24.04 LTS com instalação do Incus.

## Passo 1: Baixar a imagem base

Baixe a imagem oficial de cloud do Ubuntu e crie uma cópia usando `qemu-img`:

```bash
wget https://cloud-images.ubuntu.com/noble/current/noble-server-cloudimg-amd64.img
qemu-img create -f qcow2 -F qcow2 -b noble-server-cloudimg-amd64.img custom-ubuntu.qcow2
```

## Passo 2: Crie um arquivo ISO com o user-data

Crie um diretório temporário com dois arquivos para configuração do cloud-init:

**meta-data** (pode ficar vazio)

**user-data:**

```
#cloud-config
users:
  - name: ubuntu
    groups: sudo
    sudo: ALL=(ALL) NOPASSWD:ALL
    ssh_authorized_keys:
      - ssh-rsa AAA...
```

Substitua `ssh-rsa AAA...` pela sua chave SSH pública.

Estrutura de diretórios:

```
.
├── cloud-init/
│   ├── meta-data
│   └── user-data
├── custom-ubuntu.qcow2
└── noble-server-cloudimg-amd64.img
```

Gere o arquivo ISO:

```bash
genisoimage -o user-data.iso -V cidata -r cloud-init/
```

Para validar:

```bash
mkdir -p iso/
sudo mount user-data.iso -o loop iso/
cat iso/user-data
```

## Passo 3: Iniciar a VM no virt-manager

1. Abra virt-manager e clique em "Create a new virtual machine"
2. Selecione "Import existing disk image"
3. Escolha o arquivo `custom-ubuntu.qcow2`
4. Configure recursos (exemplo: 2GB RAM e 2 vCPU)
5. Marque "Customize configuration before install"
6. Clique em "Add Hardware" → "Storage"
7. Configure o arquivo `user-data.iso` como CDROM device
8. Clique "Begin Installation"

A VM inicializará e será acessível via SSH usando o IP da máquina.

**Customização opcional:**

```bash
sudo apt update
sudo apt install -y incus
sudo incus admin init --auto
```

## Passo 4: Generalizar a imagem

Execute na VM para remover informações específicas da máquina:

```bash
# Remove SSH keys, logs, and temp data
sudo rm -f /etc/ssh/ssh_host_*
sudo rm -f /root/.ssh/authorized_keys /home/ubuntu/.ssh/authorized_keys
sudo rm -rf /tmp/* /var/tmp/* /var/lib/cloud/seed/nocloud-net/

# Clean cloud-init logs
sudo cloud-init clean --logs

# Clean the /etc/machine-id files
sudo sh -c 'echo -n > /etc/machine-id && rm -f /var/lib/dbus/machine-id'

# Clean apt downloaded packages
sudo apt-get clean
sudo rm -rf /var/lib/apt/lists/*

# Remove bash history
sudo rm -f /root/.bash_history /home/ubuntu/.bash_history

# Poweroff
sudo systemctl poweroff
```

## Passo 5: Converter para imagem final

Após desligar a VM, execute:

```bash
qemu-img convert -f qcow2 -O qcow2 -o compat=1.1,lazy_refcounts=off custom-ubuntu.qcow2 final-incus-image.qcow2
```

A imagem `.qcow2` está pronta para importação na Magalu Cloud. Revise os pré-requisitos obrigatórios e o guia de boas práticas antes de importar.
