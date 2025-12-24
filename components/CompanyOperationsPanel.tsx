import React, { useState, useEffect, useMemo } from 'react';
import { StartupCompany, BusinessDecision, BusinessDecisionType, DecisionImpact, CompanyStage } from '../types/startup';
import { Sector } from '../types';

interface CompanyOperationsPanelProps {
  company: StartupCompany | null;
  availableDecisions: BusinessDecision[];
  onExecuteDecision: (decisionId: string) => void;
  onClose: () => void;
  playerCash: number;
}

const DECISION_ICONS: Record<BusinessDecisionType, string> = {
  [BusinessDecisionType.PRODUCT_LAUNCH]: 'rocket_launch',
  [BusinessDecisionType.MARKETING_CAMPAIGN]: 'campaign',
  [BusinessDecisionType.RD_INVESTMENT]: 'science',
  [BusinessDecisionType.EXPANSION]: 'trending_up',
  [BusinessDecisionType.PARTNERSHIP]: 'handshake',
  [BusinessDecisionType.COST_CUTTING]: 'savings',
  [BusinessDecisionType.TALENT_ACQUISITION]: 'person_add',
  [BusinessDecisionType.TECHNOLOGY_UPGRADE]: 'upgrade',
  [BusinessDecisionType.BRAND_BUILDING]: 'stars',
  [BusinessDecisionType.INTERNATIONAL_EXPANSION]: 'public'
};

const IMPACT_ICONS: Record<DecisionImpact, string> = {
  [DecisionImpact.REVENUE]: 'payments',
  [DecisionImpact.PROFIT]: 'account_balance',
  [DecisionImpact.GROWTH]: 'show_chart',
  [DecisionImpact.RISK]: 'warning',
  [DecisionImpact.BRAND]: 'verified',
  [DecisionImpact.INNOVATION]: 'lightbulb',
  [DecisionImpact.MARKET_SHARE]: 'pie_chart'
};

const IMPACT_LABELS: Record<DecisionImpact, string> = {
  [DecisionImpact.REVENUE]: '营收',
  [DecisionImpact.PROFIT]: '利润',
  [DecisionImpact.GROWTH]: '增长率',
  [DecisionImpact.RISK]: '风险',
  [DecisionImpact.BRAND]: '品牌价值',
  [DecisionImpact.INNOVATION]: '创新能力',
  [DecisionImpact.MARKET_SHARE]: '市场份额'
};

const RISK_COLORS = {
  low: { bg: 'bg-green-900/30', border: 'border-green-500/30', text: 'text-green-400', label: '低风险' },
  medium: { bg: 'bg-yellow-900/30', border: 'border-yellow-500/30', text: 'text-yellow-400', label: '中风险' },
  high: { bg: 'bg-red-900/30', border: 'border-red-500/30', text: 'text-red-400', label: '高风险' }
};

const STAGE_COLORS: Record<CompanyStage, string> = {
  [CompanyStage.SEED]: 'from-gray-700 to-gray-800',
  [CompanyStage.ANGEL]: 'from-blue-700 to-blue-800',
  [CompanyStage.SERIES_A]: 'from-purple-700 to-purple-800',
  [CompanyStage.SERIES_B]: 'from-indigo-700 to-indigo-800',
  [CompanyStage.SERIES_C]: 'from-pink-700 to-pink-800',
  [CompanyStage.PRE_IPO]: 'from-orange-700 to-orange-800',
  [CompanyStage.IPO]: 'from-green-700 to-green-800'
};

const CompanyOperationsPanel: React.FC<CompanyOperationsPanelProps> = ({
  company,
  availableDecisions,
  onExecuteDecision,
  onClose,
  playerCash
}) => {
  const [selectedDecision, setSelectedDecision] = useState<BusinessDecision | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const canAfford = (decision: BusinessDecision) => playerCash >= decision.cost;

  const getActiveDecisionProgress = (decisionId: string) => {
    const active = company?.activeDecisions.find(d => d.decisionId === decisionId);
    return active?.progress || 0;
  };

  const handleExecuteDecision = () => {
    if (selectedDecision) {
      onExecuteDecision(selectedDecision.id);
      setShowConfirm(false);
      setSelectedDecision(null);
    }
  };

  const getMetricValue = (type: DecisionImpact): number => {
    if (!company) return 0;
    const metrics = company.metrics as any;
    return metrics[type] || 0;
  };

  const formatMetricValue = (type: DecisionImpact, value: number): string => {
    if (type === DecisionImpact.REVENUE || type === DecisionImpact.PROFIT) {
      return `¥${(value / 10000).toFixed(1)}万`;
    }
    if (type === DecisionImpact.GROWTH || type === DecisionImpact.MARKET_SHARE) {
      return `${(value * 100).toFixed(1)}%`;
    }
    if (type === DecisionImpact.RISK) {
      return `${(value * 100).toFixed(1)}%`;
    }
    return value.toFixed(1);
  };

  if (!company) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[80] bg-black/90 flex items-center justify-center p-8 animate-fade-in backdrop-blur-md">
      <div className="bg-gray-900 border border-gray-600 w-full max-w-6xl h-[90vh] rounded-3xl shadow-2xl relative overflow-hidden flex flex-col">
        <div className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r ${STAGE_COLORS[company.stage]}`}></div>
        
        <div className="p-6 border-b border-gray-700 flex justify-between items-center bg-gray-800/50">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${STAGE_COLORS[company.stage]} flex items-center justify-center shadow-lg`}>
              <span className="material-icons text-3xl text-white">business</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{company.name}</h2>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-sm text-gray-400">{company.sector}</span>
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${RISK_COLORS[company.stage === CompanyStage.IPO ? 'low' : 'medium'].bg} ${RISK_COLORS[company.stage === CompanyStage.IPO ? 'low' : 'medium'].text}`}>
                  {company.stage}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="bg-gray-700 hover:bg-gray-600 p-2 rounded-full text-white transition-colors">
            <span className="material-icons">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 space-y-6">
              <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <span className="material-icons text-blue-400">assessment</span>
                  公司指标
                </h3>
                <div className="grid grid-cols-4 gap-4">
                  {Object.values(DecisionImpact).map(impact => (
                    <div key={impact} className="bg-gray-900/50 rounded-xl p-3 border border-gray-700/50">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="material-icons text-sm text-gray-400">{IMPACT_ICONS[impact]}</span>
                        <span className="text-xs text-gray-500">{IMPACT_LABELS[impact]}</span>
                      </div>
                      <div className="text-lg font-bold text-white font-mono">
                        {formatMetricValue(impact, getMetricValue(impact))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <span className="material-icons text-purple-400">auto_awesome</span>
                  可用决策
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {availableDecisions.map(decision => {
                    const progress = getActiveDecisionProgress(decision.id);
                    const riskConfig = RISK_COLORS[decision.riskLevel];
                    const canExecute = canAfford(decision) && progress === 0;

                    return (
                      <div
                        key={decision.id}
                        onClick={() => canExecute && setSelectedDecision(decision)}
                        className={`relative rounded-xl p-4 border transition-all cursor-pointer ${
                          canExecute
                            ? 'bg-gray-900/50 border-gray-700 hover:border-blue-500/50 hover:bg-gray-800/50'
                            : 'bg-gray-900/30 border-gray-800 opacity-50 cursor-not-allowed'
                        } ${selectedDecision?.id === decision.id ? 'ring-2 ring-blue-500' : ''}`}
                      >
                        {progress > 0 && (
                          <div className="absolute inset-0 bg-blue-900/20 rounded-xl overflow-hidden">
                            <div
                              className="absolute bottom-0 left-0 right-0 bg-blue-500/30 transition-all"
                              style={{ height: `${progress}%` }}
                            ></div>
                          </div>
                        )}
                        <div className="relative z-10">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="material-icons text-xl text-blue-400">
                                {DECISION_ICONS[decision.type]}
                              </span>
                              <h4 className="font-bold text-white text-sm">{decision.title}</h4>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded ${riskConfig.bg} ${riskConfig.border} ${riskConfig.text} border`}>
                              {riskConfig.label}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mb-3 line-clamp-2">{decision.description}</p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-500">成本:</span>
                              <span className="text-sm font-bold text-yellow-400 font-mono">
                                ¥{(decision.cost / 10000).toFixed(1)}万
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-500">成功率:</span>
                              <span className="text-sm font-bold text-green-400 font-mono">
                                {(decision.successRate * 100).toFixed(0)}%
                              </span>
                            </div>
                          </div>
                          {progress > 0 && (
                            <div className="mt-2">
                              <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                                <span>执行中</span>
                                <span>{progress.toFixed(0)}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-500 transition-all"
                                  style={{ width: `${progress}%` }}
                                ></div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <span className="material-icons text-green-400">account_balance</span>
                  公司估值
                </h3>
                <div className="text-center py-4">
                  <div className="text-3xl font-black text-white font-mono mb-2">
                    ¥{(company.valuation / 100000000).toFixed(2)}亿
                  </div>
                  <div className="text-sm text-gray-400">
                    总股本: {(company.sharesIssued / 10000).toFixed(0)}万股
                  </div>
                </div>
                <div className="border-t border-gray-700 pt-4 mt-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">投资者数量</span>
                    <span className="text-white font-bold">{company.investors.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">活跃决策</span>
                    <span className="text-white font-bold">{company.activeDecisions.length}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <span className="material-icons text-yellow-400">history</span>
                  历史记录
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {company.history.slice(-5).reverse().map((record, index) => (
                    <div key={index} className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/50">
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>{new Date(record.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-white">估值: ¥{(record.valuation / 100000000).toFixed(2)}亿</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedDecision && (
                <div className="bg-gray-800/50 rounded-2xl p-6 border border-blue-500/50">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <span className="material-icons text-blue-400">info</span>
                    决策详情
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm text-gray-400 mb-1">决策名称</div>
                      <div className="text-white font-bold">{selectedDecision.title}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400 mb-1">描述</div>
                      <div className="text-gray-300 text-sm">{selectedDecision.description}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400 mb-2">预期影响</div>
                      <div className="space-y-2">
                        {selectedDecision.impacts.map((impact, index) => (
                          <div key={index} className="flex items-center justify-between bg-gray-900/50 rounded-lg p-2">
                            <div className="flex items-center gap-2">
                              <span className="material-icons text-sm text-gray-400">{IMPACT_ICONS[impact.type]}</span>
                              <span className="text-xs text-gray-300">{IMPACT_LABELS[impact.type]}</span>
                            </div>
                            <span className={`text-sm font-bold ${impact.value > 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {impact.value > 0 ? '+' : ''}{(impact.value * 100).toFixed(1)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="pt-3 border-t border-gray-700">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-400">执行时间</span>
                        <span className="text-white">{(selectedDecision.executionTime / 1000).toFixed(0)}秒</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">所需资金</span>
                        <span className="text-yellow-400 font-bold">¥{(selectedDecision.cost / 10000).toFixed(1)}万</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowConfirm(true)}
                      className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-xl transition-all"
                    >
                      执行决策
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {showConfirm && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-gray-800 border border-gray-600 rounded-2xl p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <span className="material-icons text-yellow-400">warning</span>
                确认执行决策
              </h3>
              <div className="bg-gray-900/50 rounded-xl p-4 mb-4">
                <div className="text-white font-bold mb-2">{selectedDecision?.title}</div>
                <div className="text-gray-400 text-sm mb-3">{selectedDecision?.description}</div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">所需资金:</span>
                  <span className="text-yellow-400 font-bold">¥{((selectedDecision?.cost || 0) / 10000).toFixed(1)}万</span>
                </div>
              </div>
              <div className="text-sm text-gray-400 mb-4">
                此决策需要 {selectedDecision?.executionTime ? (selectedDecision.executionTime / 1000).toFixed(0) : 0} 秒执行时间，成功率为 {(selectedDecision?.successRate || 0) * 100}%。
                执行后将对公司各项指标产生影响。
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleExecuteDecision}
                  className="flex-1 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold rounded-xl transition-all"
                >
                  确认执行
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanyOperationsPanel;
