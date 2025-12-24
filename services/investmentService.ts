import {
  InvestmentActionType,
  InvestmentStatus,
  CompetitionType,
  CooperationType,
  InvestmentRequest,
  InvestmentCompetition,
  InvestmentCooperation,
  InvestmentAlliance,
  InvestmentEvent,
  InvestmentLeaderboard,
  PlayerInvestmentProfile,
  InvestmentMarketplace,
  StartupCompany,
  CompanyStage,
  InvestmentOpportunity
} from '../types/startup';
import { Player } from '../types';

export class InvestmentService {
  private investmentRequests: Map<string, InvestmentRequest> = new Map();
  private activeCompetitions: Map<string, InvestmentCompetition> = new Map();
  private activeCooperations: Map<string, InvestmentCooperation> = new Map();
  private activeAlliances: Map<string, InvestmentAlliance> = new Map();
  private playerProfiles: Map<string, PlayerInvestmentProfile> = new Map();
  private investmentEvents: InvestmentEvent[] = [];
  private leaderboard: InvestmentLeaderboard = {
    period: 'all_time',
    rankings: [],
    lastUpdated: Date.now()
  };

  createInvestmentRequest(
    playerId: string,
    playerName: string,
    company: StartupCompany,
    investmentAmount: number,
    equityRequested: number
  ): InvestmentRequest {
    const request: InvestmentRequest = {
      id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      playerId,
      playerName,
      companyId: company.id,
      companyName: company.name,
      investmentAmount,
      equityRequested,
      valuation: company.valuation,
      timestamp: Date.now(),
      status: InvestmentStatus.PENDING,
      conditions: this.generateInvestmentConditions(company, investmentAmount)
    };

    this.investmentRequests.set(request.id, request);
    this.recordInvestmentEvent({
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'investment',
      companyId: company.id,
      companyName: company.name,
      participants: [{ playerId, playerName, role: 'investor' }],
      amount: investmentAmount,
      timestamp: Date.now(),
      description: `${playerName} 提交了对 ${company.name} 的投资请求，金额 ${investmentAmount} 万元`
    });

    return request;
  }

  approveInvestmentRequest(requestId: string, company: StartupCompany): { success: boolean; message: string } {
    const request = this.investmentRequests.get(requestId);
    if (!request) {
      return { success: false, message: '投资请求不存在' };
    }

    if (request.status !== InvestmentStatus.PENDING) {
      return { success: false, message: '该请求已处理' };
    }

    const equityPercentage = (request.investmentAmount / request.valuation) * 100;
    const sharesToIssue = Math.floor((equityPercentage / 100) * company.sharesIssued);

    const updatedCompany = { ...company };
    updatedCompany.valuation += request.investmentAmount;
    updatedCompany.sharesIssued += sharesToIssue;
    updatedCompany.investors = [
      ...updatedCompany.investors,
      {
        playerId: request.playerId,
        shares: sharesToIssue,
        investmentAmount: request.investmentAmount,
        entryValuation: request.valuation
      }
    ];

    const updatedRequest = { ...request, status: InvestmentStatus.COMPLETED };
    this.investmentRequests.set(requestId, updatedRequest);

    this.updatePlayerInvestmentProfile(request.playerId, request.playerName, updatedCompany, request.investmentAmount, sharesToIssue);

    return { success: true, message: '投资请求已批准' };
  }

  createInvestmentCompetition(
    company: StartupCompany,
    type: CompetitionType,
    targetAmount: number,
    duration: number
  ): InvestmentCompetition {
    const competition: InvestmentCompetition = {
      id: `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      companyId: company.id,
      companyName: company.name,
      stage: company.stage,
      type,
      targetAmount,
      currentTotal: 0,
      startTime: Date.now(),
      endTime: Date.now() + duration * 60 * 1000,
      participants: [],
      status: InvestmentStatus.ACTIVE,
      rewards: this.generateCompetitionRewards(type, targetAmount)
    };

    this.activeCompetitions.set(competition.id, competition);
    return competition;
  }

  joinCompetition(
    competitionId: string,
    playerId: string,
    playerName: string,
    investmentAmount: number
  ): { success: boolean; message: string; competition?: InvestmentCompetition } {
    const competition = this.activeCompetitions.get(competitionId);
    if (!competition) {
      return { success: false, message: '竞争不存在' };
    }

    if (competition.status !== InvestmentStatus.ACTIVE) {
      return { success: false, message: '竞争已结束' };
    }

    if (Date.now() > competition.endTime) {
      competition.status = InvestmentStatus.COMPLETED;
      this.activeCompetitions.set(competitionId, competition);
      return { success: false, message: '竞争已结束' };
    }

    const existingParticipant = competition.participants.find(p => p.playerId === playerId);
    if (existingParticipant) {
      return { success: false, message: '您已参与此竞争' };
    }

    const equityShare = (investmentAmount / competition.targetAmount) * 100;
    const newParticipant = {
      playerId,
      playerName,
      investmentAmount,
      equityShare,
      isLeading: false
    };

    competition.participants.push(newParticipant);
    competition.currentTotal += investmentAmount;

    competition.participants.sort((a, b) => b.investmentAmount - a.investmentAmount);
    if (competition.participants.length > 0) {
      competition.participants[0].isLeading = true;
    }

    this.activeCompetitions.set(competitionId, competition);

    this.recordInvestmentEvent({
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'competition',
      companyId: competition.companyId,
      companyName: competition.companyName,
      participants: [{ playerId, playerName, role: 'participant' }],
      amount: investmentAmount,
      timestamp: Date.now(),
      description: `${playerName} 加入了 ${competition.companyName} 的投资竞争，投资 ${investmentAmount} 万元`
    });

    return { success: true, message: '成功加入竞争', competition };
  }

  resolveCompetition(competitionId: string, company: StartupCompany): { winner?: { playerId: string; playerName: string; investmentAmount: number; equityShare: number }; message: string } {
    const competition = this.activeCompetitions.get(competitionId);
    if (!competition) {
      return { message: '竞争不存在' };
    }

    if (competition.status !== InvestmentStatus.ACTIVE) {
      return { message: '竞争已结束' };
    }

    competition.status = InvestmentStatus.COMPLETED;

    if (competition.participants.length === 0) {
      this.activeCompetitions.set(competitionId, competition);
      return { message: '竞争结束，无参与者' };
    }

    const winner = competition.participants[0];
    competition.winner = winner;

    const equityPercentage = (winner.investmentAmount / company.valuation) * 100;
    const sharesToIssue = Math.floor((equityPercentage / 100) * company.sharesIssued);

    const updatedCompany = { ...company };
    updatedCompany.valuation += winner.investmentAmount;
    updatedCompany.sharesIssued += sharesToIssue;
    updatedCompany.investors = [
      ...updatedCompany.investors,
      {
        playerId: winner.playerId,
        shares: sharesToIssue,
        investmentAmount: winner.investmentAmount,
        entryValuation: company.valuation
      }
    ];

    this.activeCompetitions.set(competitionId, competition);

    this.updatePlayerInvestmentProfile(winner.playerId, winner.playerName, updatedCompany, winner.investmentAmount, sharesToIssue);
    this.updatePlayerCompetitionStats(winner.playerId, winner.investmentAmount, true);

    this.recordInvestmentEvent({
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'competition',
      companyId: competition.companyId,
      companyName: competition.companyName,
      participants: [{ playerId: winner.playerId, playerName: winner.playerName, role: 'winner' }],
      amount: winner.investmentAmount,
      timestamp: Date.now(),
      description: `${winner.playerName} 赢得了 ${competition.companyName} 的投资竞争，获得 ${equityPercentage.toFixed(2)}% 股权`
    });

    return { winner, message: `${winner.playerName} 赢得了竞争！` };
  }

  createInvestmentCooperation(
    name: string,
    company: StartupCompany,
    type: CooperationType,
    targetAmount: number,
    minParticipants: number,
    maxParticipants: number,
    duration: number
  ): InvestmentCooperation {
    const cooperation: InvestmentCooperation = {
      id: `coop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      type,
      companyId: company.id,
      companyName: company.name,
      targetAmount,
      currentTotal: 0,
      minParticipants,
      maxParticipants,
      participants: [],
      benefits: this.generateCooperationBenefits(type, targetAmount),
      startTime: Date.now(),
      endTime: Date.now() + duration * 60 * 1000,
      status: InvestmentStatus.ACTIVE,
      agreementTerms: this.generateAgreementTerms(type)
    };

    this.activeCooperations.set(cooperation.id, cooperation);
    return cooperation;
  }

  joinCooperation(
    cooperationId: string,
    playerId: string,
    playerName: string,
    investmentAmount: number,
    contribution: string
  ): { success: boolean; message: string; cooperation?: InvestmentCooperation } {
    const cooperation = this.activeCooperations.get(cooperationId);
    if (!cooperation) {
      return { success: false, message: '合作项目不存在' };
    }

    if (cooperation.status !== InvestmentStatus.ACTIVE) {
      return { success: false, message: '合作项目已结束' };
    }

    if (Date.now() > cooperation.endTime) {
      cooperation.status = InvestmentStatus.COMPLETED;
      this.activeCooperations.set(cooperationId, cooperation);
      return { success: false, message: '合作项目已结束' };
    }

    if (cooperation.participants.length >= cooperation.maxParticipants) {
      return { success: false, message: '合作项目已满员' };
    }

    const existingParticipant = cooperation.participants.find(p => p.playerId === playerId);
    if (existingParticipant) {
      return { success: false, message: '您已参与此合作项目' };
    }

    const equityShare = (investmentAmount / cooperation.targetAmount) * 100;
    const newParticipant = {
      playerId,
      playerName,
      investmentAmount,
      equityShare,
      contribution,
      joinedAt: Date.now()
    };

    cooperation.participants.push(newParticipant);
    cooperation.currentTotal += investmentAmount;

    this.activeCooperations.set(cooperationId, cooperation);

    this.recordInvestmentEvent({
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'cooperation',
      companyId: cooperation.companyId,
      companyName: cooperation.companyName,
      participants: [{ playerId, playerName, role: 'participant' }],
      amount: investmentAmount,
      timestamp: Date.now(),
      description: `${playerName} 加入了 ${cooperation.name} 合作项目，投资 ${investmentAmount} 万元`
    });

    return { success: true, message: '成功加入合作项目', cooperation };
  }

  finalizeCooperation(cooperationId: string, company: StartupCompany): { success: boolean; message: string; participants?: Array<{ playerId: string; playerName: string; investmentAmount: number; equityShare: number }> } {
    const cooperation = this.activeCooperations.get(cooperationId);
    if (!cooperation) {
      return { success: false, message: '合作项目不存在' };
    }

    if (cooperation.status !== InvestmentStatus.ACTIVE) {
      return { success: false, message: '合作项目已结束' };
    }

    if (cooperation.participants.length < cooperation.minParticipants) {
      cooperation.status = InvestmentStatus.FAILED;
      this.activeCooperations.set(cooperationId, cooperation);
      return { success: false, message: '参与人数不足，合作项目失败' };
    }

    cooperation.status = InvestmentStatus.COMPLETED;

    const updatedCompany = { ...company };
    updatedCompany.valuation += cooperation.currentTotal;

    cooperation.participants.forEach(participant => {
      const equityPercentage = (participant.investmentAmount / company.valuation) * 100;
      const sharesToIssue = Math.floor((equityPercentage / 100) * company.sharesIssued);

      updatedCompany.sharesIssued += sharesToIssue;
      updatedCompany.investors = [
        ...updatedCompany.investors,
        {
          playerId: participant.playerId,
          shares: sharesToIssue,
          investmentAmount: participant.investmentAmount,
          entryValuation: company.valuation
        }
      ];

      this.updatePlayerInvestmentProfile(participant.playerId, participant.playerName, updatedCompany, participant.investmentAmount, sharesToIssue);
      this.updatePlayerCooperationStats(participant.playerId, participant.investmentAmount);
    });

    this.activeCooperations.set(cooperationId, cooperation);

    this.recordInvestmentEvent({
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'cooperation',
      companyId: cooperation.companyId,
      companyName: cooperation.companyName,
      participants: cooperation.participants.map(p => ({ playerId: p.playerId, playerName: p.playerName, role: 'participant' })),
      amount: cooperation.currentTotal,
      timestamp: Date.now(),
      description: `${cooperation.name} 合作项目成功完成，共筹集 ${cooperation.currentTotal} 万元`
    });

    return { success: true, message: '合作项目成功完成', participants: cooperation.participants };
  }

  createAlliance(
    name: string,
    leaderId: string,
    leaderName: string,
    targetCompanies: string[],
    allianceGoals: string[]
  ): InvestmentAlliance {
    const alliance: InvestmentAlliance = {
      id: `alliance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      leaderId,
      leaderName,
      members: [{
        playerId: leaderId,
        playerName: leaderName,
        reputation: 100,
        contribution: 0,
        joinedAt: Date.now()
      }],
      targetCompanies,
      allianceGoals,
      resources: {
        capital: 0,
        influence: 0,
        knowledge: 0,
        network: 0
      },
      createdAt: Date.now(),
      isActive: true,
      allianceLevel: 1
    };

    this.activeAlliances.set(alliance.id, alliance);

    this.recordInvestmentEvent({
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'alliance',
      companyId: '',
      companyName: alliance.name,
      participants: [{ playerId: leaderId, playerName: leaderName, role: 'leader' }],
      amount: 0,
      timestamp: Date.now(),
      description: `${leaderName} 创建了投资联盟 ${alliance.name}`
    });

    return alliance;
  }

  joinAlliance(
    allianceId: string,
    playerId: string,
    playerName: string
  ): { success: boolean; message: string; alliance?: InvestmentAlliance } {
    const alliance = this.activeAlliances.get(allianceId);
    if (!alliance) {
      return { success: false, message: '联盟不存在' };
    }

    if (!alliance.isActive) {
      return { success: false, message: '联盟已解散' };
    }

    const existingMember = alliance.members.find(m => m.playerId === playerId);
    if (existingMember) {
      return { success: false, message: '您已加入此联盟' };
    }

    alliance.members.push({
      playerId,
      playerName,
      reputation: 100,
      contribution: 0,
      joinedAt: Date.now()
    });

    this.activeAlliances.set(allianceId, alliance);

    this.recordInvestmentEvent({
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'alliance',
      companyId: '',
      companyName: alliance.name,
      participants: [{ playerId, playerName, role: 'member' }],
      amount: 0,
      timestamp: Date.now(),
      description: `${playerName} 加入了 ${alliance.name} 联盟`
    });

    return { success: true, message: '成功加入联盟', alliance };
  }

  contributeToAlliance(
    allianceId: string,
    playerId: string,
    contributionType: 'capital' | 'influence' | 'knowledge' | 'network',
    amount: number
  ): { success: boolean; message: string; alliance?: InvestmentAlliance } {
    const alliance = this.activeAlliances.get(allianceId);
    if (!alliance) {
      return { success: false, message: '联盟不存在' };
    }

    if (!alliance.isActive) {
      return { success: false, message: '联盟已解散' };
    }

    const member = alliance.members.find(m => m.playerId === playerId);
    if (!member) {
      return { success: false, message: '您不是联盟成员' };
    }

    alliance.resources[contributionType] += amount;
    member.contribution += amount;

    const totalContribution = alliance.members.reduce((sum, m) => sum + m.contribution, 0);
    if (totalContribution > alliance.allianceLevel * 10000) {
      alliance.allianceLevel = Math.min(5, alliance.allianceLevel + 1);
    }

    this.activeAlliances.set(allianceId, alliance);

    return { success: true, message: '贡献成功', alliance };
  }

  getPlayerInvestmentProfile(playerId: string, playerName: string): PlayerInvestmentProfile {
    if (!this.playerProfiles.has(playerId)) {
      const profile: PlayerInvestmentProfile = {
        playerId,
        playerName,
        reputation: 100,
        influence: 0,
        investmentHistory: [],
        activeInvestments: [],
        competitions: {
          participated: 0,
          won: 0,
          lost: 0,
          totalInvested: 0,
          totalWon: 0
        },
        cooperations: {
          participated: 0,
          active: 0,
          completed: 0,
          totalContribution: 0,
          totalBenefits: 0
        },
        alliances: {
          memberOf: [],
          leaderOf: [],
          totalContribution: 0,
          totalBenefits: 0
        },
        investmentStyle: {
          riskTolerance: 'moderate',
          preferredSectors: [],
          preferredStages: [],
          averageHoldTime: 30
        },
        achievements: [],
        badges: []
      };
      this.playerProfiles.set(playerId, profile);
    }
    return this.playerProfiles.get(playerId)!;
  }

  updateLeaderboard(players: Player[]): InvestmentLeaderboard {
    const rankings = players.map(player => {
      const profile = this.getPlayerInvestmentProfile(player.id, player.name);
      const totalInvested = profile.activeInvestments.reduce((sum, inv) => sum + inv.investmentAmount, 0);
      const totalReturns = profile.activeInvestments.reduce((sum, inv) => sum + inv.returns, 0);
      const returnRate = totalInvested > 0 ? (totalReturns / totalInvested) * 100 : 0;
      const successfulInvestments = profile.activeInvestments.filter(inv => inv.returnRate > 0).length;

      const alliance = Array.from(this.activeAlliances.values()).find(a => 
        a.members.some(m => m.playerId === player.id)
      );

      return {
        rank: 0,
        playerId: player.id,
        playerName: player.name,
        totalInvested,
        totalReturns,
        returnRate,
        successfulInvestments,
        reputation: profile.reputation,
        allianceName: alliance?.name
      };
    });

    rankings.sort((a, b) => b.returnRate - a.returnRate);
    rankings.forEach((r, index) => { r.rank = index + 1; });

    this.leaderboard = {
      period: 'all_time',
      rankings: rankings.slice(0, 100),
      lastUpdated: Date.now()
    };

    return this.leaderboard;
  }

  getInvestmentMarketplace(): InvestmentMarketplace {
    return {
      availableOpportunities: [],
      activeCompetitions: Array.from(this.activeCompetitions.values()),
      activeCooperations: Array.from(this.activeCooperations.values()),
      activeAlliances: Array.from(this.activeAlliances.values()),
      leaderboard: this.leaderboard,
      marketTrends: []
    };
  }

  private generateInvestmentConditions(company: StartupCompany, investmentAmount: number): string[] {
    const conditions: string[] = [];
    const equityPercentage = (investmentAmount / company.valuation) * 100;

    if (equityPercentage > 20) {
      conditions.push('要求董事会席位');
    }
    if (equityPercentage > 10) {
      conditions.push('要求财务监督权');
    }
    if (company.stage === CompanyStage.SEED || company.stage === CompanyStage.ANGEL) {
      conditions.push('高风险投资，需签署风险披露协议');
    }

    return conditions;
  }

  private generateCompetitionRewards(type: CompetitionType, targetAmount: number): Array<{ type: 'equity' | 'influence' | 'reputation'; value: number }> {
    const rewards: Array<{ type: 'equity' | 'influence' | 'reputation'; value: number }> = [];

    if (type === CompetitionType.BIDDING) {
      rewards.push({ type: 'equity', value: 15 });
      rewards.push({ type: 'reputation', value: 50 });
    } else if (type === CompetitionType.RACING) {
      rewards.push({ type: 'equity', value: 10 });
      rewards.push({ type: 'influence', value: 30 });
    } else if (type === CompetitionType.DOMINANCE) {
      rewards.push({ type: 'equity', value: 20 });
      rewards.push({ type: 'influence', value: 50 });
      rewards.push({ type: 'reputation', value: 100 });
    }

    return rewards;
  }

  private generateCooperationBenefits(type: CooperationType, targetAmount: number): Array<{ type: 'cost_reduction' | 'risk_sharing' | 'resource_access' | 'influence_boost'; value: number; description: string }> {
    const benefits: Array<{ type: 'cost_reduction' | 'risk_sharing' | 'resource_access' | 'influence_boost'; value: number; description: string }> = [];

    if (type === CooperationType.SYNDICATE) {
      benefits.push({ type: 'risk_sharing', value: 30, description: '风险分担降低30%' });
      benefits.push({ type: 'cost_reduction', value: 15, description: '投资成本降低15%' });
    } else if (type === CooperationType.JOINT_VENTURE) {
      benefits.push({ type: 'resource_access', value: 50, description: '共享资源池50%' });
      benefits.push({ type: 'influence_boost', value: 25, description: '影响力提升25%' });
    } else if (type === CooperationType.RESOURCE_SHARING) {
      benefits.push({ type: 'resource_access', value: 40, description: '共享资源池40%' });
      benefits.push({ type: 'cost_reduction', value: 20, description: '运营成本降低20%' });
    } else if (type === CooperationType.KNOWLEDGE_SHARING) {
      benefits.push({ type: 'influence_boost', value: 30, description: '行业影响力提升30%' });
      benefits.push({ type: 'resource_access', value: 20, description: '知识资源获取20%' });
    }

    return benefits;
  }

  private generateAgreementTerms(type: CooperationType): string[] {
    const terms: string[] = [];

    if (type === CooperationType.SYNDICATE) {
      terms.push('所有参与者共同承担投资风险');
      terms.push('收益按投资比例分配');
      terms.push('重大决策需多数同意');
    } else if (type === CooperationType.JOINT_VENTURE) {
      terms.push('共同管理投资项目');
      terms.push('资源共享，优势互补');
      terms.push('退出机制需提前30天通知');
    } else if (type === CooperationType.RESOURCE_SHARING) {
      terms.push('资源使用需提前申请');
      terms.push('不得滥用共享资源');
      terms.push('资源使用记录公开透明');
    } else if (type === CooperationType.KNOWLEDGE_SHARING) {
      terms.push('定期组织知识分享会议');
      terms.push('保护知识产权');
      terms.push('不得泄露商业机密');
    }

    return terms;
  }

  private updatePlayerInvestmentProfile(
    playerId: string,
    playerName: string,
    company: StartupCompany,
    investmentAmount: number,
    shares: number
  ): void {
    const profile = this.getPlayerInvestmentProfile(playerId, playerName);
    const equityShare = (shares / company.sharesIssued) * 100;

    profile.activeInvestments.push({
      companyId: company.id,
      companyName: company.name,
      investmentAmount,
      equityShare,
      entryValuation: company.valuation - investmentAmount,
      currentValuation: company.valuation,
      returns: 0,
      returnRate: 0,
      entryDate: Date.now()
    });

    profile.reputation += Math.floor(investmentAmount / 1000);
    profile.influence += Math.floor(equityShare * 10);

    this.playerProfiles.set(playerId, profile);
  }

  private updatePlayerCompetitionStats(playerId: string, investmentAmount: number, won: boolean): void {
    const profile = this.playerProfiles.get(playerId);
    if (!profile) return;

    profile.competitions.participated += 1;
    profile.competitions.totalInvested += investmentAmount;
    if (won) {
      profile.competitions.won += 1;
      profile.competitions.totalWon += investmentAmount;
    } else {
      profile.competitions.lost += 1;
    }

    this.playerProfiles.set(playerId, profile);
  }

  private updatePlayerCooperationStats(playerId: string, contribution: number): void {
    const profile = this.playerProfiles.get(playerId);
    if (!profile) return;

    profile.cooperations.participated += 1;
    profile.cooperations.active += 1;
    profile.cooperations.totalContribution += contribution;

    this.playerProfiles.set(playerId, profile);
  }

  private recordInvestmentEvent(event: InvestmentEvent): void {
    this.investmentEvents.push(event);
    if (this.investmentEvents.length > 1000) {
      this.investmentEvents = this.investmentEvents.slice(-500);
    }
  }

  getInvestmentEvents(limit: number = 50): InvestmentEvent[] {
    return this.investmentEvents.slice(-limit).reverse();
  }

  getActiveCompetitions(): InvestmentCompetition[] {
    return Array.from(this.activeCompetitions.values()).filter(c => c.status === InvestmentStatus.ACTIVE);
  }

  getActiveCooperations(): InvestmentCooperation[] {
    return Array.from(this.activeCooperations.values()).filter(c => c.status === InvestmentStatus.ACTIVE);
  }

  getActiveAlliances(): InvestmentAlliance[] {
    return Array.from(this.activeAlliances.values()).filter(a => a.isActive);
  }

  getInvestmentRequests(): InvestmentRequest[] {
    return Array.from(this.investmentRequests.values()).filter(r => r.status === InvestmentStatus.PENDING);
  }

  getRequest(requestId: string): InvestmentRequest | undefined {
    return this.investmentRequests.get(requestId);
  }

  getCompetition(competitionId: string): InvestmentCompetition | undefined {
    return this.activeCompetitions.get(competitionId);
  }

  getCooperation(cooperationId: string): InvestmentCooperation | undefined {
    return this.activeCooperations.get(cooperationId);
  }

  getAlliance(allianceId: string): InvestmentAlliance | undefined {
    return this.activeAlliances.get(allianceId);
  }

  getLeaderboard(players?: Player[]): InvestmentLeaderboard {
    if (players) {
      this.updateLeaderboard(players);
    }
    return this.leaderboard;
  }

  getMarketplace(): InvestmentMarketplace {
    const marketplace: InvestmentMarketplace = {
      availableOpportunities: this.generateInvestmentOpportunities(),
      activeCompetitions: this.getActiveCompetitions(),
      activeCooperations: this.getActiveCooperations(),
      activeAlliances: this.getActiveAlliances(),
      leaderboard: this.getLeaderboard(),
      marketTrends: this.generateMarketTrends()
    };
    return marketplace;
  }

  private generateInvestmentOpportunities(): InvestmentOpportunity[] {
    const opportunities: InvestmentOpportunity[] = [];
    
    const sectors = ['科技', '新能源', '消费', '金融', '医疗', '教育', '制造', '交通'];
    const stages = [CompanyStage.SEED, CompanyStage.ANGEL, CompanyStage.SERIES_A, CompanyStage.SERIES_B];
    
    for (let i = 0; i < 10; i++) {
      const sector = sectors[Math.floor(Math.random() * sectors.length)];
      const stage = stages[Math.floor(Math.random() * stages.length)];
      const valuation = Math.floor(Math.random() * 5000) + 500;
      const expectedReturn = Math.random() * 0.3 + 0.05;
      
      const riskLevel: 'low' | 'medium' | 'high' = expectedReturn > 0.25 ? 'high' : expectedReturn > 0.15 ? 'medium' : 'low';
      
      const opportunity: InvestmentOpportunity = {
        id: `opp_${Date.now()}_${i}`,
        companyId: `company_${Date.now()}_${i}`,
        companyName: `创业公司 ${String.fromCharCode(65 + i)}`,
        sector,
        stage,
        targetAmount: Math.floor(valuation * 0.2),
        minInvestment: Math.floor(valuation * 0.01),
        maxInvestment: Math.floor(valuation * 0.1),
        valuation,
        equityOffered: Math.random() * 15 + 5,
        expectedReturn,
        riskLevel,
        description: `${sector} 行业 ${stage} 阶段融资机会，预期回报率 ${(expectedReturn * 100).toFixed(1)}%`,
        deadline: Date.now() + 7 * 24 * 60 * 60 * 1000,
        requiredMetrics: [
          { type: 'revenue', value: Math.floor(Math.random() * 1000) + 100 },
          { type: 'growth', value: Math.random() * 0.5 + 0.1 }
        ]
      };
      opportunities.push(opportunity);
    }
    
    return opportunities;
  }

  private generateMarketTrends(): Array<{ sector: string; investmentVolume: number; averageReturn: number; trend: 'up' | 'down' | 'stable' }> {
    return [
      { sector: '科技', investmentVolume: 50000, averageReturn: 0.15, trend: 'up' },
      { sector: '新能源', investmentVolume: 35000, averageReturn: 0.08, trend: 'up' },
      { sector: '消费', investmentVolume: 25000, averageReturn: -0.05, trend: 'down' },
      { sector: '金融', investmentVolume: 40000, averageReturn: 0.02, trend: 'stable' }
    ];
  }
}
