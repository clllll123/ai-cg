import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useUser } from '../../context/UserContext';
import { useTask } from '../../context/TaskContext';
import { Link, useNavigate } from 'react-router-dom';
import { adminApi } from '../../services/api';
import LevelUpModal from '../../components/LevelUpModal';
import TaskPanel from '../../components/TaskPanel';

const StatCard: React.FC<{ label: string; value: string | number; icon: string; color: string }> = ({ label, value, icon, color }) => (
    <div className={`group bg-gray-800/40 backdrop-blur-md border border-gray-700/50 p-5 rounded-2xl flex items-center gap-4 hover:bg-gray-700/50 transition-all hover:scale-[1.02] shadow-lg hover:shadow-${color}-900/20`}>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-${color}-500/10 text-${color}-400 group-hover:bg-${color}-500 group-hover:text-white transition-colors`}>
             <span className="material-icons">{icon}</span>
        </div>
        <div>
            <div className="text-gray-400 text-xs font-mono uppercase tracking-wider mb-1">{label}</div>
            <div className="text-2xl font-black text-white tracking-tight">{value}</div>
        </div>
    </div>
);

const TaskItem: React.FC<{ title: string; reward: string; isDone: boolean }> = ({ title, reward, isDone }) => (
    <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg border border-gray-800 mb-2">
        <div className="flex items-center gap-3">
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isDone ? 'border-green-500 bg-green-500' : 'border-gray-600'}`}>
                {isDone && <span className="material-icons text-white text-[12px]">check</span>}
            </div>
            <span className={isDone ? 'text-gray-500 line-through' : 'text-gray-300'}>{title}</span>
        </div>
        <span className="text-xs font-mono text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded">{reward}</span>
    </div>
);

const StudentDashboard: React.FC<{ user: any }> = ({ user }) => (
    <div className="space-y-6">
        {/* Primary Actions - Mobile Optimized */}
        <div className="grid grid-cols-1 gap-4">
            <Link to="/game-plaza" className="bg-gradient-to-br from-blue-600 to-purple-800 p-6 rounded-2xl shadow-lg shadow-blue-900/40 flex flex-col items-center justify-center gap-3 hover:scale-[1.02] transition-transform relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-white/20 transition-colors"></div>
                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                    <span className="material-icons text-3xl text-white">sports_esports</span>
                </div>
                <div className="font-bold text-lg">查看游戏广场</div>
                <div className="text-sm text-white/80">发现局域网游戏房间</div>
            </Link>
        </div>

        {/* Secondary: Stats */}
        <div className="bg-gray-800/40 backdrop-blur border border-gray-700/50 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-gray-400 mb-4 flex items-center gap-2">
                <span className="material-icons text-xs">analytics</span> 个人数据
            </h3>
            <div className="grid grid-cols-3 gap-3">
                 <div className="text-center p-3 bg-gray-900/50 rounded-xl border border-gray-800/50">
                    <div className="text-xs text-gray-500 mb-1">胜率</div>
                    <div className="font-black text-lg text-green-400 font-mono">
                        {user.stats?.totalGames ? ((user.stats.wins / user.stats.totalGames) * 100).toFixed(0) : 0}%
                    </div>
                 </div>
                 <div className="text-center p-3 bg-gray-900/50 rounded-xl border border-gray-800/50">
                    <div className="text-xs text-gray-500 mb-1">场次</div>
                    <div className="font-black text-lg text-white font-mono">{user.stats?.totalGames || 0}</div>
                 </div>
                 <div className="text-center p-3 bg-gray-900/50 rounded-xl border border-gray-800/50">
                    <div className="text-xs text-gray-500 mb-1">收益</div>
                    <div className="font-black text-lg text-yellow-400 font-mono">+12.5%</div>
                 </div>
            </div>
        </div>

        {/* Tasks & Other */}
        <div className="bg-gray-800/30 border border-gray-700 rounded-2xl p-6">
            <h3 className="font-bold mb-4 flex items-center gap-2">
                <span className="material-icons text-yellow-500">assignment</span> 每日任务
            </h3>
            <TaskItem title="完成一场交易对局" reward="+100 XP" isDone={false} />
            <TaskItem title="总收益超过 20%" reward="+50 金币" isDone={false} />
        </div>
    </div>
);

// 优化后的创建房间按钮组件 - 性能优化版本
const CreateRoomButton: React.FC<{ children: React.ReactNode; description: string }> = React.memo(({ children, description }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showError, setShowError] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const navigate = useNavigate();
    const buttonRef = useRef<HTMLButtonElement>(null);
    const successTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleClick = useCallback(async () => {
        if (isLoading) return;

        setError(null);
        setShowError(false);
        setIsLoading(true);
        setIsSuccess(false);

        try {
            const startTime = performance.now();
            
            const token = localStorage.getItem('token');
            
            const response = await fetch('/api/game-plaza/rooms/generate-code', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ timestamp: Date.now() })
            });

            if (!response.ok) {
                throw new Error(`服务器错误: ${response.status} ${response.statusText}`);
            }

            const text = await response.text();
            
            if (!text.trim()) {
                throw new Error('服务器返回空响应，请确保后端服务已启动');
            }

            let result;
            try {
                result = JSON.parse(text);
            } catch (parseErr) {
                console.error('JSON解析错误:', text);
                throw new Error('服务器返回数据格式异常');
            }

            const elapsed = performance.now() - startTime;

            if (result.success) {
                setIsSuccess(true);
                const roomCode = result.data?.roomCode || Math.random().toString(36).substring(2, 8).toUpperCase();
                const remainingDelay = Math.max(0, 600 - elapsed);
                
                successTimeoutRef.current = setTimeout(() => {
                    navigate(`/game/bigscreen?roomCode=${roomCode}&step=scan`);
                }, remainingDelay);
            } else {
                throw new Error(result.error || '生成房间失败');
            }
        } catch (err: any) {
            console.error('创建房间错误:', err);
            setError(err.message || '创建房间失败，请检查后端服务是否运行');
            setShowError(true);
            setIsLoading(false);
            setTimeout(() => setShowError(false), 5000);
        }
    }, [isLoading, navigate]);

    useEffect(() => {
        return () => {
            if (successTimeoutRef.current) {
                clearTimeout(successTimeoutRef.current);
            }
        };
    }, []);

    const buttonClassName = useMemo(() => {
        const base = 'group relative bg-gradient-to-br from-blue-900 to-blue-950 border border-blue-500/30 p-8 rounded-3xl overflow-hidden transition-all shadow-lg hover:shadow-blue-900/20 w-full text-left';
        const disabled = isLoading || isSuccess ? 'opacity-80 cursor-not-allowed' : 'hover:border-blue-500/60';
        return `${base} ${disabled}`;
    }, [isLoading, isSuccess]);

    const iconClassName = useMemo(() => {
        const base = 'w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center mb-6 shadow-lg shadow-blue-900/40 group-hover:scale-110 transition-all duration-300';
        return `${base} ${isLoading ? 'animate-shake' : ''}`;
    }, [isLoading]);

    const titleClassName = useMemo(() => {
        const base = 'text-2xl font-black mb-2 text-white transition-all duration-300';
        return `${base} ${isLoading ? 'translate-x-2' : ''}`;
    }, [isLoading]);

    const descClassName = useMemo(() => {
        const base = 'text-blue-200/60 text-sm leading-relaxed max-w-xs transition-all duration-300';
        return `${base} ${isLoading ? 'opacity-50' : ''}`;
    }, [isLoading]);

    return (
        <div className="relative">
            <button
                ref={buttonRef}
                onClick={handleClick}
                disabled={isLoading || isSuccess}
                className={buttonClassName}
            >
                {isSuccess && (
                    <div className="absolute inset-0 bg-green-900/60 backdrop-blur-sm flex items-center justify-center z-20 animate-success-pulse">
                        <div className="flex flex-col items-center gap-3 animate-bounce-in">
                            <div className="h-16 w-16 rounded-full bg-green-500 flex items-center justify-center animate-scale-in">
                                <span className="material-icons text-4xl text-white">check</span>
                            </div>
                            <span className="text-green-300 text-lg font-medium animate-fade-in">创建成功!</span>
                        </div>
                    </div>
                )}

                {isLoading && !isSuccess && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-20">
                        <div className="flex flex-col items-center gap-3">
                            <div className="relative">
                                <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                                <div className="absolute inset-0 animate-ping opacity-30">
                                    <div className="h-full w-full border-4 border-blue-500 rounded-full"></div>
                                </div>
                            </div>
                            <span className="text-blue-300 text-sm font-medium animate-pulse">正在创建房间...</span>
                        </div>
                    </div>
                )}

                <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-blue-500/20 transition-colors duration-500"></div>
                <div className="relative z-10">
                    <div className={iconClassName}>
                        {isSuccess ? (
                            <span className="material-icons text-3xl text-white animate-pop-in">check_circle</span>
                        ) : isLoading ? (
                            <span className="material-icons text-3xl text-white animate-spin-slow">hourglass_empty</span>
                        ) : (
                            <span className="material-icons text-3xl text-white group-hover:rotate-90 transition-transform duration-300">add_circle</span>
                        )}
                    </div>
                    <h3 className={titleClassName}>{children}</h3>
                    <p className={descClassName}>{description}</p>
                </div>
            </button>

            {showError && error && (
                <div className="absolute bottom-0 left-0 right-0 transform translate-y-full mt-2 bg-red-900/90 backdrop-blur border border-red-500/50 rounded-xl p-4 animate-slide-up z-50">
                    <div className="flex items-center gap-3 text-red-200">
                        <div className="h-8 w-8 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 animate-wiggle">
                            <span className="material-icons text-sm">error</span>
                        </div>
                        <span className="text-sm font-medium flex-1">{error}</span>
                        <button
                            onClick={() => setShowError(false)}
                            className="ml-auto text-red-400 hover:text-red-200 transition-colors p-1 hover:bg-red-500/20 rounded"
                        >
                            <span className="material-icons text-sm">close</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
});

const TeacherDashboard: React.FC<{ user: any }> = ({ user }) => (
    <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <CreateRoomButton description="配置市场初始参数，生成游戏房间二维码，邀请学生加入。">
                创建对局 (Host)
            </CreateRoomButton>

            <Link to="/stats" className="group relative bg-gradient-to-br from-purple-900 to-purple-950 border border-purple-500/30 p-8 rounded-3xl overflow-hidden hover:border-purple-500/60 transition-all shadow-lg hover:shadow-purple-900/20">
                <div className="absolute top-0 right-0 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-purple-500/20 transition-colors"></div>
                <div className="relative z-10">
                    <div className="w-16 h-16 rounded-2xl bg-purple-600 flex items-center justify-center mb-6 shadow-lg shadow-purple-900/40 group-hover:scale-110 transition-transform">
                        <span className="material-icons text-3xl text-white">bar_chart</span>
                    </div>
                    <h3 className="text-2xl font-black mb-2 text-white">数据中心</h3>
                    <p className="text-purple-200/60 text-sm leading-relaxed max-w-xs">查看历史对局记录，分析学生交易行为和表现数据。</p>
                </div>
            </Link>
        </div>

        <div>
            <h3 className="font-bold mb-4 flex items-center gap-2 text-gray-400">
                <span className="material-icons">query_stats</span> 教学概览
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard label="累计开局" value={user.stats?.totalGames || 0} icon="layers" color="blue" />
                <StatCard label="参与学生" value="1,204" icon="groups" color="purple" />
                <StatCard label="平均收益" value="+8.4%" icon="trending_up" color="green" />
            </div>
        </div>
    </div>
);

const DashboardContent: React.FC<{ user: any; canHost: boolean }> = ({ user, canHost }) => {
    return canHost ? <TeacherDashboard user={user} /> : <StudentDashboard user={user} />;
};

export const Dashboard: React.FC = () => {
    const { user, logout } = useUser();
    const { isTaskPanelOpen, setTaskPanelOpen } = useTask();
    const navigate = useNavigate();

    const [showCreateTeacher, setShowCreateTeacher] = useState(false);
    const [teacherForm, setTeacherForm] = useState({ username: '', password: '', email: '' });
    const [createMsg, setCreateMsg] = useState('');
    const [showLevelUp, setShowLevelUp] = useState(false);
    const [levelUpData, setLevelUpData] = useState({
        oldLevel: 1,
        newLevel: 1,
        oldRank: '青铜',
        newRank: '青铜',
        expGained: 0
    });

    // 检查是否有等级提升需要显示
    useEffect(() => {
        if (user && user.levelUpData) {
            setLevelUpData(user.levelUpData);
            setShowLevelUp(true);
            // 清除等级提升数据，避免重复显示
            setTimeout(() => {
                if (user.clearLevelUpData) {
                    user.clearLevelUpData();
                }
            }, 3000);
        }
    }, [user]);

    if (!user) {
        return <div className="p-8 text-white">加载中...</div>;
    }

    const isTeacher = user.role === 'teacher';
    const isAdmin = user.role === 'admin';
    const canHost = isTeacher || isAdmin;

    const handleCreateTeacher = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateMsg('');
        try {
            await adminApi.createTeacher(teacherForm);
            setCreateMsg('✅ 教师账户创建成功');
            setTeacherForm({ username: '', password: '', email: '' });
            setTimeout(() => {
                setShowCreateTeacher(false);
                setCreateMsg('');
            }, 2000);
        } catch (err: any) {
            setCreateMsg('❌ ' + (err.response?.data?.error || err.message));
        }
    };

    return (
        <div className="min-h-screen bg-[#050b14] text-white relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>
            </div>

            {/* Mobile Header */}
            <div className="md:hidden bg-gray-900/60 backdrop-blur-xl border-b border-gray-800 p-4 z-20 relative sticky top-0">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center font-bold text-xs">
                             {(user.nickname || user.username).substr(0, 2).toUpperCase()}
                         </div>
                        <h1 className="text-lg font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                            AI 股市
                        </h1>
                    </div>
                    
                    <div className="flex gap-2 items-center">
                        <div className="flex items-center gap-1 px-2 py-1 bg-gray-800/60 backdrop-blur border border-yellow-500/20 rounded-full text-xs">
                            <span className="material-icons text-yellow-500 text-xs">monetization_on</span>
                            <span className="font-mono font-bold text-yellow-400">{user.coins.toLocaleString()}</span>
                        </div>
                        <button onClick={() => { logout(); navigate('/'); }} className="w-8 h-8 flex items-center justify-center bg-gray-800 rounded-full text-gray-400 hover:text-white border border-gray-700">
                            <span className="material-icons text-sm">logout</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Desktop Layout */}
            <div className="hidden md:flex min-h-screen">
                {/* Sidebar */}
                <div className="w-64 border-r border-gray-800 bg-gray-900/40 backdrop-blur-xl flex flex-col z-10 relative">
                    <div className="p-6 border-b border-gray-800">
                        <h1 className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                            AI 股市操盘手
                        </h1>
                        <div className="text-[10px] text-gray-500 font-mono mt-1">沉浸式金融交易模拟系统</div>
                    </div>

                    <div className="p-4 flex-1">
                        <nav className="space-y-2">
                            <button className="w-full flex items-center gap-3 p-3 bg-blue-600/10 text-blue-400 rounded-lg font-bold border border-blue-600/20">
                                <span className="material-icons">dashboard</span>
                                <span>控制台</span>
                            </button>
                            {isAdmin && (
                                <button onClick={() => setShowCreateTeacher(true)} className="w-full flex items-center gap-3 p-3 hover:bg-gray-800 text-purple-400 rounded-lg transition-colors">
                                    <span className="material-icons">admin_panel_settings</span>
                                    <span>添加教师</span>
                                </button>
                            )}
                            <button className="w-full flex items-center gap-3 p-3 hover:bg-gray-800 text-gray-400 rounded-lg transition-colors">
                                <span className="material-icons">emoji_events</span>
                                <span>排行榜</span>
                            </button>
                            <button onClick={() => setTaskPanelOpen(!isTaskPanelOpen)} className="w-full flex items-center gap-3 p-3 hover:bg-gray-800 text-gray-400 rounded-lg transition-colors">
                                <span className="material-icons">assignment</span>
                                <span>任务中心</span>
                            </button>
                             <button className="w-full flex items-center gap-3 p-3 hover:bg-gray-800 text-gray-400 rounded-lg transition-colors">
                                <span className="material-icons">school</span>
                                <span>{canHost ? '课程管理' : '我的课程'}</span>
                            </button>
                        </nav>
                    </div>

                    <div className="p-4 border-t border-gray-800">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center font-bold text-sm">
                                {(user.nickname || user.username).substr(0, 2).toUpperCase()}
                            </div>
                            <div className="overflow-hidden">
                                <div className="font-bold truncate">{user.nickname || user.username}</div>
                                <div className="text-xs text-gray-500 capitalize">{user.role} • Lv.{user.level} {user.rank}</div>
                            </div>
                        </div>
                        
                        {/* Level Progress Bar */}
                        <div className="mb-4">
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                                <span>Lv.{user.level}</span>
                                <span>Lv.{user.level + 1}</span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-2">
                                <div 
                                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                                    style={{ 
                                        width: `${Math.min(100, (user.xp / Math.max(1, user.nextLevelExp)) * 100)}%` 
                                    }}
                                ></div>
                            </div>
                            <div className="text-xs text-gray-400 mt-1 text-center">
                                {user.xp} / {user.nextLevelExp} XP
                            </div>
                        </div>
                        <button onClick={() => { logout(); navigate('/'); }} className="w-full flex items-center justify-center gap-2 p-2 border border-gray-700 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
                            <span className="material-icons text-sm">logout</span> 退出登录
                        </button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 p-8 overflow-y-auto z-10 relative">
                    <header className="flex justify-between items-center mb-8">
                        <div>
                            <h2 className="text-3xl font-black mb-1 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                                欢迎回来, {user.nickname || user.username} 👋
                            </h2>
                            <p className="text-gray-400 text-sm font-medium">准备好今天的市场挑战了吗？</p>
                        </div>
                        
                        <div className="flex gap-4">
                             <div className="flex items-center gap-2 px-4 py-2 bg-gray-800/60 backdrop-blur border border-yellow-500/20 rounded-full shadow-lg shadow-yellow-900/10 hover:border-yellow-500/50 transition-colors">
                                <span className="material-icons text-yellow-500 text-sm">monetization_on</span>
                                <span className="font-mono font-bold text-yellow-400">{user.coins.toLocaleString()}</span>
                             </div>
                             <div className="flex items-center gap-2 px-4 py-2 bg-gray-800/60 backdrop-blur border border-blue-500/20 rounded-full shadow-lg shadow-blue-900/10 hover:border-blue-500/50 transition-colors">
                                <span className="material-icons text-blue-500 text-sm">star</span>
                                <span className="font-mono font-bold text-blue-400">{user.xp.toLocaleString()} XP</span>
                             </div>
                        </div>
                    </header>
                    
                    {/* Desktop Dashboard Content */}
                    <DashboardContent user={user} canHost={canHost} />
                </div>
            </div>

            {/* Mobile Content */}
            <div className="md:hidden p-4 overflow-y-auto z-10 relative pb-20">
                <header className="mb-6">
                    <h2 className="text-2xl font-black mb-1 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                        欢迎回来, {user.nickname || user.username} 👋
                    </h2>
                    <p className="text-gray-400 text-sm font-medium">准备好今天的市场挑战了吗？</p>
                </header>

                {/* Mobile Dashboard Content */}
                <DashboardContent user={user} canHost={canHost} />
            </div>

            {/* Create Teacher Modal */}
            {showCreateTeacher && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-gray-900 border border-gray-700 p-8 rounded-2xl w-full max-w-md relative">
                        <button onClick={() => setShowCreateTeacher(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                            <span className="material-icons">close</span>
                        </button>
                        <h2 className="text-2xl font-bold mb-6 text-purple-400 flex items-center gap-2">
                             <span className="material-icons">school</span> 添加教师账户
                        </h2>
                        
                        {createMsg && (
                            <div className={`p-3 rounded mb-4 text-sm ${createMsg.startsWith('✅') ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                                {createMsg}
                            </div>
                        )}

                        <form onSubmit={handleCreateTeacher} className="space-y-4">
                            <div>
                                <label className="block text-gray-400 text-sm mb-1">用户名</label>
                                <input 
                                    type="text" 
                                    value={teacherForm.username}
                                    onChange={e => setTeacherForm({...teacherForm, username: e.target.value})}
                                    className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white"
                                    required
                                    minLength={3}
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-1">邮箱 (可选)</label>
                                <input 
                                    type="email" 
                                    value={teacherForm.email}
                                    onChange={e => setTeacherForm({...teacherForm, email: e.target.value})}
                                    className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-1">初始密码</label>
                                <input 
                                    type="password" 
                                    value={teacherForm.password}
                                    onChange={e => setTeacherForm({...teacherForm, password: e.target.value})}
                                    className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white"
                                    required
                                    minLength={6}
                                />
                            </div>
                            <button type="submit" className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-lg mt-4">
                                创建教师
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Level Up Modal */}
            <LevelUpModal
                isOpen={showLevelUp}
                onClose={() => setShowLevelUp(false)}
                oldLevel={levelUpData.oldLevel}
                newLevel={levelUpData.newLevel}
                oldRank={levelUpData.oldRank}
                newRank={levelUpData.newRank}
                expGained={levelUpData.expGained}
            />

            {/* Test Level Up Button (Development Only) */}
            {process.env.NODE_ENV === 'development' && (
                <button
                    onClick={() => {
                        setLevelUpData({
                            oldLevel: 5,
                            newLevel: 6,
                            oldRank: '黄金',
                            newRank: '铂金',
                            expGained: 150
                        });
                        setShowLevelUp(true);
                    }}
                    className="fixed bottom-4 right-4 bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-full shadow-lg z-50"
                >
                    测试等级提升
                </button>
            )}

            {/* Task Panel */}
            {isTaskPanelOpen && (
                <div className="fixed inset-0 z-50 flex items-end justify-end p-2 sm:p-4 pointer-events-none">
                    <div className="pointer-events-auto w-full max-w-sm sm:max-w-md animate-slide-up">
                        <TaskPanel />
                    </div>
                </div>
            )}
        </div>
    );
};
