import axios from 'axios';
import { User, LoginCredentials, RegisterCredentials } from '../types/user';

const API_URL = 'http://47.98.44.27:3000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<{ user: User; token: string }> => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  register: async (credentials: RegisterCredentials): Promise<{ user: User; token: string }> => {
    const response = await api.post('/auth/register', credentials);
    return response.data;
  },

  requestPasswordReset: async (email: string): Promise<{ message: string }> => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (email: string, token: string, newPassword: string): Promise<{ message: string }> => {
    const response = await api.post('/auth/reset-password', { email, token, newPassword });
    return response.data;
  },

  getProfile: async (): Promise<User> => {
    // Implement if there's a profile endpoint, for now we can rely on stored user or add an endpoint
    // This is a placeholder if we need to fetch fresh user data
    return Promise.resolve({} as User); 
  }
};

export const gameApi = {
  saveGameResult: async (gameData: any): Promise<{ success: boolean; data: any }> => {
    const response = await api.post('/game/results', gameData);
    return response.data;
  },

  getGameHistory: async (userId: string): Promise<{ success: boolean; data: any[] }> => {
    const response = await api.get(`/game/history/${userId}`);
    return response.data;
  },

  getPlayerLevelInfo: async (userId: string): Promise<{ success: boolean; data: any }> => {
    const response = await api.get(`/game/level/${userId}`);
    return response.data;
  },

  getLeaderboard: async (type?: string, limit?: number): Promise<{ success: boolean; data: any[] }> => {
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    if (limit) params.append('limit', limit.toString());
    const response = await api.get(`/game/leaderboard?${params.toString()}`);
    return response.data;
  }
};

export const aiApi = {
  generateNews: async (context?: string): Promise<string> => {
    const response = await api.post('/ai/news', { context });
    return response.data.news;
  }
};

export const adminApi = {
  createTeacher: async (data: RegisterCredentials): Promise<{ user: User }> => {
    const response = await api.post('/admin/create-teacher', data);
    return response.data;
  }
};

export default api;
