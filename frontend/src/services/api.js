import { AuthService } from './auth';

// Force same-origin path-based API for all environments to avoid DNS reliance
const origin = typeof window !== 'undefined' ? window.location.origin : '';
const API_URL = `${origin}/api`;

const api = {
  async get(url) {
    const token = AuthService.getToken();
    const response = await fetch(`${API_URL}${url}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      if (response.status === 401) {
        AuthService.logout();
        window.location.href = '/';
        throw new Error('Sessão expirada ou usuário não autenticado');
      }
      const error = await response.json();
      throw new Error(error.error || 'Erro na requisição');
    }
    return response.json();
  },

  async post(url, data) {
    const token = AuthService.getToken();
    const response = await fetch(`${API_URL}${url}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro na requisição');
    }
    return response.json();
  },

  async put(url, data) {
    const token = AuthService.getToken();
    const response = await fetch(`${API_URL}${url}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro na requisição');
    }
    return response.json();
  },

  async delete(url) {
    const token = AuthService.getToken();
    const response = await fetch(`${API_URL}${url}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro na requisição');
    }
    return response.json();
  },

  async patch(url, data) {
    const token = AuthService.getToken();
    const response = await fetch(`${API_URL}${url}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro na requisição');
    }
    return response.json();
  }
};

export default api;