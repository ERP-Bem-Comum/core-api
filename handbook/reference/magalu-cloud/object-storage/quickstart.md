# Início Rápido

O serviço de object storage da magalu cloud é uma solução de armazenamento de dados inteiramente brasileira compatível com s3.

---

> Atualmente, todas ferramentas podem ser utilizadas por meio da mgc-cli, que permite operações de objetos nos buckets disponíveis, entre outros.

## Criando Credenciais

Para utilizar a cli é necessário prover as credenciais do usuário. Inicialmente, sendo necessário logar com seu tenant pelo comando:

```bash
mgc auth login
```

### Criando api-key para Object Storage

**Via Console:**

👣 _Inicio > Menu > Object Storage_

Na seção de **Object Storage**, acesse a aba **API Keys** e siga os passos abaixo:

- **Iniciar Criação**: Clique no botão **Criar API Key**.
- **Identificação**: Defina um nome descritivo para a chave.
- **Conta Proprietária**: Se aplicável, selecione a conta que será a proprietária desta credencial.
- **Expiração**: Escolha uma data de validade para a chave ou selecione a opção para mantê-la sem expiração.
- **Revisão e Confirmação**: Revise cuidadosamente os dados, pois "não é possível editar a API Key após a criação". Clique em **Criar API Key** e confirme na janela que será exibida.

**Via MGC-CLI:**

1. Gere uma chave utilizando:

```bash
mgc object-storage api-key create NOME_DA_CHAVE
```

2. Use o comando abaixo e copie o uuid da chave criada:

```bash
mgc object-storage api-key list
```

3. Defina a chave a criada como a ser utilizada:

```bash
mgc object-storage api-key set UUID_DA_CHAVE
```

---

## Criando seu Primeiro Bucket

Para criar um bucket utilizando o mgc-cli, utiliza-se:

```bash
mgc object-storage buckets create NOME_DO_BUCKET
```

### Criando um Objeto

Para criar o objeto, é necessário informar o caminho do arquivo, seja na máquina local ou na nuvem, e o nome do bucket onde ele será depositado. Utilize o comando:

```bash
mgc object-storage objects upload CAMINHO_DO_OBJETO NOME_DO_BUCKET
```

### Listando Objetos

Este comando retornará os nomes de todos os objetos em um bucket.

```bash
mgc object-storage objects list NOME_DO_BUCKET
```

### Apagando um Objeto

Atente-se, pois apagar um objeto é uma ação irreversível, resultando na exclusão permanente dos dados. Para utilizá-la:

```bash
mgc object-storage objects delete NOME_DO_BUCKET/NOME_DO_OBJETO
```

## Listando um bucket

A listagem dos buckets irá retornar os nomes e outros metadados de cada bucket em um tenant. Tais dados são importantes para a gestão de informações e são utilizados para operações como deleção. Para realizar:

```bash
mgc object-storage buckets list
```

## Apagando um Bucket

Apagar um bucket deve ser feito com cuidado, pois todos os objetos serão perdidos. Além disso, é necessário que o bucket esteja vazio, caso não se queira forçar o apagamento.

### Bucket Vazio

```bash
mgc object-storage buckets delete NOME_DO_BUCKET
```

### Bucket com Objetos

```bash
mgc object-storage buckets delete NOME_DO_BUCKET --recursive
```

---

## Considerações Adicionais

Existem diversas funcionalidades disponíveis em nosso serviço de object storage, para tutoriais mais específicos siga para a aba de como fazer.
