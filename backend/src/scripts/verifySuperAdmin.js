const prisma = require('../config/prisma');

async function verifySuperAdmin() {
  try {
    const superAdmin = await prisma.user.findUnique({
      where: { email: 'superadmin@zent.com' },
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

    if (superAdmin) {
      console.log('\n✅ Super Admin Verified:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`ID:       ${superAdmin.id}`);
      console.log(`Name:     ${superAdmin.name}`);
      console.log(`Email:    ${superAdmin.email}`);
      console.log(`Role:     ${superAdmin.role}`);
      console.log(`TenantId: ${superAdmin.tenantId || 'null (System-wide access)'}`);
      console.log(`Active:   ${superAdmin.isActive}`);
      console.log(`Created:  ${superAdmin.createdAt}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    } else {
      console.log('\n❌ Super Admin not found!\n');
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('\n❌ Error verifying super admin:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

verifySuperAdmin();



