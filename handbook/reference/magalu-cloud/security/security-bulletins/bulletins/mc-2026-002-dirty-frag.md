# MC-2026-002: Vulnerabilidade "Dirty Frag" no Kernel Linux (CVE-2026-43284)

**ID do Boletim:** MC-2026-0002
**Data de Publicação:** 08/05/2026
**Gravidade:** 🔴 Alta

---

## 📝 Resumo

Uma vulnerabilidade crítica chamada "Dirty Frag" (CVE-2026-43284) foi descoberta no Kernel Linux. Conforme descrito no boletim, "um usuário local sem privilégios" pode "obtenha acesso de administrador (root) ao sistema."

A Magalu Cloud está atualizando suas imagens oficiais e infraestrutura global em resposta à ameaça.

---

## 🛡️ Impacto

A falha ocorre na gestão de memória durante a descriptografia de pacotes. Um atacante com acesso local pode corromper essa memória para elevar seus privilégios.

- **Risco:** Escalação de Privilégios Local (LPE)
- **Sistemas Afetados:** Distribuições Linux com versões de kernel desde 2017, incluindo kernels LTS populares

---

## 🚀 O que você precisa fazer

### 1. Atualização Definitiva (Recomendado)

Atualize o Kernel para a versão mais recente:

**Ubuntu/Debian:**

```
sudo apt update && sudo apt upgrade linux-image-generic
```

**CentOS/RHEL/AlmaLinux:**

```
sudo dnf update kernel
```

A atualização entra em vigor após reboot. Confirme a versão com `uname -r`.

### 2. Mitigação Temporária

Se não puder reiniciar imediatamente, execute como root:

```
sudo sh -c "printf 'blacklist esp4\nblacklist esp6\nblacklist rxrpc' >> /etc/modprobe.d/dirtyfrag-mitigation.conf; rmmod esp4 esp6 rxrpc 2>/dev/null; echo 3 > /proc/sys/vm/drop_caches; true"
```

**Aviso:** A desativação dos módulos `esp4` e `esp6` interromperá conexões IPsec/VPN. Se seu ambiente depende disso, priorize a atualização com reboot.

---

## ☁️ Ações da Magalu Cloud

- **Imagens Oficiais:** Todas as imagens de sistemas operacionais estão sendo atualizadas; novas instâncias já contarão com as correções
- **Infraestrutura Gerenciada:** Serviços gerenciados serão atualizados automaticamente nas janelas de manutenção, sem impacto previsto

---

## 📞 Precisa de ajuda?

Contate: [help@magalu.cloud](mailto:help@magalu.cloud)

---

## 🔗 Referências

- [CVE-2026-43284 (NIST NVD)](https://nvd.nist.gov/vuln/detail/CVE-2026-43284)
