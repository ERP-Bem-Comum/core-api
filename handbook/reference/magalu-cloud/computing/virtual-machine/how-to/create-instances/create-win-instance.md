# Criar instância Windows

Para criar uma instância execute os comandos abaixo:

## Console

👣Início > Menu > Virtual Machines

Na página de Virtual Machines, clique no botão para "Criar instância".

1. A sua máquina será criada na região correspondente a que você estiver logado no console. Recomendamos escolher a região mais próxima aos destinatários da sua aplicação.

2. Clique em Escolha uma imagem e selecione Windows Server e Windows Server 2022.

3. Escolha um tipo instância, observe que você pode optar por 3 categorias, são elas:
   - Low Memory
   - Standard Memory
   - High Memory

Selecione o tipo desejado e após o tamanho do disco. Defina a quantidade de vCPUs e de memória RAM mais adequada para a aplicação que deseja.

4. Opcionalmente, escolha se deseja atribuir um IPv4 público para essa instância. Por padrão, o IPv6 público é gerado automaticamente após a criação da instância.

> **info**
> Associar um IPv4 Público à instância serve para exposição de serviços na Internet conforme estiver configurado no Security Group relacionado a ela.

5. Após isso nomeie a sua instância e clique no botão Criar instância.

Aguarde o final do processo para poder conectar na sua máquina virtual.

## CLI

Para criar uma instância do Windows Server 2022, usaremos o seguinte comando:

```
mgc virtual-machines instances create --name="name_instance" --machine-type.name="type_instance" --image.name "windows-server-2022"
```

> **info**
> Por padrão a máquina é criada na região Sudeste, caso queira criá-la na região Nordeste adicione ao final do comando acima a seguinte informação: --region="br-ne1"

Após executar o comando, você receberá uma resposta semelhante a esta:

```
┌──────────────────────────────────────┐
│ ID                                   │
├──────────────────────────────────────┤
│ a22b308f-e3fe-4239-af67-902cc0745775 │
└──────────────────────────────────────┘
```

Esta resposta indica que a instância foi criada com sucesso e fornece o ID da instância gerada.
