# Conectando ao SQL Server

## Windows

### Baixar e Instalar o SSMS

1. [Baixar SSMS](https://learn.microsoft.com/en-us/ssms/download-sql-server-management-studio-ssms)

2. Instalar o SSMS:
   - Abra o arquivo `SSMS-Setup-<versão>.exe`
   - Clique em **Next** e aceite os termos de uso
   - Escolha um diretório de instalação (ou mantenha o padrão)
   - Clique em **Install** e aguarde a conclusão

### Conectar ao SQL Server

1. Abra o **SQL Server Management Studio**
2. Clique em **Connect**
3. Insira os seguintes detalhes:
   - **Server name**: `<IP-DA-VM>,1433`
   - **Authentication**: SQL Server Authentication
   - **Login**: `sa`
   - **Password**: `<SENHA>`
4. Clique em **Connect**

### Verificar a Conexão

Após conectar, execute:

```sql
SELECT @@SERVERNAME AS [Server Name], @@VERSION AS [SQL Server Version];
GO
```

Se a query retornar a versão do SQL Server, a conexão foi bem-sucedida.

## Linux

### Instalar Ferramentas do SQL Server

1. Adicione o repositório Microsoft:

```bash
curl https://packages.microsoft.com/keys/microsoft.asc | sudo apt-key add -
curl https://packages.microsoft.com/config/ubuntu/$(lsb_release -rs)/prod.list | sudo tee /etc/apt/sources.list.d/mssql-release.list
```

2. Atualize e instale os pacotes:

```bash
sudo apt-get update
sudo ACCEPT_EULA=Y apt-get install -y mssql-tools unixodbc-dev
```

3. Adicione ao PATH:

```bash
echo 'export PATH="$PATH:/opt/mssql-tools/bin"' >> ~/.bashrc
source ~/.bashrc
```

### Conectar ao SQL Server

1. Execute o comando para se conectar:

```bash
sqlcmd -S <IP-DA-VM>,1433 -U sa -P '<SENHA>'
```

Se conectar com sucesso, você verá o prompt interativo (`1>`).
