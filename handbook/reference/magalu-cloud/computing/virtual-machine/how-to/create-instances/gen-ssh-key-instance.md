# Gerar Chaves SSH

Chaves SSH consistem em um par de chaves: uma pública e uma privada. A chave pública é carregada para a instância de VM, enquanto a chave privada permanece segura no seu dispositivo local. Juntas, elas permitem a autenticação sem senha ao acessar a VM.

Para gerar o par de chaves SSH siga as instruções abaixo de acordo com o seus sistema operacional

## Em Sistemas Linux ou MacOS

1. Abra o terminal: A maioria das distribuições Linux já vem com o OpenSSH instalado, então você pode usar o terminal diretamente.

2. Gerar a chave SSH:

   - Execute o seguinte comando:

     ```
     ssh-keygen -t rsa
     ```

   - Você será solicitado a escolher um local para salvar a chave. Pressione Enter para aceitar o local padrão (~/.ssh/id_rsa).
   - Em seguida, será solicitado a criar uma senha para proteger a chave privada (opcional, mas recomendado).

3. Verifique a chave SSH: Sua chave pública estará disponível em ~/.ssh/id_rsa.pub. Para visualizar, use:

   ```
   cat ~/.ssh/id_rsa.pub
   ```

4. [Inserir uma Chave SSH](set-ssh-key-instance.md) sua chave SSH seguindo as seguintes orientações.

## Em Sistemas Windows

1. Instalar o OpenSSH (se necessário): No Windows 10 e 11, o OpenSSH geralmente já vem instalado. Caso contrário, você pode instalar através das "Configurações" > "Aplicativos" > "Recursos Opcionais" > "Adicionar recurso" e adicionar "Cliente OpenSSH".

2. Abra o PowerShell: Use o atalho Win + X e selecione "Windows PowerShell".

3. Gerar a chave SSH:

   - Execute o comando:

     ```
     ssh-keygen -t rsa
     ```

   - Siga os prompts para salvar a chave no local padrão (C:\Users\SeuNomeDeUsuário\.ssh\id_rsa) e criar uma senha para a chave.

4. Verifique a chave SSH: Use o comando abaixo para visualizar a chave pública

   ```
   Get-Content ~/.ssh/id_rsa.pub
   ```
