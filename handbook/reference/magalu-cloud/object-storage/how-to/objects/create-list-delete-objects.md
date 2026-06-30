# Criar, Listar e Apagar Objetos

Os objetos são a unidade básica de armazenamento em um serviço de armazenamento de objetos. Ao utilizá-los você poderá fazer operações de arquivos, imagens, vídeos, documentos, entre outros tipos de dados, todos sendo interpretados como objetos. Neste tutorial, você aprenderá a criar, listar e apagar objetos em um bucket utilizando o terminal do magalu cloud, a MGC CLI e outras clis disponíveis.

---

## Upload de Objeto

Fazer o upload de um objeto para um bucket de armazenamento é uma tarefa fundamental para gerenciar seus dados.

### Console

Após selecionar o bucket que irá receber o objeto, clique no botão **Upload**.

1. Clique em **Selecionar arquivos** e escolha um ou mais arquivos para adicionar ao seu bucket. Se um arquivo com o mesmo nome já existir no bucket e pasta, este último será salvo como uma versão anterior e o arquivo carregado se tornará a versão atual do objeto.
2. Escolha a Classe de Armazenamento de acordo com a finalidade dos seus objetos. Ao fazer upload de múltiplos objetos, todos usarão a mesma Classe de Armazenamento.
3. Defina a **Pasta de destino** escolhendo uma das pastas existentes ou criando uma nova.
4. Ao finalizar clique em **Fazer Upload**. O tempo para a finalização do upload pode variar de acordo com o tamanho do(s) arquivo(s) selecionado(s).

> **Nota:** No Object Storage, pastas são estruturas lógicas criadas usando prefixos de nomes de objetos e o caractere de barra (/). Por exemplo, ao definir "prod" como nome de pasta para "imagem.png", a interface do Console exibirá "prod" como pasta e "imagem.png" dentro dela. No entanto, o nome real do arquivo será "prod/imagem.png", e ele estará no mesmo nível hierárquico de outros arquivos no bucket.

### MGC-CLI

```bash
mgc object-storage objects upload CAMINHO_DO_OBJETO NOME_DO_BUCKET
```

### AWS-CLI

```bash
aws s3 cp CAMINHO_DO_OBJETO s3://NOME_DO_BUCKET
```

#### Utilizando o AWS s3api:

```bash
aws s3api put-object --bucket NOME_DO_BUCKET --body CAMINHO_DO_OBJETO
```

### RCLONE

```bash
rclone copy CAMINHO_DO_OBJETO NOME_DO_REMOTO:NOME_DO_BUCKET
```

---

## Upload de um Diretório com Objetos

Realizar o upload de um diretório é uma maneira eficiente de transferir múltiplos arquivos para um bucket de armazenamento.

### Console

Atualmente, a interface do Console não suporta a funcionalidade de upload de um diretório com objetos, mas é possível realizar o upload de diversos objetos simultaneamente.

Para fazer isso verifique o item **Upload de Objetos**.

### MGC-CLI

```bash
mgc object-storage objects upload-dir DIRETORIO_LOCAL NOME_DO_BUCKET
```

### AWS-CLI

```bash
aws s3 cp DIRETORIO_LOCAL s3://NOME_DO_BUCKET
```

### RCLONE

```bash
rclone copy DIRETORIO_LOCAL NOME_DO_REMOTO:NOME_DO_BUCKET
```

---

## Listar Objetos

Listar os objetos dentro de um bucket é uma etapa fundamental para gerenciar seus dados.

### Console

Ao acessar um bucket você pode visualizar todos os objetos e pastas presentes. A listagem exibe informações básicas sobre os objetos e permite a realização de diversas ações sobre os mesmos, facilitando o gerenciamento.

Nesta mesma tela também é possível filtrar pelo nome de qualquer objeto ou pasta deste bucket.

### MGC-CLI

```bash
mgc object-storage objects list NOME_DO_BUCKET
```

### AWS-CLI

```bash
aws s3 ls s3://NOME_DO_BUCKET
```

#### Utilizando o AWS s3api:

```bash
aws s3api list-objects --bucket NOME_DO_BUCKET
```

### RCLONE

```bash
rclone ls NOME_DO_REMOTO:NOME_DO_BUCKET
```

---

## Excluir Objeto

Excluir objetos de um bucket pode ser necessário para liberar espaço ou remover dados desatualizados.

### Console

É possível excluir um objeto de duas formas:

* Na lista de objetos clique nos 3 pontinhos e selecione "Excluir Objeto".
* Ao acessar um objeto clique que no botão "Ações" e então "Excluir Objeto".

Uma modal irá aparecer pedindo a confirmação da exclusão. Digite "Excluir" para confirmar.

### MGC-CLI

```bash
mgc object-storage objects delete NOME_DO_BUCKET/NOME_DO_OBJETO
```

### AWS-CLI

```bash
aws s3 rm s3://NOME_DO_BUCKET/NOME_DO_OBJETO --recursive
```

#### Utilizando o AWS s3api:

```bash
aws s3api delete-object --bucket NOME_DO_BUCKET --key NOME_DO_OBJETO
```

### RCLONE

```bash
rclone delete NOME_DO_REMOTO:NOME_DO_BUCKET/NOME_DO_OBJETO
```

> **Aviso:** Essa ação é irreversível.

---

## Excluir Todos os Objetos

Excluir todos os objetos de um bucket pode ser necessário em diversas situações, como a limpeza de dados antigos ou a reorganização de armazenamento.

### Console

Atualmente, a interface do Console não permite a exclusão de múltiplos objetos simultaneamente. Para realizar essa operação, utilize as ferramentas de linha de comando (CLI) ou de forma individual.

### MGC-CLI

Para excluir todos os objetos em um bucket:

```bash
mgc object-storage objects delete-all NOME_DO_BUCKET
```

Para excluir todos os objetos com determinado prefixo:

```bash
mgc object-storage objects delete-all NOME_DO_BUCKET/PREFIXO/
```

Se você estiver excluindo vários itens, talvez deseje não confirmar a exclusão de cada um deles, para isso utilize `--no-confirm` ao final do comando:

```bash
mgc object-storage objects delete-all NOME_DO_BUCKET --no-confirm
```

### AWS-CLI

```bash
aws s3 rm s3://NOME_DO_BUCKET --recursive
```

#### Utilizando o AWS s3api:

```bash
# Lista todos objetos no bucket
aws s3api list-objects --bucket NOME_BUCKET --query "Contents[].Key"

# Remove todos objetos presentes
aws s3api delete-objects --bucket NOME_BUCKET --delete "Objects=[{Key=OBJECT_KEY}]"
```

### RCLONE

```bash
rclone delete "NOME_DO_REMOTO":NOME_DO_BUCKET
```

> **Aviso:** Essa ação é irreversível.
