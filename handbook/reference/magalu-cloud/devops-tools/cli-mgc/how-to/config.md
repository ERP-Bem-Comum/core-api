# Configurando a CLI

É possível definir configurações padrão a serem utilizadas em todos os comandos, entregando uma experiência mais fluida no uso da CLI. Vamos ver algumas das opções.

## Definir padrão de formato de saída

O comando abaixo executa a alteração permanente do tipo de saída da CLI para JSON, ou seja, todos os comandos executados após este terão suas saídas nesse formato se não houver um outro formato especificado na linha do comando.

```bash
mgc config set --key defaultOutput --value json
```

Outros valores possíveis para essa configuração seriam: table, yaml e json.

Para mais detalhes de como utilizar cada um dos formatos, execute o comando de ajuda abaixo.

```bash
mgc --output help
```

Se você desejar alterar o formato de saída para um comando específico, basta adicionar a flag -o seguida do formato desejado.

```bash
mgc virtual-machines instances list -o table
```

## Definir região

Ao definir uma região padrão para a CLI todos os comandos executados farão referência a ela, salvo se outra região for informada na linha de comando.

```bash
mgc config set --key region --value br-ne1
```

Consulte a lista de regiões disponíveis:

```bash
mgc config get-schema region -o jsonpath=$.enum
```

## Remover highlights para scripts

Caso esteja utilizando a CLI em scripts, é comum querer remover os highlights (cores, loading...) das operações. Basta utilizar a flag `--raw`:

```bash
mgc vm instances list --raw
```

## Outras configurações

Existem outras opções de configuração disponíveis:

* Chunk Size: tamanho do chunk em requisições multipart de Object Storage.
* Workers: número de processos paralelos em operações do Object Storage.

```bash
mgc config list
mgc config set --key nome_da_config --value valor_a_aplicar
```

## Arquivo local de configurações

As configurações alteradas pela CLI serão armazenadas em um arquivo local dentro da sua pasta de usuário: `$HOME/.config/mgc/<PERFIL>/cli.yaml`

No Windows essa pasta se localiza em: `$env:APPDATA\mgc\<PERFIL>\`

Onde `<PERFIL>` é o nome do perfil que você deseja configurar.
