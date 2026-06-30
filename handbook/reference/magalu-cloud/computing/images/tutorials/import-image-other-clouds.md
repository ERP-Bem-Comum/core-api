# Importando Suas Imagens de Outras Clouds

Migrar cargas de trabalho de outros provedores de nuvem para a Magalu Cloud é um cenário comum. Felizmente, as ferramentas de virtualização e nuvem atuais permitem que você exporte suas imagens de VMs já existentes e as prepare para uso em um novo ambiente, desde que você siga os passos corretos.

## Processo Geral

De forma geral, o processo segue estes passos:

1. **Exportar** a imagem no provedor de origem.
2. **Generalizar** a imagem para remover dados e configurações específicas.
3. **Converter** para o formato **QCOW2**.
4. **Upload** para um bucket da Magalu Cloud.
5. **Gerar URL pré-assinada** válida por mais de 12 horas.
6. **Importar** a imagem via CLI para a Magalu Cloud.

Veja mais detalhes de pré-reqs e exemplos de importação [aqui](../import-custom-images/overview.md).

## Fluxo de Exportação por Provedor

Cada provedor de nuvem tem seu próprio método para exportar discos virtuais. Embora as ferramentas sejam diferentes, o objetivo é o mesmo: obter um arquivo de imagem que você possa baixar.

### 1. Amazon Web Services (AWS):

* Use o [VM Import/Export](https://aws.amazon.com/pt/ec2/vm-import/) ou crie uma **AMI** (Amazon Machine Image) a partir de uma instância existente.

* Exporte a AMI para um bucket no **S3** com o comando:

```
aws ec2 export-image —-image-id <ami-id> —-disk-image-format VMDK —s3-export-location $3
```

* Faça o download da imagem exportada para sua máquina.

### 2. Microsoft Azure:

* Crie um snapshot do disco gerenciado.

* Gere uma **URL SAS** temporária para o VHD.

* Baixe o VHD com o `AzCopy`:

```
azcopy copy "<sas-url>" ./disk.vhd
```

[Download a Linux VHD from Azure](https://learn.microsoft.com/en-us/azure/virtual-machines/linux/download-vhd?tabs=azure-portal)

### 3. Google Cloud Platform (GCP):

* No **GCP**, a forma mais comum é exportar um disco virtual a partir de um snapshot. Você pode usar a CLI com o comando `gcloud compute images export` para exportar o disco para um bucket do Google Cloud Storage (GCS), de onde poderá baixá-la.

## Exemplo de Migração: GCP -> Magalu Cloud

Neste exemplo, criamos uma VM na GCP com o Ubuntu 24.04 e instalamos o gerenciador de containers Incus nesta imagem (`sudo apt install -y incus`).

### Passo 1: Preparar a imagem

* Antes de exportar, generalize a VM para remover dados específicos da GCP que poderiam causar conflitos.

* Para generalizar a imagem, é necessário remover chaves SSH do host e do usuário, limpar logs do cloud-init e históricos em geral.

> Remova o arquivo `/etc/cloud/cloud.cfg.d/91-gce.cfg`, que força o `cloud-init` a usar apenas metadados da GCP.

```
# Remove SSH keys, logs, and temp data.
$ sudo rm -f /etc/ssh/ssh_host_*
$ sudo rm -f /root/.ssh/authorized_keys /home/ubuntu/.ssh/authorized_keys
$ sudo rm -rf /tmp/* /var/tmp/* /var/lib/cloud/seed/nocloud-net/

# Clean cloud-init logs
$ sudo cloud-init clean --logs

# Clean the /etc/machine-id files
$ sudo sh -c 'echo -n > /etc/machine-id && rm -f /var/lib/dbus/machine-id'

# Clean apt downloaded packages
$ sudo apt-get clean
$ sudo rm -rf /var/lib/apt/lists/*

# Remove bash history
$ sudo rm -f /root/.bash_history /home/ubuntu/.bash_history

# Purge Google Cloud-specific packages (recommended)
$ sudo rm /etc/cloud/cloud.cfg.d/91-gce.cfg
$ sudo apt-get purge -y google-guest-agent google-compute-engine

# Now, power off the VM.
$ sudo systemctl poweroff
```

> Para garantir a integridade da imagem, desligue completamente a máquina virtual antes de iniciar o processo de exportação.

### Passo 2: Exportar a imagem no GCP

* **Criar a Imagem gerenciada no GCP a partir do disco da sua VM:**

```
gcloud compute images create <image name> --source-disk <vm source disk> --source-disk-zone <zone> --family <family name> --storage-location <region>
```

* **Exporte a Imagem do gerenciamento do GCP para um bucket do Google Cloud Storage (GCS):**

```
gcloud compute images export --destination-uri gs://<destination-bucket>/<image-name>.tar.gz --image <image-name>
```

Obs: A imagem exportada virá em formato `tar.gz`, contendo um arquivo de disco raw.

* **Baixe o arquivo para sua máquina local:**

```
gcloud storage cp gs://<bucket-name>/<image-name>.tar.gz .
```

### Passo 3: Converter e preparar para importação

* O arquivo exportado da GCP está no formato `raw`.

* Para a Magalu Cloud, ele precisa ser convertido para `.qcow2`, que é otimizado para ambientes de virtualização.

* Primeiro, extraia o arquivo `raw` do `tar.gz` e depois use o comando `qemu-img convert`:

```
tar -xvf <image-name>.tar.gz
qemu-img convert -f raw -O qcow2 disk.raw disk.qcow2
```

### Passo 4: Upload para a Magalu Cloud

```
mgc os objects upload --dst='<bucekt>/<nome-da-imagem>.qcow2' --src='disk.qcow2' --region <bucket-region>
```

* Gere uma URL pré-assinada válida (>12h):

> É crucial que a URL tenha um prazo de validade maior que 12 horas para que o processo de importação não expire.

```
mgc os objects presign --dst='<bucket>/<nome-da-imagem>.qcow2' --expires-in="24h" --region <bucket-region>
```

### Passo 5: Importar a imagem

```
mgc vm images custom create \
  --name="<image-name>" \
  --architecture="x86/64" \
  --license="unlicensed" \
  --platform="linux" \
  --url="https://<region>.magaluobjects.com/<bucket>/<image-name>.qcow2?<signature-hashes>"
id: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

* Após iniciar a importação, o status da imagem será importing.
* Monitore o progresso com o comando `mgc vm images custom get`.
* Quando o status mudar para active, a imagem estará pronta para uso.

### Passo 6: Criar a instância e validar

* Crie a VM a partir da imagem:

```
mgc vm instances create --name="<vm-name>" --image.id=<image-id>' --machine-type.name="<machine-type>" --ssh-key-name="<keypair-name>"
id: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

> Nos logs da instância, você deve ver o `cloud-init` injetando sua chave SSH. Isso confirma que a migração foi bem-sucedida.
