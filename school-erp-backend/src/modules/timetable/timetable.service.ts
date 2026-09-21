import prisma from '../../lib/prisma';
import { AppError } from '../../utils/AppError';
import { DayOfWeek } from '@prisma/client';

interface GridEntryInput {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  subjectId: string;
  teacherId: string;   // value picked in the UI is a Staff.id (see getTeachers below)
  roomNo?: string;
}

function slugifyCode(name: string) {
  return name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').slice(0, 12) || 'SUBJ';
}

export class TimetableService {
  static async getClasses(tenantId: string) {
    return prisma.class.findMany({
      where: { tenantId, isActive: true },
      select: {
        id: true,
        name: true,
        sections: {
          where: { isActive: true },
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    });
  }

  // ✅ FIX: the Subject table is shared with Marks Entry / Progress Report,
  // which auto-creates exam-bookkeeping entries like "Biology — Practical",
  // "Art & Craft — Term Exam", "Art & Craft — Unit Test" (via
  // ensureSubject elsewhere). Those aren't real weekly teaching periods, so
  // the Timetable Builder's subject picker should only ever show plain
  // subject names — filter out anything with a " - " or " — " separator.
  static async getSubjects(tenantId: string) {
    const subjects = await prisma.subject.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, name: true, code: true },
      orderBy: { name: 'asc' },
    });

    return subjects.filter((s) => !/\s[-—]\s/.test(s.name));
  }

  // ✅ FIX: read real teachers from the Staff table (where "Add Staff" actually
  // writes), instead of the separate/legacy Teacher table that nothing populates.
  static async getTeachers(tenantId: string) {
    return prisma.staff.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, firstName: true, lastName: true, employeeId: true },
      orderBy: { firstName: 'asc' },
    });
  }

  static async getGrid(tenantId: string, classId: string, sectionId: string) {
    return prisma.timetable.findMany({
      where: { tenantId, classId, sectionId },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        staff: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  // ✅ FIX: Teacher.employeeId AND Teacher.email are BOTH globally unique
  // (not scoped per tenant) in this schema. Upserting only on the
  // tenantId+employeeId composite could still hit the separate email unique
  // index on create (a leftover/legacy Teacher row already using that
  // email under a different employeeId) — that's what produced the 409
  // "Duplicate entry" on field 'email'. Fix: look up by employeeId OR email
  // OR userId first, reuse whatever is found, and only create when nothing
  // matches at all — with a safe fallback if a race condition still hits
  // the index.
  //
  // ✅ FIX (this pass): the mirrored Teacher row never had `userId` set,
  // even though Staff.userId (the login link) is right there on the Staff
  // record. The Teacher Dashboard looks a teacher up by `userId` — so a
  // teacher with a full weekly timetable still showed "No classes assigned
  // yet" because that lookup came back empty against a Teacher row that
  // was correctly populated with periods but had no userId on it. Now
  // userId is copied over on both create and update, so the Teacher row
  // Timetable actually points to is the same one the dashboard finds.
  //
  // IMPORTANT: this does DB round-trips. It must never be called inside a
  // Prisma interactive transaction in a loop — that's what was blowing past
  // the 5s transaction timeout and silently losing every save. Call this
  // BEFORE opening any $transaction, once per unique staffId (see
  // resolveTeacherIds below).
  private static async resolveTeacherId(tenantId: string, staffId: string) {
    const staff = await prisma.staff.findFirst({ where: { id: staffId, tenantId } });
    if (!staff) {
      throw new AppError(400, 'Selected teacher was not found');
    }

    const orClauses: any[] = [{ employeeId: staff.employeeId }];
    if (staff.email) orClauses.push({ email: staff.email });
    if (staff.userId) orClauses.push({ userId: staff.userId });

    const existing = await prisma.teacher.findFirst({ where: { OR: orClauses } });

    const sharedData: any = {
      firstName: staff.firstName,
      lastName: staff.lastName,
      email: staff.email,
      phone: staff.phone,
      designation: staff.designation,
      department: staff.department,
      isActive: staff.isActive,
    };
    if (staff.userId) {
      sharedData.userId = staff.userId;
    }

    if (existing) {
      try {
        const updated = await prisma.teacher.update({
          where: { id: existing.id },
          data: sharedData,
        });
        return updated.id;
      } catch (err: any) {
        // userId already claimed by a different/stray Teacher row —
        // don't fail the whole save over it, just keep using this row.
        if (err?.code === 'P2002') {
          return existing.id;
        }
        throw err;
      }
    }

    try {
      const created = await prisma.teacher.create({
        data: {
          tenantId,
          employeeId: staff.employeeId,
          dateOfBirth: staff.dateOfBirth,
          gender: staff.gender,
          qualification: staff.qualification,
          experience: staff.experience,
          specialization: staff.specialization,
          joiningDate: staff.joiningDate,
          ...sharedData,
        },
      });
      return created.id;
    } catch (err: any) {
      // Race condition: another request created it between our lookup and
      // our insert. Fetch and reuse instead of failing the whole save.
      if (err?.code === 'P2002') {
        const fallback = await prisma.teacher.findFirst({ where: { OR: orClauses } });
        if (fallback) return fallback.id;
      }
      throw err;
    }
  }

  // ✅ resolves every unique staffId in the incoming grid to a Teacher.id
  // exactly once (not once per period), and does it fully outside any
  // transaction, so the actual write below is fast and never times out.
  private static async resolveTeacherIds(
    tenantId: string,
    entries: GridEntryInput[]
  ): Promise<Map<string, string>> {
    const uniqueStaffIds = [...new Set(entries.map((e) => e.teacherId))];
    const pairs = await Promise.all(
      uniqueStaffIds.map(async (staffId) => [
        staffId,
        await this.resolveTeacherId(tenantId, staffId),
      ] as const)
    );
    return new Map(pairs);
  }

  static async saveGrid(
    tenantId: string,
    classId: string,
    sectionId: string,
    entries: GridEntryInput[]
  ) {
    if (!classId || !sectionId) {
      throw new AppError(400, 'Class and section are required');
    }

    // Resolve every teacher mapping BEFORE opening the transaction. This is
    // the fix: the old code did a findFirst + upsert per entry *inside* the
    // transaction loop, which for a full week (30-50 entries) took well
    // over Prisma's 5s interactive-transaction timeout — the transaction
    // got killed mid-loop and nothing was ever committed, even though the
    // request "succeeded" up until the timeout hit.
    const teacherIdMap = await this.resolveTeacherIds(tenantId, entries);

    // Replace the whole week for this class/section in one transaction,
    // so saving is idempotent — clear old entries, insert the new set.
    // Now the transaction only does fast, synchronous-to-Prisma bulk writes.
    return prisma.$transaction(async (tx) => {
      await tx.timetable.deleteMany({
        where: { tenantId, classId, sectionId },
      });

      if (entries.length > 0) {
        await tx.timetable.createMany({
          data: entries.map((e) => ({
            tenantId,
            classId,
            sectionId,
            dayOfWeek: e.dayOfWeek,
            startTime: e.startTime,
            endTime: e.endTime,
            subjectId: e.subjectId,
            teacherId: teacherIdMap.get(e.teacherId)!,
            staffId: e.teacherId,
            roomNo: e.roomNo || null,
          })),
        });
      }

      return tx.timetable.findMany({
        where: { tenantId, classId, sectionId },
        include: {
          subject: { select: { id: true, name: true, code: true } },
          staff: { select: { id: true, firstName: true, lastName: true } },
        },
      });
    });
  }

  static async deleteEntry(tenantId: string, id: string) {
    const existing = await prisma.timetable.findFirst({ where: { id, tenantId } });
    if (!existing) {
      throw new AppError(404, 'Timetable entry not found');
    }
    await prisma.timetable.delete({ where: { id } });
    return { success: true };
  }

  // ✅ quick find-or-create for Subjects (mirrors what Marks Entry already
  // does), since there's no dedicated Subject admin screen yet.
  static async ensureSubject(tenantId: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) throw new AppError(400, 'Subject name is required');

    const existing = await prisma.subject.findFirst({
      where: { tenantId, name: { equals: trimmed, mode: 'insensitive' } },
    });
    if (existing) return existing;

    let code = slugifyCode(trimmed);
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await prisma.subject.create({
          data: { tenantId, name: trimmed, code: attempt === 0 ? code : `${code}_${attempt}` },
        });
      } catch (err: any) {
        if (err?.code === 'P2002' && attempt < 2) continue;
        throw err;
      }
    }
    throw new AppError(500, `Could not create subject: ${trimmed}`);
  }

  // ✅ a single teacher's own weekly schedule, for the Teacher Dashboard.
  static async getMySchedule(tenantId: string, staffId: string) {
    return prisma.timetable.findMany({
      where: { tenantId, staffId },
      include: {
        class: { select: { id: true, name: true } },
        section: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true, code: true } },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  // ✅ NEW — a student's own weekly timetable, scoped to their class/section
  // automatically. No classId/sectionId needs to come from the client.
  static async getStudentSchedule(tenantId: string, classId: string, sectionId: string) {
    return prisma.timetable.findMany({
      where: { tenantId, classId, sectionId },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        staff: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }
}