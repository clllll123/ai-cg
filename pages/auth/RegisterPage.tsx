
import React, { useState } from 'react';
import { useUser } from '../../context/UserContext';
import { useNavigate, Link } from 'react-router-dom';

export const RegisterPage: React.FC = () => {
  const { register, isLoading } = useUser();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      // Always register as student by default
      await register(username, email, password, 'student');
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || '注册失败，请稍后重试');
    }
  };

  return (
    <div className="min-h-screen bg-[#050b14] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-green-600/20 rounded-full blur-[100px] animate-pulse"></div>
          <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1.5s' }}></div>
      </div>
      
      <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-700/50 p-8 rounded-3xl shadow-2xl w-full max-w-md relative z-10">
        <h2 className="text-3xl font-black text-white mb-6 text-center tracking-tight">创建新账户</h2>
        
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-2 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-400 text-sm font-bold mb-2">用户名</label>
            <input 
              type="text" 
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-3 focus:outline-none focus:border-blue-500 transition-colors"
              required 
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm font-bold mb-2">邮箱</label>
            <input 
              type="email" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-3 focus:outline-none focus:border-blue-500 transition-colors"
              required 
            />
          </div>
          
          <div>
            <label className="block text-gray-400 text-sm font-bold mb-2">密码</label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-3 focus:outline-none focus:border-blue-500 transition-colors"
              required 
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white font-bold py-3 rounded-lg transition-all transform hover:scale-[1.02] shadow-lg mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '注册中...' : '创建账户'}
          </button>
        </form>

        <div className="mt-6 text-center text-gray-500 text-sm">
          已有账号? <Link to="/" className="text-green-400 hover:text-green-300 font-bold">去登录</Link>
        </div>
      </div>
    </div>
  );
};
