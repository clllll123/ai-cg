import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { GameRoomInfo } from '../server/src/types/gamePlaza';
import io from 'socket.io-client';

interface JoiningRoomState {
  [roomId: string]: {
    isJoining: boolean;
    error: string | null;
    startTime: number;
  };
}

interface RoomCardProps {
  room: GameRoomInfo;
  joiningState: JoiningRoomState[string] | undefined;
  onJoin: (roomId: string) => void;
  onClearError: (roomId: string) => void;
  index: number;
}

const RoomCard: React.FC<RoomCardProps> = React.memo(({ room, joiningState, onJoin, onClearError, index }) => {
  const statusClassName = useMemo(() => {
    const base = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ';
    switch (room.gameStatus) {
      case 'waiting':
        return base + 'bg-green-900/40 text-green-400 border border-green-500/40';
      case 'playing':
        return base + 'bg-yellow-900/40 text-yellow-400 border border-yellow-500/40';
      default:
        return base + 'bg-red-900/40 text-red-400 border border-red-500/40';
    }
  }, [room.gameStatus]);

  const statusDotClassName = useMemo(() => {
    const base = 'w-2 h-2 rounded-full animate-pulse ';
    switch (room.gameStatus) {
      case 'waiting':
        return base + 'bg-green-400';
      case 'playing':
        return base + 'bg-yellow-400';
      default:
        return base + 'bg-red-400';
    }
  }, [room.gameStatus]);

  const statusText = useMemo(() => {
    switch (room.gameStatus) {
      case 'waiting':
        return '等待中';
      case 'playing':
        return '进行中';
      default:
        return '已结束';
    }
  }, [room.gameStatus]);

  const playerCountClassName = useMemo(() => {
    const base = 'font-medium transition-all ';
    return base + (room.playerCount >= room.maxPlayers ? 'text-red-400' : 'text-green-400');
  }, [room.playerCount, room.maxPlayers]);

  const cardClassName = useMemo(() => {
    const base = 'bg-gray-800/50 backdrop-blur border border-gray-700 rounded-xl p-4 hover:border-blue-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-900/20 group animate-slide-up';
    return `${base} ${room.gameStatus === 'waiting' ? 'cursor-pointer' : 'cursor-default'}`;
  }, [room.gameStatus]);

  const titleClassName = useMemo(() => {
    const base = 'text-lg font-bold text-white group-hover:text-blue-400 transition-colors ';
    return base + (room.gameStatus === 'waiting' ? '' : 'cursor-default');
  }, [room.gameStatus]);

  const isJoining = joiningState?.isJoining ?? false;
  const hasError = joiningState?.error != null;

  return (
    <div
      className={cardClassName}
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className={statusClassName}>
          <span className={statusDotClassName}></span>
          {statusText}
        </span>
        <span className="text-xs text-gray-400 flex items-center gap-1">
          <span className="material-icons text-xs">person</span>
          {room.hostName}
        </span>
      </div>

      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className={titleClassName}>房间 {room.roomCode}</h3>
          <span className="text-xs text-gray-500 font-mono">{room.ipAddress}</span>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">玩家数量</span>
          <span className={playerCountClassName}>
            <span className="font-bold">{room.playerCount}</span> / {room.maxPlayers} 人
          </span>
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>创建时间</span>
          <span className="font-mono">{new Date(room.createdAt).toLocaleTimeString()}</span>
        </div>
      </div>

      {isJoining ? (
        <button
          disabled
          className="w-full mt-4 bg-blue-600/80 text-white font-medium py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 cursor-wait"
        >
          <div className="relative">
            <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
          </div>
          <span>正在加入...</span>
        </button>
      ) : hasError ? (
        <div className="w-full mt-4">
          <button
            onClick={() => onClearError(room.roomId)}
            className="w-full bg-red-600/80 hover:bg-red-600 text-white font-medium py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 animate-pulse"
          >
            <span className="material-icons text-sm">error_outline</span>
            <span>{joiningState?.error}</span>
          </button>
        </div>
      ) : room.gameStatus === 'waiting' && room.playerCount < room.maxPlayers ? (
        <button
          onClick={() => onJoin(room.roomId)}
          className="w-full mt-4 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-medium py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 group-hover:shadow-lg group-hover:shadow-blue-900/30"
        >
          <span className="material-icons text-sm group-hover:translate-x-1 transition-transform">login</span>
          <span>加入房间</span>
        </button>
      ) : (
        <button
          disabled
          className="w-full mt-4 bg-gray-700/50 text-gray-400 font-medium py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 cursor-not-allowed"
        >
          <span>{room.gameStatus !== 'waiting' ? '游戏进行中' : '房间已满'}</span>
        </button>
      )}
    </div>
  );
});

const GamePlaza: React.FC = () => {
  const [rooms, setRooms] = useState<GameRoomInfo[]>([]);
  const [filteredRooms, setFilteredRooms] = useState<GameRoomInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isConnected, setIsConnected] = useState(false);
  const [joiningRooms, setJoiningRooms] = useState<JoiningRoomState>({});
  const [connectionRetryCount, setConnectionRetryCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const socketRef = useRef<any>(null);
  const joinTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const MAX_JOIN_TIMEOUT = 10000;
  const MAX_RETRIES = 3;

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toUpperCase();
      const results = rooms.filter(room => 
        room.roomCode.includes(query) || 
        room.hostName?.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredRooms(results);
      setShowSearchResults(true);
    } else {
      setFilteredRooms(rooms);
      setShowSearchResults(false);
    }
  }, [searchQuery, rooms]);

  useEffect(() => {
    socketRef.current = io({
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: MAX_RETRIES,
      reconnectionDelay: 1000
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('WebSocket连接成功');
      setIsConnected(true);
      setError('');
      setConnectionRetryCount(0);
      socket.emit('getRooms');
    });

    socket.on('disconnect', () => {
      console.log('WebSocket连接断开');
      setIsConnected(false);
      setError('连接断开，正在重连...');
    });

    socket.on('connect_error', (err: Error) => {
      console.error('WebSocket连接错误:', err);
      setConnectionRetryCount(prev => prev + 1);
      if (connectionRetryCount >= MAX_RETRIES - 1) {
        setError('连接失败，请检查网络连接后刷新页面重试');
      } else {
        setError(`连接失败，正在重试 (${connectionRetryCount + 1}/${MAX_RETRIES})...`);
      }
    });

    socket.on('roomList', (data: { success: boolean; data?: GameRoomInfo[]; error?: string }) => {
      if (data.success) {
        setRooms(data.data || []);
        setFilteredRooms(data.data || []);
        setLastUpdated(new Date());
        setLoading(false);
        setError('');
      } else {
        setError(data.error || '获取房间列表失败');
        setLoading(false);
      }
    });

    socket.on('roomListUpdate', (data: { success: boolean; data?: GameRoomInfo[] }) => {
      if (data.success) {
        setRooms(data.data || []);
        if (!showSearchResults) {
          setFilteredRooms(data.data || []);
        }
        setLastUpdated(new Date());
      }
    });

    socket.on('roomUpdate', (data: { roomId: string; roomInfo: GameRoomInfo }) => {
      setRooms(prevRooms => 
        prevRooms.map(room => 
          room.roomId === data.roomId ? data.roomInfo : room
        )
      );
      setLastUpdated(new Date());
    });

    socket.on('joinRoomResult', (data: { success: boolean; data?: { roomInfo: GameRoomInfo }; error?: string; roomId: string }) => {
      const roomId = data.roomId;
      const timeout = joinTimeoutRef.current.get(roomId);
      if (timeout) {
        clearTimeout(timeout);
        joinTimeoutRef.current.delete(roomId);
      }

      if (data.success) {
        setJoiningRooms(prev => {
          const next = { ...prev };
          delete next[roomId];
          return next;
        });
        window.location.href = `/game/room/${roomId}`;
      } else {
        const errorMsg = data.error || '加入房间失败';
        setJoiningRooms(prev => ({
          ...prev,
          [roomId]: {
            isJoining: false,
            error: errorMsg,
            startTime: Date.now()
          }
        }));
        setError(errorMsg);
      }
    });

    const heartbeatInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit('heartbeat');
      }
    }, 10000);

    return () => {
      clearInterval(heartbeatInterval);
      joinTimeoutRef.current.forEach(timeout => clearTimeout(timeout));
      joinTimeoutRef.current.clear();
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  const handleJoinRoom = useCallback(async (roomId: string) => {
    const room = rooms.find(r => r.roomId === roomId);
    if (!room) {
      setError('房间不存在');
      return;
    }

    if (joiningRooms[roomId]?.isJoining) {
      return;
    }

    if (room.gameStatus !== 'waiting') {
      setError('房间已开始游戏，无法加入');
      return;
    }

    if (room.playerCount >= room.maxPlayers) {
      setError('房间已满，无法加入');
      return;
    }

    if (!isConnected) {
      setError('未连接到服务器，请等待连接恢复');
      return;
    }

    setJoiningRooms(prev => ({
      ...prev,
      [roomId]: {
        isJoining: true,
        error: null,
        startTime: Date.now()
      }
    }));
    setError('');

    const timeout = setTimeout(() => {
      setJoiningRooms(prev => ({
        ...prev,
        [roomId]: {
          isJoining: false,
          error: '加入房间超时，请重试',
          startTime: Date.now()
        }
      }));
    }, MAX_JOIN_TIMEOUT);
    joinTimeoutRef.current.set(roomId, timeout);

    if (socketRef.current) {
      socketRef.current.emit('joinRoom', { roomId });
    } else {
      try {
        const response = await fetch(`/api/game-plaza/rooms/${roomId}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomId })
        });
        const result = await response.json();
        clearTimeout(timeout);
        joinTimeoutRef.current.delete(roomId);

        if (result.success) {
          window.location.href = `/game/room/${roomId}`;
        } else {
          setJoiningRooms(prev => ({
            ...prev,
            [roomId]: {
              isJoining: false,
              error: result.error || '加入房间失败',
              startTime: Date.now()
            }
          }));
          setError(result.error || '加入房间失败');
        }
      } catch (err) {
        clearTimeout(timeout);
        joinTimeoutRef.current.delete(roomId);
        setJoiningRooms(prev => ({
          ...prev,
          [roomId]: {
            isJoining: false,
            error: '加入房间失败，请重试',
            startTime: Date.now()
          }
        }));
        setError('网络错误，请检查连接后重试');
      }
    }
  }, [rooms, joiningRooms, isConnected]);

  const clearRoomError = useCallback((roomId: string) => {
    setJoiningRooms(prev => {
      const next = { ...prev };
      delete next[roomId];
      return next;
    });
  }, []);

  const handleRefresh = useCallback(() => {
    setLoading(true);
    setError('');
    if (socketRef.current) {
      socketRef.current.emit('getRooms');
    }
  }, []);

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toUpperCase();
      const results = rooms.filter(room => 
        room.roomCode.includes(query) || 
        room.hostName?.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredRooms(results);
      setShowSearchResults(true);
    } else {
      setFilteredRooms(rooms);
      setShowSearchResults(false);
    }
  }, [searchQuery, rooms]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setFilteredRooms(rooms);
    setShowSearchResults(false);
  }, [rooms]);

  const displayRooms = showSearchResults ? filteredRooms : rooms;

  const emptyStateClassName = useMemo(() => {
    return 'flex flex-col items-center justify-center h-64 animate-fade-in';
  }, []);

  const emptyIconClassName = useMemo(() => {
    return 'text-6xl mb-4 opacity-50 animate-bounce';
  }, []);

  const roomsGridClassName = useMemo(() => {
    return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 pr-2';
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-white relative overflow-hidden">
      {/* 返回按钮 */}
      <a href="/dashboard" className="absolute top-4 left-4 z-50 flex items-center gap-1 text-gray-400 hover:text-white bg-gray-800/50 backdrop-blur px-3 py-1.5 rounded-lg text-xs transition-all border border-gray-700 hover:border-gray-500">
        <span className="material-icons text-sm">arrow_back</span>
        <span>返回</span>
      </a>

      {/* 背景装饰 */}
      <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
        <div className="absolute top-10 left-10 w-32 h-32 bg-blue-500 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-40 h-40 bg-purple-500 rounded-full blur-3xl"></div>
      </div>

      {/* 主要内容容器 - 支持滚动 */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="z-10 w-full max-w-4xl mx-auto px-8 py-8 animate-fade-in">
          {/* 标题区域 */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
              游戏广场
            </h1>
            <p className="text-gray-400 text-sm">发现局域网内的游戏房间，快速加入对战</p>
            
            <div className="mt-6 max-w-md mx-auto">
              <form onSubmit={handleSearch} className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="输入房间号或房主名称搜索..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 pr-24 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <span className="material-icons text-sm">close</span>
                    </button>
                  )}
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors"
                  >
                    搜索
                  </button>
                </div>
              </form>
              
              {showSearchResults && (
                <p className="text-xs text-gray-500 mt-2">
                  搜索到 <span className="text-blue-400 font-medium">{displayRooms.length}</span> 个房间
                </p>
              )}
            </div>
            
            {/* 状态信息 */}
            <div className="flex items-center justify-center gap-4 mt-4 text-xs text-gray-500">
              <span>最后更新: {lastUpdated.toLocaleTimeString()}</span>
              <span>•</span>
              <span>发现房间: {rooms.length} 个</span>
              <button 
                onClick={handleRefresh}
                className="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
              >
                <span className="material-icons text-sm">refresh</span>
                刷新
              </button>
            </div>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="text-red-300 text-sm text-center font-bold bg-red-900/40 p-3 rounded border border-red-500/30 mb-4 animate-shake">
              {error}
            </div>
          )}

          {/* 内容区域 - 支持滚动 */}
          <div className="flex-1 min-h-0">
            {/* 加载状态 */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="relative">
                  <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                  <div className="absolute inset-0 animate-ping opacity-30">
                    <div className="h-full w-full border-4 border-blue-500 rounded-full"></div>
                  </div>
                </div>
                <p className="text-gray-400 mt-4 animate-pulse">正在搜索局域网游戏房间...</p>
              </div>
            ) : (
              /* 房间列表容器 - 支持滚动 */
              <div className="h-full">
                {displayRooms.length === 0 ? (
                  <div className={emptyStateClassName}>
                    <div className={emptyIconClassName}>🏢</div>
                    <p className="text-gray-400 text-lg">
                      {showSearchResults ? '未找到匹配的房间' : '暂无可用房间'}
                    </p>
                    <p className="text-gray-500 text-sm mt-2">
                      {showSearchResults ? '请尝试其他搜索条件' : '请确保您和其他玩家在同一局域网内'}
                    </p>
                  </div>
                ) : (
                  <div className={roomsGridClassName}>
                    {displayRooms.map((room, index) => (
                      <RoomCard
                        key={room.roomId}
                        room={room}
                        joiningState={joiningRooms[room.roomId]}
                        onJoin={handleJoinRoom}
                        onClearError={clearRoomError}
                        index={index}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 底部信息 */}
          <div className="mt-8 text-center text-xs text-gray-600">
            <p>游戏广场 • 局域网房间发现系统</p>
            <p className="mt-1">基于 UDP 广播技术实现实时房间发现</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GamePlaza;