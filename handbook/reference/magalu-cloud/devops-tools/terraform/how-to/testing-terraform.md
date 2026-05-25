# Testando seu projeto terraform

Agora vamos executar o seu projeto terraform. Os comandos sugeridos abaixo seguem o fluxo básico de execução e verificação da ferramenta, mas para melhor compreender o seu funcionamento recomendamos visitar a documentação oficial a página do desenvolvedor: [Terraform Documentation](https://terraform.io/docs).

1. Inicialmente abra um seu terminal dentro da pasta onde está o projeto terraform (os arquivos `.tf`) e execute o comando `init` para validar o provider.

```bash
terraform init
```

2. Agora execute o seguinte comando para revisar as mudanças antes de aplicar:

```bash
terraform plan
```

3. E quando estiver seguro das alterações execute o comando abaixo para aplicá-las. Responda aos prompts de confirmação, caso sejam exibidos no seu terminal.

```bash
terraform apply
```

4. Por fim, para verificar as alterações aplicadas sobre seus recursos na Magalu Cloud, execute o comando abaixo.

```bash
terraform show
```
