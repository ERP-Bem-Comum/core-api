# Access Control Lists (ACLs)

ACLs são utilizadas para controlar o acesso de tenants a buckets e objetos, permitindo um controle restrito de suas funções.

> Para mais informações sobre ACLs, consulte a documentação de ACL.

---

## ACL em Buckets

É possível estabelecer uma ACL para um bucket por completo, sendo que as permissões não são passadas de forma recursiva, logo, os objetos ainda são acessíveis por terceiros.

### Criar ACL do Bucket

**Console:**

1. Clique no ícone de menu ao lado do bucket para o qual deseja configurar permissões.
2. Selecione a opção "Criar Acesso via ACL".
3. Insira o e-mail da pessoa a quem deseja conceder acesso e clique em "Adicionar".
4. Escolha o nível de acesso desejado para o usuário:
   - **Leitura:** O usuário poderá listar e acessar os metadados dos objetos no bucket.
   - **Leitura e Escrita:** Além das permissões de Leitura, o usuário poderá fazer o upload de objetos no bucket.
5. Clique em "Criar Acesso".

**MGC-CLI:**

```bash
mgc object-storage buckets acl set --dst NOME_DO_BUCKET --public-read
```

Opções disponíveis:

- `--private:` O proprietário (Owner) possui FULL_CONTROL. Apenas o proprietário e os delegados da conta têm direitos de acesso.
- `--public-read:` O proprietário (Owner) possui FULL_CONTROL. Qualquer pessoa pode ler o bucket.
- `--grant-write array (object):` Permite que os destinatários criem objetos neste bucket.

**AWS-CLI:**

```bash
aws s3 mb s3://NOME_DO_BUCKET
```

Utilizando o AWS s3api:

```bash
aws s3api put-bucket-acl --bucket NOME_DO_BUCKET --acl "ACL-Grantee"
```

Para mais informações sobre as opções de configuração no "ACL-Grantee", consulte a documentação de ACL da AWS CLI.

**RClone:**

```bash
rclone config
```

O RClone não oferece suporte direto para ACL vinculada ao Bucket. Durante a configuração, você pode definir ACL ao criar um remote.

---

### Listar Bucket com ACL

Para acessar um bucket com permissões concedidas por meio de uma Lista de Controle de Acesso (ACL), utilize os seguintes comandos para listar todos os objetos disponíveis para o seu acesso:

**MGC-CLI:**

```bash
mgc object-storage objects list NOME_DO_BUCKET
```

**AWS-CLI:**

```bash
aws s3 ls s3://NOME_DO_BUCKET --recursive
```

Utilizando o AWS s3api:

```bash
aws s3api list-objects --bucket NOME_DO_BUCKET
```

**RClone:**

```bash
rclone lsd NOME_DO_REMOTO:NOME_DO_BUCKET
```

---

### Verificar ACL do Bucket

**Console:**

1. Clique no ícone de menu ao lado do bucket para o qual deseja configurar permissões.
2. Selecione a opção "Criar Acesso via ACL".
3. Na lista de acessos concedidos para o bucket, você pode:
   - Deletar um acesso clicando no ícone de exclusão.
   - Alterar o nível de acesso entre "Leitura" e "Leitura e Escrita".
4. Clique em "Criar Acesso" para atualizar a lista.

**MGC-CLI:**

```bash
mgc object-storage buckets acl get NOME_DO_BUCKET
```

**AWS-CLI:**

```bash
aws s3api get-bucket-acl --bucket NOME_DO_BUCKET
```

**RClone:**

```bash
rclone config
```

O RClone não oferece uma função direta para gerenciar ACL vinculada ao bucket. Durante a configuração, você pode definir a ACL ao criar um remote.

---

## ACL de Objetos

É possível adicionar permissões para objetos específicos, permitindo um controle mais granular sobre o acesso. Além disso, permitindo que as permissões estejam presentes não apenas nos buckets, mas também em seus conteúdos.

### Criar ACL de um Objeto

**Console:**
Atualmente, a criação de listas de controle de acesso (ACL) para objetos não é suportada diretamente pelo Console. Essa configuração deve ser realizada por meio da CLI.

**MGC-CLI:**

```bash
mgc object-storage objects acl set "mgc-bucket-1"/"my-file"
```

Você pode adicionar a flag correspondente às suas necessidades de acesso. As opções disponíveis são:

- **--private:** O proprietário (Owner) possui FULL_CONTROL. Apenas o proprietário e os delegados da conta têm direitos de acesso.
- **--public-read:** O proprietário (Owner) possui FULL_CONTROL. Qualquer pessoa pode acessar o objeto para LEITURA (Read).
- **--grant-write array (object):** Permite que os destinatários criem objetos no bucket especificado.

**AWS-CLI:**

```bash
aws s3 cp "MEU-OBJETO" s3://mgc-bucket-1 --acl public-read
```

Utilizando o AWS s3api:

```bash
aws s3api put-object-acl --bucket "mgc-bucket-1" --key "MEU-OBJETO" --acl "ACL-Grantee"
```

Para determinar o tipo de acesso a configurar em "ACL-Grantee", consulte a documentação de ACL da AWS CLI.

**RClone:**

```bash
rclone copy "my-file" "NOME_DO_REMOTO":"mgc-bucket-1"/"my-file" --acl ACL
```

No RClone, a ACL é configurada durante o upload ou cópia do objeto. O valor para ACL segue o mesmo padrão descrito na documentação de ACL da AWS CLI.

---

### Verificar ACL do Objeto

**Console:**
Atualmente, o gerenciamento de ACLs de objetos não está disponível na interface do Console da Magalu Cloud. No entanto, para proporcionar uma experiência mais eficiente, recomenda-se o uso do **RClone GUI**, uma ferramenta compatível com o produto de Armazenamento de Objetos.

**MGC-CLI:**

```bash
mgc object-storage objects acl get NOME_DO_BUCKET/NOME_DO_OBJETO
```

**AWS-CLI:**

```bash
aws s3api get-object-acl --bucket mgc-bucket-1 --key my-file
```

**RClone:**
Atualmente, o RClone não oferece um comando específico para listar a ACL de um objeto diretamente. No entanto, você pode visualizar as configurações de ACL durante o processo de sincronização ou cópia de objetos.

---

### Upload de um Objeto Público

Fazer o upload de um objeto público significa que qualquer pessoa com o link poderá acessar esse arquivo.

**Console:**
Atualmente, a interface do Console não suporta a funcionalidade de upload de objetos. Para realizar essa operação, utilize as ferramentas de linha de comando (CLI).

**MGC-CLI:**
Atualmente, não é possível fazer upload de objeto público via MGC-CLI.

**AWS-CLI:**

```bash
aws s3 cp "MEU-OBJETO" s3://mgc-bucket-1 --acl public-read
```

Utilizando o AWS s3api:

```bash
aws s3api put-object-acl --bucket "mgc-bucket-1" --key "MEU-OBJETO" --acl public-read
```

**RClone:**

```bash
rclone copy "MEU-OBJETO" "NOME_DO_REMOTO":"mgc-bucket-1"/"MEU-OBJETO" --acl public-read
```

---

### Tornar um Objeto Público

Tornar um objeto público permite que qualquer pessoa com o link tenha acesso a ele.

**Console:**
Atualmente, a interface do Console não suporta a funcionalidade de upload de objetos. Para realizar essa operação, utilize as ferramentas de linha de comando (CLI).

**MGC-CLI:**

```bash
mgc object-storage objects acl set NOME_DO_BUCKET/CAMINHO_DO_OBJETO --public-read
```

**AWS-CLI:**

```bash
aws s3 cp "MEU-OBJETO" s3://mgc-bucket-1 --acl public-read
```

Utilizando o AWS s3api:

```bash
aws s3api put-object-acl --bucket NOME_DO_BUCKET --key CAMINHO_DO_OBJETO --acl public-read
```

**RClone:**

```bash
rclone copy "MEU-OBJETO" "NOME_DO_REMOTO":"mgc-bucket-1"/"MEU-OBJETO" --acl public-read
```

---

## Criar ACL para Usuários Distintos

Atualmente, a configuração de ACLs granulares para usuários distintos não é suportada diretamente pelo comando de ACL. Para gerenciar permissões complexas e definir níveis de acesso específicos para diferentes usuários, utilize Bucket Policies.

**Exemplos práticos:**

- **Leitura:** Departamentos de auditoria precisam acessar os logs, mas não modificá-los.
- **Leitura e Escrita:** Equipe de TI precisa adicionar novos logs e atualizar os existentes.

**Dados de Exemplo:**

- **Nome do bucket:** `meu-bucket-super-secreto`
- **Tenant ID do departamento de auditoria (somente leitura):** `7e1a0618-319f-4c87-a38d-67adb33da365`
- **Tenant ID da equipe de TI (leitura e escrita):** `3df4456b-0390-467c-8b03-97a7d704c0fc`

**AWS-CLI:**

```bash
aws s3api put-bucket-acl --bucket meu-bucket-super-secreto --grant-read id=00000000-0000-0000-0000-000000000 --grant-full-control id=00000000-0000-0000-0000-000000000
```

**Dicas de Uso:** Teste sempre as configurações com arquivos de teste antes de aplicá-las a dados críticos para garantir que as permissões estejam corretamente configuradas.

> Ao configurar a ACL do bucket, observe que as regras não são aplicáveis de forma recursiva, ou seja, não são transmitidas para os objetos contidos no bucket. Para aplicar regras de acesso aos objetos, utilize a ACL para Objetos.
