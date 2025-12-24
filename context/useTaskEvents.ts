import { useCallback, useContext } from 'react';
import { useTask } from './TaskContext';
import { 
  TaskCondition, 
  TaskProgressUpdate,
  TaskCategory,
  TaskStatus 
} from '../types';

export const useTaskEvents = () => {
  const { updateTaskProgress, initTasks, completeTask, claimReward, tasks } = useTask();

  const onTrade = useCallback((isBuy: boolean, amount: number, stockCount: number) => {
    updateTaskProgress({
      taskId: '',
      conditionType: 'TRADE_COUNT',
      currentValue: 0,
      targetValue: 0
    });
    
    if (isBuy) {
      updateTaskProgress({
        taskId: '',
        conditionType: 'FIRST_BUY',
        currentValue: 1,
        targetValue: 1
      });
    } else {
      updateTaskProgress({
        taskId: '',
        conditionType: 'FIRST_SELL',
        currentValue: 1,
        targetValue: 1
      });
    }
  }, [updateTaskProgress]);

  const onProfitUpdate = useCallback((profitRate: number) => {
    updateTaskProgress({
      taskId: '',
      conditionType: 'PROFIT_RATE',
      currentValue: profitRate,
      targetValue: 5
    });
  }, [updateTaskProgress]);

  const onPortfolioUpdate = useCallback((totalValue: number, sectors: string[]) => {
    updateTaskProgress({
      taskId: '',
      conditionType: 'PORTFOLIO_VALUE',
      currentValue: totalValue,
      targetValue: 100000
    });
    
    updateTaskProgress({
      taskId: '',
      conditionType: 'SECTOR_DIVERSIFY',
      currentValue: sectors.length,
      targetValue: 3
    });
  }, [updateTaskProgress]);

  const onNewsRead = useCallback(() => {
    updateTaskProgress({
      taskId: '',
      conditionType: 'READ_NEWS',
      currentValue: 1,
      targetValue: 3
    });
  }, [updateTaskProgress]);

  const onDanmuSent = useCallback(() => {
    updateTaskProgress({
      taskId: '',
      conditionType: 'SEND_DANMU',
      currentValue: 1,
      targetValue: 1
    });
  }, [updateTaskProgress]);

  const onBorrowMoney = useCallback((amount: number) => {
    updateTaskProgress({
      taskId: '',
      conditionType: 'BORROW_MONEY',
      currentValue: amount,
      targetValue: 10000
    });
  }, [updateTaskProgress]);

  const onRepayDebt = useCallback((amount: number) => {
    updateTaskProgress({
      taskId: '',
      conditionType: 'REPAY_DEBT',
      currentValue: amount,
      targetValue: 10000
    });
  }, [updateTaskProgress]);

  const onJoinGame = useCallback(() => {
    updateTaskProgress({
      taskId: '',
      conditionType: 'JOIN_GAME',
      currentValue: 1,
      targetValue: 1
    });
  }, [updateTaskProgress]);

  const onAttendance = useCallback(() => {
    updateTaskProgress({
      taskId: '',
      conditionType: 'ATTENDANCE',
      currentValue: 1,
      targetValue: 1
    });
  }, [updateTaskProgress]);

  const onLevelUp = useCallback((newLevel: number) => {
    updateTaskProgress({
      taskId: '',
      conditionType: 'LEVEL_REACH',
      currentValue: newLevel,
      targetValue: newLevel
    });
  }, [updateTaskProgress]);

  const onGameWin = useCallback(() => {
    updateTaskProgress({
      taskId: '',
      conditionType: 'WIN_GAME',
      currentValue: 1,
      targetValue: 1
    });
  }, [updateTaskProgress]);

  const onToolUse = useCallback((toolName: string) => {
    updateTaskProgress({
      taskId: '',
      conditionType: 'USE_TOOL',
      currentValue: 1,
      targetValue: 1
    });
  }, [updateTaskProgress]);

  const checkAndCompleteTasks = useCallback((currentValue: number, condition: TaskCondition) => {
    if (currentValue >= condition.targetValue) {
      updateTaskProgress({
        taskId: '',
        conditionType: condition.type,
        currentValue: condition.targetValue,
        targetValue: condition.targetValue
      });
    }
  }, [updateTaskProgress]);

  return {
    initTasks,
    completeTask,
    claimReward,
    getTasks: () => tasks,
    onTrade,
    onProfitUpdate,
    onPortfolioUpdate,
    onNewsRead,
    onDanmuSent,
    onBorrowMoney,
    onRepayDebt,
    onJoinGame,
    onAttendance,
    onLevelUp,
    onGameWin,
    onToolUse,
    checkAndCompleteTasks
  };
};

export default useTaskEvents;
