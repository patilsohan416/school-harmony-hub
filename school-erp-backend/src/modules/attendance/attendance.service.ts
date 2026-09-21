import prisma from '../../lib/prisma';
import { AppError } from '../../utils/AppError';
import logger from '../../lib/logger';

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export class AttendanceService {
  /**
   * Pulls every active student in a class/section straight from Student
   * Management, and merges in whatever attendance has already been marked
   * for the given date (if any) so the page can be re-opened/edited safely.
   */
  static async getRoster(params: {
    tenantId: string;
    classId: string;
    sectionId: string;
    date: string;
  }) {
    const { tenantId, classId, sectionId, date } = params;

    if (!classId || !sectionId) {
      throw new AppError(400, 'Class and Section are required');
    }

    const day = startOfDay(new Date(date));
    if (isNaN(day.getTime())) {
      throw new AppError(400, 'Invalid date');
    }

    const [students, classInfo, sectionInfo, existing] = await Promise.all([
      prisma.student.findMany({
        where: { tenantId, classId, sectionId, status: 'ACTIVE' },
        orderBy: { rollNumber: 'asc' },
        select: {
          id: true,
          admissionNo: true,
          rollNumber: true,
          firstName: true,
          middleName: true,
          lastName: true,
          profileImage: true,
        },
      }),
      prisma.class.findUnique({ where: { id: classId }, select: { name: true } }),
      prisma.section.findUnique({ where: { id: sectionId }, select: { name: true } }),
      prisma.attendance.findMany({
        where: { tenantId, classId, sectionId, date: day },
      }),
    ]);

    const existingByStudent = new Map(existing.map((a) => [a.studentId, a]));

    const roster = students.map((s) => {
      const record = existingByStudent.get(s.id);
      return {
        studentId: s.id,
        admissionNo: s.admissionNo,
        rollNumber: s.rollNumber,
        name: [s.firstName, s.middleName, s.lastName].filter(Boolean).join(' '),
        profileImage: s.profileImage,
        status: record?.status || null,
        remarks: record?.remarks || '',
      };
    });

    return {
      date: day.toISOString().slice(0, 10),
      class: classInfo?.name || '',
      section: sectionInfo?.name || '',
      total: roster.length,
      marked: existing.length,
      roster,
    };
  }

  /**
   * Saves (or updates) attendance for a whole class/section on one date in
   * a single call — one upsert per student, keyed on the student+date
   * uniqueness the schema already enforces.
   */
  static async markAttendance(params: {
    tenantId: string;
    classId: string;
    sectionId: string;
    date: string;
    markedBy?: string;
    records: { studentId: string; status: string; remarks?: string }[];
  }) {
    const { tenantId, classId, sectionId, date, markedBy, records } = params;

    if (!classId || !sectionId) {
      throw new AppError(400, 'Class and Section are required');
    }
    if (!Array.isArray(records) || records.length === 0) {
      throw new AppError(400, 'No attendance records were provided');
    }

    const day = startOfDay(new Date(date));
    if (isNaN(day.getTime())) {
      throw new AppError(400, 'Invalid date');
    }

    const validStatuses = ['PRESENT', 'ABSENT', 'LATE', 'LEAVE', 'HOLIDAY'];

    const results = await Promise.all(
      records
        .filter((r) => r.studentId && validStatuses.includes(r.status))
        .map((r) =>
          prisma.attendance.upsert({
            where: { studentId_date: { studentId: r.studentId, date: day } },
            update: {
              status: r.status as any,
              remarks: r.remarks || null,
              markedBy: markedBy || null,
              classId,
              sectionId,
            },
            create: {
              tenantId,
              studentId: r.studentId,
              classId,
              sectionId,
              date: day,
              status: r.status as any,
              remarks: r.remarks || null,
              markedBy: markedBy || null,
            },
          })
        )
    );

    logger.info(
      `Attendance marked: ${results.length} students, class/section ${classId}/${sectionId}, ${day.toISOString().slice(0, 10)}`
    );

    const present = results.filter((r) => r.status === 'PRESENT').length;
    const absent = results.filter((r) => r.status === 'ABSENT').length;

    return {
      date: day.toISOString().slice(0, 10),
      totalMarked: results.length,
      present,
      absent,
      other: results.length - present - absent,
    };
  }

  /**
   * Paginated history of every attendance record already marked — powers
   * the "Attendance Register" list view. Matches the shape the generic
   * table expects: { data, pagination }.
   */
  static async listRegister(params: {
    tenantId: string;
    page: number;
    limit: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    classId?: string;
    sectionId?: string;
    date?: string;
    status?: string;
  }) {
    const { tenantId, page, limit, search, sortBy = 'date', sortOrder = 'desc', classId, sectionId, date, status } = params;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (classId) where.classId = classId;
    if (sectionId) where.sectionId = sectionId;
    if (status) where.status = status.toUpperCase();
    if (date) {
      const day = startOfDay(new Date(date));
      if (!isNaN(day.getTime())) where.date = day;
    }

    // ✅ FIX: the old version only checked firstName/lastName (never
    // middleName) with a single OR block, so a name like "anuja ajit patil"
    // (first + middle + last) could never match — no single field contains
    // the whole typed string, and middleName wasn't checked at all.
    // Now each typed word is required to match SOMEWHERE across
    // firstName/middleName/lastName/admissionNo, so searching "anuja",
    // "patil", or the full "anuja ajit patil" all correctly find the
    // student.
    if (search) {
      const words = search.trim().split(/\s+/).filter(Boolean);
      if (words.length > 0) {
        where.AND = words.map((word) => ({
          student: {
            is: {
              OR: [
                { firstName: { contains: word, mode: 'insensitive' } },
                { middleName: { contains: word, mode: 'insensitive' } },
                { lastName: { contains: word, mode: 'insensitive' } },
                { admissionNo: { contains: word, mode: 'insensitive' } },
              ],
            },
          },
        }));
      }
    }

    let orderBy: any = { date: sortOrder };
    if (sortBy === 'name') orderBy = { student: { firstName: sortOrder } };
    else if (sortBy === 'class') orderBy = { class: { name: sortOrder } };
    else if (sortBy === 'status') orderBy = { status: sortOrder };
    else orderBy = { date: sortOrder };

    const [records, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        include: {
          student: { select: { firstName: true, middleName: true, lastName: true, admissionNo: true, rollNumber: true } },
          class: { select: { name: true } },
          section: { select: { name: true } },
        },
        skip,
        take: limit,
        orderBy,
      }),
      prisma.attendance.count({ where }),
    ]);

    const data = records.map((r) => ({
      id: r.id,
      date: r.date.toISOString().slice(0, 10),
      name: [r.student.firstName, r.student.middleName, r.student.lastName].filter(Boolean).join(' '),
      admissionNo: r.student.admissionNo,
      rollNumber: r.student.rollNumber,
      classId: r.classId,
      sectionId: r.sectionId,
      className: r.class?.name || '',
      sectionName: r.section?.name || '',
      class: `${r.class?.name || ''}${r.section?.name ? ' - ' + r.section.name : ''}`,
      status: r.status.charAt(0) + r.status.slice(1).toLowerCase(),
      remarks: r.remarks || '',
    }));

    return {
      data,
      pagination: { total, page, limit },
    };
  }

  static async getRegisterEntry(tenantId: string, id: string) {
    const record = await prisma.attendance.findFirst({
      where: { id, tenantId },
      include: {
        student: { select: { firstName: true, middleName: true, lastName: true, admissionNo: true } },
        class: { select: { name: true } },
        section: { select: { name: true } },
      },
    });

    if (!record) {
      throw new AppError(404, 'Attendance record not found');
    }

    return {
      id: record.id,
      date: record.date.toISOString().slice(0, 10),
      name: [record.student.firstName, record.student.middleName, record.student.lastName].filter(Boolean).join(' '),
      admissionNo: record.student.admissionNo,
      class: `${record.class?.name || ''}${record.section?.name ? ' - ' + record.section.name : ''}`,
      status: record.status.charAt(0) + record.status.slice(1).toLowerCase(),
      remarks: record.remarks || '',
    };
  }

  /**
   * Corrects a single attendance record — only status/remarks are
   * editable; the student, class, and date stay fixed to what was
   * originally marked (those come from real relations, not free text).
   */
  static async updateRegisterEntry(tenantId: string, id: string, patch: { status?: string; remarks?: string }) {
    const existing = await prisma.attendance.findFirst({ where: { id, tenantId } });
    if (!existing) {
      throw new AppError(404, 'Attendance record not found');
    }

    const validStatuses = ['PRESENT', 'ABSENT', 'LATE', 'LEAVE', 'HOLIDAY'];
    const nextStatus = patch.status ? patch.status.toUpperCase() : undefined;
    if (nextStatus && !validStatuses.includes(nextStatus)) {
      throw new AppError(400, `Invalid status: ${patch.status}`);
    }

    const updated = await prisma.attendance.update({
      where: { id },
      data: {
        ...(nextStatus ? { status: nextStatus as any } : {}),
        ...(patch.remarks !== undefined ? { remarks: patch.remarks || null } : {}),
      },
    });

    return updated;
  }

  static async deleteRegisterEntry(tenantId: string, id: string) {
    const existing = await prisma.attendance.findFirst({ where: { id, tenantId } });
    if (!existing) {
      throw new AppError(404, 'Attendance record not found');
    }
    await prisma.attendance.delete({ where: { id } });
  }
}