# Configurar senha para o usuário Administrator manualmente

Este tutorial é útil em duas situações:

- Para VMs Windows criadas **antes de outubro de 2025**, quando ainda não existia o fluxo automático de configuração da senha do usuário `Administrator`;
- Para casos em que, por algum motivo, o **formulário de configuração da senha** não tenha sido exibido no primeiro login do usuário `Admin` da VM Windows Server 2022;

Em ambos os cenários, é possível configurar manualmente a senha do `Administrator` para garantir acesso de emergência em situações críticas.

## Por que essa senha é importante

A senha do usuário `Administrator` é a credencial de emergência da sua VM.

Ela pode ser necessária em situações como:

- Perda de confiança com domínios.
- Perda de privilégios do usuário admin.

> A senha do usuário `Administrator` é única e não pode ser resgatada pela MGC. Se perdida, só poderá ser recuperada pelo próprio cliente.

## Passo a passo para configurar a senha manualmente

1. Acesse a sua VM com o usuário `Admin`;
   - Use o IP público da VM e a senha do usuário `Admin` resgatada via Portal ou CLI da MGC.

2. **Abra um prompt do PowerShell com privilégios administrativos**:
   - Clique no "Menu Iniciar";
   - Digite `PowerShell`;
   - Clique com o botão direito em `Windows PowerShell` e selecione **Executar como administrador**;
   - Execute o comando para definir a senha do usuário `Administrator`:

```
net user Administrator "Minh@SenhaF0rt3"
```

> Se a sua senha possuir caracteres especiais, coloque-a entre aspas duplas como no exemplo anterior.

3. Guarde a senha em um local seguro.

Após executar esses passos, o usuário `Administrator` terá uma senha configurada e poderá ser usado em cenários de recuperação da VM.
