import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MarketNews, NewsType } from '../types';

export type NewsCategory = 'BREAKING' | 'RUMOR' | 'INSIDER' | 'EXPERT';

const getCategoryInfo = (type: NewsType): { key: NewsCategory; label: string; color: string; icon: string } => {
  switch (type) {
    case NewsType.NEWS:
      return { key: 'BREAKING', label: '重大新闻', color: 'text-red-400', icon: '🔥' };
    case NewsType.RUMOR:
      return { key: 'RUMOR', label: '传闻/小道', color: 'text-orange-400', icon: '💬' };
    case NewsType.SENTIMENT:
      return { key: 'INSIDER', label: '内幕消息', color: 'text-purple-400', icon: '🔍' };
    case NewsType.EXPERT:
      return { key: 'EXPERT', label: '专家分析', color: 'text-blue-400', icon: '📊' };
    default:
      return { key: 'BREAKING', label: '新闻', color: 'text-gray-400', icon: '📰' };
  }
};

const CATEGORY_ORDER: NewsCategory[] = ['BREAKING', 'RUMOR', 'INSIDER', 'EXPERT'];

export const useSequentialNews = (allNews: MarketNews[], loadInterval: number = 5000) => {
  const [visibleNews, setVisibleNews] = useState<MarketNews[]>([]);
  const [loadedCount, setLoadedCount] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (allNews.length === 0) {
      setVisibleNews([]);
      setLoadedCount(0);
      return;
    }

    if (isPaused) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    if (loadedCount >= allNews.length) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setLoadedCount(prev => {
        const nextCount = prev + 1;
        if (nextCount >= allNews.length) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
        }
        return nextCount;
      });
    }, loadInterval);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [allNews.length, loadInterval, isPaused]);

  useEffect(() => {
    setVisibleNews(allNews.slice(0, loadedCount));
  }, [loadedCount, allNews]);

  const togglePause = useCallback(() => setIsPaused(prev => !prev), []);
  const reset = useCallback(() => {
    setLoadedCount(0);
    setVisibleNews([]);
  }, []);
  const loadMore = useCallback((count: number) => {
    setLoadedCount(prev => Math.min(prev + count, allNews.length));
  }, [allNews.length]);

  return {
    visibleNews,
    totalNews: allNews.length,
    loadedCount,
    isPaused,
    togglePause,
    reset,
    loadMore,
    setIsPaused
  };
};

interface NewsMarqueeProps {
  news: MarketNews[];
  speed?: number;
  pauseOnHover?: boolean;
}

export const NewsMarquee: React.FC<NewsMarqueeProps> = ({ news, speed = 50, pauseOnHover = true }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (news.length === 0) return;

    const interval = setInterval(() => {
      if (!isPaused) {
        setCurrentIndex(prev => (prev + 1) % news.length);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [news.length, isPaused]);

  if (news.length === 0) {
    return (
      <div className="bg-gray-800/80 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4">
        <div className="flex items-center gap-2 text-gray-500">
          <span className="material-icons animate-pulse">breaking_news</span>
          <span>暂无新闻</span>
        </div>
      </div>
    );
  }

  const currentNews = news[currentIndex];
  const category = getCategoryInfo(currentNews.type);

  return (
    <div 
      className="bg-gray-800/80 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden"
      onMouseEnter={() => pauseOnHover && setIsPaused(true)}
      onMouseLeave={() => pauseOnHover && setIsPaused(false)}
    >
      <div className="flex items-center">
        <div className={`${category.color} px-4 py-3 flex items-center gap-1 font-bold text-sm whitespace-nowrap`}>
          <span>{category.icon}</span>
          <span>{category.label}</span>
        </div>
        <div className="flex-1 px-4 py-3 overflow-hidden">
          <div className="transition-opacity duration-300 ease-in-out">
            <h4 className="font-bold text-white text-sm truncate">{currentNews.title}</h4>
            <p className="text-gray-400 text-xs mt-1 truncate">{currentNews.content}</p>
          </div>
        </div>
        <div className="px-4 py-3 flex items-center gap-2">
          <span className="text-xs text-gray-500">{currentIndex + 1}/{news.length}</span>
          <button 
            onClick={() => setCurrentIndex(prev => (prev - 1 + news.length) % news.length)}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
          >
            <span className="material-icons text-gray-400 text-sm">chevron_left</span>
          </button>
          <button 
            onClick={() => setIsPaused(!isPaused)}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
          >
            <span className="material-icons text-gray-400 text-sm">{isPaused ? 'play_arrow' : 'pause'}</span>
          </button>
          <button 
            onClick={() => setCurrentIndex(prev => (prev + 1) % news.length)}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
          >
            <span className="material-icons text-gray-400 text-sm">chevron_right</span>
          </button>
        </div>
      </div>
    </div>
  );
};

interface NewsColumnProps {
  news: MarketNews[];
  category: NewsCategory;
  maxItems?: number;
}

export const NewsColumn: React.FC<NewsColumnProps> = ({ news, category, maxItems = 5 }) => {
  const categoryNews = news
    .filter(n => getCategoryInfo(n.type).key === category)
    .slice(0, maxItems);

  const categoryConfig = CATEGORY_ORDER.find(c => c === category);
  const config = categoryConfig ? {
    BREAKING: { label: '🔥 重大新闻', color: 'border-red-500/50', bg: 'bg-red-500/10' },
    RUMOR: { label: '💬 传闻/小道', color: 'border-orange-500/50', bg: 'bg-orange-500/10' },
    INSIDER: { label: '🔍 内幕消息', color: 'border-purple-500/50', bg: 'bg-purple-500/10' },
    EXPERT: { label: '📊 专家分析', color: 'border-blue-500/50', bg: 'bg-blue-500/10' },
  }[category] : { label: '📰 新闻', color: 'border-gray-500/50', bg: 'bg-gray-500/10' };

  if (categoryNews.length === 0) {
    return (
      <div className={`${config.bg} border ${config.color} rounded-xl p-4 min-h-[200px]`}>
        <h3 className="text-sm font-bold text-gray-400 mb-3">{config.label}</h3>
        <div className="text-center text-gray-600 text-sm py-8">暂无新闻</div>
      </div>
    );
  }

  return (
    <div className={`${config.bg} border ${config.color} rounded-xl p-4`}>
      <h3 className="text-sm font-bold text-gray-300 mb-3 flex items-center gap-2">
        {config.label}
        <span className="text-xs bg-gray-700 px-2 py-0.5 rounded-full text-gray-400">
          {categoryNews.length}
        </span>
      </h3>
      <div className="space-y-3">
        {categoryNews.map((item, index) => (
          <div 
            key={item.id} 
            className="bg-gray-800/50 rounded-lg p-3 hover:bg-gray-700/50 transition-all cursor-pointer border border-gray-700/30"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-start gap-2">
              <span className="text-xs text-gray-500 whitespace-nowrap mt-0.5">
                {new Date(item.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
              </span>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-200 truncate">{item.title}</h4>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.content}</p>
                <div className="flex items-center gap-2 mt-2">
                  {item.impact === 'positive' && (
                    <span className="text-xs text-green-400">📈 利好</span>
                  )}
                  {item.impact === 'negative' && (
                    <span className="text-xs text-red-400">📉 利空</span>
                  )}
                  {item.affectedSectors.length > 0 && (
                    <span className="text-xs text-gray-500 truncate">
                      {item.affectedSectors[0]}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface NewsMarqueePanelProps {
  news: MarketNews[];
  onNewsClick?: (news: MarketNews) => void;
}

export const NewsMarqueePanel: React.FC<NewsMarqueePanelProps> = ({ news, onNewsClick }) => {
  const { visibleNews, totalNews, loadedCount, isPaused, togglePause, reset, loadMore, setIsPaused } = useSequentialNews(news);

  const breakingNews = visibleNews.filter(n => getCategoryInfo(n.type).key === 'BREAKING');
  const otherNews = visibleNews.filter(n => getCategoryInfo(n.type).key !== 'BREAKING');

  return (
    <div className="space-y-4">
      <NewsMarquee news={breakingNews} pauseOnHover={true} />
      
      <div className="bg-gray-800/60 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-300">最新资讯</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">
              已加载 {loadedCount}/{totalNews}
            </span>
            <button 
              onClick={togglePause}
              className="p-1 hover:bg-gray-700 rounded transition-colors"
              title={isPaused ? '继续加载' : '暂停加载'}
            >
              <span className="material-icons text-gray-400 text-sm">
                {isPaused ? 'play_arrow' : 'pause'}
              </span>
            </button>
            <button 
              onClick={reset}
              className="p-1 hover:bg-gray-700 rounded transition-colors"
              title="重新加载"
            >
              <span className="material-icons text-gray-400 text-sm">refresh</span>
            </button>
          </div>
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
          {otherNews.map((item, index) => {
            const category = getCategoryInfo(item.type);
            return (
              <div 
                key={item.id}
                className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-700/30 cursor-pointer transition-all"
                onClick={() => onNewsClick?.(item)}
                style={{ animation: `fadeIn 0.3s ease-out ${index * 50}ms both` }}
              >
                <span className={`text-xs ${category.color} whitespace-nowrap mt-0.5 min-w-[60px]`}>
                  {category.icon} {category.label}
                </span>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm text-gray-200 truncate">{item.title}</h4>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{item.content}</p>
                </div>
                <span className="text-xs text-gray-600 whitespace-nowrap">
                  {new Date(item.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })}
          {otherNews.length === 0 && (
            <div className="text-center text-gray-600 text-sm py-4">
              正在等待新闻...
            </div>
          )}
        </div>

        {loadedCount < totalNews && (
          <button 
            onClick={() => loadMore(3)}
            className="w-full mt-3 py-2 bg-gray-700/50 hover:bg-gray-700 rounded-lg text-sm text-gray-400 transition-colors"
          >
            加载更多 (+3)
          </button>
        )}
      </div>
    </div>
  );
};

interface NewsDashboardProps {
  news: MarketNews[];
  onNewsClick?: (news: MarketNews) => void;
}

export const NewsDashboard: React.FC<NewsDashboardProps> = ({ news, onNewsClick }) => {
  const sortedNews = [...news].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="space-y-4">
      <NewsMarqueePanel news={sortedNews} onNewsClick={onNewsClick} />
      
      <div className="grid grid-cols-2 gap-4">
        {CATEGORY_ORDER.slice(1).map(category => (
          <NewsColumn 
            key={category} 
            news={sortedNews} 
            category={category} 
            maxItems={4}
          />
        ))}
      </div>
    </div>
  );
};

export default NewsDashboard;
