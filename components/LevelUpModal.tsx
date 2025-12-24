import React, { useEffect, useState } from 'react';

interface LevelUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  oldLevel: number;
  newLevel: number;
  oldRank: string;
  newRank: string;
  expGained: number;
}

const LevelUpModal: React.FC<LevelUpModalProps> = ({
  isOpen,
  onClose,
  oldLevel,
  newLevel,
  oldRank,
  newRank,
  expGained
}) => {
  const [showAnimation, setShowAnimation] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowAnimation(true);
      const timer = setTimeout(() => {
        setShowAnimation(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isRankUp = oldRank !== newRank;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4">
      <div className="relative bg-gradient-to-br from-yellow-900/90 to-orange-900/90 border-2 border-yellow-500/50 rounded-2xl sm:rounded-3xl p-5 sm:p-8 max-w-md w-full mx-2 sm:mx-4 shadow-2xl shadow-yellow-900/30">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl sm:rounded-3xl">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-yellow-500/10 to-orange-500/10"></div>
          {showAnimation && (
            <div className="absolute inset-0 animate-pulse">
              <div className="absolute top-1/2 left-1/2 w-48 h-48 sm:w-64 sm:h-64 bg-yellow-500/20 rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2"></div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="relative z-10 text-center">
          {/* Icon */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 sm:mb-4 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center shadow-lg shadow-yellow-900/50">
            <span className="material-icons text-3xl sm:text-4xl text-white">emoji_events</span>
          </div>

          {/* Title */}
          <h2 className="text-xl sm:text-2xl font-black text-white mb-1.5 sm:mb-2">
            {isRankUp ? '段位提升！' : '等级提升！'}
          </h2>

          {/* Level/Rank Info */}
          <div className="mb-3 sm:mb-4">
            <div className="flex items-center justify-center gap-3 sm:gap-4 mb-2 sm:mb-3">
              <div className="text-center">
                <div className="text-[11px] sm:text-sm text-yellow-300 mb-1">原等级</div>
                <div className="text-lg sm:text-xl font-bold text-white">Lv.{oldLevel}</div>
                <div className="text-[10px] sm:text-xs text-yellow-200">{oldRank}</div>
              </div>
              
              <div className="text-yellow-400 text-xl sm:text-2xl">→</div>
              
              <div className="text-center">
                <div className="text-[11px] sm:text-sm text-yellow-300 mb-1">新等级</div>
                <div className="text-lg sm:text-xl font-bold text-white">Lv.{newLevel}</div>
                <div className="text-[10px] sm:text-xs text-yellow-200">{newRank}</div>
              </div>
            </div>

            {isRankUp && (
              <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-2 sm:p-2.5 mb-2 sm:mb-3">
                <div className="text-yellow-300 text-xs sm:text-sm font-bold">恭喜！段位晋升</div>
                <div className="text-yellow-200 text-[10px] sm:text-xs">{oldRank} → {newRank}</div>
              </div>
            )}
          </div>

          {/* Experience Gained */}
          <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-2.5 sm:p-3 mb-3 sm:mb-4">
            <div className="text-gray-400 text-[11px] sm:text-sm mb-1">获得经验值</div>
            <div className="text-yellow-400 font-bold text-base sm:text-lg">+{expGained} XP</div>
          </div>

          {/* Rewards */}
          <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-2.5 sm:p-3 mb-4 sm:mb-6">
            <div className="text-gray-400 text-[11px] sm:text-sm mb-1.5 sm:mb-2">升级奖励</div>
            <div className="flex justify-center gap-3 sm:gap-4">
              <div className="text-center">
                <div className="w-7 h-7 sm:w-8 sm:h-8 mx-auto bg-blue-500/20 rounded-full flex items-center justify-center mb-1">
                  <span className="material-icons text-blue-400 text-xs sm:text-sm">star</span>
                </div>
                <div className="text-blue-400 text-[10px] sm:text-xs">+50 金币</div>
              </div>
              <div className="text-center">
                <div className="w-7 h-7 sm:w-8 sm:h-8 mx-auto bg-green-500/20 rounded-full flex items-center justify-center mb-1">
                  <span className="material-icons text-green-400 text-xs sm:text-sm">bolt</span>
                </div>
                <div className="text-green-400 text-[10px] sm:text-xs">解锁新功能</div>
              </div>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2.5 sm:py-3 rounded-lg transition-colors shadow-lg shadow-yellow-900/30 text-sm sm:text-base"
          >
            继续游戏
          </button>
        </div>
      </div>
    </div>
  );
};

export default LevelUpModal;