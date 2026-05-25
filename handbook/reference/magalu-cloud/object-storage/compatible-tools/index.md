# Visão Geral

A **Magalu Cloud** é uma solução robusta de armazenamento de objetos que segue o protocolo S3, oferecendo uma alternativa confiável e escalável ao AWS S3. A compatibilidade com ferramentas populares do ecossistema S3 torna o **Magalu Cloud** uma opção atraente para empresas e desenvolvedores que buscam integrar seus fluxos de trabalho existentes a uma plataforma de armazenamento eficiente, de alto desempenho e com suporte local.

Este documento detalha as ferramentas compatíveis com a Magalu Cloud, focando em suas funcionalidades, compatibilidade e instruções de configuração.

---

## Vantagens da Compatibilidade com Magalu Cloud

A **Magalu Cloud** oferece inúmeras vantagens em termos de compatibilidade, especialmente para aqueles que já estão familiarizados com o ecossistema S3. Com suporte para ferramentas como **AWS CLI** e **RClone**, a transição para a Magalu Cloud é simples e rápida, mantendo a integridade dos fluxos de trabalho estabelecidos.

* **Fácil Migração**: Suporte total a ferramentas que utilizam o protocolo S3, permitindo uma migração sem complicações para a Magalu Cloud.
* **Escalabilidade e Desempenho**: Estrutura projetada para grandes volumes de dados e alta performance.
* **Suporte Completo a Funcionalidades Críticas**: Operações como criação de buckets, gerenciamento de permissões, upload/download de objetos e versionamento são totalmente suportadas.

---

## Funcionalidades Suportadas por Ferramentas

As três principais ferramentas compatíveis com a Magalu Cloud – **MGC CLI**, **AWS CLI** e **RClone** – oferecem diversas funcionalidades para gerenciar buckets e objetos. Abaixo, uma comparação das principais capacidades e limitações de cada ferramenta.

### Buckets

* **Criar, Listar, Deletar, Conversão (público/privado), Versionamento**:
  * Suportado em: MGC CLI ✅, AWS CLI ✅, RClone ✅
* **Permissionamento (ACL/Bucket Policy)**:
  * Suportado em: MGC CLI ✅, AWS CLI ✅
  * Limitado em: RClone ➀
* **URL Pública**:
  * Suportado em: MGC CLI ✅
  * Não suportado: AWS CLI ❌, RClone ❌

### Objetos

* **Upload, Download, Deletar, Conversão (público/privado), Versionamento**:
  * Suportado em: MGC CLI ✅, AWS CLI ✅, RClone ✅
* **Permissionamento(ACL)**:
  * Suportado em: MGC CLI ✅, AWS CLI ✅
  * Não suportado: RClone ❌
* **URL Pública**:
  * Suportado em: MGC CLI ✅, AWS CLI ✅
  * Não suportado: RClone ❌
* **URL Presigned**:
  * Suportado em: MGC CLI ✅, AWS CLI ✅, RClone ✅

### Detalhes e Observações

➀ O RClone não suporta download e exclusão de versões de objetos.

---

## Compatibilidade Ampliada com SDKs

A **Magalu Cloud** também oferece compatibilidade com SDKs que utilizam o protocolo S3, possibilitando uma integração perfeita com diversas linguagens de programação. Isso permite que desenvolvedores utilizem bibliotecas populares, como o **Boto3** para Python, para realizar operações em buckets e objetos hospedados na Magalu Cloud.

---

## Conclusão

A **Magalu Cloud** destaca-se pela compatibilidade com ferramentas e protocolos amplamente usados, como AWS CLI e RClone, além de oferecer suporte nativo ao protocolo S3. Essa compatibilidade garante uma migração suave e sem interrupções, permitindo que os usuários continuem utilizando suas ferramentas preferidas em um ambiente de armazenamento seguro e de alto desempenho. **Magalu Cloud** é a escolha ideal para quem busca escalabilidade, flexibilidade e integração perfeita com o ecossistema S3.

---

## Links Úteis

Para explorar mais ferramentas compatíveis e guias de configuração, confira os tutoriais abaixo:

* [MGC CLI](mgc-cli-compatibility.md)
* [AWS CLI](aws-configuration.md)
* [Boto3](boto3-compatibility.md)
* [Rclone](rclone-compatibility.md)
