# Como criar API Key

## Como criar

⚠️ **Aviso**: Mantenha sua API Key em sigilo para evitar acessos não autorizados.

A autenticação com API Key é ideal para quando você não tem a CLI instalada. Siga estas etapas simples para se autenticar:

### Via Console

1. Acesse o [ID Magalu](https://id.magalu.com/api-keys)
2. Certifique-se de que você está autenticado e acessando o tenant em que deseja criar a API Key (é possível verificar o tenant atual no canto superior direito da tela)
3. Clique em Criar API Key
4. Defina um nome para a API Key
5. Selecione o período de expiração
6. Selecione as aplicações da Magalu Cloud que deseja dar permissão
7. Copie a API Key

### Via CLI

1. Execute o comando:

```bash
mgc auth api-key create --name="api-key-name"
```

2. Selecione quais escopos a API Key terá acesso, apertando enter nos scopes desejados.

3. Finalize clicando tab. A API Key será criada com retorno similar a:

```
Select scopes:  > Virtual Machine [Read]
uuid: f4b2345c-fue1-4176-a525-fasdfaaa
```

4. Como o retorno só traz o `UUID`, consulte para obter a API Key:

```bash
mgc auth api-key get f4b2345c-fue1-4176-a525-fasdfaaa
```

Pronto, sua API Key será retornada e já poderá ser utilizada.
