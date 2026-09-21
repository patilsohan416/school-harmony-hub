import "dotenv/config";
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ==========================
  // TENANT
  // ==========================

  const tenant = await prisma.tenant.upsert({
    where: {
      code: "SCH001",
    },
    update: {},
    create: {
      name: "Sunrise International School",
      code: "SCH001",
      subdomain: "sunrise",
      address: "123 Main Street",
      city: "Mumbai",
      state: "Maharashtra",
      country: "India",
      pincode: "400001",
      phone: "+91 9876543210",
      email: "info@sunriseschool.edu",
      isActive: true,
    },
  });

  console.log(`✅ Tenant Created : ${tenant.name}`);

  // ==========================
  // ADMIN USER
  // ==========================

  const password = await bcrypt.hash("Admin@123", 10);

  const admin = await prisma.user.upsert({
    where: {
      email: "admin@school.edu",
    },
    update: {},
    create: {
      email: "admin@school.edu",
      password,
      firstName: "Admin",
      lastName: "User",
      phone: "9876543210",
      role: Role.SUPER_ADMIN,
      tenantId: tenant.id,
      permissions: ["*"],
      isActive: true,
    },
  });

  console.log(`✅ Admin Created : ${admin.email}`);

  // ==========================
  // CLASSES
  // ==========================

  const classes = [
    { name: "Nursery", code: "NUR" },
    { name: "LKG", code: "LKG" },
    { name: "UKG", code: "UKG" },

    { name: "1st Grade", code: "1" },
    { name: "2nd Grade", code: "2" },
    { name: "3rd Grade", code: "3" },
    { name: "4th Grade", code: "4" },
    { name: "5th Grade", code: "5" },
    { name: "6th Grade", code: "6" },
    { name: "7th Grade", code: "7" },
    { name: "8th Grade", code: "8" },
    { name: "9th Grade", code: "9" },
    { name: "10th Grade", code: "10" },
    { name: "11th Grade", code: "11" },
    { name: "12th Grade", code: "12" },
  ];

  const sectionNames = ["A", "B", "C", "D"];

  for (let i = 0; i < classes.length; i++) {
    const item = classes[i];

    const cls = await prisma.class.upsert({
      where: {
        tenantId_name: {
          tenantId: tenant.id,
          name: item.name,
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        name: item.name,
        code: item.code,
        order: i + 1,
        isActive: true,
      },
    });

    console.log(`\n✅ ${cls.name}`);

    for (const sec of sectionNames) {
      await prisma.section.upsert({
        where: {
          classId_name: {
            classId: cls.id,
            name: sec,
          },
        },
        update: {},
        create: {
          tenantId: tenant.id,
          classId: cls.id,
          name: sec,
          capacity: 40,
          currentStrength: 0,
          isActive: true,
        },
      });

      console.log(`   ➜ Section ${sec}`);
    }
  }

  console.log("");
  console.log("===================================");
  console.log("✅ DATABASE SEEDED SUCCESSFULLY");
  console.log("===================================");
  console.log("School : Sunrise International School");
  console.log("Email  : admin@school.edu");
  console.log("Password : Admin@123");
  console.log("===================================");
}

main()
  .catch((e) => {
    console.error("❌ Seed Error");
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });