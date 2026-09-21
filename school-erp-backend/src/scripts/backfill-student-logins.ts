import prisma from '../lib/prisma';
import bcrypt from 'bcryptjs';

const DEFAULT_STUDENT_PASSWORD = '123456';

async function main() {
  const orphanedStudents = await prisma.student.findMany({
    where: { userId: null },
    select: {
      id: true,
      tenantId: true,
      email: true,
      firstName: true,
      lastName: true,
      mobile: true,
      guardianMobile: true,
      admissionNo: true,
    },
  });

  console.log(`Found ${orphanedStudents.length} student(s) without a login account.`);

  let created = 0;
  let skipped = 0;

  for (const student of orphanedStudents) {
    if (!student.email) {
      console.warn(`Skipping ${student.admissionNo} (${student.firstName} ${student.lastName}) - no email on record.`);
      skipped++;
      continue;
    }

    const existingUser = await prisma.user.findUnique({ where: { email: student.email } });

    if (existingUser) {
      await prisma.student.update({
        where: { id: student.id },
        data: { userId: existingUser.id },
      });
      console.log(`Linked existing User to ${student.admissionNo} (${student.email})`);
      created++;
      continue;
    }

    const hashedPassword = await bcrypt.hash(DEFAULT_STUDENT_PASSWORD, 10);

    const user = await prisma.user.create({
      data: {
        email: student.email,
        password: hashedPassword,
        firstName: student.firstName,
        lastName: student.lastName,
        phone: student.mobile || student.guardianMobile || null,
        role: 'STUDENT',
        tenantId: student.tenantId,
        isActive: true,
      },
    });

    await prisma.student.update({
      where: { id: student.id },
      data: { userId: user.id },
    });

    console.log(`Created login for ${student.admissionNo} - ${student.email} (password: ${DEFAULT_STUDENT_PASSWORD})`);
    created++;
  }

  console.log('---');
  console.log(`Done. Created/linked: ${created}, Skipped (no email): ${skipped}`);
  console.log(`All newly created accounts use the default password: ${DEFAULT_STUDENT_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error('Backfill failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
