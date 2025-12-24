
import React, { useState, useEffect, useCallback } from 'react';
import { useGame } from '../context/GameContext';
import { useUser } from '../context/UserContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GamePhase } from '../types';

const PlayerLogin: React.FC = () => {
  const { joinGame, phase, isMqttConnected } = useGame();
  const { user, isAuthenticated, isLoading: userLoading } = useUser();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    if (!userLoading && !isAuthenticated) {
      const urlCode = searchParams.get('code');
      if (urlCode) {
        navigate(`/?redirect=register&code=${urlCode}`, { replace: true });
      } else {
        navigate('/?redirect=register', { replace: true });
      }
      return;
    }

    if (user) {
      setName(user.nickname || user.username);
    }
  }, [user, isAuthenticated, userLoading, navigate, searchParams]);

  useEffect(() => {
    const urlCode = searchParams.get('code');
    if (urlCode && urlCode.length === 4) {
      setCode(urlCode);
    }
  }, [searchParams]);

  const handleJoin = useCallback(async () => {
    setError('');
    if (name.trim() && code.trim()) {
      setIsConnecting(true);
      
      try {
        const result = await joinGame(name.trim(), code.trim());
        if (!result.success) {
            setError(result.message || '连接失败，请重试');
            setIsConnecting(false);
        }
      } catch (e) {
          setError('连接异常，请重试');
          setIsConnecting(false);
      }
    }
  }, [name, code, joinGame]);

  if (userLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-900 text-white p-8">
        <div className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <h2 className="text-sm font-bold text-blue-400">正在验证身份...</h2>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full bg-gray-900 text-white p-8 relative overflow-hidden">
      <a href="/dashboard" className="absolute top-4 left-4 z-50 flex items-center gap-1 text-gray-400 hover:text-white bg-gray-800/50 backdrop-blur px-3 py-1.5 rounded-lg text-xs transition-all border border-gray-700 hover:border-gray-500">
            <span className="material-icons text-sm">arrow_back</span>
            <span>退出</span>
      </a>

      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
        <div className="absolute top-10 left-10 w-32 h-32 bg-blue-500 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-40 h-40 bg-purple-500 rounded-full blur-3xl"></div>
      </div>

      <div className="z-10 w-full max-w-sm animate-fade-in">
        <h1 className="text-4xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 text-center">
          AI 股市操盘手
        </h1>
        <p className="text-gray-400 mb-8 text-sm text-center">输入交易大厅代码进入市场</p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wider">交易大厅代码 (房间号)</label>
            <input
              type="tel"
              maxLength={4}
              value={code}
              onChange={(e) => { setCode(e.target.value); setError(''); }}
              placeholder="请输入大屏上的4位数字"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-center text-xl font-mono tracking-widest focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>



          <div>
            <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wider">昵称</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="请输入游戏内显示名称"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
            />
          </div>

          {error && (
              <div className="text-red-300 text-xs text-center font-bold bg-red-900/40 p-3 rounded border border-red-500/30 flex flex-col gap-1">
                  <span>{error}</span>
                  {error.includes("超时") && <span className="text-[10px] text-gray-400 font-normal">建议：切换到4G网络或刷新页面</span>}
              </div>
          )}
          
          {/* Status Indicator */}
          <div className="flex items-center justify-center gap-2 mb-2 bg-gray-800/50 p-2 rounded-lg">
             <div className={`w-3 h-3 rounded-full ${isMqttConnected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 'bg-red-500 animate-pulse'}`}></div>
             <span className="text-xs text-gray-300 font-mono">
                云端: {isMqttConnected ? '已连接 (稳定)' : '断开 (正在重连...)'}
             </span>
          </div>

          <button
            onClick={handleJoin}
            disabled={!name.trim() || code.length !== 4 || isConnecting || !isMqttConnected}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-lg transform active:scale-95 transition-all mt-2 flex justify-center items-center gap-2"
          >
            {isConnecting ? (
               <>
                 <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                 正在进入市场...
               </>
            ) : (phase === GamePhase.LOBBY ? '进入交易大厅' : '立即入场 (比赛进行中)')}
          </button>
        </div>

        <div className="mt-8 text-center space-y-2">
           {phase !== GamePhase.LOBBY && (
             <div className="text-xs text-yellow-500 animate-pulse">比赛已开始，现在加入可参与剩余交易</div>
           )}
           <div className="text-[10px] text-gray-600 font-mono">
               Ver 2.0 (国内稳定版) - MQTT Enabled
           </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerLogin;
