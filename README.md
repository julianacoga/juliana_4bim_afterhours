# 🎟️ AFTER HOURS

### Discover. Experience. Enjoy.

![Status](https://img.shields.io/badge/Status-Concluído-8A2BE2?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

## 🌙 Sobre o projeto

O **After Hours** é uma plataforma web de descoberta de eventos e venda de ingressos, criada para conectar pessoas a experiências inesquecíveis.

De shows de artistas nacionais e internacionais a festivais, musicais, peças de teatro e festas, a plataforma reúne diferentes experiências em um único lugar.

O projeto foi desenvolvido como atividade avaliativa do 4º bimestre da disciplina de Desenvolvimento Web 1 (DW1), na UTFPR — Campus Campo Mourão.

## ✨ Funcionalidades

### 👤 Área do cliente

- 🔍 Exploração de eventos.
- 🎫 Consulta e compra de ingressos.
- 🛒 Carrinho de compras.
- 💳 Finalização de pedidos e simulação de pagamento.
- 📱 Visualização dos ingressos adquiridos.
- ⚙️ Gerenciamento do perfil.
- 🔐 Cadastro, login e logout.
- 📧 Recuperação de senha por e-mail.

### 🛠️ Área administrativa

- 👥 Gerenciamento de pessoas, clientes e funcionários.
- 💼 Gerenciamento de cargos.
- 🏷️ Gerenciamento de categorias.
- 🎤 Gerenciamento de eventos.
- 🎟️ Gerenciamento de ingressos.
- 🖼️ Upload e processamento de imagens.

## 🚀 Tecnologias utilizadas

### Frontend

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

### Backend

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)

### Bibliotecas e dependências

| Biblioteca | Finalidade |
|---|---|
| bcryptjs | Hash de senhas |
| dotenv | Variáveis de ambiente |
| multer | Upload de imagens |
| sharp | Processamento de imagens |
| nodemailer | Envio de e-mails |
| express-session | Gerenciamento de sessões |
| express-rate-limit | Limitação de requisições |
| pg | Conexão com PostgreSQL |
| cors | Controle de requisições entre origens |

## 🧩 Arquitetura

O projeto utiliza a arquitetura **Cliente/Servidor** e segue o padrão **MVC (Model-View-Controller)**.

- **Model:** comunicação com o banco de dados.
- **View:** interface e interação com o usuário.
- **Controller:** processamento das requisições e regras de negócio.
- **Router:** organização e direcionamento dos endpoints.

## 🗄️ Banco de dados

O banco de dados relacional foi desenvolvido utilizando PostgreSQL, com relacionamentos 1:1, 1:N e N:N.

### 📊 After Hours em números

| Informação | Quantidade |
|---|---:|
| Tabelas de negócio | 12 |
| Registros no banco | 306 |
| Eventos cadastrados | 41 |
| Registros de ingressos | 121 |
| Categorias | 20 |

Todas as tabelas de negócio possuem pelo menos 10 registros para demonstração do sistema.

### 🔗 Diagrama Entidade-Relacionamento

![Diagrama do banco de dados](docs/diagramaBanco.png)

## 🎨 Wireframes

Representação da estrutura e organização das interfaces do sistema.

![Wireframes](docs/wireframes.png)

## 🔒 Segurança

A aplicação conta com mecanismos de autenticação e proteção de dados:

- Hash de senhas utilizando bcrypt.
- Autenticação baseada em sessões e cookies.
- Controle de acesso por tipo de usuário.
- Proteção de credenciais por variáveis de ambiente.
- Recuperação de senha por e-mail real.
- Tokens de recuperação com expiração e uso único.
- Limitação de tentativas de recuperação de senha.

## 💻 Como executar o projeto

### 📋 Pré-requisitos

- Node.js
- npm
- PostgreSQL
- Git

### 1️⃣ Clone o repositório

```bash
git clone URL_DO_REPOSITORIO
```

### 2️⃣ Instale as dependências

```bash
cd backend
npm install
```

### 3️⃣ Configure o banco de dados

Crie um banco de dados chamado `afterhours` no PostgreSQL e execute o arquivo SQL disponibilizado no repositório.

### 4️⃣ Configure o ambiente

Crie um arquivo `.env` na pasta do backend:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=sua_senha
DB_NAME=afterhours

EMAIL_USER=seu_email@gmail.com
EMAIL_PASS=sua_senha_de_aplicativo

APP_URL=http://localhost:3001
```

> ⚠️ O arquivo `.env` contém informações confidenciais e não deve ser publicado no GitHub. Para utilizar o envio de e-mails pelo Gmail, configure uma senha de aplicativo.

### 5️⃣ Inicie o servidor

```bash
node server.js
```

### 6️⃣ Acesse a aplicação

Abra o navegador e acesse:

http://localhost:3001

## 📌 Observações

Este projeto foi desenvolvido exclusivamente para fins acadêmicos.

Os eventos, datas e preços cadastrados são demonstrativos e não representam anúncios oficiais. Os pagamentos são simulados, sem realização de transações financeiras reais.

## 👩🏻‍💻 Desenvolvido por

**Juliana Coga**

🎓 Técnico em Informática para Internet  
🏫 UTFPR — Campus Campo Mourão  
🌪️ 2º ano — M32  
📚 Desenvolvimento Web 1  
👨‍🏫 Professor Radamés Halmeman  
📅 4º Bimestre — 2026

---

### 🌙 AFTER HOURS

*Life is made of experiences.*

Desenvolvido com dedicação, criatividade e muitas linhas de código. 💜
