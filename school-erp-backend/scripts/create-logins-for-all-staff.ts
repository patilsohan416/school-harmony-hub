import prisma from '../src/lib/prisma';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';

const DEFAULT_PASSWORD = '123456';

function mapDesignationToRole(designation: string): Role {
  const d = (designation || '').toLowerCase();
  if (d.includes('vice principal')) return 'VICE_PRINCIPAL';
  if (d.includes('principal')) return 'PRINCIPAL';
  if (d.includes('accountant')) return 'ACCOUNTANT';
  if (d.includes('librarian')) return 'LIBRARIAN';
  if (d.includes('teacher')) return 'TEACHER';
  return 'USER';
}

async function main() {
  const staffWithoutLogin = await prisma.staff.findMany({
    where: { userId: null },
  });

  console.log(`Found ${staffWithoutLogin.length} staff record(s) without a login account.\n`);

  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  let created = 0;
  let skipped = 0;

  for (const staff of staffWithoutLogin) {
    if (!staff.email) {
      console.log(`SKIP  (no email on staff record): ${staff.firstName} ${staff.lastName}`);
      skipped++;
      continue;
    }

    const existingUser = await prisma.user.findUnique({ where: { email: staff.email } });
    if (existingUser) {
      await prisma.staff.update({ where: { id: staff.id }, data: { userId: existingUser.id } });
      console.log(`LINKED (user already existed): ${staff.email}`);
      created++;
      continue;
    }

    const role = mapDesignationToRole(staff.designation);

    const user = await prisma.user.create({
      data: {
        email: staff.email,
        password: hashedPassword,
        firstName: staff.firstName,
        lastName: staff.lastName,
        phone: staff.phone,
        role,
        tenantId: staff.tenantId,
        isActive: true,
      },
    });

    await prisma.staff.update({
      where: { id: staff.id },
      data: { userId: user.id },
    });

    console.log(`CREATED: ${staff.email}  (role: ${role})`);
    created++;
  }

  console.log(`\nDone. Created/linked: ${created}, skipped: ${skipped}.`);
  console.log(`Default password for all newly created accounts: ${DEFAULT_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());