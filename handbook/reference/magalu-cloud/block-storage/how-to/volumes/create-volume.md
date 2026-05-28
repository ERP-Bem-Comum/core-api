# Criar volume

Você pode criar um novo volume utilizando Block Storage ou Virtual Machines.

## Pré-requisitos

- Para anexar um volume a uma instância é preciso que estejam provisionados na mesma região e zona.
- O nome do volume deve obedecer as regras de nomeação do volume

## Origem em Block Storage

**Caminho:** Inicio > Menu > Block Storage > Criar volume

Na página de Block Storage, clique no botão para Criar volume.

1. Para criar o Volume é necessário escolher a região de hospedagem convenientemente. Lembre-se de escolher a mesma região e zona da instância que irá anexar.

2. Escolha o tipo do volume. O tipo de volume varia de acordo com o IOPS desejado.

3. Defina o tamanho do volume que atenderá sua aplicação.

4. E por fim, defina o nome do seu volume conforme regras de nomeação definidas.

5. Clique em "Criar volume"

## Origem em Virtual Machines

**Caminho:** Inicio > Menu > Virtual Machines > Instâncias > Detalhes da Instâncias > Volume > Anexar volume novo

Na listagem de volumes da página de Volumes em Detalhes de Instância:

1. Clique em "Anexar volume novo"

2. Para criar o Volume é necessário escolher a região de hospedagem convenientemente. Lembre-se de escolher a mesma região e zona da instância que irá anexar.

3. Escolha o tipo do volume. O tipo de volume varia de acordo com o valor IOPS desejado.

4. Defina o tamanho do volume que atenderá sua aplicação.

5. E por fim, defina o nome do seu volume. Para o nome do volume são permitidas apenas letras minúsculas, hífen, underline e números e precisa ser um nome único na mesma região.

6. Clique em "Criar volume"

## Criação via CLI

Para criar um volume você precisará fornecer as seguintes flags:

| Nome | Tipo | Descrição | Obrigatório |
|------|------|-----------|-------------|
| name | string | Nome do Volume | Sim |
| description | string | Descrição do Volume | Não |
| type | object | Tipo de volume para criar o Volume | Sim |
| type.id | string | ID do tipo de volume | Não |
| type.name | string | Nome do tipo de volume | Não |
| size | integer | Tamanho em GiB de 10 a 1024 GiB | Sim |
| availability-zone | string | Zona de disponibilidade | Não |
| encrypted | string | Ativa a encriptação do disco | Não |

### Comando básico

```bash
mgc block-storage volumes create --name test-cli --size 10 --type.name cloud_nvme1k
```

### Criando volume com criptografia ativada

```bash
mgc block-storage volumes create --name test-cli --size 10 --type.name cloud_nvme1k --encrypted=true
```

> **Nota:** Após a criação de um novo volume, é preciso formatá-lo e montá-lo. Essa formatação é necessária apenas para criar um sistema de arquivos no volume.
