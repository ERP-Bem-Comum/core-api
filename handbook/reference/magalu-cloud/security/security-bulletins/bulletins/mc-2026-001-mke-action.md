# ⚠️ [Ação Necessária] CVE-2026-31431 no Magalu Kubernetes Engine

**Boletim relacionado:** MC-2026-001 - Copy Fail (CVE-2026-31431)
**Data de Publicação:** 11/05/2026
**Gravidade:** 🔴 Crítica

## 👋 Olá

Na Magalu Cloud, a segurança dos dados e estabilidade da infraestrutura são prioridades. Identificamos que a vulnerabilidade crítica CVE-2026-31431 possui um vetor de impacto adicional no Magalu Kubernetes Engine (MKE) que exige intervenção direta.

## 🛡️ O que aconteceu?

Uma falha foi descoberta no módulo `algif_aead` do Kernel do Linux. Em ambientes de containers, essa falha pode permitir que um usuário mal-intencionado "escape" do isolamento de um container e acesse o sistema operacional do Node, comprometendo a segurança de todo o Cluster.

Detalhes técnicos completos estão disponíveis em: https://copy.fail/

## ☁️ O que nós estamos fazendo?

Nossa equipe de engenharia de plataforma está trabalhando para mitigar os riscos na camada gerenciada:

1. **Novos Clusters e Nodes:** Todos os novos Nodes e Clusters criados a partir do dia 15/05/26 utilizarão imagem de sistema operacional corrigida e segura.
2. **Control Plane:** A partir do dia 15/05/26 será realizada rotação nos Nodes de Control Plane com as novas imagens, finalizada até 20/05/26.

## 🚀 O que você precisa fazer?

Os seus **Node Pools** exigem intervenção para que o patch de segurança seja aplicado. Disponibilizamos um **DaemonSet** para executar o processo de mitigação.

**Recomendação:** Aplicar imediatamente este patch em todos os Clusters MKE.

**Observações importantes:**
- O patch não gera perda de dados
- Como boa prática, teste em ambiente de homologação antes de produção
- Garanta que backups estão em dia e funcionais
- A aplicação está sob sua responsabilidade

### Aplicando o DaemonSet

Crie um arquivo `mgc-patch-copy-fail-cve.yaml`:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  namespace: default
  name: mgc-patch-copy-fail-cve
  labels:
    app: mgc-patch-copy-fail-cve
spec:
  selector:
    matchLabels:
      app: mgc-patch-copy-fail-cve
  template:
    metadata:
      labels:
        app: mgc-patch-copy-fail-cve
    spec:
      hostPID: true
      priorityClassName: system-node-critical
      containers:
      - image: harbor-k8s.csre-plat-prod.1.yel.se1.br.jaxyendy.com/dockerhub/library/busybox:1.37.0
        name: mgc-patch-copy-fail-cve
        command: ["/bin/sh", "-c"]
        args:
        - |
          echo "install algif_aead /bin/false" > /host/etc/modprobe.d/disable-algif.conf
          chroot /host /usr/sbin/modprobe -r algif_aead 2>/dev/null && echo "[OK]: algif module unloaded, CVE-2026-31431 mitigated" || echo "[WARN]: algif module is in use, Node $(cat /host/etc/hostname) needs reboot"
          sleep 24h
        securityContext:
          privileged: true
          runAsUser: 0
        volumeMounts:
        - name: root-host
          mountPath: /host
      volumes:
      - name: root-host
        hostPath:
          path: /
```

Aplique com:

```bash
kubectl apply -f mgc-patch-copy-fail-cve.yaml
```

### Verificação de Sucesso

```bash
kubectl logs --tail 2000 -n default -l app=mgc-patch-copy-fail-cve | grep OK
```

Esperado:

```
mgc-patch-copy-fail-cve-bvm4m [OK]: algif module unloaded, CVE-2026-31431 mitigated
[...]
```

### Verificação de Falha

```bash
kubectl logs --tail 2000 -n default -l app=mgc-patch-copy-fail-cve | grep WARN
```

Esperado:

```
mgc-patch-copy-fail-cve-bvm4m [WARN]: algif module is in use, Node k8s-test-001-991f1a92b needs reboot
[...]
```

Se houver falhas, o módulo está carregado e sendo utilizado. Reinicie manualmente o Node:

```bash
# Força remoção de Pods, ignorando DaemonSets
# AVISO: Pods que utilizam emptyDir perderão seus dados
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data --force

# Reinicializa o Node
kubectl debug node/<node-name> -it --image=busybox:1.37.0 -- chroot /host reboot

# Aguarda finalização (média de 1 minuto)
kubectl wait --for=condition=Ready node/<node-name> --timeout=300s

# Adiciona Node de volta ao Cluster
kubectl uncordon <node-name>
```

### Remover o DaemonSet

Não recomenda-se remoção até que novas imagens base sejam lançadas. A partir de 15/05/26 pode ser removido:

```bash
kubectl delete daemonset mgc-patch-copy-fail-cve
```

## 📞 Precisa de ajuda?

A equipe está disponível para apoiar. Para dúvidas ou mais informações, acesse o [Portal de Atendimento](https://help.magalu.cloud).
