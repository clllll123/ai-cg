import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { 
  GameTask, 
  TaskCategory, 
  TaskStatus, 
  TaskPriority, 
  TaskCondition, 
  TaskReward,
  GuideTour,
  GuideStep,
  TaskProgressUpdate
} from '../types';
import { useUser } from './UserContext';

interface TaskContextType {
  tasks: GameTask[];
  activeGuide: GuideTour | null;
  completedGuides: string[];
  currentTask: GameTask | null;
  isGuideVisible: boolean;
  isTaskPanelOpen: boolean;
  initTasks: () => void;
  updateTaskProgress: (update: TaskProgressUpdate) => void;
  completeTask: (taskId: string) => void;
  claimReward: (taskId: string) => void;
  startGuide: (guideId: string) => void;
  nextGuideStep: () => void;
  skipGuide: () => void;
  completeGuide: (guideId: string) => void;
  getTaskProgress: (taskId: string) => number;
  getCategoryTasks: (category: TaskCategory) => GameTask[];
  getPendingTaskCount: () => number;
  setTaskPanelOpen: (open: boolean) => void;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

const DEFAULT_DAILY_TASKS: Partial<GameTask>[] = [
  {
    id: 'daily_trade_1',
    title: '完成5笔交易',
    description: '在今日对局中完成至少5笔买入或卖出操作',
    category: TaskCategory.DAILY,
    priority: TaskPriority.MEDIUM,
    conditions: [{ type: 'TRADE_COUNT', targetValue: 5, description: '交易次数达到5次' }],
    reward: { experience: 50, coins: 100 },
    maxProgress: 5
  },
  {
    id: 'daily_profit_1',
    title: '盈利5%',
    description: '单局游戏中收益率达到5%以上',
    category: TaskCategory.DAILY,
    priority: TaskPriority.HIGH,
    conditions: [{ type: 'PROFIT_RATE', targetValue: 5, description: '收益率达到5%' }],
    reward: { experience: 100, coins: 200 },
    maxProgress: 5
  },
  {
    id: 'daily_diversify',
    title: '分散投资',
    description: '同时持有3个不同行业的股票',
    category: TaskCategory.DAILY,
    priority: TaskPriority.MEDIUM,
    conditions: [{ type: 'SECTOR_DIVERSIFY', targetValue: 3, description: '持有3个行业股票' }],
    reward: { experience: 75, coins: 150 },
    maxProgress: 3
  },
  {
    id: 'daily_news',
    title: '关注时事',
    description: '阅读今日市场新闻至少3条',
    category: TaskCategory.DAILY,
    priority: TaskPriority.LOW,
    conditions: [{ type: 'READ_NEWS', targetValue: 3, description: '阅读3条新闻' }],
    reward: { experience: 25, coins: 50 },
    maxProgress: 3
  },
  {
    id: 'daily_danmu',
    title: '活跃气氛',
    description: '在游戏中发送1条弹幕与其他玩家互动',
    category: TaskCategory.DAILY,
    priority: TaskPriority.LOW,
    conditions: [{ type: 'SEND_DANMU', targetValue: 1, description: '发送1条弹幕' }],
    reward: { experience: 30, coins: 60 },
    maxProgress: 1
  }
];

const NEWBIE_GUIDE_STEPS_TEACHER: GuideStep[] = [
  {
    id: 'welcome',
    targetElement: 'body',
    title: '欢迎来到AI股市操盘手',
    content: '在这里，你将体验真实的股票交易环境，学习投资理财知识。让我来带你熟悉一下游戏界面。',
    position: 'center',
    actionRequired: false,
    nextStep: 'stats_panel',
    skipable: true
  },
  {
    id: 'stats_panel',
    targetElement: 'stats-panel',
    title: '查看个人数据',
    content: '这里显示你的等级、段位、总资产和今日收益。等级越高，解锁的功能越多！',
    position: 'bottom',
    actionRequired: false,
    nextStep: 'enter_market',
    skipable: true
  },
  {
    id: 'enter_market',
    targetElement: 'game-plaza-btn',
    title: '进入游戏广场',
    content: '点击这里进入游戏广场，你可以创建游戏房间邀请学生参与，或者加入其他房间进行比赛！',
    position: 'bottom',
    actionRequired: true,
    actionType: 'CLICK',
    nextStep: 'stock_list',
    skipable: true
  },
  {
    id: 'stock_list',
    targetElement: 'stock-list',
    title: '浏览股票列表',
    content: '这里显示所有可交易的股票。每只股票有不同行业和风险等级，点击查看详情。',
    position: 'right',
    actionRequired: false,
    nextStep: 'stock_detail',
    skipable: true
  },
  {
    id: 'stock_detail',
    targetElement: 'stock-detail',
    title: '查看K线图',
    content: '这是股票的K线图，显示价格走势。红涨绿跌，学会看图是交易的第一步！',
    position: 'left',
    actionRequired: false,
    nextStep: 'place_order',
    skipable: true
  },
  {
    id: 'place_order',
    targetElement: 'order-panel',
    title: '下单交易',
    content: '选择买入或卖出，设置价格和数量后点击确认。记住，低买高卖才能盈利！',
    position: 'top',
    actionRequired: true,
    actionType: 'WAIT',
    nextStep: 'portfolio',
    skipable: true
  },
  {
    id: 'portfolio',
    targetElement: 'portfolio-tab',
    title: '查看持仓',
    content: '这里显示你持有的股票和现金。合理分配仓位，不要把鸡蛋放在一个篮子里！',
    position: 'bottom',
    actionRequired: false,
    nextStep: 'finish',
    skipable: true
  },
  {
    id: 'finish',
    targetElement: 'body',
    title: '新手引导完成',
    content: '恭喜你完成了新手引导！作为教师，你可以创建房间组织学生进行模拟交易教学。记住：股市有风险，投资需谨慎！',
    position: 'center',
    actionRequired: false,
    skipable: false
  }
];

const NEWBIE_GUIDE_STEPS_STUDENT: GuideStep[] = [
  {
    id: 'welcome',
    targetElement: 'body',
    title: '欢迎来到AI股市操盘手',
    content: '在这里，你将体验真实的股票交易环境，学习投资理财知识。让我来带你熟悉一下游戏界面。',
    position: 'center',
    actionRequired: false,
    nextStep: 'stats_panel',
    skipable: true
  },
  {
    id: 'stats_panel',
    targetElement: 'stats-panel',
    title: '查看个人数据',
    content: '这里显示你的等级、段位、总资产和今日收益。等级越高，解锁的功能越多！',
    position: 'bottom',
    actionRequired: false,
    nextStep: 'enter_market',
    skipable: true
  },
  {
    id: 'enter_market',
    targetElement: 'game-plaza-btn',
    title: '进入游戏广场',
    content: '点击这里进入游戏广场，查看并加入由教师或家长创建的游戏房间，开始你的第一局比赛！',
    position: 'bottom',
    actionRequired: true,
    actionType: 'CLICK',
    nextStep: 'join_room',
    skipable: true
  },
  {
    id: 'join_room',
    targetElement: 'room-list',
    title: '加入游戏房间',
    content: '选择一个等待中的房间，点击"加入房间"按钮进入游戏。学生只能加入房间，不能创建房间哦！',
    position: 'bottom',
    actionRequired: true,
    actionType: 'CLICK',
    nextStep: 'stock_list',
    skipable: true
  },
  {
    id: 'stock_list',
    targetElement: 'stock-list',
    title: '浏览股票列表',
    content: '这里显示所有可交易的股票。每只股票有不同行业和风险等级，点击查看详情。',
    position: 'right',
    actionRequired: false,
    nextStep: 'stock_detail',
    skipable: true
  },
  {
    id: 'stock_detail',
    targetElement: 'stock-detail',
    title: '查看K线图',
    content: '这是股票的K线图，显示价格走势。红涨绿跌，学会看图是交易的第一步！',
    position: 'left',
    actionRequired: false,
    nextStep: 'place_order',
    skipable: true
  },
  {
    id: 'place_order',
    targetElement: 'order-panel',
    title: '下单交易',
    content: '选择买入或卖出，设置价格和数量后点击确认。记住，低买高卖才能盈利！',
    position: 'top',
    actionRequired: true,
    actionType: 'WAIT',
    nextStep: 'portfolio',
    skipable: true
  },
  {
    id: 'portfolio',
    targetElement: 'portfolio-tab',
    title: '查看持仓',
    content: '这里显示你持有的股票和现金。合理分配仓位，不要把鸡蛋放在一个篮子里！',
    position: 'bottom',
    actionRequired: false,
    nextStep: 'finish',
    skipable: true
  },
  {
    id: 'finish',
    targetElement: 'body',
    title: '新手引导完成',
    content: '恭喜你完成了新手引导！现在开始你的投资之旅吧。记住：股市有风险，投资需谨慎！',
    position: 'center',
    actionRequired: false,
    skipable: false
  }
];

const getNewbieGuideSteps = (userRole: string): GuideStep[] => {
  return userRole === 'student' ? NEWBIE_GUIDE_STEPS_STUDENT : NEWBIE_GUIDE_STEPS_TEACHER;
};

const NEWBIE_TASKS: Partial<GameTask>[] = [
  {
    id: 'newbie_first_buy',
    title: '首次买入',
    description: '完成你的第一笔买入交易，开始投资之旅',
    category: TaskCategory.NEWBIE,
    priority: TaskPriority.CRITICAL,
    conditions: [{ type: 'FIRST_BUY', targetValue: 1, description: '完成首次买入' }],
    reward: { experience: 100, coins: 200, title: '新股民' },
    maxProgress: 1
  },
  {
    id: 'newbie_first_sell',
    title: '首次卖出',
    description: '完成你的第一笔卖出交易',
    category: TaskCategory.NEWBIE,
    priority: TaskPriority.HIGH,
    conditions: [{ type: 'FIRST_SELL', targetValue: 1, description: '完成首次卖出' }],
    reward: { experience: 80, coins: 150 },
    maxProgress: 1
  },
  {
    id: 'newbie_read_news',
    title: '关注行情',
    description: '阅读至少3条市场新闻，了解最新动态',
    category: TaskCategory.NEWBIE,
    priority: TaskPriority.MEDIUM,
    conditions: [{ type: 'READ_NEWS', targetValue: 3, description: '阅读3条新闻' }],
    reward: { experience: 50, coins: 100 },
    maxProgress: 3
  },
  {
    id: 'newbie_first_game',
    title: '首战告捷',
    description: '完成第一局游戏，无论输赢都是成长',
    category: TaskCategory.NEWBIE,
    priority: TaskPriority.CRITICAL,
    conditions: [{ type: 'JOIN_GAME', targetValue: 1, description: '完成1局游戏' }],
    reward: { experience: 150, coins: 300, title: '新股民' },
    maxProgress: 1
  },
  {
    id: 'newbie_profit',
    title: '初战告捷',
    description: '在单局游戏中实现盈利',
    category: TaskCategory.NEWBIE,
    priority: TaskPriority.HIGH,
    conditions: [{ type: 'PROFIT_RATE', targetValue: 1, description: '收益率达到1%' }],
    reward: { experience: 120, coins: 250 },
    maxProgress: 1
  },
  {
    id: 'newbie_level_2',
    title: '升级之路',
    description: '达到2级，解锁更多功能',
    category: TaskCategory.NEWBIE,
    priority: TaskPriority.HIGH,
    conditions: [{ type: 'LEVEL_REACH', targetValue: 2, description: '达到2级' }],
    reward: { experience: 200, coins: 400, title: '初窥门径' },
    maxProgress: 2
  }
];

const CHALLENGE_TASKS: Partial<GameTask>[] = [
  {
    id: 'challenge_pro_10',
    title: '专业交易员',
    description: '单局完成10笔以上交易',
    category: TaskCategory.CHALLENGE,
    priority: TaskPriority.HIGH,
    conditions: [{ type: 'TRADE_COUNT', targetValue: 10, description: '完成10笔交易' }],
    reward: { experience: 200, coins: 500 },
    maxProgress: 10
  },
  {
    id: 'challenge_profit_20',
    title: '收益翻红',
    description: '单局收益率达到20%以上',
    category: TaskCategory.CHALLENGE,
    priority: TaskPriority.CRITICAL,
    conditions: [{ type: 'PROFIT_RATE', targetValue: 20, description: '收益率达到20%' }],
    reward: { experience: 300, coins: 800, title: '股神附体' },
    maxProgress: 20
  },
  {
    id: 'challenge_winner',
    title: '第一名',
    description: '在任意对局中获得第一名',
    category: TaskCategory.CHALLENGE,
    priority: TaskPriority.CRITICAL,
    conditions: [{ type: 'WIN_GAME', targetValue: 1, description: '获得第1名' }],
    reward: { experience: 500, coins: 1000, title: '冠军交易员' },
    maxProgress: 1
  }
];

export const TaskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useUser();
  const [tasks, setTasks] = useState<GameTask[]>([]);
  const [activeGuide, setActiveGuide] = useState<GuideTour | null>(null);
  const [completedGuides, setCompletedGuides] = useState<string[]>([]);
  const [isGuideVisible, setIsGuideVisible] = useState(false);
  const [isTaskPanelOpen, setTaskPanelOpen] = useState(false);

  const getNewbieGuide = useCallback((): GuideTour => {
    const steps = getNewbieGuideSteps(user?.role || 'teacher');
    return {
      id: 'newbie_guide',
      name: '新手引导',
      steps: steps,
      isCompleted: false,
      currentStep: 0
    };
  }, [user?.role]);

  const initTasks = useCallback(() => {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    
    const dailyTasks = DEFAULT_DAILY_TASKS.map(task => ({
      ...task,
      status: TaskStatus.IN_PROGRESS,
      progress: 0,
      createdAt: now,
      expiresAt: now + dayMs,
      isNew: false,
      isClaimed: false
    } as GameTask));

    const newbieTasks = NEWBIE_TASKS.map(task => ({
      ...task,
      status: TaskStatus.IN_PROGRESS,
      progress: 0,
      createdAt: now,
      isNew: true,
      isClaimed: false
    } as GameTask));

    const challengeTasks = CHALLENGE_TASKS.map(task => ({
      ...task,
      status: TaskStatus.IN_PROGRESS,
      progress: 0,
      createdAt: now,
      isNew: false,
      isClaimed: false
    } as GameTask));

    setTasks([...newbieTasks, ...dailyTasks, ...challengeTasks]);

    const savedGuideState = localStorage.getItem('guide_completed');
    if (savedGuideState) {
      const completed = JSON.parse(savedGuideState);
      setCompletedGuides(completed);
    } else {
      setActiveGuide(getNewbieGuide());
      setIsGuideVisible(true);
    }
  }, [getNewbieGuide]);

  const updateTaskProgress = useCallback((update: TaskProgressUpdate) => {
    setTasks(prev => prev.map(task => {
      if (task.status !== TaskStatus.IN_PROGRESS) return task;
      
      const condition = task.conditions.find(c => c.type === update.conditionType);
      if (!condition) return task;

      const newProgress = Math.min(update.currentValue, condition.targetValue);
      const isComplete = newProgress >= condition.targetValue;

      return {
        ...task,
        progress: newProgress,
        status: isComplete ? TaskStatus.COMPLETED : TaskStatus.IN_PROGRESS,
        isNew: false
      };
    }));
  }, []);

  const completeTask = useCallback((taskId: string) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId 
        ? { ...task, status: TaskStatus.COMPLETED, isClaimed: false } 
        : task
    ));
  }, []);

  const claimReward = useCallback((taskId: string) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId 
        ? { ...task, isClaimed: true, status: TaskStatus.PENDING } 
        : task
    ));
  }, []);

  const startGuide = useCallback((guideId: string) => {
    if (guideId === 'newbie_guide' && !completedGuides.includes('newbie_guide')) {
      setActiveGuide({ ...getNewbieGuide(), currentStep: 0 });
      setIsGuideVisible(true);
    }
  }, [completedGuides, getNewbieGuide]);

  const nextGuideStep = useCallback(() => {
    if (!activeGuide) return;

    const currentStepData = activeGuide.steps[activeGuide.currentStep];
    
    if (currentStepData.nextStep === 'finish') {
      completeGuide(activeGuide.id);
      return;
    }

    const nextIndex = activeGuide.currentStep + 1;
    if (nextIndex < activeGuide.steps.length) {
      setActiveGuide(prev => prev ? { ...prev, currentStep: nextIndex } : null);
    }
  }, [activeGuide]);

  const skipGuide = useCallback(() => {
    setIsGuideVisible(false);
  }, []);

  const completeGuide = useCallback((guideId: string) => {
    setIsGuideVisible(false);
    setActiveGuide(null);
    const newCompleted = [...completedGuides, guideId];
    setCompletedGuides(newCompleted);
    localStorage.setItem('guide_completed', JSON.stringify(newCompleted));
  }, [completedGuides]);

  const getTaskProgress = useCallback((taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    return task ? (task.progress / task.maxProgress) * 100 : 0;
  }, [tasks]);

  const getCategoryTasks = useCallback((category: TaskCategory) => {
    return tasks.filter(t => t.category === category);
  }, [tasks]);

  const getPendingTaskCount = useCallback(() => {
    return tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length;
  }, [tasks]);

  useEffect(() => {
    initTasks();
  }, [initTasks]);

  return (
    <TaskContext.Provider value={{
      tasks,
      activeGuide,
      completedGuides,
      currentTask: tasks.find(t => t.status === TaskStatus.IN_PROGRESS) || null,
      isGuideVisible,
      isTaskPanelOpen,
      initTasks,
      updateTaskProgress,
      completeTask,
      claimReward,
      startGuide,
      nextGuideStep,
      skipGuide,
      completeGuide,
      getTaskProgress,
      getCategoryTasks,
      getPendingTaskCount,
      setTaskPanelOpen
    }}>
      {children}
    </TaskContext.Provider>
  );
};

export const useTask = () => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTask must be used within a TaskProvider');
  }
  return context;
};
