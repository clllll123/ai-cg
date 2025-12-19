import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdmin() {
  const username = 'admin';
  const password = 'adminpassword';
  const email = 'admin@example.com';

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const user = await prisma.user.upsert({
      where: { username },
      update: {},
      create: {
        username,
        // @ts-ignore
        email,
        password: hashedPassword,
        nickname: 'System Admin',
        role: 'admin'
      }
    });
    console.log('✅ Admin user ready:', user);
  } catch (e) {
    console.error('Error creating admin:', e);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
