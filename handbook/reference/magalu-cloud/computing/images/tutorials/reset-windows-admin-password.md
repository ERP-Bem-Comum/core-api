# Restaurar senha do usuário Admin em VMs Windows via Snapshot

Este tutorial descreve como utilizar snapshots na Magalu Cloud para recuperar o acesso ao usuário `Administrator` em VMs Windows Server 2022, em caso de perda da senha.

A restauração de snapshot é o mecanismo de contingência padrão da MGC. De forma geral, essa contingência funciona da seguinte forma:

*   Gera uma **nova senha para o usuário** `Admin`, que pode ser resgatada no portal.
*   Permite que, no próximo login com o usuário `Admin`, o formulário de configuração da senha do usuário `Administrator` seja exibido novamente, possibilitando definir uma nova senha.

## Passo a passo para a recuperação

1.  Acesse o Portal da MGC (ou CLI);
2.  Localize sua VM Windows e selecione **Criar Snapshot**. (isso pode ser feito a qualquer momento, mesmo após ter perdido a senha dos usuários `Admin` e `Administrator`);
3.  Após o snapshot estar pronto, selecione **Restaurar Snapshot**.
4.  Aguarde o processo de restauração.

*   O sistema irá gerar automaticamente **uma nova senha para** o usuário `Admin`.
*   Essa senha pode ser consultada no Portal ou via CLI.

5.  Faça login na VM via RDP utilizando o usuário `Admin` e a nova senha.
6.  No primeiro login, será exibido novamente o **formulário solicitando a configuração da senha para o usuário** `Administrator`.
7.  Defina uma nova senha forte e guarde-a em local seguro.

> Você pode obter mais informações sobre criação e restauração de snapshot através dos seguintes documentos:
>
> *   Snapshots - Criar um snapshot
> *   Snapshots - Restaurar um snapshot

O processo de restauração de snapshot permite que o cliente recupere tanto o acesso ao usuário `Admin` quanto a senha do usuário `Administrator`, mesmo que ela tenha sido perdida.

Por isso, recomendamos utilizar snapshots como prática regular de contingência e gestão de suas VMs Windows na Magalu Cloud.
