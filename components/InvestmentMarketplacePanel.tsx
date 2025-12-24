import React, { useState, useMemo } from 'react';
import { InvestmentMarketplace, InvestmentCompetition, InvestmentCooperation, InvestmentAlliance, InvestmentEvent, CompetitionType, CooperationType, StartupCompany } from '../types/startup';

interface InvestmentMarketplacePanelProps {
  marketplace: InvestmentMarketplace;
  startupCompanies: StartupCompany[];
  onCreateCompetition: (companyId: string, type: CompetitionType, targetAmount: number, duration: number) => void;
  onCreateCooperation: (name: string, companyId: string, type: CooperationType, targetAmount: number, minParticipants: number, maxParticipants: number, duration: number) => void;
  onJoinCompetition: (competitionId: string, investmentAmount: number) => void;
  onJoinCooperation: (cooperationId: string, investmentAmount: number, contribution: string) => void;
  onCreateAlliance: (name: string, targetCompanies: string[], allianceGoals: string[]) => void;
  onJoinAlliance: (allianceId: string) => void;
  onRefresh: () => void;
  onClose: () => void;
  playerCash: number;
}

const COMPETITION_TYPE_LABELS: Record<CompetitionType, string> = {
  [CompetitionType.BIDDING]: '竞价竞争',
  [CompetitionType.RACING]: '竞速竞争',
  [CompetitionType.DOMINANCE]: '主导竞争'
};

const COOPERATION_TYPE_LABELS: Record<CooperationType, string> = {
  [CooperationType.SYNDICATE]: '联合投资',
  [CooperationType.JOINT_VENTURE]: '合资企业',
  [CooperationType.RESOURCE_SHARING]: '资源共享',
  [CooperationType.KNOWLEDGE_SHARING]: '知识共享'
};

const InvestmentMarketplacePanel: React.FC<InvestmentMarketplacePanelProps> = ({
  marketplace,
  startupCompanies,
  onCreateCompetition,
  onCreateCooperation,
  onJoinCompetition,
  onJoinCooperation,
  onCreateAlliance,
  onJoinAlliance,
  onRefresh,
  onClose,
  playerCash
}) => {
  const [activeTab, setActiveTab] = useState<'opportunities' | 'competitions' | 'cooperations' | 'alliances' | 'leaderboard'>('opportunities');
  const [showCreateCompetition, setShowCreateCompetition] = useState(false);
  const [showCreateCooperation, setShowCreateCooperation] = useState(false);
  const [showCreateAlliance, setShowCreateAlliance] = useState(false);

  const [newCompetition, setNewCompetition] = useState({
    companyId: '',
    type: CompetitionType.BIDDING,
    targetAmount: 100,
    duration: 3600
  });

  const [newCooperation, setNewCooperation] = useState({
    name: '',
    companyId: '',
    type: CooperationType.SYNDICATE,
    targetAmount: 100,
    minParticipants: 2,
    maxParticipants: 10,
    duration: 3600
  });

  const [newAlliance, setNewAlliance] = useState({
    name: '',
    targetCompanies: [] as string[],
    allianceGoals: [] as string[]
  });

  const [joinAmount, setJoinAmount] = useState<{ [key: string]: number }>({});
  const [joinContribution, setJoinContribution] = useState<{ [key: string]: string }>({});

  const handleCreateCompetition = () => {
    if (newCompetition.companyId && newCompetition.targetAmount > 0) {
      onCreateCompetition(
        newCompetition.companyId,
        newCompetition.type,
        newCompetition.targetAmount,
        newCompetition.duration
      );
      setShowCreateCompetition(false);
      setNewCompetition({
        companyId: '',
        type: CompetitionType.BIDDING,
        targetAmount: 100,
        duration: 3600
      });
    }
  };

  const handleCreateCooperation = () => {
    if (newCooperation.name && newCooperation.companyId && newCooperation.targetAmount > 0) {
      onCreateCooperation(
        newCooperation.name,
        newCooperation.companyId,
        newCooperation.type,
        newCooperation.targetAmount,
        newCooperation.minParticipants,
        newCooperation.maxParticipants,
        newCooperation.duration
      );
      setShowCreateCooperation(false);
      setNewCooperation({
        name: '',
        companyId: '',
        type: CooperationType.SYNDICATE,
        targetAmount: 100,
        minParticipants: 2,
        maxParticipants: 10,
        duration: 3600
      });
    }
  };

  const handleCreateAlliance = () => {
    if (newAlliance.name && newAlliance.targetCompanies.length > 0) {
      onCreateAlliance(newAlliance.name, newAlliance.targetCompanies, newAlliance.allianceGoals);
      setShowCreateAlliance(false);
      setNewAlliance({
        name: '',
        targetCompanies: [],
        allianceGoals: []
      });
    }
  };

  const handleJoinCompetition = (competitionId: string) => {
    const amount = joinAmount[competitionId];
    if (amount && amount > 0 && amount <= playerCash) {
      onJoinCompetition(competitionId, amount);
      setJoinAmount({ ...joinAmount, [competitionId]: 0 });
    }
  };

  const handleJoinCooperation = (cooperationId: string) => {
    const amount = joinAmount[cooperationId];
    const contribution = joinContribution[cooperationId];
    if (amount && amount > 0 && amount <= playerCash && contribution) {
      onJoinCooperation(cooperationId, amount, contribution);
      setJoinAmount({ ...joinAmount, [cooperationId]: 0 });
      setJoinContribution({ ...joinContribution, [cooperationId]: '' });
    }
  };

  const handleJoinAlliance = (allianceId: string) => {
    onJoinAlliance(allianceId);
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return 'trending_up';
      case 'down': return 'trending_down';
      case 'stable': return 'trending_flat';
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return 'text-green-400';
      case 'down': return 'text-red-400';
      case 'stable': return 'text-yellow-400';
    }
  };

  const formatTimeRemaining = (endTime: number) => {
    const remaining = endTime - Date.now();
    if (remaining <= 0) return '已结束';
    const hours = Math.floor(remaining / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);
    return hours > 0 ? `${hours}小时${minutes}分钟` : `${minutes}分钟`;
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/90 flex items-center justify-center p-8 animate-fade-in backdrop-blur-md">
      <div className="bg-gray-900 border border-gray-600 w-full max-w-7xl h-[90vh] rounded-3xl shadow-2xl relative overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-700 flex justify-between items-center bg-gray-800/50">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-800 flex items-center justify-center shadow-lg">
              <span className="material-icons text-3xl text-white">account_balance</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">投资市场</h2>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-sm text-gray-400">玩家投资竞争与合作平台</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onRefresh}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-white transition-colors flex items-center gap-2"
            >
              <span className="material-icons text-sm">refresh</span>
              刷新
            </button>
            <button onClick={onClose} className="bg-gray-700 hover:bg-gray-600 p-2 rounded-full text-white transition-colors">
              <span className="material-icons">close</span>
            </button>
          </div>
        </div>

        <div className="flex border-b border-gray-700 bg-gray-800/30">
          {[
            { id: 'opportunities', label: '投资机会', icon: 'lightbulb' },
            { id: 'competitions', label: '投资竞争', icon: 'emoji_events' },
            { id: 'cooperations', label: '投资合作', icon: 'handshake' },
            { id: 'alliances', label: '玩家联盟', icon: 'groups' },
            { id: 'leaderboard', label: '排行榜', icon: 'leaderboard' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-4 px-6 flex items-center justify-center gap-2 transition-all ${
                activeTab === tab.id
                  ? 'text-blue-400 border-b-2 border-blue-500 bg-blue-900/20'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              <span className="material-icons text-sm">{tab.icon}</span>
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'opportunities' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <span className="material-icons text-yellow-400">lightbulb</span>
                  市场趋势
                </h3>
              </div>
              <div className="grid grid-cols-4 gap-4">
                {marketplace.marketTrends.map((trend, index) => (
                  <div key={index} className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-lg font-bold text-white">{trend.sector}</span>
                      <span className={`material-icons ${getTrendColor(trend.trend)}`}>
                        {getTrendIcon(trend.trend)}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">投资额</span>
                        <span className="text-white font-mono">{(trend.investmentVolume / 10000).toFixed(0)}万</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">平均回报</span>
                        <span className={`${trend.averageReturn >= 0 ? 'text-green-400' : 'text-red-400'} font-mono`}>
                          {(trend.averageReturn * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center mt-8 mb-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <span className="material-icons text-blue-400">business_center</span>
                  可投资公司
                </h3>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {marketplace.availableOpportunities.map((opportunity, index) => (
                  <div key={index} className="bg-gray-800/50 rounded-xl p-5 border border-gray-700 hover:border-blue-500/50 transition-all">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-bold text-white text-lg">{opportunity.companyName}</h4>
                        <p className="text-sm text-gray-400">{opportunity.sector}</p>
                      </div>
                      <span className="px-2 py-1 rounded text-xs font-bold bg-purple-900/30 text-purple-400 border border-purple-500/30">
                        {opportunity.stage}
                      </span>
                    </div>
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">估值</span>
                        <span className="text-white font-mono">¥{(opportunity.valuation / 10000).toFixed(1)}万</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">预期回报</span>
                        <span className="text-green-400 font-mono">{(opportunity.expectedReturn * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">风险等级</span>
                        <span className={`font-mono ${
                          opportunity.riskLevel === 'low' ? 'text-green-400' :
                          opportunity.riskLevel === 'medium' ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {opportunity.riskLevel === 'low' ? '低' :
                           opportunity.riskLevel === 'medium' ? '中' : '高'}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mb-3">{opportunity.description}</div>
                    <button className="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded-lg text-white font-medium transition-colors">
                      查看详情
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'competitions' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <span className="material-icons text-orange-400">emoji_events</span>
                  活跃投资竞争
                </h3>
                <button
                  onClick={() => setShowCreateCompetition(true)}
                  className="bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded-lg text-white transition-colors flex items-center gap-2"
                >
                  <span className="material-icons text-sm">add</span>
                  创建竞争
                </button>
              </div>

              {showCreateCompetition && (
                <div className="bg-gray-800/50 rounded-xl p-6 border border-orange-500/30">
                  <h4 className="text-lg font-bold text-white mb-4">创建投资竞争</h4>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">选择公司</label>
                      <select
                        value={newCompetition.companyId}
                        onChange={(e) => setNewCompetition({ ...newCompetition, companyId: e.target.value })}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white"
                      >
                        <option value="">请选择公司</option>
                        {startupCompanies.map(company => (
                          <option key={company.id} value={company.id}>{company.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">竞争类型</label>
                      <select
                        value={newCompetition.type}
                        onChange={(e) => setNewCompetition({ ...newCompetition, type: e.target.value as CompetitionType })}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white"
                      >
                        {Object.entries(COMPETITION_TYPE_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">目标金额 (万元)</label>
                      <input
                        type="number"
                        value={newCompetition.targetAmount}
                        onChange={(e) => setNewCompetition({ ...newCompetition, targetAmount: Number(e.target.value) })}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">持续时间 (秒)</label>
                      <input
                        type="number"
                        value={newCompetition.duration}
                        onChange={(e) => setNewCompetition({ ...newCompetition, duration: Number(e.target.value) })}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleCreateCompetition}
                      className="flex-1 bg-orange-600 hover:bg-orange-700 py-2 rounded-lg text-white font-medium transition-colors"
                    >
                      创建
                    </button>
                    <button
                      onClick={() => setShowCreateCompetition(false)}
                      className="flex-1 bg-gray-700 hover:bg-gray-600 py-2 rounded-lg text-white font-medium transition-colors"
                    >
                      取消
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {marketplace.activeCompetitions.map((competition) => (
                  <div key={competition.id} className="bg-gray-800/50 rounded-xl p-5 border border-gray-700">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-bold text-white text-lg">{competition.companyName}</h4>
                        <p className="text-sm text-gray-400">{COMPETITION_TYPE_LABELS[competition.type]}</p>
                      </div>
                      <span className="px-2 py-1 rounded text-xs font-bold bg-orange-900/30 text-orange-400 border border-orange-500/30">
                        {competition.stage}
                      </span>
                    </div>
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">目标金额</span>
                        <span className="text-white font-mono">¥{competition.targetAmount}万</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">当前金额</span>
                        <span className="text-blue-400 font-mono">¥{competition.currentTotal}万</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all"
                          style={{ width: `${Math.min((competition.currentTotal / competition.targetAmount) * 100, 100)}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">剩余时间</span>
                        <span className="text-white font-mono">{formatTimeRemaining(competition.endTime)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">参与者</span>
                        <span className="text-white font-mono">{competition.participants.length}人</span>
                      </div>
                    </div>
                    <div className="mb-4">
                      <div className="text-sm text-gray-400 mb-2">当前领先</div>
                      {competition.participants.find(p => p.isLeading) ? (
                        <div className="flex items-center gap-2">
                          <span className="material-icons text-yellow-400 text-sm">emoji_events</span>
                          <span className="text-white font-medium">
                            {competition.participants.find(p => p.isLeading)?.playerName}
                          </span>
                          <span className="text-blue-400 font-mono">
                            ¥{competition.participants.find(p => p.isLeading)?.investmentAmount}万
                          </span>
                        </div>
                      ) : (
                        <div className="text-gray-500 text-sm">暂无参与者</div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="投资金额"
                        value={joinAmount[competition.id] || ''}
                        onChange={(e) => setJoinAmount({ ...joinAmount, [competition.id]: Number(e.target.value) })}
                        className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                      />
                      <button
                        onClick={() => handleJoinCompetition(competition.id)}
                        disabled={!joinAmount[competition.id] || joinAmount[competition.id] > playerCash}
                        className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-700 disabled:cursor-not-allowed px-4 py-2 rounded-lg text-white font-medium transition-colors"
                      >
                        参与
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'cooperations' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <span className="material-icons text-green-400">handshake</span>
                  活跃投资合作
                </h3>
                <button
                  onClick={() => setShowCreateCooperation(true)}
                  className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg text-white transition-colors flex items-center gap-2"
                >
                  <span className="material-icons text-sm">add</span>
                  创建合作
                </button>
              </div>

              {showCreateCooperation && (
                <div className="bg-gray-800/50 rounded-xl p-6 border border-green-500/30">
                  <h4 className="text-lg font-bold text-white mb-4">创建投资合作</h4>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">合作名称</label>
                      <input
                        type="text"
                        value={newCooperation.name}
                        onChange={(e) => setNewCooperation({ ...newCooperation, name: e.target.value })}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">选择公司</label>
                      <select
                        value={newCooperation.companyId}
                        onChange={(e) => setNewCooperation({ ...newCooperation, companyId: e.target.value })}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white"
                      >
                        <option value="">请选择公司</option>
                        {startupCompanies.map(company => (
                          <option key={company.id} value={company.id}>{company.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">合作类型</label>
                      <select
                        value={newCooperation.type}
                        onChange={(e) => setNewCooperation({ ...newCooperation, type: e.target.value as CooperationType })}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white"
                      >
                        {Object.entries(COOPERATION_TYPE_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">目标金额 (万元)</label>
                      <input
                        type="number"
                        value={newCooperation.targetAmount}
                        onChange={(e) => setNewCooperation({ ...newCooperation, targetAmount: Number(e.target.value) })}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">最少参与者</label>
                      <input
                        type="number"
                        value={newCooperation.minParticipants}
                        onChange={(e) => setNewCooperation({ ...newCooperation, minParticipants: Number(e.target.value) })}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">最多参与者</label>
                      <input
                        type="number"
                        value={newCooperation.maxParticipants}
                        onChange={(e) => setNewCooperation({ ...newCooperation, maxParticipants: Number(e.target.value) })}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleCreateCooperation}
                      className="flex-1 bg-green-600 hover:bg-green-700 py-2 rounded-lg text-white font-medium transition-colors"
                    >
                      创建
                    </button>
                    <button
                      onClick={() => setShowCreateCooperation(false)}
                      className="flex-1 bg-gray-700 hover:bg-gray-600 py-2 rounded-lg text-white font-medium transition-colors"
                    >
                      取消
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {marketplace.activeCooperations.map((cooperation) => (
                  <div key={cooperation.id} className="bg-gray-800/50 rounded-xl p-5 border border-gray-700">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-bold text-white text-lg">{cooperation.name}</h4>
                        <p className="text-sm text-gray-400">{COOPERATION_TYPE_LABELS[cooperation.type]}</p>
                      </div>
                      <span className="px-2 py-1 rounded text-xs font-bold bg-green-900/30 text-green-400 border border-green-500/30">
                        {cooperation.participants.length}/{cooperation.maxParticipants}
                      </span>
                    </div>
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">目标公司</span>
                        <span className="text-white">{cooperation.companyName}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">目标金额</span>
                        <span className="text-white font-mono">¥{cooperation.targetAmount}万</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">当前金额</span>
                        <span className="text-blue-400 font-mono">¥{cooperation.currentTotal}万</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all"
                          style={{ width: `${Math.min((cooperation.currentTotal / cooperation.targetAmount) * 100, 100)}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">剩余时间</span>
                        <span className="text-white font-mono">{formatTimeRemaining(cooperation.endTime)}</span>
                      </div>
                    </div>
                    <div className="mb-4">
                      <div className="text-sm text-gray-400 mb-2">合作收益</div>
                      <div className="space-y-1">
                        {cooperation.benefits.slice(0, 2).map((benefit, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <span className="material-icons text-green-400 text-xs">check_circle</span>
                            <span className="text-gray-300">{benefit.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="投资金额"
                        value={joinAmount[cooperation.id] || ''}
                        onChange={(e) => setJoinAmount({ ...joinAmount, [cooperation.id]: Number(e.target.value) })}
                        className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                      />
                      <input
                        type="text"
                        placeholder="贡献说明"
                        value={joinContribution[cooperation.id] || ''}
                        onChange={(e) => setJoinContribution({ ...joinContribution, [cooperation.id]: e.target.value })}
                        className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                      />
                      <button
                        onClick={() => handleJoinCooperation(cooperation.id)}
                        disabled={!joinAmount[cooperation.id] || !joinContribution[cooperation.id] || joinAmount[cooperation.id] > playerCash}
                        className="bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed px-4 py-2 rounded-lg text-white font-medium transition-colors"
                      >
                        加入
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'alliances' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <span className="material-icons text-purple-400">groups</span>
                  玩家联盟
                </h3>
                <button
                  onClick={() => setShowCreateAlliance(true)}
                  className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg text-white transition-colors flex items-center gap-2"
                >
                  <span className="material-icons text-sm">add</span>
                  创建联盟
                </button>
              </div>

              {showCreateAlliance && (
                <div className="bg-gray-800/50 rounded-xl p-6 border border-purple-500/30">
                  <h4 className="text-lg font-bold text-white mb-4">创建玩家联盟</h4>
                  <div className="grid grid-cols-1 gap-4 mb-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">联盟名称</label>
                      <input
                        type="text"
                        value={newAlliance.name}
                        onChange={(e) => setNewAlliance({ ...newAlliance, name: e.target.value })}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">目标公司</label>
                      <div className="grid grid-cols-3 gap-2">
                        {startupCompanies.map(company => (
                          <label key={company.id} className="flex items-center gap-2 bg-gray-900/50 p-2 rounded-lg cursor-pointer hover:bg-gray-700/50">
                            <input
                              type="checkbox"
                              checked={newAlliance.targetCompanies.includes(company.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewAlliance({
                                    ...newAlliance,
                                    targetCompanies: [...newAlliance.targetCompanies, company.id]
                                  });
                                } else {
                                  setNewAlliance({
                                    ...newAlliance,
                                    targetCompanies: newAlliance.targetCompanies.filter(id => id !== company.id)
                                  });
                                }
                              }}
                              className="rounded"
                            />
                            <span className="text-sm text-white">{company.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">联盟目标</label>
                      <div className="grid grid-cols-2 gap-2">
                        {['市场主导', '技术创新', '资源整合', '风险共担'].map(goal => (
                          <label key={goal} className="flex items-center gap-2 bg-gray-900/50 p-2 rounded-lg cursor-pointer hover:bg-gray-700/50">
                            <input
                              type="checkbox"
                              checked={newAlliance.allianceGoals.includes(goal)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewAlliance({
                                    ...newAlliance,
                                    allianceGoals: [...newAlliance.allianceGoals, goal]
                                  });
                                } else {
                                  setNewAlliance({
                                    ...newAlliance,
                                    allianceGoals: newAlliance.allianceGoals.filter(g => g !== goal)
                                  });
                                }
                              }}
                              className="rounded"
                            />
                            <span className="text-sm text-white">{goal}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleCreateAlliance}
                      className="flex-1 bg-purple-600 hover:bg-purple-700 py-2 rounded-lg text-white font-medium transition-colors"
                    >
                      创建
                    </button>
                    <button
                      onClick={() => setShowCreateAlliance(false)}
                      className="flex-1 bg-gray-700 hover:bg-gray-600 py-2 rounded-lg text-white font-medium transition-colors"
                    >
                      取消
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {marketplace.activeAlliances.map((alliance) => (
                  <div key={alliance.id} className="bg-gray-800/50 rounded-xl p-5 border border-gray-700">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-bold text-white text-lg">{alliance.name}</h4>
                        <p className="text-sm text-gray-400">联盟等级 {alliance.allianceLevel}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-bold ${alliance.isActive ? 'bg-green-900/30 text-green-400' : 'bg-gray-900/30 text-gray-400'} border ${alliance.isActive ? 'border-green-500/30' : 'border-gray-700'}`}>
                        {alliance.isActive ? '活跃' : '休眠'}
                      </span>
                    </div>
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">盟主</span>
                        <span className="text-white">{alliance.leaderName}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">成员数量</span>
                        <span className="text-white font-mono">{alliance.members.length}人</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">目标公司</span>
                        <span className="text-white">{alliance.targetCompanies.length}家</span>
                      </div>
                    </div>
                    <div className="mb-4">
                      <div className="text-sm text-gray-400 mb-2">联盟资源</div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-gray-900/50 p-2 rounded-lg">
                          <div className="text-xs text-gray-500">资金</div>
                          <div className="text-sm text-blue-400 font-mono">¥{alliance.resources.capital}万</div>
                        </div>
                        <div className="bg-gray-900/50 p-2 rounded-lg">
                          <div className="text-xs text-gray-500">影响力</div>
                          <div className="text-sm text-purple-400 font-mono">{alliance.resources.influence}</div>
                        </div>
                        <div className="bg-gray-900/50 p-2 rounded-lg">
                          <div className="text-xs text-gray-500">知识</div>
                          <div className="text-sm text-green-400 font-mono">{alliance.resources.knowledge}</div>
                        </div>
                        <div className="bg-gray-900/50 p-2 rounded-lg">
                          <div className="text-xs text-gray-500">人脉</div>
                          <div className="text-sm text-orange-400 font-mono">{alliance.resources.network}</div>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleJoinAlliance(alliance.id)}
                      className="w-full bg-purple-600 hover:bg-purple-700 py-2 rounded-lg text-white font-medium transition-colors"
                    >
                      申请加入
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'leaderboard' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <span className="material-icons text-yellow-400">leaderboard</span>
                  投资排行榜
                </h3>
                <span className="text-sm text-gray-400">更新时间: {new Date(marketplace.leaderboard.lastUpdated).toLocaleString()}</span>
              </div>

              <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden">
                <div className="grid grid-cols-7 gap-4 p-4 bg-gray-900/50 border-b border-gray-700 text-sm font-bold text-gray-400">
                  <div>排名</div>
                  <div>玩家</div>
                  <div>总投资</div>
                  <div>总回报</div>
                  <div>回报率</div>
                  <div>成功投资</div>
                  <div>声望</div>
                </div>
                {marketplace.leaderboard.rankings.map((ranking) => (
                  <div
                    key={ranking.playerId}
                    className={`grid grid-cols-7 gap-4 p-4 border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors ${
                      ranking.rank <= 3 ? 'bg-gradient-to-r from-yellow-900/10 to-transparent' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {ranking.rank <= 3 ? (
                        <span className={`material-icons ${
                          ranking.rank === 1 ? 'text-yellow-400' :
                          ranking.rank === 2 ? 'text-gray-400' : 'text-orange-400'
                        }`}>
                          {ranking.rank === 1 ? 'emoji_events' : ranking.rank === 2 ? 'military_tech' : 'workspace_premium'}
                        </span>
                      ) : (
                        <span className="text-white font-mono">#{ranking.rank}</span>
                      )}
                    </div>
                    <div className="text-white font-medium">{ranking.playerName}</div>
                    <div className="text-blue-400 font-mono">¥{ranking.totalInvested.toFixed(0)}万</div>
                    <div className={`font-mono ${ranking.totalReturns >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      ¥{ranking.totalReturns.toFixed(0)}万
                    </div>
                    <div className={`font-mono ${ranking.returnRate >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {(ranking.returnRate * 100).toFixed(1)}%
                    </div>
                    <div className="text-white font-mono">{ranking.successfulInvestments}次</div>
                    <div className="text-purple-400 font-mono">{ranking.reputation}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvestmentMarketplacePanel;
