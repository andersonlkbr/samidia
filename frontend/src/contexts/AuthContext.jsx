import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('samidia_token');
    const dados = localStorage.getItem('samidia_usuario');

    if (token && dados) {
      try {
        setUsuario(JSON.parse(dados));
      } catch { /* ignore */ }
    }
    setCarregando(false);
  }, []);

  async function login(email, senha) {
    const { data } = await api.post('/auth/login', { email, senha });
    localStorage.setItem('samidia_token', data.token);
    localStorage.setItem('samidia_usuario', JSON.stringify(data.usuario));
    setUsuario(data.usuario);
    return data;
  }

  function logout() {
    localStorage.removeItem('samidia_token');
    localStorage.removeItem('samidia_usuario');
    setUsuario(null);
  }

  const isSuperAdmin = usuario?.role === 'super_admin';
  const isAdmin = usuario?.role === 'admin' || isSuperAdmin;

  return (
    <AuthContext.Provider value={{ usuario, carregando, login, logout, isSuperAdmin, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
