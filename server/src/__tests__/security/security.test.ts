// Security testing for AI Stock Trader backend
import request from 'supertest';
import express from 'express';
import authRoutes from '../../routes/authRoutes';
import gameRoutes from '../../routes/gameRoutes';
import aiRoutes from '../../routes/aiRoutes';

// Create test app
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/ai', aiRoutes);

// Security test payloads
const SECURITY_PAYLOADS = {
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

describe('Security Tests', () => {
  describe('SQL Injection Protection', () => {
    SECURITY_PAYLOADS.sqlInjection.forEach(payload => {
      it(`should prevent SQL injection: ${payload}`, async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            username: payload,
            password: 'test'
          });
        
        // Should not return 500 (internal server error) which might indicate SQL error
        expect(response.status).not.toBe(500);
        
        // Should return proper error response (400, 401, or validation error)
        expect(response.status).toBeGreaterThanOrEqual(400);
        expect(response.status).toBeLessThan(500);
      });
    });
  });

  describe('XSS Protection', () => {
    SECURITY_PAYLOADS.xss.forEach(payload => {
      it(`should prevent XSS: ${payload}`, async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            username: `testuser_${Date.now()}`,
            password: 'password123',
            nickname: payload,
            email: `test${Date.now()}@example.com`
          });
        
        // Should return validation error (400) or reject the input
        expect(response.status).toBeGreaterThanOrEqual(400);
        expect(response.status).toBeLessThan(500);
      });
    });
  });

  describe('Input Validation', () => {
    it('should validate username format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'invalid user!', // Contains spaces and special characters
          password: 'password123',
          nickname: '测试用户'
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should validate password length', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          password: '123', // Too short
          nickname: '测试用户'
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Authentication Security', () => {
    it('should require authentication for protected routes', async () => {
      const response = await request(app)
        .get('/api/game/history/test-user-id');
      
      expect(response.status).toBe(401);
    });

    it('should validate JWT tokens', async () => {
      const response = await request(app)
        .get('/api/game/history/test-user-id')
        .set('Authorization', 'Bearer invalid-token');
      
      // Should return either 401 (Unauthorized) or 403 (Forbidden) for invalid tokens
      expect([401, 403]).toContain(response.status);
    });
  });

  describe('Rate Limiting', () => {
    it('should handle rapid consecutive requests', async () => {
      const requests = [];
      
      // Send 10 rapid requests
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(app)
            .post('/api/auth/login')
            .send({
              username: 'testuser',
              password: 'wrongpassword'
            })
        );
      }
      
      const responses = await Promise.all(requests);
      
      // All requests should complete without server errors
      responses.forEach(response => {
        expect(response.status).not.toBe(500);
      });
    });
  });
});