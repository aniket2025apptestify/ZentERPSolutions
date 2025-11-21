const prisma = require('../config/prisma');
const { hashPassword } = require('../utils/password');
const { Role } = require('@prisma/client');

async function createAdminUser() {
  try {
    // Check if admin user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: 'admin@zent.com' },
    });

    if (existingUser) {
      console.log('Admin user already exists!');
      console.log('Email: admin@zent.com');
      console.log('You can reset the password if needed.');
      await prisma.$disconnect();
      return;
    }

    // Create a default tenant first (if it doesn't exist)
    let tenant = await prisma.tenant.findFirst({
      where: { code: 'ZENT001' },
    });

    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: {
          name: 'Zent ERP Solutions',
          code: 'ZENT001',
          address: 'Default Address',
        },
      });
      console.log('✅ Created default tenant:', tenant.name);
    }

    // Hash password
    const hashedPassword = await hashPassword('admin123');

    // Create admin user
    const adminUser = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        name: 'Super Admin',
        email: 'admin@zent.com',
        password: hashedPassword,
        role: Role.SUPERADMIN,
        isActive: true,
      },
    });

    console.log('\n✅ Admin user created successfully!');
    console.log('\n📧 Login Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Email:    admin@zent.com');
    console.log('Password: admin123');
    console.log('Role:     SUPERADMIN');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

createAdminUser();

