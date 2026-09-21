import prisma from '../../lib/prisma';
import { AppError } from '../../utils/AppError';
import { CreateStudyMaterialInput } from './study-material.validation';

interface UploadedFileInfo {
  fileName: string;
  fileUrl: string;
}

export class StudyMaterialService {
  static async list(
    tenantId: string,
    filters: { classId?: string; sectionId?: string; subjectId?: string }
  ) {
    return prisma.studyMaterial.findMany({
      where: {
        tenantId,
        ...(filters.classId ? { classId: filters.classId } : {}),
        ...(filters.sectionId ? { sectionId: filters.sectionId } : {}),
        ...(filters.subjectId ? { subjectId: filters.subjectId } : {}),
      },
      include: {
        class: { select: { id: true, name: true } },
        section: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
        uploadedBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async create(
    tenantId: string,
    userId: string | undefined,
    data: CreateStudyMaterialInput,
    file: UploadedFileInfo
  ) {
    let uploadedById: string | null = null;
    if (userId) {
      const teacher = await prisma.teacher.findFirst({ where: { userId } });
      uploadedById = teacher?.id || null;
    }

    return prisma.studyMaterial.create({
      data: {
        tenantId,
        title: data.title,
        description: data.description || null,
        classId: data.classId || null,
        sectionId: data.sectionId || null,
        subjectId: data.subjectId || null,
        fileUrl: file.fileUrl,
        fileName: file.fileName,
        uploadedById,
      },
      include: {
        class: { select: { id: true, name: true } },
        section: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
        uploadedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  static async delete(tenantId: string, id: string) {
    const existing = await prisma.studyMaterial.findFirst({ where: { id, tenantId } });
    if (!existing) {
      throw new AppError(404, 'Study material not found');
    }
    await prisma.studyMaterial.delete({ where: { id } });
    return { success: true };
  }
}