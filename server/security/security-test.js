// Security testing script for AI Stock Trader backend
const request = require('supertest');
const app = require('../dist/index.js'); // 需要先构建应用

// 安全测试配置
const SECURITY_TESTS = {
  sqlInjection: [
    "' OR '1'='1",
    "'; DROP TABLE users; --",
    "' UNION SELECT username, password FROM users --",
    "1' OR '1'='1' --",
    "admin' --"
  ],
  
  xss: [
    "<script>alert('XSS')</script>",
    "<img src=x onerror=alert('XSS')>",
    "javascript:alert('XSS')",
    "<svg onload=alert('XSS')>",
    "<body onload=alert('XSS')>"
  ],
  
  pathTraversal: [
    "../../../etc/passwd",
    "..\\..\\..\\windows\\system32\\drivers\\etc\\hosts",
    "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd",
    "....//....//....//etc/passwd"
  ],
  
  commandInjection: [
    "; ls -la",
    "| cat /etc/passwd",
    "`whoami`",
    "$(id)",
    "%3Bcat%20%2Fetc%2Fpasswd"
  ]
};

// 安全测试函数
async function runSecurityTests() {
  console.log('🚀 开始安全测试...\n');
  
  let passedTests = 0;
  let failedTests = 0;
  
  // 测试SQL注入防护
  console.log('🔍 测试SQL注入防护...');
  for (const payload of SECURITY_TESTS.sqlInjection) {
    try {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: payload,
          password: 'test'
        });
      
      // 检查是否返回了错误响应而不是数据库错误
      if (response.status !== 500 && !response.body.error?.includes('SQL')) {
        console.log(`✅ SQL注入测试通过: ${payload}`);
        passedTests++;
      } else {
        console.log(`❌ SQL注入测试失败: ${payload}`);
        failedTests++;
      }
    } catch (error) {
      console.log(`⚠️ SQL注入测试异常: ${payload}`, error.message);
    }
  }
  
  // 测试XSS防护
  console.log('\n🔍 测试XSS防护...');
  for (const payload of SECURITY_TESTS.xss) {
    try {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          password: 'password123',
          nickname: payload
        });
      
      // 检查是否拒绝了恶意输入
      if (response.status === 400 || response.status === 422) {
        console.log(`✅ XSS测试通过: ${payload}`);
        passedTests++;
      } else {
        console.log(`❌ XSS测试失败: ${payload}`);
        failedTests++;
      }
    } catch (error) {
      console.log(`⚠️ XSS测试异常: ${payload}`, error.message);
    }
  }
  
  // 测试路径遍历防护
  console.log('\n🔍 测试路径遍历防护...');
  for (const payload of SECURITY_TESTS.pathTraversal) {
    try {
      const response = await request(app)
        .get(`/api/files/${payload}`);
      
      // 检查是否返回了404或403
      if (response.status === 404 || response.status === 403) {
        console.log(`✅ 路径遍历测试通过: ${payload}`);
        passedTests++;
      } else {
        console.log(`❌ 路径遍历测试失败: ${payload}`);
        failedTests++;
      }
    } catch (error) {
      console.log(`⚠️ 路径遍历测试异常: ${payload}`, error.message);
    }
  }
  
  console.log('\n📊 安全测试结果:');
  console.log(`✅ 通过测试: ${passedTests}`);
  console.log(`❌ 失败测试: ${failedTests}`);
  console.log(`📈 通过率: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(2)}%`);
  
  return { passedTests, failedTests };
}

// 导出测试函数
module.exports = { runSecurityTests };

// 如果直接运行此文件
if (require.main === module) {
  runSecurityTests().catch(console.error);
}