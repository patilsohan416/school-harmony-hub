// school-erp-backend/scripts/reset-password-to-birth-year.ts
// Run once for accounts created BEFORE the birth-year-password change,
// so their stored password hash actually matches their birth year.
//
// Usage:
//   npx ts-node scripts/reset-password-to-birth-year.ts rohit.shinde@example.com

import prisma from '../src/lib/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: ts-node reset-password-to-birth-year.ts <email>');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`No user found with email: ${email}`);
    process.exit(1);
  }

  const staff =
    (await prisma.staff.findFirst({ where: { userId: user.id } })) ||
    (await prisma.teacher.findFirst({ where: { userId: user.id } }));

  if (!staff || !staff.dateOfBirth) {
    console.error(`No linked staff/teacher record with a date of birth for: ${email}`);
    process.exit(1);
  }

  const birthYear = new Date(staff.dateOfBirth).getFullYear();
  const newPassword = String(birthYear);
  const hashed = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashed },
  });

  console.log(`Password for ${email} reset to: ${newPassword}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
