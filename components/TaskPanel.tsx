import React, { useState } from 'react';
import { useTask } from '../context/TaskContext';
import { TaskCategory, TaskStatus, GameTask } from '../types';

const TaskPanel: React.FC = () => {
  const { 
    tasks, 
    getTaskProgress, 
    getCategoryTasks, 
    claimReward,
    startGuide,
    completedGuides
  } = useTask();

  const [activeTab, setActiveTab] = useState<TaskCategory>(TaskCategory.NEWBIE);
  const [isExpanded, setIsExpanded] = useState(true);

  const categoryLabels: Record<TaskCategory, string> = {
    [TaskCategory.NEWBIE]: '新手任务',
    [TaskCategory.DAILY]: '每日任务',
    [TaskCategory.ACHIEVEMENT]: '成就',
    [TaskCategory.CHALLENGE]: '挑战'
  };

  const categoryColors: Record<TaskCategory, string> = {
    [TaskCategory.NEWBIE]: 'text-blue-400',
    [TaskCategory.DAILY]: 'text-green-400',
    [TaskCategory.ACHIEVEMENT]: 'text-yellow-400',
    [TaskCategory.CHALLENGE]: 'text-purple-400'
  };

  const categoryBgColors: Record<TaskCategory, string> = {
    [TaskCategory.NEWBIE]: 'bg-blue-500/10',
    [TaskCategory.DAILY]: 'bg-green-500/10',
    [TaskCategory.ACHIEVEMENT]: 'bg-yellow-500/10',
    [TaskCategory.CHALLENGE]: 'bg-purple-500/10'
  };

  const categoryBorderColors: Record<TaskCategory, string> = {
    [TaskCategory.NEWBIE]: 'border-blue-500/30',
    [TaskCategory.DAILY]: 'border-green-500/30',
    [TaskCategory.ACHIEVEMENT]: 'border-yellow-500/30',
    [TaskCategory.CHALLENGE]: 'border-purple-500/30'
  };

  const completedCount = tasks.filter(t => t.status === TaskStatus.COMPLETED && !t.isClaimed).length;

  const renderTaskItem = (task: GameTask) => {
    const progress = getTaskProgress(task.id);
    const isCompleted = task.status === TaskStatus.COMPLETED;
    const canClaim = isCompleted && !task.isClaimed;

    return (
      <div 
        key={task.id}
        className={`p-3 sm:p-4 rounded-xl border transition-all ${
          task.isNew 
            ? 'bg-blue-500/5 border-blue-500/30 animate-pulse' 
            : 'bg-gray-900/50 border-gray-800'
        } ${canClaim ? 'ring-1 ring-yellow-500/50' : ''}`}
      >
        <div className="flex justify-between items-start mb-2 sm:mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-1 flex-wrap">
              {task.category === TaskCategory.NEWBIE && (
                <span className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded">新手</span>
              )}
              {task.category === TaskCategory.CHALLENGE && (
                <span className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded">挑战</span>
              )}
              <h4 className={`font-bold text-[11px] sm:text-sm ${isCompleted ? 'text-gray-500 line-through' : 'text-white'} truncate`}>
                {task.title}
              </h4>
            </div>
            <p className="text-[10px] sm:text-xs text-gray-500 line-clamp-2">{task.description}</p>
          </div>
          
          <div className="text-right ml-2 sm:ml-3 flex-shrink-0">
            <div className="flex items-center gap-0.5 sm:gap-1 text-yellow-500">
              <span className="material-icons text-[12px] sm:text-[14px]">star</span>
              <span className="text-[10px] sm:text-xs font-bold">+{task.reward.experience}</span>
            </div>
            {task.reward.coins > 0 && (
              <div className="flex items-center gap-0.5 sm:gap-1 text-green-400 mt-0.5">
                <span className="material-icons text-[12px] sm:text-[14px]">monetization_on</span>
                <span className="text-[10px] sm:text-xs">+{task.reward.coins}</span>
              </div>
            )}
            {task.reward.title && (
              <div className="text-[9px] sm:text-[10px] text-purple-400 mt-0.5">
                称号: {task.reward.title}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex-1 h-1 sm:h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                isCompleted ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-[10px] sm:text-xs text-gray-500 font-mono min-w-[45px] sm:min-w-[50px] text-right">
            {task.progress}/{task.maxProgress}
          </span>
        </div>

        {canClaim && (
          <button
            onClick={() => claimReward(task.id)}
            className="mt-2 sm:mt-3 w-full py-1.5 sm:py-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white text-[10px] sm:text-xs font-bold rounded-lg shadow-lg shadow-yellow-500/20 transition-all animate-bounce"
          >
            领取奖励
          </button>
        )}

        {isCompleted && task.isClaimed && (
          <div className="mt-2 sm:mt-3 flex items-center justify-center gap-1 text-green-500 text-[10px] sm:text-xs">
            <span className="material-icons text-[12px] sm:text-[14px]">check_circle</span>
            已领取
          </div>
        )}
      </div>
    );
  };

  const currentTasks = getCategoryTasks(activeTab);
  const sortedTasks = [...currentTasks].sort((a, b) => {
    if (a.status === TaskStatus.COMPLETED && !a.isClaimed) return -1;
    if (b.status === TaskStatus.COMPLETED && !b.isClaimed) return 1;
    return b.priority - a.priority;
  });

  return (
    <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-2xl overflow-hidden w-full">
      {/* Header */}
      <div 
        className="p-3 sm:p-4 border-b border-gray-800 cursor-pointer hover:bg-gray-800/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <span className="material-icons text-white text-lg sm:text-xl">assignment</span>
            </div>
            <div>
              <h3 className="font-bold text-white text-sm sm:text-base">任务中心</h3>
              <p className="text-[10px] sm:text-xs text-gray-500">
                {completedCount > 0 ? `${completedCount}个任务待领取` : '完成任务获取奖励'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2">
            {completedCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-yellow-500 text-[10px] font-bold text-black flex items-center justify-center">
                {completedCount}
              </span>
            )}
            <span className={`material-icons text-gray-400 transition-transform text-lg sm:text-xl ${isExpanded ? 'rotate-180' : ''}`}>
              expand_more
            </span>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="p-3 sm:p-4">
          {/* Guide Button */}
          {!completedGuides.includes('newbie_guide') && (
            <button
              onClick={() => startGuide('newbie_guide')}
              className="w-full mb-3 sm:mb-4 p-2.5 sm:p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center gap-1.5 sm:gap-2 hover:from-blue-500 hover:to-purple-500 transition-all shadow-lg shadow-blue-500/20"
            >
              <span className="material-icons text-white text-sm sm:text-base">school</span>
              <span className="text-xs sm:text-sm font-bold text-white">重新查看新手引导</span>
            </button>
          )}

          {/* Category Tabs */}
          <div className="flex gap-1.5 sm:gap-2 mb-3 sm:mb-4 overflow-x-auto pb-1 -mx-1 px-1">
            {Object.entries(categoryLabels).map(([key, label]) => {
              const category = key as TaskCategory;
              const count = getCategoryTasks(category).filter(t => 
                t.status === TaskStatus.IN_PROGRESS
              ).length;
              
              return (
                <button
                  key={key}
                  onClick={() => setActiveTab(category)}
                  className={`flex-shrink-0 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-bold transition-all ${
                    activeTab === category
                      ? `${categoryBgColors[category]} ${categoryColors[category]} border ${categoryBorderColors[category]}`
                      : 'bg-gray-800/50 text-gray-500 hover:bg-gray-800'
                  }`}
                >
                  {label}
                  {count > 0 && (
                    <span className="ml-1 sm:ml-1.5 px-1 sm:px-1.5 py-0.5 bg-gray-700 rounded-full text-[9px] sm:text-[10px]">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Task List */}
          <div className="space-y-2 sm:space-y-3 max-h-[50vh] sm:max-h-[400px] overflow-y-auto pr-1 sm:pr-2 custom-scrollbar">
            {sortedTasks.length === 0 ? (
              <div className="text-center py-6 sm:py-8 text-gray-500">
                <span className="material-icons text-3xl sm:text-4xl opacity-50">emoji_events</span>
                <p className="text-xs sm:text-sm mt-2">暂无任务</p>
              </div>
            ) : (
              sortedTasks.map(renderTaskItem)
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskPanel;
