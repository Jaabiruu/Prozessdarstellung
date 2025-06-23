const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

async function debugBcryptHashing() {
  console.log('🔧 DEBUG: Bcrypt Hashing Consistency Check\n');
  
  const prisma = new PrismaClient();
  
  try {
    // Test the exact same pattern as setup.ts
    const testPassword = 'admin123';
    const rounds = 12;
    
    console.log('1. Testing bcrypt hashing with same parameters as setup.ts:');
    console.log(`   Password: "${testPassword}"`);
    console.log(`   Rounds: ${rounds}`);
    
    // Generate hash like setup.ts does
    const newHash = await bcrypt.hash(testPassword, rounds);
    console.log(`   Generated hash: ${newHash}`);
    
    // Test validation
    const isValid = await bcrypt.compare(testPassword, newHash);
    console.log(`   Self-validation: ${isValid ? '✅ PASS' : '❌ FAIL'}\n`);
    
    // Check existing user in database
    console.log('2. Checking existing admin user in database:');
    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@test.local' }
    });
    
    if (adminUser) {
      console.log(`   User found: ${adminUser.email}`);
      console.log(`   Stored hash: ${adminUser.password}`);
      console.log(`   Hash length: ${adminUser.password.length}`);
      
      // Test validation against stored hash
      const storedHashValid = await bcrypt.compare(testPassword, adminUser.password);
      console.log(`   Stored hash validation: ${storedHashValid ? '✅ PASS' : '❌ FAIL'}`);
      
      if (!storedHashValid) {
        console.log('\n🚨 ISSUE FOUND: Stored hash does not validate against expected password!');
        console.log('   This explains the authentication failures.');
      }
    } else {
      console.log('   ❌ Admin user not found in database');
    }
    
    console.log('\n3. Testing other test users:');
    const testUsers = [
      { email: 'manager@test.local', password: 'manager123' },
      { email: 'operator@test.local', password: 'operator123' }
    ];
    
    for (const testUser of testUsers) {
      const user = await prisma.user.findUnique({
        where: { email: testUser.email }
      });
      
      if (user) {
        const isValidPassword = await bcrypt.compare(testUser.password, user.password);
        console.log(`   ${testUser.email}: ${isValidPassword ? '✅ PASS' : '❌ FAIL'}`);
      } else {
        console.log(`   ${testUser.email}: ❌ NOT FOUND`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error during bcrypt debug:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugBcryptHashing().catch(console.error);