import React from 'react';
import { useTask } from '../context/TaskContext';

const FloatingTaskButton: React.FC = () => {
  const { getPendingTaskCount, completedGuides, isTaskPanelOpen, setTaskPanelOpen } = useTask();
  const pendingCount = getPendingTaskCount();
  const hasUnclaimedTasks = pendingCount > 0;

  const handleClick = () => {
    setTaskPanelOpen(!isTaskPanelOpen);
  };

  return (
    <div className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 z-40">
      <button
        onClick={handleClick}
        className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl shadow-lg transition-all duration-300 flex items-center justify-center ${
          hasUnclaimedTasks
            ? 'bg-gradient-to-br from-yellow-500 to-orange-600 hover:from-yellow-400 hover:to-orange-500 animate-bounce shadow-orange-500/40'
            : 'bg-gray-800 hover:bg-gray-700 border border-gray-700'
        }`}
      >
        <span className="material-icons text-white text-xl sm:text-2xl">assignment</span>
        
        {/* Notification Badge */}
        {hasUnclaimedTasks && (
          <span className="absolute -top-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-red-500 text-white text-[9px] sm:text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg">
            {pendingCount > 9 ? '9+' : pendingCount}
          </span>
        )}

        {/* Pulse Animation */}
        {hasUnclaimedTasks && (
          <span className="absolute inset-0 rounded-2xl bg-yellow-500 animate-ping opacity-25" />
        )}
      </button>

      {/* Tooltip */}
      <div className="absolute right-full mr-2 sm:mr-3 top-1/2 -translate-y-1/2 bg-gray-900 border border-gray-700 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap hidden sm:block">
        <span className="text-xs sm:text-sm text-white font-medium">任务中心</span>
        {hasUnclaimedTasks && (
          <span className="ml-2 text-[10px] sm:text-xs text-yellow-400">
            {pendingCount}个待完成
          </span>
        )}
      </div>
    </div>
  );
};

export default FloatingTaskButton;
