
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile, UserRole } from '../types/user';
import { authApi } from '../services/api';

interface UserContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, nickname: string) => Promise<void>;
  logout: () => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const USER_STORAGE_KEY = 'stock_game_user';
const TOKEN_STORAGE_KEY = 'token';

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load user from local storage
    const storedUser = localStorage.getItem(USER_STORAGE_KEY);
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    
    if (storedUser && token) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error('Failed to parse user data', e);
        localStorage.removeItem(USER_STORAGE_KEY);
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const mapBackendUserToProfile = (backendUser: any): UserProfile => {
    const userProfile: UserProfile = {
      id: backendUser.id,
      username: backendUser.username,
      email: backendUser.email || backendUser.username + '@example.com',
      role: backendUser.role.toLowerCase() as UserRole,
      avatar: backendUser.avatar,
      nickname: backendUser.nickname || backendUser.username, // 使用昵称，如果没有则使用用户名
      createdAt: Date.now(), // Should come from backend
      level: backendUser.level || 1,
      xp: backendUser.experience || 0,
      coins: backendUser.totalAssets || 100000,
      nextLevelExp: backendUser.nextLevelExp || 100,
      rank: backendUser.rank || '青铜',
      achievements: [],
      completedTasks: [],
      stats: {
        totalGames: backendUser.totalGames || 0,
        wins: backendUser.totalWins || 0,
        totalProfit: 0
      },
      levelUpData: backendUser.levelUpData || undefined
    };

    // 添加清除等级提升数据的方法
    userProfile.clearLevelUpData = () => {
      const updatedUser = { ...userProfile, levelUpData: undefined };
      setUser(updatedUser);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
    };

    return userProfile;
  };

  const login = async (username: string, password: string): Promise<void> => {
    setIsLoading(true);
    try {
      const { user: backendUser, token } = await authApi.login({ username, password });
      
      const userProfile = mapBackendUserToProfile(backendUser);
      
      setUser(userProfile);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userProfile));
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } catch (error: any) {
      console.error('Login failed', error);
      throw new Error(error.response?.data?.error || '登录失败，请检查用户名和密码');
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (username: string, email: string, password: string, nickname: string): Promise<void> => {
    setIsLoading(true);
    try {
      // Note: Backend currently doesn't use email/role for registration logic as strictly as frontend
      // We are passing extra fields that backend might ignore or we need to update backend
      const { user: backendUser, token } = await authApi.register({ 
        username, 
        password, 
        email, 
        role: 'student', // Always register as student by default
        nickname: nickname 
      });

      const userProfile = mapBackendUserToProfile(backendUser);

      setUser(userProfile);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userProfile));
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } catch (error: any) {
      console.error('Registration failed', error);
       throw new Error(error.response?.data?.error || '注册失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  };

  const updateProfile = (updates: Partial<UserProfile>) => {
    if (!user) return;
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
  };


  return (
    <UserContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, register, logout, updateProfile }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
