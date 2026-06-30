import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import QuickChat from './components/QuickChat'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import TransactionsPage from './pages/TransactionsPage'
import BillsPage from './pages/BillsPage'
import CategoriesPage from './pages/CategoriesPage'
import AccountsPage from './pages/AccountsPage'

function PrivateRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" replace />
}

function PublicRoute({ children }) {
  const { user } = useAuth()
  return user ? <Navigate to="/" replace /> : children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/cadastro" element={<PublicRoute><RegisterPage /></PublicRoute>} />
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<DashboardPage />} />
            <Route path="lancamentos" element={<TransactionsPage />} />
            <Route path="contas-a-pagar" element={<BillsPage />} />
            <Route path="categorias" element={<CategoriesPage />} />
            <Route path="contas" element={<AccountsPage />} />
          </Route>
        </Routes>
        <PrivateRoute><QuickChat /></PrivateRoute>
      </BrowserRouter>
    </AuthProvider>
  )
}
