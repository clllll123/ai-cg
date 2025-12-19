import React from 'react';
import { Link } from 'react-router-dom';

export const Homepage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#050b14] flex flex-col relative overflow-hidden text-white font-sans">
      {/* Animated Background */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
          <div className="absolute top-[-10%] right-[-10%] w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>
      
      {/* Navbar */}
      <nav className="relative z-10 container mx-auto px-6 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
            <span className="material-icons text-blue-500 text-3xl">candlestick_chart</span>
            <span className="text-xl font-black tracking-tighter">STOCK MASTER</span>
        </div>
        <div className="hidden md:flex gap-8 text-sm font-medium text-gray-400">
            <a href="#features" className="hover:text-white transition-colors">核心玩法</a>
            <a href="#about" className="hover:text-white transition-colors">关于我们</a>
            <a href="#rank" className="hover:text-white transition-colors">排行榜</a>
        </div>
        <div>
             <Link to="/login" className="px-6 py-2 rounded-full border border-gray-700 hover:bg-gray-800 transition-colors text-sm font-bold">登录 / 注册</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 flex-1 container mx-auto px-6 flex flex-col lg:flex-row items-center justify-center gap-16 py-12">
        
        {/* Left: Content */}
        <div className="flex-1 text-center lg:text-left space-y-8">
            <h1 className="text-5xl lg:text-7xl font-black leading-tight tracking-tight">
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">掌握市场脉搏</span>
                <span className="block text-white">成就操盘传奇</span>
            </h1>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                全真模拟股市交易环境，集成 DeepSeek AI 生成实时财经新闻。
                在这里体验最真实的涨跌博弈，与全球玩家一较高下。
            </p>
            
            {/* Call to Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4">
                <Link 
                    to="/login" 
                    className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-900/50 transition-all transform hover:scale-105 flex items-center justify-center gap-2"
                >
                    <span className="material-icons">login</span>
                    立即登录
                </Link>
                <Link 
                    to="/login?mode=register" 
                    className="px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-bold text-lg border border-gray-700 hover:border-gray-600 transition-all transform hover:scale-105 flex items-center justify-center gap-2"
                >
                    <span className="material-icons">person_add</span>
                    免费注册
                </Link>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8">
                <div className="p-4 bg-gray-900/50 backdrop-blur rounded-xl border border-gray-800">
                    <span className="material-icons text-blue-400 mb-2">psychology</span>
                    <h3 className="font-bold mb-1">AI 驱动</h3>
                    <p className="text-xs text-gray-500">DeepSeek 实时生成新闻</p>
                </div>
                 <div className="p-4 bg-gray-900/50 backdrop-blur rounded-xl border border-gray-800">
                    <span className="material-icons text-purple-400 mb-2">hub</span>
                    <h3 className="font-bold mb-1">多人对战</h3>
                    <p className="text-xs text-gray-500">实时联机，策略博弈</p>
                </div>
                 <div className="p-4 bg-gray-900/50 backdrop-blur rounded-xl border border-gray-800">
                    <span className="material-icons text-green-400 mb-2">trending_up</span>
                    <h3 className="font-bold mb-1">真实模拟</h3>
                    <p className="text-xs text-gray-500">K线图表，还原实战</p>
                </div>
            </div>
        </div>

        {/* Right: Visual Preview (No Form) */}
        <div className="w-full max-w-lg hidden lg:block">
            <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-700/50 p-6 rounded-3xl shadow-2xl relative transform rotate-3 hover:rotate-0 transition-all duration-500">
                {/* Mock Game Interface */}
                <div className="flex justify-between items-center mb-6">
                    <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                    <div className="text-xs font-mono text-gray-500">LIVE MARKET</div>
                </div>
                
                <div className="space-y-4">
                    <div className="flex justify-between items-end">
                        <div>
                            <div className="text-sm text-gray-400">上证指数</div>
                            <div className="text-3xl font-mono font-bold text-red-500">3,245.89</div>
                        </div>
                        <div className="bg-red-500/20 text-red-400 px-2 py-1 rounded text-xs font-bold">+1.24%</div>
                    </div>
                    
                    {/* Mock Chart */}
                    <div className="h-32 flex items-end justify-between gap-1">
                        {[40, 60, 45, 70, 65, 80, 75, 90, 85, 95, 100, 90, 85, 95, 110].map((h, i) => (
                            <div key={i} className="w-full bg-blue-500/30 rounded-t hover:bg-blue-500/60 transition-colors" style={{ height: `${h}%` }}></div>
                        ))}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                         <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700">
                            <div className="text-xs text-gray-500 mb-1">您的资产</div>
                            <div className="font-mono font-bold">¥ 100,000</div>
                         </div>
                         <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700">
                            <div className="text-xs text-gray-500 mb-1">当前排名</div>
                            <div className="font-mono font-bold text-yellow-500"># 1</div>
                         </div>
                    </div>
                </div>
            </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="relative z-10 border-t border-gray-800 mt-auto">
          <div className="container mx-auto px-6 py-8 flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-gray-500 text-sm">© 2025 Stock Master AI. All rights reserved.</p>
              <div className="flex gap-4 text-gray-500">
                  <span className="hover:text-white cursor-pointer transition-colors material-icons">code</span>
                  <span className="hover:text-white cursor-pointer transition-colors material-icons">language</span>
              </div>
          </div>
      </footer>
    </div>
  );
};
