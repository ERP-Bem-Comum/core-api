# Criar, Listar e Deletar Buckets

## Buckets

A API de S3 da Magalu cloud oferece acesso programático a uma variedade de funcionalidades, expostas como endpoints REST, acessíveis via HTTPS e compatíveis com o MGCCLI e outras CLIs. Com esta API você pode:

* Criar e gerenciar buckets
* Armazenar com segurança objetos de qualquer formato e tamanho
* Baixar objetos previamente armazenados
* Gerenciar seus arquivos objetos na nuvem de forma segura

Ao criar um bucket é atribuído um URL no formato:

```
https://br-ne1.magaluobjects.com/mgc-bucket-1
```

> Para acesso ao URL do Bucket é necessário definir a ACL do Bucket.

---

## Criar Buckets

Existem dois principais métodos para se criar um bucket na Magalu Cloud, por meio do console ou por meio de CLI, como o MGC-CLI.

Ao criar um bucket, você poderá armazenar e gerenciar seus objetos de forma eficiente e segura. Os buckets servem como contêineres que organizam seus dados, permitindo um acesso rápido e estruturado.

### Via Console

Início > Menu > Object Storage

Na página Object Storage, clique no botão para **Criar bucket**.

1. **Escolha a Região**: Selecione a região de hospedagem mais próxima de sua aplicação para otimizar o acesso aos dados. Se os dados forem acessados de uma localização geográfica específica, escolha a região de hospedagem correspondente.

2. **Configuração de Permissão**: Por padrão, o bucket é configurado como Privado. Escolha a opção de permissão desejada:

   * **Privado**: Somente usuários que se conectam ao bucket usando API Keys poderão listar seu conteúdo. Após a criação do bucket, você pode configurar Listas de Controle de Acesso (ACL) para autorizar usuários específicos a acessá-lo.

   * **Público**: Permite que qualquer pessoa possa listar os objetos armazenados no bucket. Note que o acesso será somente para leitura dos dados.

### Via MGC-CLI

```bash
mgc object-storage buckets create NOME_DO_BUCKET
```

### Via AWS-CLI

```bash
aws s3 mb s3://NOME_DO_BUCKET
```

#### Utilizando o AWS s3api:

```bash
aws s3api create-bucket --bucket NOME_DO_BUCKET
```

### Via RCLONE

```bash
rclone mkdir NOME_DO_REMOTO:NOME_DO_BUCKET
```

> Escolha um nome único para o seu bucket. Sugerimos um nome que atenda às regras de nomenclatura dos buckets. O nome do bucket será validado, e se o nome desejado não estiver disponível, a criação do bucket não será permitida.

---

## Listar Buckets

Para recuperar os nomes e datas de criação dos buckets, existem os métodos abaixo.

### Via Console

Início > Menu > Object Storage

Na página de Object Storage, você pode visualizar todos os buckets para cada região. A listagem exibe informações básicas sobre cada bucket, facilitando o gerenciamento.

### Via MGC-CLI

```bash
mgc object-storage buckets list
```

### Via AWS-CLI

```bash
aws s3 ls
```

#### Utilizando o AWS s3api:

```bash
aws s3api list-buckets
```

### Via RCLONE

```bash
rclone lsd NOME_DO_REMOTO:
```

---

## Apagar Bucket

Apagar buckets é um processo que deve apresentar cuidado, pois é irreversível.

Além disso, é necessário que o bucket esteja vazio para que ele seja deletado. Todavia, caso a operação ocorra via console, então todos os objetos serão automaticamente deletados.

### Bucket Vazio

#### Via Console

Início > Menu > Object Storage > Menu do Bucket > Excluir Bucket

1. Na página de Armazenamento de Objetos, você pode visualizar todos os buckets para cada região. Encontre o bucket desejado e selecione a opção de gerenciamento, clicando em **Excluir Bucket**.

2. Confirme a exclusão reescrevendo o nome do bucket que deseja excluir.

#### Via MGC-CLI

```bash
# Apaga o bucket
mgc object-storage buckets delete NOME_BUCKET
```

#### Via AWS-CLI

```bash
# Apaga o bucket
aws s3 rb s3://NOME_BUCKET
```

#### Utilizando o AWS s3api:

```bash
# Apaga o bucket
aws s3api delete-bucket --bucket NOME_DO_BUCKET
```

#### Via RCLONE

```bash
rclone rmdir NOME_DO_REMOTO:NOME_BUCKET
```

### Bucket com Objetos

#### Via Console

Início > Menu > Object Storage > Menu do Bucket > Excluir Bucket

1. Na página de Armazenamento de Objetos, você pode visualizar todos os buckets para cada região. Encontre o bucket desejado e selecione a opção de gerenciamento, clicando em **Excluir Bucket**.

2. Confirme a exclusão reescrevendo o nome do bucket que deseja excluir.

#### Via MGC-CLI

Permite a exclusão de buckets que ainda contêm objetos, iniciando a remoção completa de forma assíncrona:

```bash
mgc object-storage buckets delete NOME_BUCKET --recursive
```

* Os objetos são removidos em background, sem a necessidade de manter a sessão do terminal ativa.
* Durante o processo, o bucket permanece **travado** e indisponível para operações como `PUT`, `GET` ou `LIST`.
* Qualquer `PUT` que for bem-sucedido nesse bucket durante o processo de deleção será **automaticamente removido**.

#### Via AWS-CLI

```bash
# Remove todos os objetos presentes no bucket
aws s3 rm s3://NOME_BUCKET --recursive
# Apaga o bucket vazio
aws s3 rb s3://NOME_BUCKET
```

#### Utilizando o AWS s3api:

```bash
# Lista todos objetos no bucket
aws s3api list-objects --bucket NOME_BUCKET --query "Contents[].Key"
# Remove todos objetos presentes
aws s3api delete-objects --bucket NOME_BUCKET --delete "Objects=[{Key=OBJECT_KEY}]"
# Apaga o bucket vazio
aws s3api delete-bucket --bucket NOME_BUCKET
```

#### Via RCLONE

```bash
# Deleta todos os objetos em conjunto ao bucket
rclone purge REMOTO:NOME_BUCKET
```

> **Aviso:** A exclusão do bucket irá remover permanentemente todo o seu conteúdo, incluindo objetos armazenados. **Esta ação é irreversível.**
