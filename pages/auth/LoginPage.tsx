
import React, { useState, useEffect } from 'react';
import { useUser } from '../../context/UserContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../../services/api';

export const LoginPage: React.FC = () => {
  const { login, register, isLoading } = useUser();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Auth Mode: 'login' or 'register'
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  
  // Form States
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState(''); // For registration
  const [nickname, setNickname] = useState(''); // For registration - required
  const [rememberMe, setRememberMe] = useState(false);
  
  // Forgot Password States
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetStep, setResetStep] = useState(1);
  
  // UI States
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize mode from URL query param
  useEffect(() => {
    const mode = searchParams.get('mode');
    if (mode === 'register') {
      setAuthMode('register');
    }
  }, [searchParams]);

  // Load remembered username
  useEffect(() => {
    const savedUsername = localStorage.getItem('rememberedUsername');
    if (savedUsername) {
      setUsername(savedUsername);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsProcessing(true);
    
    try {
      if (authMode === 'login') {
        await login(username, password);
        
        if (rememberMe) {
          localStorage.setItem('rememberedUsername', username);
        } else {
          localStorage.removeItem('rememberedUsername');
        }
        
        // 显示欢迎语
        setWelcomeMessage(`欢迎回来，${username}！`);
        setShowWelcome(true);
        
        // 2秒后自动跳转
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
        
      } else {
        // Registration Logic
        // Always register as 'student' by default here
        await register(username, email, password, nickname);
        
        // 显示欢迎语
        setWelcomeMessage(`欢迎加入，${nickname || username}！`);
        setShowWelcome(true);
        
        // 2秒后自动跳转
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || (authMode === 'login' ? '登录失败，请检查用户名和密码' : '注册失败，请稍后重试'));
      setIsProcessing(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail) {
      setError('请输入邮箱地址');
      return;
    }
    
    try {
      await authApi.requestPasswordReset(forgotEmail);
      setResetStep(2);
      setSuccess('验证码已发送到您的邮箱');
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || '发送验证码失败，请稍后重试');
    }
  };

  const handleResetPassword = async () => {
    if (!resetCode || !newPassword) {
      setError('请填写所有字段');
      return;
    }
    
    if (newPassword.length < 6) {
      setError('密码长度至少6位');
      return;
    }
    
    try {
      await authApi.resetPassword(forgotEmail, resetCode, newPassword);
      setSuccess('密码重置成功，请重新登录');
      setShowForgotPassword(false);
      setResetStep(1);
      setForgotEmail('');
      setResetCode('');
      setNewPassword('');
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || '密码重置失败，请稍后重试');
    }
  };

  return (
    <div className="min-h-screen bg-[#050b14] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[100px] animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>
      
      {/* 主登录表单 */}
      <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-700/50 p-6 md:p-8 rounded-3xl shadow-2xl w-full max-w-md relative z-10 mx-4">
        <div className="text-center mb-6 md:mb-8">
             <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600 mb-2 tracking-tighter">
                AI 股市操盘手
            </h1>
            <p className="text-gray-400 text-xs md:text-sm font-mono tracking-widest">REAL-TIME TRADING SYSTEM</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-gray-800/50 p-1 rounded-xl mb-6 relative">
             <div 
                className="absolute h-[calc(100%-8px)] top-1 bg-gray-700 rounded-lg transition-all duration-300 ease-in-out shadow-lg"
                style={{ 
                    width: 'calc(50% - 4px)', 
                    left: authMode === 'login' ? '4px' : 'calc(50% + 0px)' 
                }}
             ></div>
             <button
                type="button"
                onClick={() => setAuthMode('login')}
                className={`flex-1 py-2 text-sm font-bold relative z-10 transition-colors ${authMode === 'login' ? 'text-white' : 'text-gray-400 hover:text-gray-200'}`}
             >
                登录
             </button>
             <button
                type="button"
                onClick={() => setAuthMode('register')}
                className={`flex-1 py-2 text-sm font-bold relative z-10 transition-colors ${authMode === 'register' ? 'text-white' : 'text-gray-400 hover:text-gray-200'}`}
             >
                注册
             </button>
        </div>
        
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-2 rounded mb-4 text-sm">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-500/20 border border-green-500/50 text-green-200 px-4 py-2 rounded mb-4 text-sm">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
          <div>
            <label className="block text-gray-400 text-sm font-bold mb-2">用户名</label>
            <input 
              type="text" 
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-3 text-sm md:text-base focus:outline-none focus:border-blue-500 transition-colors"
              required 
              placeholder="请输入用户名"
            />
          </div>

          {authMode === 'register' && (
            <>
              <div>
                <label className="block text-gray-400 text-sm font-bold mb-2">昵称</label>
                <input 
                  type="text" 
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-3 text-sm md:text-base focus:outline-none focus:border-blue-500 transition-colors"
                  required 
                  placeholder="请输入游戏内显示名称"
                  maxLength={20}
                />
                <p className="text-xs text-gray-500 mt-1">昵称将在游戏中显示，请选择独特的名称</p>
              </div>
              <div>
                <label className="block text-gray-400 text-sm font-bold mb-2">电子邮箱</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-3 text-sm md:text-base focus:outline-none focus:border-blue-500 transition-colors"
                  required 
                  placeholder="请输入邮箱地址"
                />
              </div>
            </>
          )}
          
          <div>
            <label className="block text-gray-400 text-sm font-bold mb-2">密码</label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-3 text-sm md:text-base focus:outline-none focus:border-blue-500 transition-colors"
              required 
              placeholder="请输入密码"
            />
          </div>

          {/* 记住我和忘记密码 - Only for Login */}
          {authMode === 'login' && (
            <div className="flex justify-between items-center">
              <label className="flex items-center text-gray-400 text-sm cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="mr-2 w-4 h-4 rounded border-gray-600 bg-gray-800 focus:ring-blue-500"
                />
                记住我
              </label>
              <button 
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-blue-400 hover:text-blue-300 text-sm font-medium"
              >
                忘记密码？
              </button>
            </div>
          )}

          <button 
            type="submit" 
            disabled={isLoading || isProcessing}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold py-3 rounded-lg transition-all transform hover:scale-[1.02] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
          >
            {isLoading || isProcessing ? '处理中...' : (authMode === 'login' ? '立即登录' : '立即注册')}
          </button>
        </form>
      </div>

      {/* 忘记密码模态框 */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900/90 backdrop-blur-xl border border-gray-700/50 p-6 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">重置密码</h3>
              <button 
                onClick={() => {
                  setShowForgotPassword(false);
                  setResetStep(1);
                  setForgotEmail('');
                  setResetCode('');
                  setNewPassword('');
                  setError('');
                  setSuccess('');
                }}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
            
            {resetStep === 1 && (
              <div className="space-y-4">
                <p className="text-gray-400 text-sm">请输入您的邮箱地址，我们将发送验证码</p>
                <input 
                  type="email" 
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg p-3 focus:outline-none focus:border-blue-500"
                  placeholder="请输入邮箱地址"
                />
                <button 
                  onClick={handleForgotPassword}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-colors"
                >
                  发送验证码
                </button>
              </div>
            )}
            
            {resetStep === 2 && (
              <div className="space-y-4">
                <p className="text-gray-400 text-sm">请输入收到的验证码和新密码</p>
                <input 
                  type="text" 
                  value={resetCode}
                  onChange={e => setResetCode(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg p-3 focus:outline-none focus:border-blue-500"
                  placeholder="请输入6位验证码"
                  maxLength={6}
                />
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg p-3 focus:outline-none focus:border-blue-500"
                  placeholder="请输入新密码（至少6位）"
                />
                <button 
                  onClick={handleResetPassword}
                  className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg transition-colors"
                >
                  重置密码
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 欢迎语模态框 */}
      {showWelcome && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-blue-900/90 to-purple-900/90 border-2 border-blue-500/30 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
            {/* 动画效果 */}
            <div className="absolute inset-0 overflow-hidden rounded-3xl">
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-500/10 to-purple-500/10"></div>
              <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-blue-500/20 rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2 animate-pulse"></div>
            </div>
            
            <div className="relative z-10">
              {/* 图标 */}
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center shadow-lg">
                <span className="material-icons text-3xl text-white">emoji_events</span>
              </div>
              
              {/* 欢迎消息 */}
              <h3 className="text-2xl font-black text-white mb-2">欢迎！</h3>
              <p className="text-blue-200 text-lg mb-4">{welcomeMessage}</p>
              
              {/* 加载动画 */}
              <div className="flex justify-center mb-4">
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              </div>
              
              <p className="text-gray-300 text-sm">正在跳转到账户页面...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
