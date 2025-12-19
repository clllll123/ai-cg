
import { Stock, Sector } from '../types';

// 谐音梗、股市黑话与网络热梗库 (避嫌版)
const SECTOR_DATA: Record<Sector, { names: string[], symbols: string[], descriptions: string[], basePrice: [number, number], volatility: [number, number], beta: [number, number] }> = {
  [Sector.TECH]: {
    names: ['福报网络', '拼夕夕', '粗粮手机', '鹅厂帝国', '跳动字节', '巨硬软件', '不存在搜索', '非死不可', '核弹显卡', '赛博画饼', '只抄作业'],
    symbols: ['996', 'PXX', 'RICE', 'QQ', 'DANCE', 'HARD', '404', 'MASK', 'BOOM', 'CYBR', 'COPY'],
    descriptions: [
        "行业绝对龙头，拥有数万名发际线很高的核心研发人员。主营业务包括大数据杀熟和精准广告推送。",
        "靠‘帮我砍一刀’裂变起家，主要业务是给用户画饼，宣称要在月球建立物流中心。",
        "宣称掌握了核心科技，实际上主要是掌握了手机壳换色技术，拥有庞大的粉丝群体。",
        "拥有庞大的社交护城河，即使服务器宕机也能躺着赚钱，被誉为‘南山必胜客’。"
    ],
    basePrice: [100, 300], // High price
    // CHANGED: Reduced from [0.08, 0.15] to [0.04, 0.08]
    volatility: [0.04, 0.08], 
    beta: [1.1, 1.4] 
  },
  [Sector.ENERGY]: {
    names: ['特撕拉', '保佑爹', '宁王电池', '理想很丰满', '未来没来', '下周回国', 'PPT造车', '光伏巨头', '水变油科技', '用爱发电'],
    symbols: ['TEAR', 'DAD', 'KING', 'DREAM', 'NEXT', 'BACK', 'PPT', 'SUN', 'H2O', 'LOVE'],
    descriptions: [
        "新能源领军企业，全靠老板在纳斯达克讲故事，市值全靠梦想支撑。",
        "掌握了电池核心配方，虽然偶尔会冒烟，但续航确实长，垄断了全球80%的产能。",
        "号称下周量产，目前主要资产是三台原型车和一百个销售，但PPT做得极好。",
        "全球最大的清洁能源供应商，甚至打算去火星铺设太阳能板，深受环保主义者喜爱。"
    ],
    basePrice: [50, 150],
    // CHANGED: Reduced from [0.06, 0.12] to [0.03, 0.07]
    volatility: [0.03, 0.07],
    beta: [1.0, 1.3]
  },
  [Sector.CONSUMER]: {
    names: ['酱香科技', '海天味精', '疯狂星期四', '星爸爸', '瑞幸加冰', '老干妈', '大自然的搬运工', '肥宅快乐水', '康师父', '雪花勇闯', '脚踩酸菜'],
    symbols: ['JIANG', 'MSG', 'V50', 'PAPA', 'ICE', 'MAMA', 'WATER', 'COLA', 'MASTER', 'BEER', 'SOUR'],
    descriptions: [
        "拥有国宝级保密配方，产品具备极强的金融属性，喝的不是酒是寂寞，机构抱团首选。",
        "掌握了年轻人的味蕾，每逢周四业绩就会神秘暴涨，拥有神秘的营销代码 'V50'。",
        "大自然的搬运工，其实就是把自来水装进瓶子里卖，但包装设计拿过国际大奖。",
        "凭借‘有点甜’的洗脑广告词，垄断了国内便利店货架，现金流比印钞机还快。"
    ],
    basePrice: [20, 80],
    // CHANGED: Reduced from [0.02, 0.05] to [0.01, 0.03]
    volatility: [0.01, 0.03], 
    beta: [0.5, 0.7] 
  },
  [Sector.REAL_ESTATE]: {
    names: ['很大集团', '必贵园', '万科没钱', '融化创伤', '链家不爱', '鹤岗豪宅', '汤臣一品', '烂尾楼建设', '公摊面积', '学区房概念'],
    symbols: ['BIG', 'EXP', 'NO-$', 'MELT', 'LINK', 'CHEAP', 'TOP', 'FAIL', 'POOL', 'SCH'],
    descriptions: [
        "曾经的宇宙第一房企，现在的宇宙第一欠款大户，老板正在努力卖私人飞机还债。",
        "专注于三四线城市开发，房子盖得比韭菜长得还快，最近转型搞农业机器人。",
        "手里囤了大量的地皮，虽然暂时开发不了，但看着心里踏实，坐等拆迁。",
        "主打高端豪宅，每平米售价能买一辆跑车，深受土豪喜爱，看房需要验资一个亿。"
    ],
    basePrice: [5, 30], 
    // CHANGED: Reduced from [0.04, 0.10] to [0.02, 0.06]
    volatility: [0.02, 0.06],
    beta: [0.8, 1.1] 
  },
  [Sector.MEDICAL]: {
    names: ['长生不老药', '莲花清瘟', '恒瑞制药', '爱尔眼科', '云南白粉', '同仁堂', '片仔黄', '莆田系', '植发第一股', '玻尿酸'],
    symbols: ['LIFE', 'COLD', 'PILL', 'EYE', 'POWDER', 'OLD', 'GOLD', 'FAKE', 'HAIR', 'FACE'],
    descriptions: [
        "宣称研发出了长生不老药，其实主要成分是淀粉，但老年人非常买账。",
        "拥有独家秘方，不管什么病都建议吃两粒，居家旅行必备神药。",
        "专注于眼科连锁，随着大家玩手机时间越来越长，他们的生意越来越好。",
        "百年老字号，一粒药丸能卖出黄金的价格，拥有极其深厚的品牌护城河。"
    ],
    basePrice: [30, 100],
    // CHANGED: Reduced from [0.03, 0.08] to [0.01, 0.04]
    volatility: [0.01, 0.04],
    beta: [0.6, 0.9]
  },
  [Sector.GAME]: {
    names: ['原神启动', '暴雪绿茶', '任地狱', '育碧土豆', 'G胖折扣', '赛博朋克', '氪金手游', '是兄弟就砍我', '蒸汽平台', '4399'],
    symbols: ['GENS', 'BLIZ', 'NINT', 'BUG', 'SALE', '2077', 'GOLD', 'BRO', 'STM', '4399'],
    descriptions: [
        "靠抽卡机制让无数玩家倾家荡产，流水比很多上市公司营收还高，拥有顶级二次元美工。",
        "服务器经常像土豆一样烂，买BUG送游戏，但玩家依然一边骂一边买。",
        "拥有世界主宰IP，法务部比开发部还强，号称'东半球最强法务部'。",
        "专注于换皮网页游戏，'是兄弟就来砍我'的广告语响彻大江南北。"
    ],
    basePrice: [10, 60],
    // CHANGED: Reduced from [0.10, 0.25] to [0.05, 0.12]
    volatility: [0.05, 0.12], 
    beta: [1.0, 1.3]
  },
  [Sector.TOY]: {
    names: ['泡泡马特', '乐高积木', '万代南梦宫', '高达模型', '玲娜贝儿', '暴力熊', '盲盒经济', '手办狂魔', '二次元浓度', '限定发售'],
    symbols: ['POP', 'LEGO', 'BAND', 'GUND', 'FOX', 'BEAR', 'BOX', 'FIG', 'ACG', 'LTD'],
    descriptions: [
        "靠卖塑料小人发家致富，通过'隐藏款'机制收割年轻人的钱包，二手市场炒作疯狂。",
        "拼接积木界的霸主，踩在脚下会痛不欲生，被誉为'塑料黄金'。",
        "拥有无数动漫IP授权，胶佬们的快乐源泉，每次出新品都要靠抢。",
        "迪士尼的新晋顶流，虽然没有作品，但凭借可爱外表征服了所有女生的心。"
    ],
    basePrice: [15, 50],
    // CHANGED: Reduced from [0.08, 0.20] to [0.04, 0.10]
    volatility: [0.04, 0.10],
    beta: [0.7, 1.1]
  },
  [Sector.FINANCE]: {
    names: ['招财银行', '蚂蚁花呗', '韭菜基金', '中信证券', '高盛集团', '巴菲特午餐', '庞氏骗局', '校园贷', '比特币', '华尔街之狼'],
    symbols: ['BANK', 'ANT', 'FUND', 'CITI', 'GOLD', 'LUNCH', 'SCAM', 'LOAN', 'BTC', 'WOLF'],
    descriptions: [
        "号称零售之王，服务态度极好，但信用卡利息也是真的高。",
        "最懂年轻人的消费金融公司，让你在发工资前就能过上体面的生活。",
        "基金经理全靠运气炒股，牛市是股神，熊市是'蔡经理'，管理费旱涝保收。",
        "华尔街老牌投行，翻手为云覆手为雨，据说能控制全球经济命脉。"
    ],
    basePrice: [10, 40],
    // CHANGED: Reduced from [0.01, 0.04] to [0.01, 0.02]
    volatility: [0.01, 0.02], 
    beta: [1.0, 1.0] 
  },
  [Sector.MANUFACTURING]: {
    names: ['富士康', '大疆创新', '蓝翔挖掘机', '格力空调', '三一重工', '波音飞机', '台积电', '福耀玻璃', '宁德时代', '中国中车'],
    symbols: ['FOX', 'DJI', 'DIG', 'COOL', 'HEAVY', 'FLY', 'CHIP', 'GLAS', 'BATT', 'TRAIN'],
    descriptions: [
        "全球最大的代工厂，流水线上的螺丝钉，苹果离不开的合作伙伴。",
        "无人机领域的绝对霸主，产品经常被误认为是外星科技，远销全球。",
        "掌握核心科技的空调巨头，董事长亲自代言，承诺保修十年。",
        "高端芯片制造的瓶颈，全球电子产业的心脏，打个喷嚏全球都要感冒。"
    ],
    basePrice: [20, 100],
    // CHANGED: Reduced from [0.03, 0.07] to [0.02, 0.04]
    volatility: [0.02, 0.04],
    beta: [0.9, 1.1]
  },
  [Sector.LOGISTICS]: {
    names: ['顺丰速运', '菜鸟驿站', '美团外卖', '京东物流', '三通一达', '货拉拉', '极兔快递', '马士基', '联邦快递', '闪送'],
    symbols: ['FAST', 'BIRD', 'FOOD', 'JD', 'TONG', 'LALA', 'RABT', 'SEA', 'FEDX', 'FLASH'],
    descriptions: [
        "速度最快的快递公司，运费虽然贵，但服务确实好，送货小哥都开飞机。",
        "垄断了大学校园的最后一公里，取快递像寻宝一样，拥有庞大的数据网络。",
        "不仅送外卖，万物皆可送，由数百万骑手组成的庞大物流网络。",
        "拥有自己的货运机队和无人仓，号称上午下单下午送达，极速体验。"
    ],
    basePrice: [10, 50],
    // CHANGED: Reduced from [0.03, 0.08] to [0.02, 0.04]
    volatility: [0.02, 0.04],
    beta: [0.8, 1.1]
  },
  [Sector.AGRICULTURE]: {
    names: ['袁隆平高科', '牧原股份', '北大荒', '金龙鱼', '温氏股份', '新希望', '海大集团', '隆平高科', '登海种业', '苏垦农发'],
    symbols: ['RICE', 'PIG', 'LAND', 'OIL', 'CHKN', 'HOPE', 'FEED', 'SEED', 'CORN', 'FARM'],
    descriptions: [
        "专注于生猪养殖，拥有全自动化猪舍，猪过得比人还舒服，周期性极强。",
        "掌握了国家粮食安全的命脉，拥有千万亩良田，旱涝保收。",
        "食用油龙头，控制了家庭的厨房，产品涨价大家也得买。",
        "高科技种子公司，一颗种子改变世界，农业里的'芯片'企业。"
    ],
    basePrice: [8, 30],
    // CHANGED: Reduced from [0.02, 0.06] to [0.01, 0.03]
    volatility: [0.01, 0.03],
    beta: [0.4, 0.6]
  }
};

export const generateStocks = (count: number, allowedSectors?: Sector[]): Stock[] => {
  const stocks: Stock[] = [];
  const sectors = allowedSectors && allowedSectors.length > 0 ? allowedSectors : Object.values(Sector);
  
  // Helper to get random item from array
  const random = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
  
  // Track used names to prevent duplicates
  const usedNames = new Set<string>();

  for (let i = 0; i < count; i++) {
    const sector = random(sectors);
    const data = SECTOR_DATA[sector];
    
    // Find unique name
    let name = random(data.names);
    let attempts = 0;
    while (usedNames.has(name) && attempts < 20) {
        name = random(data.names);
        attempts++;
    }
    // If we ran out of unique names, append a number
    if (usedNames.has(name)) {
        name = `${name} ${Math.floor(Math.random() * 100)}`;
    }
    usedNames.add(name);

    const symbol = random(data.symbols) + (Math.floor(Math.random() * 900) + 100);
    const description = random(data.descriptions); // Pick random description

    // Base price generation
    const [minP, maxP] = data.basePrice;
    const basePrice = Math.floor(minP + Math.random() * (maxP - minP));
    
    // Generate History (Pre-market context)
    // We generate 20 points representing "Yesterday".
    // The LAST point of history becomes the Open Price and Current Price.
    const history: { time: number; price: number; volume: number }[] = [];
    const now = Date.now();
    let trendPrice = basePrice * (0.8 + Math.random() * 0.4); // Start somewhere around base
    
    for (let j = 0; j < 20; j++) {
       const time = now - (20 - j) * 60000; // 1 minute intervals backwards
       // Random walk for history
       const change = (Math.random() - 0.5) * 0.05; 
       trendPrice = trendPrice * (1 + change);
       history.push({
           time,
           price: Number(trendPrice.toFixed(2)),
           volume: Math.floor(Math.random() * 5000)
       });
    }
    
    // CRITICAL: Set Price and OpenPrice to the FINAL value of the history.
    // This ensures the stock starts at 0.00% change relative to "Open".
    const finalPrice = history[history.length - 1].price;
    
    // NEW: Total Shares Generation (for Turnover Rate)
    // Assume Market Cap between 10M and 5B
    const totalShares = Math.floor(1000000 + Math.random() * 90000000); 

    // NEW: EPS Generation (Price / EPS ~ 10-100 P/E)
    // Avoid division by zero, ensure some realism
    const targetPE = 10 + Math.random() * 50; 
    const eps = finalPrice / targetPE;

    stocks.push({
      id: (100000 + i).toString(),
      name,
      symbol,
      sector,
      description, // Assign description
      price: finalPrice, // Starts at Open Price
      openPrice: finalPrice, // Reference for 0%
      lastPrice: finalPrice,
      history,
      volatility: data.volatility[0] + Math.random() * (data.volatility[1] - data.volatility[0]),
      trend: (Math.random() - 0.5) * 0.1,
      beta: data.beta[0] + Math.random() * (data.beta[1] - data.beta[0]),
      transactions: [],
      totalVolume: 0,
      totalShares,
      eps,
      momentum: 0 // Init momentum
    });
  }
  return stocks;
};
