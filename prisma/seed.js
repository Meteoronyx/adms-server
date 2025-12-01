const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  await prisma.device.upsert({
    where: { sn: 'TEST_DEVICE_001' },
    update: {},
    create: {
      sn: 'TEST_DEVICE_001',
      name: 'Test Device',
      ipAddress: '127.0.0.1',
      status: 'offline',
      timezone: '+07:00',
    },
  });

  console.log('Seeded TEST_DEVICE_001');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
