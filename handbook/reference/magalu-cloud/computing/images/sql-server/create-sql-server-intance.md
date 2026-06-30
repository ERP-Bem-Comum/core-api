# Criar Máquina Virtual com SQL Server em Diferentes Sistemas Operacionais via CLI

## Pré-requisitos

- Conta criada na Magalu Cloud
- CLI `mgc` instalada e autenticada

## Visão Geral

Como boa prática, recomenda-se criar um **Block Storage separado** para armazenar os dados do SQL Server. Isso permite:

- Melhor performance para operações de I/O
- Flexibilidade para redimensionar o armazenamento conforme necessário
- Isolamento dos dados do sistema operacional

## Criar Block Storage para o SQL Server

### 1. Criar o volume

```bash
mgc block-storage volumes create \
  --name="sql-server-data" \
  --size=100 \
  --type.name="cloud_nvme5k"
```

**Importante:** Guarde o ID do volume, ele será utilizado na criação da VM.

### Detalhes do Volume

O parâmetro `--type.name` define o desempenho do volume. A opção `cloud_nvme5k` representa um volume NVMe com aproximadamente 5.000 IOPS, indicado para uso padrão de banco de dados em produção.

Para avaliar outros tipos de volume:

```bash
mgc block-storage volume-types list -o table
```

**Nota:** O volume de Block Storage e a Máquina Virtual devem estar na mesma Availability Zone.

## Criar a Máquina Virtual com SQL Server

### Windows

```bash
mgc virtual-machine instances create \
  --name="sql-server-vm" \
  --image.name="sql-server-enterprise-2022-windows" \
  --machine-type.name="BV8-32-100" \
  --availability-zone="br-se1-a" \
  --volumes='[{"id":"<ID_DO_VOLUME>"}]'
```

### Linux

Para VMs Linux, é obrigatório informar uma chave SSH no momento da criação.

#### 1. Listar chaves SSH cadastradas

```bash
mgc profile ssh-keys list -o json
```

Retorno esperado:

```json
{
  "id": "87faeiou9-8kk9-4fe3-a373-pp831c5353a7",
  "name": "ssh-user-mgc",
  "key_type": "ssh-ed25519"
}
```

#### 2. Criar uma chave SSH (se necessário)

```bash
mgc profile ssh-keys create \
  --name="ssh-user-mgc" \
  --key="$(cat ~/.ssh/id_ed25519.pub)"
```

#### 3. Criar a VM Linux com SQL Server

```bash
mgc virtual-machine instances create \
  --name="sql-server-vm" \
  --image.name="sql-server-enterprise-2022-linux" \
  --machine-type.name="BV8-32-100" \
  --availability-zone="br-se1-a" \
  --volumes='[{"id":"<ID_DO_VOLUME>"}]' \
  --ssh-key-name="ssh-user-mgc"
```

### Imagens Disponíveis

| Image Name | Descrição |
|---|---|
| sql-server-enterprise-2022-windows | SQL Server 2022 Enterprise + Windows Datacenter |
| sql-server-enterprise-2022-linux | SQL Server 2022 Enterprise + Linux |
| sql-server-standard-2022-windows | SQL Server 2022 Standard + Windows Datacenter |
| sql-server-standard-2022-linux | SQL Server 2022 Standard + Linux |
| sql-server-web-2022-windows | SQL Server 2022 Web + Windows Datacenter |
| sql-server-web-2022-linux | SQL Server 2022 Web + Linux |

## Configurar Security Groups para SQL Server

Para que aplicações externas acessem o SQL Server, a porta 1433 precisa ser liberada.

| Protocolo | Porta | Origem recomendada | Descrição |
|---|---|---|---|
| TCP | 1433 | IP da aplicação ou rede privada | Permite conexões externas ao SQL Server |
