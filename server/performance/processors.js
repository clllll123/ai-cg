// Performance test processors for generating test data
module.exports = {
  generateUserData: (userContext, events, done) => {
    const timestamp = Date.now();
    const randomId = Math.floor(Math.random() * 1000000);
    
    userContext.vars.username = `testuser_${timestamp}_${randomId}`;
    userContext.vars.password = `password_${timestamp}`;
    userContext.vars.nickname = `测试用户_${timestamp}`;
    userContext.vars.email = `test_${timestamp}_${randomId}@example.com`;
    
    return done();
  },
  
  generateAuthToken: (userContext, events, done) => {
    // This would normally generate a JWT token for authenticated requests
    // For now, we'll use a mock token
    userContext.vars.token = 'mock-jwt-token-for-performance-testing';
    return done();
  }
};