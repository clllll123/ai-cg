// 测试一日大事件API功能
const testEventAPI = async () => {
    console.log('🧪 测试一日大事件API...');
    
    try {
        const currentTime = new Date().getHours() < 12 ? 'MORNING' : 'AFTERNOON';
        const marketTrend = 0.2; // 轻微上涨趋势
        const activeSectors = ['科技', '金融', '医疗', '能源', '消费'];
        
        const response = await fetch('http://localhost:3001/api/events/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                currentTime,
                marketTrend,
                activeSectors
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ API响应成功:', data);
            
            if (data.success) {
                console.log('📰 大事件标题:', data.data.title);
                console.log('📝 事件描述:', data.data.description);
                console.log('⚡ 市场影响:', data.data.effects.length, '个效果');
                console.log('📢 新闻快讯:', data.data.newsFlash);
                console.log('⏰ 触发时机:', data.data.triggerCondition);
            } else {
                console.log('❌ API返回失败:', data.message);
            }
        } else {
            console.log('❌ HTTP错误:', response.status, response.statusText);
        }
    } catch (error) {
        console.log('❌ 网络错误:', error.message);
    }
};

testEventAPI();