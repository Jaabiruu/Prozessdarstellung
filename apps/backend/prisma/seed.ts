import { PrismaClient, UserRole, ProductionLineStatus, ProcessStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = process.env['DEFAULT_ADMIN_PASSWORD'];
  const qaPassword = process.env['DEFAULT_QA_PASSWORD'];

  if (!adminPassword || !qaPassword) {
    throw new Error(
      'DEFAULT_ADMIN_PASSWORD and DEFAULT_QA_PASSWORD must be set in your .env file for seeding. ' +
      'Please check your .env.example for guidance.'
    );
  }

  if (adminPassword.length < 8 || qaPassword.length < 8) {
    throw new Error(
      'Password must be at least 8 characters long for security compliance.'
    );
  }

  console.log('🌱 Starting database seeding...');

  const adminHashedPassword = await bcrypt.hash(adminPassword, 12);
  const qaHashedPassword = await bcrypt.hash(qaPassword, 12);

  let adminUser;
  let qaUser;

  try {
    console.log('👤 Creating admin user...');
    adminUser = await prisma.user.upsert({
      where: { email: 'admin@pharma.local' },
      update: {},
      create: {
        email: 'admin@pharma.local',
        password: adminHashedPassword,
        firstName: 'System',
        lastName: 'Administrator',
        role: UserRole.ADMIN,
        isActive: true,
      },
    });

    console.log('🔬 Creating QA user...');
    qaUser = await prisma.user.upsert({
      where: { email: 'qa@pharma.local' },
      update: {},
      create: {
        email: 'qa@pharma.local',
        password: qaHashedPassword,
        firstName: 'Quality',
        lastName: 'Assurance',
        role: UserRole.QUALITY_ASSURANCE,
        isActive: true,
      },
    });

    console.log('🏭 Creating sample production line...');
    const productionLine = await prisma.productionLine.create({
      data: {
        name: 'Main Production Line Alpha',
        status: ProductionLineStatus.ACTIVE,
        version: 1,
        isActive: true,
        createdBy: adminUser.id,
        reason: 'Initial system setup and seeding for development environment',
      },
    });

    console.log('⚙️ Creating sample processes...');
    const processes = await Promise.all([
      prisma.process.create({
        data: {
          title: 'Raw Material Preparation',
          description: 'Initial preparation and validation of raw pharmaceutical materials',
          duration: 120,
          progress: 0.0,
          status: ProcessStatus.PENDING,
          x: 100.0,
          y: 100.0,
          color: '#10B981',
          version: 1,
          isActive: true,
          productionLineId: productionLine.id,
          createdBy: adminUser.id,
          reason: 'Initial process setup for raw material handling workflow',
        },
      }),
      prisma.process.create({
        data: {
          title: 'Quality Control Testing',
          description: 'Comprehensive quality control and validation testing procedures',
          duration: 180,
          progress: 0.0,
          status: ProcessStatus.PENDING,
          x: 300.0,
          y: 100.0,
          color: '#F59E0B',
          version: 1,
          isActive: true,
          productionLineId: productionLine.id,
          createdBy: qaUser.id,
          reason: 'Quality assurance process for GxP compliance validation',
        },
      }),
      prisma.process.create({
        data: {
          title: 'Final Packaging',
          description: 'Final packaging and labeling according to regulatory requirements',
          duration: 90,
          progress: 0.0,
          status: ProcessStatus.PENDING,
          x: 500.0,
          y: 100.0,
          color: '#6366F1',
          version: 1,
          isActive: true,
          productionLineId: productionLine.id,
          createdBy: adminUser.id,
          reason: 'Final packaging process for pharmaceutical product completion',
        },
      }),
    ]);

    console.log('📝 Creating initial audit log entries...');
    await Promise.all([
      prisma.auditLog.create({
        data: {
          userId: adminUser.id,
          action: 'CREATE',
          entityType: 'User',
          entityId: adminUser.id,
          details: { email: adminUser.email, role: adminUser.role },
          reason: 'System initialization - admin user creation',
          ipAddress: '127.0.0.1',
          userAgent: 'Database Seeding Script',
        },
      }),
      prisma.auditLog.create({
        data: {
          userId: adminUser.id,
          action: 'CREATE',
          entityType: 'User',
          entityId: qaUser.id,
          details: { email: qaUser.email, role: qaUser.role },
          reason: 'System initialization - QA user creation',
          ipAddress: '127.0.0.1',
          userAgent: 'Database Seeding Script',
        },
      }),
      prisma.auditLog.create({
        data: {
          userId: adminUser.id,
          action: 'CREATE',
          entityType: 'ProductionLine',
          entityId: productionLine.id,
          details: { name: productionLine.name, status: productionLine.status },
          reason: 'System initialization - sample production line setup',
          ipAddress: '127.0.0.1',
          userAgent: 'Database Seeding Script',
        },
      }),
      ...processes.map(process => 
        prisma.auditLog.create({
          data: {
            userId: process.createdBy,
            action: 'CREATE',
            entityType: 'Process',
            entityId: process.id,
            details: { title: process.title, status: process.status },
            reason: `System initialization - sample process setup: ${process.title}`,
            ipAddress: '127.0.0.1',
            userAgent: 'Database Seeding Script',
          },
        })
      ),
    ]);

    console.log('✅ Database seeding completed successfully!');
    console.log(`📊 Created:`);
    console.log(`   - 2 users (admin, qa)`);
    console.log(`   - 1 production line`);
    console.log(`   - ${processes.length} processes`);
    console.log(`   - ${5 + processes.length} audit log entries`);
    console.log('🔐 All passwords are securely hashed with bcrypt (12 salt rounds)');

  } catch (error) {
    console.error('❌ Error during database seeding:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('💥 Fatal error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('🔌 Database connection closed');
  });