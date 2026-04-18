import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 12)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@yourdomain.com' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@yourdomain.com',
      password: hashedPassword,
      role: 'ADMIN'
    }
  })

  console.log('✓ Seed complete. Admin user created:')
  console.log(`  Email: ${admin.email}`)
  console.log(`  Password: admin123`)
  console.log(`  ⚠️  Change this password immediately after first login.`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
