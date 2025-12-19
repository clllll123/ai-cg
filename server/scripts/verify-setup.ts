import axios from 'axios';

const BASE_URL = 'http://localhost:3001/api';

async function verifySetup() {
  try {
    console.log('1. Testing Health Check...');
    const health = await axios.get('http://localhost:3001/health');
    console.log('✅ Health Check Passed:', health.data);

    console.log('\n2. Testing Registration...');
    const username = `testuser_${Date.now()}`;
    const password = 'password123';
    
    try {
      await axios.post(`${BASE_URL}/auth/register`, {
        username,
        password,
        nickname: 'Test User'
      });
      console.log('✅ Registration Passed');
    } catch (e: any) {
      console.log('⚠️ Registration note:', e.response?.data?.error || e.message);
    }

    console.log('\n3. Testing Login...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      username,
      password
    });
    const token = loginRes.data.token;
    console.log('✅ Login Passed, Token received');

    console.log('\n4. Testing AI News Generation...');
    const aiRes = await axios.post(
      `${BASE_URL}/ai/news`,
      { context: '科技股大涨' },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('✅ AI News Generation Passed');
    console.log('📰 Generated News:', aiRes.data.news);

  } catch (error: any) {
    console.error('❌ Verification Failed:', error.response?.data || error.message);
  }
}

verifySetup();
