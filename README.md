# ✂ Barbearia Loyalty — Sistema de Fidelidade Digital

Sistema completo de cartões de fidelidade digital para barbearia.  
**8 carimbos = Corte Grátis**

---

## 🚀 Instalação rápida

### 1. Pré-requisitos
- [Node.js](https://nodejs.org) (versão 18 ou superior)

### 2. Instalar dependências
```bash
cd backend
npm install
```

### 3. Configurar (opcional)
Cria um ficheiro `.env` na pasta `backend/`:
```env
PORT=3001
JWT_SECRET=muda-esta-chave-secreta-aqui
BASE_URL=https://o-teu-dominio.pt
```

### 4. Iniciar o servidor
```bash
cd backend
node server.js
```

O servidor inicia em: **http://localhost:3001**

---

## 🔐 Acesso ao painel de admin

URL: **http://localhost:3001/admin**

| Campo | Valor |
|-------|-------|
| Utilizador | `admin` |
| Password | `admin123` |

> ⚠️ Muda a password após o primeiro login (edita o ficheiro `data.json` ou adiciona rota de alteração de password)

---

## 📱 Como funciona para os clientes

1. O cliente acede ao link do seu cartão (ex: `http://localhost:3001/card/XXXXX`)
2. Se for a primeira vez, preenche o nome e telemóvel
3. O cartão digital é criado e mostrado na página
4. Cada vez que o cliente vem à barbearia, o barbeiro dá um carimbo no painel admin
5. Ao 8.º carimbo → **Corte Grátis** desbloqueado automaticamente!

---

## 🛠 Estrutura do projeto

```
barbershop-loyalty/
├── backend/
│   ├── server.js       ← API REST completa
│   ├── data.json       ← Base de dados (gerada automaticamente)
│   └── package.json
├── frontend-client/
│   └── index.html      ← Cartão digital do cliente
└── frontend-admin/
    └── index.html      ← Painel de administração
```

---

## 📡 API Endpoints

### Públicos
| Método | URL | Descrição |
|--------|-----|-----------|
| POST | `/api/clients/register` | Registar novo cliente |
| GET | `/api/card/:clientId` | Ver cartão do cliente |

### Admin (requerem token JWT)
| Método | URL | Descrição |
|--------|-----|-----------|
| POST | `/api/auth/login` | Login de admin |
| GET | `/api/admin/clients` | Listar todos os clientes |
| POST | `/api/admin/stamp` | Dar carimbo a cliente |
| POST | `/api/admin/reward/use` | Marcar recompensa como usada |
| GET | `/api/admin/stats` | Estatísticas gerais |
| GET | `/api/admin/client/:id/qr` | Gerar QR code de cliente |
| DELETE | `/api/admin/client/:id` | Apagar cliente |

---

## 🌐 Colocar online (produção)

Para colocar online podes usar:
- **Railway.app** — gratuito, deploy simples
- **Render.com** — gratuito com sleep após inactividade
- **DigitalOcean** / **VPS próprio** — maior controlo

Lembra-te de definir a variável `BASE_URL` com o teu domínio real!

---

## 💡 Próximas funcionalidades possíveis
- [ ] Notificações por SMS quando o cliente ganha recompensa
- [ ] Múltiplos admins / barbeiros
- [ ] Histórico de recompensas usadas
- [ ] Export de clientes para Excel
- [ ] Scanner de QR code com câmara no admin
- [ ] Migração para base de dados PostgreSQL / MySQL

---

Feito com ✂ para a tua barbearia.
