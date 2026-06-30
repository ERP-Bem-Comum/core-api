# Configuração do SQL Server no Linux

## Acessando a VM

### Conectando via SSH

1. Abra um terminal no seu computador local
2. Conecte-se à VM usando o comando SSH:

```
ssh ubuntu@<ip-da-vm>
```

**Dicas de Segurança**

- Substitua `<ip-da-vm>` pelo endereço IP público da sua VM
- Se estiver usando chave SSH, certifique-se de que ela está configurada corretamente

### Verificando o Acesso

Após conectar, você deve ver o prompt do terminal mudar para algo como:

```
ubuntu@sql-server-vm:~$
```

## Alterar a senha do usuário `sa`

Para alterar a senha do usuário padrão `sa` utilize o comando:

```
sudo /opt/mssql/bin/mssql-conf set-sa-password
```

Defina a nova senha de acesso.

## Configurando o Volume de Block Storage

### Verificar o Volume Montado

1. Liste os discos disponíveis para confirmar que o volume está montado:

```
lsblk
```

### Configurar Diretórios e Permissões

1. Criar diretórios para dados e logs:

```
sudo mkdir -p /mnt/mssql/data
sudo mkdir -p /mnt/mssql/log
```

2. Definir permissões apropriadas:

```
sudo chown -R mssql:mssql /mnt/mssql
sudo chmod -R 770 /mnt/mssql
```

### Configurar Variáveis de Ambiente do SQL Server

1. Criar arquivo de override para o systemd:

```
sudo mkdir -p /etc/systemd/system/mssql-server.service.d
sudo nano /etc/systemd/system/mssql-server.service.d/override.conf
```

2. Adicionar o seguinte conteúdo ao arquivo:

```
[Service]
Environment="MSSQL_DATA_DIR=/mnt/mssql/data"
Environment="MSSQL_LOG_DIR=/mnt/mssql/log"
```

3. Salvar o arquivo (Ctrl + O, Enter) e sair (Ctrl + X)

### Aplicar e Validar as Configurações

1. Recarregar e reiniciar o serviço:

```
sudo systemctl daemon-reexec
sudo systemctl restart mssql-server
```

2. Verificar se o serviço está rodando:

```
sudo systemctl status mssql-server
```

### Validar a Configuração

1. Conectar ao SQL Server:

```
/opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P 'SuaSenhaAqui'
```

2. Criar um banco de teste:

```
CREATE DATABASE TesteVolume;
GO
```

3. Verificar a localização dos arquivos:

```
SELECT
    name AS [Logical Name],
    physical_name AS [File Path]
FROM sys.master_files
WHERE database_id = DB_ID('TesteVolume');
GO
```

Para instruções sobre como se conectar ao SQL Server, consulte [Conectando ao SQL Server](connecting-sql-server.md).
