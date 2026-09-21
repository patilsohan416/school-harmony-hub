import prisma from '../../lib/prisma';
import { AppError } from '../../utils/AppError';
import logger from '../../lib/logger';

function slugifyCode(name: string): string {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40) || 'SUBJECT';
}

// Same thresholds used across Progress Report / Consolidated Results, kept
// in sync so ICSE Grade-wise Results tallies the same letters.
function gradeFor(pct: number): string {
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B+';
  if (pct >= 60) return 'B';
  if (pct >= 50) return 'C';
  if (pct >= 35) return 'D';
  return 'E';
}
const GRADE_ORDER = ['A+', 'A', 'B+', 'B', 'C', 'D', 'E'];

function passThresholdForClass(className: string): number {
  const m = className.match(/\d+/);
  const n = m ? parseInt(m[0], 10) : null;
  if (n !== null && n >= 9 && n <= 10) return 33; // ICSE
  if (n !== null && n >= 11 && n <= 12) return 35; // ISC
  return 35;
}

export class IcseMarksService {
  private static async findOrCreateSubject(tenantId: string, name: string, maxMarks?: number) {
    const existing = await prisma.icseSubject.findFirst({
      where: { tenantId, name: { equals: name, mode: 'insensitive' } },
    });
    if (existing) return existing;

    let code = slugifyCode(name);
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await prisma.icseSubject.create({
          data: {
            tenantId,
            name,
            code: attempt === 0 ? code : `${code}_${attempt}`,
            theoryMarks: maxMarks ?? 100,
          },
        });
      } catch (err: any) {
        if (err?.code === 'P2002' && attempt < 2) continue;
        throw err;
      }
    }
    throw new AppError(500, `Could not create ICSE subject: ${name}`);
  }

  private static async findOrCreateExam(params: {
    tenantId: string;
    classId: string;
    sectionId?: string;
    name: string;
    academicYear: string;
  }) {
    const { tenantId, classId, sectionId, name, academicYear } = params;

    const existing = await prisma.icseExam.findFirst({
      where: { tenantId, classId, sectionId: sectionId || null, name: { equals: name, mode: 'insensitive' }, academicYear },
    });
    if (existing) return existing;

    const today = new Date();
    return prisma.icseExam.create({
      data: { tenantId, classId, sectionId: sectionId || null, name, academicYear, startDate: today, endDate: today },
    });
  }

  static async getRoster(params: {
    tenantId: string;
    classId: string;
    sectionId: string;
    examName: string;
    academicYear: string;
    subjects: string[];
  }) {
    const { tenantId, classId, sectionId, examName, academicYear, subjects } = params;
    if (!classId || !sectionId) throw new AppError(400, 'Class and Section are required');

    const students = await prisma.student.findMany({
      where: { tenantId, classId, sectionId, status: 'ACTIVE' },
      orderBy: { rollNumber: 'asc' },
      select: { id: true, admissionNo: true, rollNumber: true, firstName: true, middleName: true, lastName: true },
    });

    const exam = await prisma.icseExam.findFirst({
      where: { tenantId, classId, sectionId, name: { equals: examName, mode: 'insensitive' }, academicYear },
    });

    let existingMarks: Record<string, Record<string, number>> = {};
    // The max marks the teacher used for each subject/component in this
    // exam, so the entry grid re-shows what was actually saved rather than
    // silently reverting to the default when re-opening a saved exam.
    const existingMaxMarks: Record<string, number> = {};
    if (exam) {
      const subjectRows = await prisma.icseSubject.findMany({
        where: { tenantId, name: { in: subjects, mode: 'insensitive' } },
      });
      const subjectIdToName = new Map(subjectRows.map((s) => [s.id, s.name]));

      const marks = await prisma.icseExamMark.findMany({
        where: { tenantId, examId: exam.id, studentId: { in: students.map((s) => s.id) } },
      });

      for (const m of marks) {
        const subjName = subjectIdToName.get(m.subjectId);
        if (!subjName) continue;
        if (!existingMarks[m.studentId]) existingMarks[m.studentId] = {};
        existingMarks[m.studentId][subjName] = m.totalMarks ? Number(m.totalMarks) : 0;
        if (existingMaxMarks[subjName] === undefined && m.maxMarks !== null && m.maxMarks !== undefined) {
          existingMaxMarks[subjName] = Number(m.maxMarks);
        }
      }
    }

    const roster = students.map((s) => ({
      studentId: s.id,
      admissionNo: s.admissionNo,
      rollNumber: s.rollNumber,
      name: [s.firstName, s.middleName, s.lastName].filter(Boolean).join(' '),
      marks: existingMarks[s.id] || {},
    }));

    return { roster, examExists: !!exam, maxMarks: existingMaxMarks };
  }

  static async saveMarks(params: {
    tenantId: string;
    classId: string;
    sectionId: string;
    examName: string;
    academicYear: string;
    markedBy?: string;
    subjects: { name: string; maxMarks: number }[];
    records: { studentId: string; subjectName: string; marks: number }[];
  }) {
    const { tenantId, classId, sectionId, examName, academicYear, markedBy, subjects, records } = params;

    if (!classId || !sectionId) throw new AppError(400, 'Class and Section are required');
    if (!examName?.trim()) throw new AppError(400, 'Exam name is required');
    if (!subjects?.length) throw new AppError(400, 'At least one subject is required');
    if (!records?.length) throw new AppError(400, 'No marks were entered');

    const exam = await this.findOrCreateExam({ tenantId, classId, sectionId, name: examName.trim(), academicYear });

    const subjectByName = new Map<string, { id: string }>();
    for (const subj of subjects) {
      const row = await this.findOrCreateSubject(tenantId, subj.name, subj.maxMarks);
      subjectByName.set(subj.name.toLowerCase(), row);
    }
    const maxMarksByName = new Map(subjects.map((s) => [s.name.toLowerCase(), s.maxMarks]));

    let saved = 0;
    for (const r of records) {
      const subject = subjectByName.get(r.subjectName.toLowerCase());
      if (!subject || r.marks === null || r.marks === undefined || isNaN(r.marks)) continue;

      // The teacher decides how many marks this paper/component is out of
      // (per exam, per subject) — that value is what obtained marks are
      // divided by, both here and in every downstream report.
      const maxMarks = maxMarksByName.get(r.subjectName.toLowerCase()) || 100;
      const percentage = maxMarks > 0 ? Math.round((r.marks / maxMarks) * 10000) / 100 : null;

      await prisma.icseExamMark.upsert({
        where: { studentId_examId_subjectId: { studentId: r.studentId, examId: exam.id, subjectId: subject.id } },
        update: { totalMarks: r.marks, maxMarks, percentage: percentage ?? undefined, marksEnteredBy: markedBy || null },
        create: {
          tenantId, studentId: r.studentId, examId: exam.id, subjectId: subject.id,
          totalMarks: r.marks, maxMarks, percentage: percentage ?? undefined, marksEnteredBy: markedBy || null,
        },
      });
      saved++;
    }

    logger.info(`ICSE marks saved: exam "${examName}", ${saved} entries, class/section ${classId}/${sectionId}`);
    return { examId: exam.id, saved };
  }

  /**
   * Subject-wise average/highest/lowest across every class and section for
   * a given ICSE exam — one row per (subject, class) combination, computed
   * from the dedicated ICSE tables only.
   */
  static async getSubjectWiseResults(params: {
    tenantId: string;
    examName: string;
    academicYear: string;
  }) {
    const { tenantId, examName, academicYear } = params;
    if (!examName?.trim()) throw new AppError(400, 'Exam name is required');

    const exams = await prisma.icseExam.findMany({
      where: { tenantId, name: { equals: examName.trim(), mode: 'insensitive' }, academicYear },
      include: { class: { select: { name: true } } },
    });

    if (exams.length === 0) {
      return { examName: examName.trim(), academicYear, examExists: false, rows: [] as any[] };
    }

    const examIdToClassName = new Map(exams.map((e) => [e.id, e.class?.name || '']));

    const marks = await prisma.icseExamMark.findMany({
      where: { tenantId, examId: { in: exams.map((e) => e.id) } },
      include: { subject: { select: { name: true } } },
    });

    const groups = new Map<string, { subject: string; className: string; values: number[] }>();
    for (const m of marks) {
      const className = examIdToClassName.get(m.examId) || '';
      const key = `${m.subject.name}__${className}`;
      if (!groups.has(key)) groups.set(key, { subject: m.subject.name, className, values: [] });
      groups.get(key)!.values.push(m.totalMarks ? Number(m.totalMarks) : 0);
    }

    const rows = Array.from(groups.values())
      .map((g) => ({
        subject: g.subject,
        class: g.className,
        studentCount: g.values.length,
        average: Math.round((g.values.reduce((a, b) => a + b, 0) / g.values.length) * 100) / 100,
        highest: Math.max(...g.values),
        lowest: Math.min(...g.values),
      }))
      .sort((a, b) => a.subject.localeCompare(b.subject) || a.class.localeCompare(b.class));

    return { examName: examName.trim(), academicYear, examExists: true, rows };
  }

  /**
   * Grade-wise tally for a given exam — each active student's overall
   * percentage (same computation Progress Report uses: obtained/max summed
   * across every subject they have marks for) is bucketed into a letter
   * grade. When classId/sectionId are omitted, every ICSE class and section
   * is combined into one set of totals; passing them narrows to just that
   * class (and section, if given).
   */
  static async getGradeWiseResults(params: {
    tenantId: string;
    examName: string;
    academicYear: string;
    classId?: string;
    sectionId?: string;
  }) {
    const { tenantId, examName, academicYear, classId, sectionId } = params;
    if (!examName?.trim()) throw new AppError(400, 'Exam name is required');

    const exams = await prisma.icseExam.findMany({
      where: {
        tenantId,
        name: { equals: examName.trim(), mode: 'insensitive' },
        academicYear,
        ...(classId ? { classId } : {}),
        ...(sectionId ? { sectionId } : {}),
      },
      include: { class: { select: { name: true } }, section: { select: { name: true } } },
    });

    if (exams.length === 0) {
      return {
        examName: examName.trim(), academicYear, examExists: false,
        rows: [] as any[], totalGraded: 0, classesCovered: 0,
      };
    }

    const counts = new Map<string, number>();
    let totalGraded = 0;

    for (const exam of exams) {
      const students = await prisma.student.findMany({
        where: {
          tenantId,
          classId: exam.classId,
          sectionId: exam.sectionId || undefined,
          status: 'ACTIVE',
        },
        select: { id: true },
      });
      if (students.length === 0) continue;

      const marks = await prisma.icseExamMark.findMany({
        where: { tenantId, examId: exam.id, studentId: { in: students.map((s) => s.id) } },
        include: { subject: { select: { theoryMarks: true } } },
      });

      const byStudent = new Map<string, { obtained: number; max: number }>();
      for (const m of marks) {
        const obtained = m.totalMarks ? Number(m.totalMarks) : 0;
        // Prefer the max marks the teacher set on this exact mark entry
        // (per exam, per subject); only fall back to the subject's generic
        // default for marks saved before that was tracked per-row.
        const max = m.maxMarks ? Number(m.maxMarks) : (m.subject.theoryMarks ?? 100);
        const cur = byStudent.get(m.studentId) || { obtained: 0, max: 0 };
        cur.obtained += obtained;
        cur.max += max;
        byStudent.set(m.studentId, cur);
      }

      for (const [, v] of byStudent) {
        if (v.max === 0) continue;
        const pct = Math.round((v.obtained / v.max) * 10000) / 100;
        const g = gradeFor(pct);
        counts.set(g, (counts.get(g) || 0) + 1);
        totalGraded++;
      }
    }

    const rows = GRADE_ORDER
      .filter((g) => counts.has(g))
      .map((g) => ({
        grade: g,
        count: counts.get(g)!,
        percentage: totalGraded > 0 ? Math.round((counts.get(g)! / totalGraded) * 10000) / 100 : 0,
      }));

    return {
      examName: examName.trim(),
      academicYear,
      examExists: true,
      rows,
      totalGraded,
      classesCovered: exams.length,
    };
  }

  /**
   * Full ICSE progress report for one student on one exam — marks across
   * every subject (with each subject's own max marks), overall percentage,
   * and attendance percentage for the academic year. Mirrors the regular
   * board's Progress Report but reads from the dedicated ICSE tables.
   */
  static async getProgressReport(params: {
    tenantId: string;
    studentId: string;
    examName: string;
    academicYear: string;
  }) {
    const { tenantId, studentId, examName, academicYear } = params;

    if (!studentId) throw new AppError(400, 'Student is required');
    if (!examName?.trim()) throw new AppError(400, 'Exam name is required');

    const student = await prisma.student.findFirst({
      where: { id: studentId, tenantId },
      include: { class: true, section: true },
    });
    if (!student) throw new AppError(404, 'Student not found');

    const exam = await prisma.icseExam.findFirst({
      where: {
        tenantId,
        classId: student.classId,
        sectionId: student.sectionId,
        name: { equals: examName.trim(), mode: 'insensitive' },
        academicYear,
      },
    });

    let subjects: { name: string; obtained: number; max: number }[] = [];
    if (exam) {
      const marks = await prisma.icseExamMark.findMany({
        where: { tenantId, studentId, examId: exam.id },
        include: { subject: { select: { name: true, theoryMarks: true } } },
        orderBy: { subject: { name: 'asc' } },
      });
      subjects = marks.map((m) => ({
        name: m.subject.name,
        obtained: m.totalMarks ? Number(m.totalMarks) : 0,
        max: m.maxMarks ? Number(m.maxMarks) : (m.subject.theoryMarks ?? 100),
      }));
    }

    const totalObtained = subjects.reduce((sum, s) => sum + s.obtained, 0);
    const totalMax = subjects.reduce((sum, s) => sum + s.max, 0);
    const overallPercentage = totalMax > 0 ? Math.round((totalObtained / totalMax) * 10000) / 100 : 0;

    // Attendance across the academic year (roughly June of year1 to May of year2).
    const yearMatch = academicYear.match(/(\d{4})/);
    const startYear = yearMatch ? parseInt(yearMatch[1], 10) : new Date().getFullYear();
    const rangeStart = new Date(startYear, 5, 1); // June 1
    const rangeEnd = new Date(startYear + 1, 4, 31, 23, 59, 59); // May 31 next year

    const attendanceRecords = await prisma.attendance.findMany({
      where: { tenantId, studentId, date: { gte: rangeStart, lte: rangeEnd } },
      select: { status: true },
    });
    const countable = attendanceRecords.filter((a) => a.status !== 'HOLIDAY');
    const presentCount = countable.filter((a) => a.status === 'PRESENT' || a.status === 'LATE').length;
    const attendancePercentage = countable.length > 0
      ? Math.round((presentCount / countable.length) * 10000) / 100
      : null;

    return {
      student: {
        id: student.id,
        admissionNo: student.admissionNo,
        rollNumber: student.rollNumber,
        name: [student.firstName, student.middleName, student.lastName].filter(Boolean).join(' '),
        className: student.class?.name || '',
        sectionName: student.section?.name || '',
      },
      examName: examName.trim(),
      academicYear,
      examExists: !!exam,
      subjects,
      totalObtained,
      totalMax,
      overallPercentage,
      attendance: {
        present: presentCount,
        total: countable.length,
        percentage: attendancePercentage,
      },
    };
  }

  /**
   * ICSE Preliminary Progress — every active student in Class 10 and Class
   * 12 (every section, board-exam years only), pulled straight from
   * Student Management, with their overall percentage for the given
   * Preliminary exam. Students who haven't had any marks entered yet still
   * appear (percentage null) so the list always mirrors the roster, not
   * just whoever already has marks. Pass classId/sectionId to narrow down
   * to one class (and section) instead of both board-exam years combined.
   */
  static async getPreliminaryProgress(params: {
    tenantId: string;
    examName: string;
    academicYear: string;
    classId?: string;
    sectionId?: string;
  }) {
    const { tenantId, examName, academicYear, classId, sectionId } = params;
    if (!examName?.trim()) throw new AppError(400, 'Exam name is required');

    let targetClassIds: string[];
    if (classId) {
      targetClassIds = [classId];
    } else {
      const classes = await prisma.class.findMany({ where: { tenantId } });
      targetClassIds = classes
        .filter((c) => {
          const m = c.name.match(/\d+/);
          if (!m) return false;
          const n = parseInt(m[0], 10);
          return n === 10 || n === 12;
        })
        .map((c) => c.id);
    }

    if (targetClassIds.length === 0) {
      return { examName: examName.trim(), academicYear, rows: [] as any[] };
    }

    const students = await prisma.student.findMany({
      where: {
        tenantId,
        classId: { in: targetClassIds },
        ...(sectionId ? { sectionId } : {}),
        status: 'ACTIVE',
      },
      include: { class: { select: { name: true } }, section: { select: { name: true } } },
      orderBy: [{ classId: 'asc' }, { sectionId: 'asc' }, { rollNumber: 'asc' }],
    });

    if (students.length === 0) {
      return { examName: examName.trim(), academicYear, rows: [] as any[] };
    }

    const exams = await prisma.icseExam.findMany({
      where: {
        tenantId,
        classId: { in: targetClassIds },
        name: { equals: examName.trim(), mode: 'insensitive' },
        academicYear,
      },
    });
    const examIds = exams.map((e) => e.id);

    const marks = examIds.length > 0
      ? await prisma.icseExamMark.findMany({
          where: { tenantId, examId: { in: examIds }, studentId: { in: students.map((s) => s.id) } },
          include: { subject: { select: { theoryMarks: true } } },
        })
      : [];

    const byStudent = new Map<string, { obtained: number; max: number }>();
    for (const m of marks) {
      const obtained = m.totalMarks ? Number(m.totalMarks) : 0;
      const max = m.maxMarks ? Number(m.maxMarks) : (m.subject.theoryMarks ?? 100);
      const cur = byStudent.get(m.studentId) || { obtained: 0, max: 0 };
      cur.obtained += obtained;
      cur.max += max;
      byStudent.set(m.studentId, cur);
    }

    const rows = students.map((s) => {
      const agg = byStudent.get(s.id);
      const hasMarks = !!agg && agg.max > 0;
      const percentage = hasMarks ? Math.round((agg!.obtained / agg!.max) * 10000) / 100 : null;
      return {
        studentId: s.id,
        admissionNo: s.admissionNo,
        rollNumber: s.rollNumber,
        name: [s.firstName, s.middleName, s.lastName].filter(Boolean).join(' '),
        className: s.class.name,
        sectionName: s.section?.name || '',
        obtained: agg?.obtained ?? 0,
        max: agg?.max ?? 0,
        percentage,
      };
    });

    return { examName: examName.trim(), academicYear, rows };
  }

  /**
   * ICSE View Reports dashboard for one student — identity + monthly
   * attendance + height/weight (same source as the regular board's
   * dashboard) plus exam performance across every standard ICSE exam
   * (Unit Test 1/2, Half Yearly, Preliminary 1/2, Annual, Board Exam),
   * computed from the ICSE marks tables instead of the regular ones.
   */
  static async getStudentDashboard(params: {
    tenantId: string;
    studentId: string;
    academicYear: string;
  }) {
    const { tenantId, studentId, academicYear } = params;
    if (!studentId) throw new AppError(400, 'Student is required');

    const student = await prisma.student.findFirst({
      where: { id: studentId, tenantId },
      include: { class: true, section: true },
    });
    if (!student) throw new AppError(404, 'Student not found');

    const year = academicYear || new Date().getFullYear().toString();
    const startYear = parseInt(year.split('-')[0], 10);
    const start = new Date(Date.UTC(startYear, 5, 1)); // June 1
    const end = new Date(Date.UTC(startYear + 1, 4, 31, 23, 59, 59)); // May 31 next year

    const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const attendanceRecords = await prisma.attendance.findMany({
      where: { tenantId, studentId, date: { gte: start, lte: end } },
      select: { date: true, status: true },
    });
    const monthlyAttendance = MONTH_LABELS.map((label, idx) => {
      const calendarMonth = (idx + 5) % 12;
      const recordsInMonth = attendanceRecords.filter((a) => new Date(a.date).getUTCMonth() === calendarMonth);
      const present = recordsInMonth.filter((a) => a.status === 'PRESENT').length;
      return { month: label, present, total: recordsInMonth.length };
    });

    const STANDARD_ICSE_EXAMS = [
      'Unit Test 1', 'Half Yearly Examination', 'Unit Test 2',
      'Preliminary Examination 1', 'Preliminary Examination 2',
      'Final Examination', 'Annual Examination', 'ICSE Board Examination',
    ];

    const exams = await prisma.icseExam.findMany({
      where: {
        tenantId,
        classId: student.classId,
        sectionId: student.sectionId,
        academicYear: year,
        name: { in: STANDARD_ICSE_EXAMS },
      },
      select: { id: true, name: true },
    });

    const examPerformance = await Promise.all(
      STANDARD_ICSE_EXAMS.map(async (examName) => {
        const exam = exams.find((e) => e.name === examName);
        if (!exam) {
          return { examName, totalObtained: 0, totalMax: 0, percentage: 0, entered: false };
        }

        const marks = await prisma.icseExamMark.findMany({
          where: { tenantId, examId: exam.id, studentId },
          include: { subject: { select: { theoryMarks: true } } },
        });

        let obtained = 0;
        let max = 0;
        for (const m of marks) {
          const o = m.totalMarks != null ? Number(m.totalMarks) : 0;
          const mx = m.maxMarks != null ? Number(m.maxMarks) : (m.subject.theoryMarks ?? 100);
          obtained += o;
          max += mx;
        }

        return {
          examName,
          totalObtained: Math.round(obtained * 100) / 100,
          totalMax: Math.round(max * 100) / 100,
          percentage: max > 0 ? Math.round((obtained / max) * 10000) / 100 : 0,
          entered: marks.length > 0,
        };
      })
    );

    return {
      student: {
        id: student.id,
        name: [student.firstName, student.middleName, student.lastName].filter(Boolean).join(' '),
        admissionNo: student.admissionNo,
        grNo: student.grNo,
        rollNumber: student.rollNumber,
        className: student.class?.name,
        sectionName: student.section?.name,
        heightCm: student.heightCm != null ? Number(student.heightCm) : null,
        weightKg: student.weightKg != null ? Number(student.weightKg) : null,
      },
      academicYear: year,
      monthlyAttendance,
      examPerformance,
    };
  }

  /**
   * PASS/FAIL per student for one exam — marks are grouped back from
   * virtual subjects ("Physics — Written Exam" + "Physics — Lab Practical")
   * into their real subject before judging, and a student fails if ANY
   * real subject falls below the CISCE pass threshold for their grade band
   * (33% for ICSE Class 10, 35% for ISC Class 12) — matching the official
   * per-subject pass rule, not just an overall percentage cutoff. Powers
   * ICSE Student Promotion.
   */
  static async getConsolidatedResults(params: {
    tenantId: string;
    classId: string;
    sectionId: string;
    examName: string;
    academicYear: string;
  }) {
    const { tenantId, classId, sectionId, examName, academicYear } = params;
    if (!classId || !sectionId) throw new AppError(400, 'Class and Section are required');
    if (!examName?.trim()) throw new AppError(400, 'Exam name is required');

    const [students, classInfo, sectionInfo, exam] = await Promise.all([
      prisma.student.findMany({
        where: { tenantId, classId, sectionId, status: 'ACTIVE' },
        orderBy: { rollNumber: 'asc' },
        select: { id: true, admissionNo: true, rollNumber: true, firstName: true, middleName: true, lastName: true },
      }),
      prisma.class.findUnique({ where: { id: classId }, select: { name: true } }),
      prisma.section.findUnique({ where: { id: sectionId }, select: { name: true } }),
      prisma.icseExam.findFirst({
        where: { tenantId, classId, sectionId, name: { equals: examName.trim(), mode: 'insensitive' }, academicYear },
      }),
    ]);

    const passThreshold = passThresholdForClass(classInfo?.name || '');

    if (!exam) {
      return {
        class: classInfo?.name || '', section: sectionInfo?.name || '',
        examName: examName.trim(), academicYear, examExists: false,
        results: [] as any[],
        summary: { total: students.length, passed: 0, failed: 0, notEntered: students.length },
        passThreshold,
      };
    }

    const allMarks = await prisma.icseExamMark.findMany({
      where: { tenantId, examId: exam.id, studentId: { in: students.map((s) => s.id) } },
      include: { subject: { select: { name: true, theoryMarks: true } } },
    });

    const marksByStudent = new Map<string, typeof allMarks>();
    for (const m of allMarks) {
      if (!marksByStudent.has(m.studentId)) marksByStudent.set(m.studentId, []);
      marksByStudent.get(m.studentId)!.push(m);
    }

    let passed = 0, failed = 0, notEntered = 0;

    const results = students.map((s) => {
      const marks = marksByStudent.get(s.id) || [];
      if (marks.length === 0) {
        notEntered++;
        return {
          studentId: s.id,
          admissionNo: s.admissionNo,
          rollNumber: s.rollNumber,
          name: [s.firstName, s.middleName, s.lastName].filter(Boolean).join(' '),
          totalObtained: 0,
          totalMax: 0,
          percentage: 0,
          result: 'NOT ENTERED' as const,
        };
      }

      // Group virtual-subject rows ("Physics — Written Exam") back into
      // their real subject before judging pass/fail.
      const bySubject = new Map<string, { obtained: number; max: number }>();
      for (const m of marks) {
        const base = m.subject.name.split(' — ')[0];
        const obtained = m.totalMarks ? Number(m.totalMarks) : 0;
        const max = m.maxMarks ? Number(m.maxMarks) : (m.subject.theoryMarks ?? 100);
        const cur = bySubject.get(base) || { obtained: 0, max: 0 };
        cur.obtained += obtained;
        cur.max += max;
        bySubject.set(base, cur);
      }

      let totalObtained = 0, totalMax = 0, anyFailedSubject = false;
      for (const [, v] of bySubject) {
        totalObtained += v.obtained;
        totalMax += v.max;
        const subjPct = v.max > 0 ? (v.obtained / v.max) * 100 : 0;
        if (subjPct < passThreshold) anyFailedSubject = true;
      }

      const percentage = totalMax > 0 ? Math.round((totalObtained / totalMax) * 10000) / 100 : 0;
      const result = anyFailedSubject ? 'FAIL' : 'PASS';
      if (result === 'PASS') passed++; else failed++;

      return {
        studentId: s.id,
        admissionNo: s.admissionNo,
        rollNumber: s.rollNumber,
        name: [s.firstName, s.middleName, s.lastName].filter(Boolean).join(' '),
        totalObtained,
        totalMax,
        percentage,
        result: result as 'PASS' | 'FAIL',
      };
    });

    return {
      class: classInfo?.name || '',
      section: sectionInfo?.name || '',
      examName: examName.trim(),
      academicYear,
      examExists: true,
      results,
      summary: { total: students.length, passed, failed, notEntered },
      passThreshold,
    };
  }
}