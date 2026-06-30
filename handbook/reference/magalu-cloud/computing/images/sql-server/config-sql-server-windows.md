# Configuração do SQL Server no Windows

## Autenticação e Acesso

### Método de Autenticação

Por padrão, a imagem do SQL Server está configurada para usar apenas **SQL Server Authentication**. A autenticação do Windows (Windows Authentication) está desabilitada por padrão.

### Credenciais Padrão

Ao criar a VM, você terá acesso com as seguintes credenciais:

*   **Login**: `sa`
*   **Senha**: `P@ssw0rd`

**Importante**: Altere a senha do usuário `sa` imediatamente após o primeiro acesso. Esta é uma medida de segurança crítica.

### Alterando a Senha

1.  Conecte-se ao SQL Server usando as credenciais padrão
2.  Execute o seguinte comando para alterar a senha:

```sql
ALTER LOGIN sa WITH PASSWORD = 'NovaSenhaForte123!';
GO
```

**Boas Práticas**

*   Use uma senha forte com pelo menos 12 caracteres
*   Combine letras maiúsculas, minúsculas, números e caracteres especiais
*   Evite usar palavras comuns ou sequências óbvias
*   Considere usar um gerenciador de senhas para armazenar a senha com segurança

## Configurando o Volume de Block Storage

### Ativar e formatar o disco com diskpart

1.  Abra o Prompt de Comando como Administrador
2.  Execute o comando `diskpart` para iniciar o utilitário de gerenciamento de disco
3.  Verifique se o volume já está disponível e qual letra está usando com o comando `list volume`

Deverá aparecer algo assim:

```
Volume ###  Ltr  Label        Fs     Type        Size     Status     Info
----------  ---  -----------  -----  ----------  -------  ---------  --------
Volume 0     C   WINDOWS      NTFS   Partition     99 GB  Healthy    Boot
Volume 1         Recovery     NTFS   Partition    499 MB  Healthy    Hidden
Volume 2         SYSTEM       FAT32  Partition    100 MB  Healthy    System
Volume 3     D                NTFS   Partition     99 GB  Healthy
```

### Garantindo permissões

1.  Verifique se os diretórios `D:\SQLData` e `D:\SQLLogs` estão criados.
2.  Garanta a permissão de escrita:

```cmd
icacls D:\SQLData /grant "NT SERVICE\MSSQLSERVER:(OI)(CI)F"
icacls D:\SQLLogs /grant "NT SERVICE\MSSQLSERVER:(OI)(CI)F"
```

### Configurando SQL Server para apontar para o volume

1.  Abra o SQL Server Management Studio (SSMS)
2.  Conecte-se à instância local
3.  No Object Explorer, clique com o botão direito na instância e selecione "Properties"
4.  Na aba "Database Settings", altere os caminhos padrão para:
    *   Data files: `D:\SQLData`
    *   Log files: `D:\SQLLogs`
5.  Clique em "OK" para salvar as alterações
6.  Reinicie o serviço pelo CMD: `Restart-Service -Name 'MSSQLSERVER'`

### Verificando a Configuração

1.  Vamos verificar se os dados estão sendo salvos no volume, crie um banco simple:

```sql
CREATE DATABASE TesteVolume;
GO
```

2.  Em seguida execute a query:

```sql
SELECT name AS LogicalName,
       physical_name AS FilePath,
       type_desc AS FileType
FROM sys.master_files
WHERE database_id = DB_ID('TesteVolume');
```

Resultado esperado:

```
LogicalName     FilePath                         FileType
-------------   -------------------------------  ---------
TesteVolume     D:\SQLData\TesteVolume.mdf       ROWS
TesteVolume_log D:\SQLLogs\TesteVolume_log.ldf   LOG
```
