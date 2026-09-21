import prisma from '../../lib/prisma';

export class ClassService {
  static async getClassesWithSections(tenantId: string) {
    const classes = await prisma.class.findMany({
      where: { tenantId, isActive: true },
      orderBy: { order: 'asc' },
      include: {
        sections: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
          select: {
            id: true,
            name: true,
            capacity: true,
            currentStrength: true,
          },
        },
      },
    });

    return classes;
  }
}
