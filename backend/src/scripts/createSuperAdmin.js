const prisma = require('../config/prisma');
const { hashPassword } = require('../utils/password');
const { Role } = require('@prisma/client');

/**
 * Create a super admin user with no tenant (tenantId: null)
 * Super admin can manage all tenants and has system-wide access
 */
async function createSuperAdmin() {
  try {
    const email = process.env.SUPERADMIN_EMAIL || 'superadmin@zent.com';
    const password = process.env.SUPERADMIN_PASSWORD || 'SuperAdmin@123';
    const name = process.env.SUPERADMIN_NAME || 'Super Administrator';

    // Check if super admin already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log('\n⚠️  Super admin user already exists!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`Email:    ${existingUser.email}`);
      console.log(`Name:     ${existingUser.name}`);
      console.log(`Role:     ${existingUser.role}`);
      console.log(`TenantId: ${existingUser.tenantId || 'null (System-wide access)'}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log('💡 To create a new super admin, use a different email.');
      console.log('💡 To reset password, update the user manually.\n');
      await prisma.$disconnect();
      return;
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create super admin user with no tenant (tenantId: null)
    const superAdmin = await prisma.user.create({
      data: {
        tenantId: null, // Super admin has no tenant - system-wide access
        name,
        email,
        password: hashedPassword,
        role: Role.SUPERADMIN,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        tenantId: true,
        isActive: true,
        createdAt: true,
      },
    });

    console.log('\n✅ Super Admin created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Login Credentials:');
    console.log(`   Email:    ${superAdmin.email}`);
    console.log(`   Password: ${password}`);
    console.log(`   Role:     ${superAdmin.role}`);
    console.log(`   TenantId: ${superAdmin.tenantId || 'null (System-wide access)'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🔐 Security Note:');
    console.log('   - Change the default password after first login');
    console.log('   - Super admin has access to all tenants');
    console.log('   - Can create, update, and delete tenants');
    console.log('   - Can manage all users across all tenants\n');

    await prisma.$disconnect();
  } catch (error) {
    console.error('\n❌ Error creating super admin:', error.message);
    if (error.code === 'P2002') {
      console.error('   A user with this email already exists.\n');
    }
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Run the script
createSuperAdmin();


