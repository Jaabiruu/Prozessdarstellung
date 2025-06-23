const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

async function seedTestDatabase() {
  console.log('🌱 Seeding test database with users...\n');
  
  const prisma = new PrismaClient();
  
  try {
    // Check if users already exist
    const existingUsers = await prisma.user.count({
      where: {
        email: {
          in: ['admin@test.local', 'manager@test.local', 'operator@test.local'],
        },
      },
    });

    console.log(`Existing users found: ${existingUsers}`);

    if (existingUsers >= 3) {
      console.log('✅ Test users already seeded');
      return;
    }

    // Delete any existing test users first
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['admin@test.local', 'manager@test.local', 'operator@test.local'],
        },
      },
    });

    console.log('Creating test users...');

    // Create test admin user
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@test.local' },
      update: {},
      create: {
        email: 'admin@test.local',
        password: await bcrypt.hash('admin123', 12),
        firstName: 'Test',
        lastName: 'Admin',
        role: 'ADMIN',
        isActive: true,
      },
    });
    console.log(`✅ Created admin user: ${adminUser.email}`);

    // Create test manager user
    const managerUser = await prisma.user.upsert({
      where: { email: 'manager@test.local' },
      update: {},
      create: {
        email: 'manager@test.local',
        password: await bcrypt.hash('manager123', 12),
        firstName: 'Test',
        lastName: 'Manager',
        role: 'MANAGER',
        isActive: true,
      },
    });
    console.log(`✅ Created manager user: ${managerUser.email}`);

    // Create test operator user
    const operatorUser = await prisma.user.upsert({
      where: { email: 'operator@test.local' },
      update: {},
      create: {
        email: 'operator@test.local',
        password: await bcrypt.hash('operator123', 12),
        firstName: 'Test',
        lastName: 'Operator',
        role: 'OPERATOR',
        isActive: true,
      },
    });
    console.log(`✅ Created operator user: ${operatorUser.email}`);

    console.log('\n✅ Test database seeded successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedTestDatabase().catch(console.error);