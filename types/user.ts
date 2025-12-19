
export type UserRole = 'teacher' | 'student' | 'admin';

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  avatar?: string;
  nickname?: string; // 游戏内显示名称
  createdAt: number;
}

export interface UserProfile extends User {
  level: number;
  xp: number;
  coins: number;
  nextLevelExp: number;
  rank: string;
  achievements: string[]; // Achievement IDs
  completedTasks: string[]; // Task IDs
  stats: {
    totalGames: number;
    wins: number;
    totalProfit: number;
  };
  levelUpData?: {
    oldLevel: number;
    newLevel: number;
    oldRank: string;
    newRank: string;
    expGained: number;
  };
  clearLevelUpData?: () => void;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  reward: {
    xp: number;
    coins: number;
  };
  isCompleted: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export interface LoginCredentials {
  username: string;
  password?: string;
  code?: string; // For verification code login
}

export interface RegisterCredentials {
  username: string;
  password?: string;
  email?: string;
  role?: UserRole;
  code?: string;
  nickname?: string;
}
