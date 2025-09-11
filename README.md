# 🍽️ Sistema de Pedidos - Mania Mix

Um sistema web completo e responsivo para a gestão de pedidos da área de restaurante do mercado de bairro Mania Mix. Desenvolvido para ser rápido, intuitivo e funcionar em tempo real, otimizando o fluxo de trabalho da cozinha.

![Dashboard do Sistema Mania Mix].
<img width="1919" height="1079" alt="Captura de tela 2025-09-11 192002" src="https://github.com/user-attachments/assets/7b0c762e-9ba7-4505-b642-3fce9d99b49a" />
---

## ✨ Funcionalidades Principais

### Gestão de Pedidos em Tempo Real
* **📝 Lançamento de Novos Pedidos:** Interface clara para adicionar pratos, acompanhamentos, extras e dados do cliente.
* **🔄 Fila de Pedidos Dinâmica:** Acompanhe os pedidos com atualização automática e status visuais (`Pendente`, `Em Preparo`, `Pronto`, `Cancelado`).
* **🔍 Filtros e Busca:** Encontre pedidos rapidamente com filtros por status, tipo (Loja, Retirada, Entrega) e uma barra de busca por nome ou número.
* **⭐ Sistema de Prioridade:** Marque pedidos como urgentes para que se destaquem na fila.
* **🖨️ Impressão de Comandas:** Geração de recibos otimizados para impressoras térmicas, tanto para o cliente quanto para uso interno da cozinha.

### Cardápio do Dia Dinâmico
* **📄 Gerenciamento Fácil:** Crie e edite o cardápio do dia de forma visual, agrupando pratos e acompanhamentos.
* **🖨️ Versão para Impressão:** Gere e imprima uma versão A4 do cardápio para exibir aos clientes.

### Histórico e Relatórios
* **📊 Consulta ao Histórico:** Acesse o histórico de todos os pedidos filtrando por data.
* **📈 Relatórios em PDF:** Gere relatórios de performance diários e semanais em PDF, com resumo de pratos vendidos e total de pedidos.
* **🔐 Limpeza Segura:** Função de limpeza de dados semanais protegida por senha para manter o sistema performático.

---

## 💻 Tecnologias Utilizadas

* **Frontend:** `HTML5`, `CSS3` (com Flexbox & Grid para responsividade) e `JavaScript (Vanilla)`.
* **Backend & Database:** `Firebase` (Firestore Realtime Database & Authentication).
* **Bibliotecas:** `jsPDF` para a geração de relatórios e `Font Awesome` para os ícones.

---

## 🚀 Como Executar o Projeto

1.  **Clone o repositório:**
    ```bash
    git clone [https://github.com/seu-usuario/seu-repositorio.git](https://github.com/seu-usuario/seu-repositorio.git)
    ```

2.  **Configure o Firebase:**
    * Crie um projeto no [console do Firebase](https://console.firebase.google.com/).
    * Ative os serviços **Firestore Database** e **Authentication** (com e-mail/senha).
    * No arquivo `script.js`, substitua o objeto `firebaseConfig` pelas credenciais do **seu** projeto Firebase.

3.  **Abra o `index.html`:**
    * Como é um projeto frontend puro, basta abrir o arquivo `index.html` no seu navegador de preferência.

---

Feito com ❤️ por **[Seu Nome/Usuário do Github]**.
