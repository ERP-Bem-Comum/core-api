# Administrar Tenants

A CLI permite selecionar sobre qual tenant os comandos serão executados. Para isso há uma area de gestão de tenants na opção `auth tenant`.

```
mgc auth tenant
```

Aqui você pode listar os tenant disponíveis com o comando abaixo.

```
mgc auth tenant list
```

Verificar qual o tenant ativo no momento (current):

```
mgc auth tenant current
```

E alterar o tenant ativo, dentre os disponíveis. Para isso existem duas formas.

Usando o comando `set` e informando qual o tenant desejado explicitamente apontando para seu UUID.

```
mgc auth tenant set ad468668-4cd4-4336-905e-90a390502e97
```

Ou então usando o comando `select`, que torna esse processo muito mais fácil, porque exibirá na tela a lista de tenants disponíveis em modo de seleção interativo.

```
mgc auth tenant select
```
