# 💰 FinanceApp

Sistema de gestão financeira pessoal — responsivo para desktop e mobile.

## Stack
- **Backend:** Python + FastAPI + PostgreSQL
- **Frontend:** React + Vite + Tailwind CSS
- **Deploy:** Render (backend + frontend + banco)

---

## 🚀 Deploy no Render (passo a passo)

### 1. Suba o código para o GitHub

```bash
cd financeapp
git init
git add .
git commit -m "feat: initial commit"
git remote add origin https://github.com/SEU_USUARIO/financeapp.git
git push -u origin main
```

### 2. Crie os serviços no Render

Acesse [render.com](https://render.com) e faça login.

#### Opção A — Automático via render.yaml (recomendado)
1. Clique em **New → Blueprint**
2. Conecte seu repositório GitHub
3. O Render detecta o `render.yaml` e cria tudo automaticamente

#### Opção B — Manual

**Banco de dados PostgreSQL:**
1. New → PostgreSQL
2. Nome: `financeapp-db`
3. Plan: Free
4. Anote a **Internal Database URL**

**Backend (Web Service):**
1. New → Web Service
2. Repositório: seu repo
3. Root Directory: `backend`
4. Runtime: Python 3
5. Build Command: `pip install -r requirements.txt`
6. Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
7. Environment Variables:
   - `DATABASE_URL` → Internal Database URL do PostgreSQL
   - `SECRET_KEY` → clique em "Generate" ou use uma string aleatória longa
   - `ALLOWED_ORIGINS` → URL do seu frontend (ex: `https://financeapp-web.onrender.com`)

**Frontend (Static Site):**
1. New → Static Site
2. Repositório: seu repo
3. Root Directory: `front-end`
4. Build Command: `npm install && npm run build`
5. Publish Directory: `dist`
6. Environment Variables:
   - `VITE_API_URL` → URL do seu backend (ex: `https://financeapp-api.onrender.com`)
7. Redirects/Rewrites: `/* → /index.html` (Status 200)

### 3. Aguarde o deploy
O Render vai buildar e publicar automaticamente. Em ~3-5 minutos tudo estará no ar.

---

## 💻 Rodando localmente

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Criar .env
cp .env.example .env
# Edite .env com sua DATABASE_URL local

uvicorn app.main:app --reload
# API em http://localhost:8000
# Docs em http://localhost:8000/docs
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# App em http://localhost:5173
```

---

## ✨ Funcionalidades

- ✅ Cadastro e login de usuários (multi-usuário)
- 📊 Dashboard com resumo mensal
- 💸 Lançamentos de receitas e despesas
- 📋 Contas a pagar com status (pendente/pago/vencido)
- 🏷️ Categorias personalizáveis com ícone e cor
- 🏦 Múltiplas contas bancárias
- 📱 100% responsivo (desktop + mobile)
- 🔄 Saldo automático ao lançar transações
- 🔒 Autenticação JWT segura
