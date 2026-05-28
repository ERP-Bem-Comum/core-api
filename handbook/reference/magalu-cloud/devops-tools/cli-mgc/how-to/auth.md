# Autenticação

## Autenticação Padrão

Para fazer a autenticação na CLI e ter sua credencial armazenada no arquivo de configuração, utilize o seguinte comando:

```
mgc auth login
```

Este comando abrirá uma janela do seu navegador padrão diretamente no site do ID Magalu, onde você deverá fazer seu login. Ao terminar o procedimento e fechar o navegador, a CLI exibirá a confirmação e seu token de acesso será salvo no arquivo `$HOME/.config/mgc/<PERFIL>/auth.yaml`

Onde PERFIL é o nome do perfil que você deseja configurar.

Caso precise do token de acesso para usar com a API da Magalu Cloud, digite o comando abaixo:

```
mgc auth access-token
```

## Autenticação com API Key

> A autenticação com API Key é indicada para criação de automações ou scripts.

Para utilizar a API Key, o primeiro passo é criar uma.

Nós oferecemos duas formas de utilização:

### 1. API Key como variável de ambiente

Para utilizar a API Key como variável de ambiente, basta configurar as variáveis

Desta forma, ao utilizar a CLI, automaticamente já usará a API Key como forma de autenticação.

> Caso não queira mais utilizar a API Key como forma de autentação, é necessário remover a variável de ambiente.

### 2. API Key diretamente no comando

Para utilizar a API Key na execução dos comandos, é necessário adicionar a flag `--api-key="api-key-value"`

```
mgc vm instances list --api-key="api-key-value"
```

## Autenticação Headless

A autenticação Headless poderá ser útil caso esteja realizando o processo em uma máquina virtual onde não possui um browser.

Siga o passo a passo:

1. Na máquina virtual, com a CLI já instalada execute o comando no terminal

```
mgc auth login --headless
```

2. Copie a URL gerada para uma máquina com browser.

3. Realize o Login no ID Magalu.

4. Você será redirecionado para uma URL localhost, copie essa URL inteira.

5. Cole esta URL no terminal da máquina virtual.
