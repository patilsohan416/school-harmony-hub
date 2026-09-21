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

function gradeFor(pct: number): string {
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B+';
  if (pct >= 60) return 'B';
  if (pct >= 50) return 'C';
  if (pct >= 35) return 'D';
  return 'E';
}

function parseGrade(className: string): number | null {
  const norm = className.toLowerCase().replace(/class|grade|std\.?/g, '').trim();
  const m = norm.match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
}

export class CbseMarksService {
  private static async findOrCreateSubject(tenantId: string, name: string, maxMarks?: number) {
    const existing = await prisma.cbseSubject.findFirst({
      where: { tenantId, name: { equals: name, mode: 'insensitive' } },
    });
    if (existing) return existing;

    let code = slugifyCode(name);
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await prisma.cbseSubject.create({
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
    throw new AppError(500, `Could not create CBSE subject: ${name}`);
  }

  private static async findOrCreateExam(params: {
    tenantId: string;
    classId: string;
    sectionId?: string;
    name: string;
    academicYear: string;
  }) {
    const { tenantId, classId, sectionId, name, academicYear } = params;

    const existing = await prisma.cbseExam.findFirst({
      where: { tenantId, classId, sectionId: sectionId || null, name: { equals: name, mode: 'insensitive' }, academicYear },
    });
    if (existing) return existing;

    const today = new Date();
    return prisma.cbseExam.create({
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

    const exam = await prisma.cbseExam.findFirst({
      where: { tenantId, classId, sectionId, name: { equals: examName, mode: 'insensitive' }, academicYear },
    });

    let existingMarks: Record<string, Record<string, number>> = {};
    // The max marks the teacher used for each subject/component in this
    // exam, so the entry grid re-shows what was actually saved rather than
    // silently reverting to the default when re-opening a saved exam.
    const existingMaxMarks: Record<string, number> = {};
    if (exam) {
      const subjectRows = await prisma.cbseSubject.findMany({
        where: { tenantId, name: { in: subjects, mode: 'insensitive' } },
      });
      const subjectIdToName = new Map(subjectRows.map((s) => [s.id, s.name]));

      const marks = await prisma.cbseExamMark.findMany({
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

      await prisma.cbseExamMark.upsert({
        where: { studentId_examId_subjectId: { studentId: r.studentId, examId: exam.id, subjectId: subject.id } },
        update: { totalMarks: r.marks, maxMarks, percentage: percentage ?? undefined, marksEnteredBy: markedBy || null },
        create: {
          tenantId, studentId: r.studentId, examId: exam.id, subjectId: subject.id,
          totalMarks: r.marks, maxMarks, percentage: percentage ?? undefined, marksEnteredBy: markedBy || null,
        },
      });
      saved++;
    }

    logger.info(`CBSE marks saved: exam "${examName}", ${saved} entries, class/section ${classId}/${sectionId}`);
    return { examId: exam.id, saved };
  }

  /**
   * Full CBSE progress report for one student on one exam — marks across
   * every subject (with each subject's own max marks) and overall
   * percentage. Mirrors ICSE Progress Report but reads from the dedicated
   * CBSE tables.
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

    const exam = await prisma.cbseExam.findFirst({
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
      const marks = await prisma.cbseExamMark.findMany({
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
    };
  }

  /**
   * CBSE High School Results — every active Class 9 & 10 student, every
   * section, pulled straight from Student Management. Virtual-subject mark
   * rows ("Physics — Theory" + "Physics — Practical") are grouped back
   * into their real subject before computing each student's percentage
   * and grade, so the breakdown is certificate-ready.
   */
  static async getHighSchoolResults(params: {
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
        .filter((c) => { const g = parseGrade(c.name); return g === 9 || g === 10; })
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

    const exams = await prisma.cbseExam.findMany({
      where: {
        tenantId,
        classId: { in: targetClassIds },
        name: { equals: examName.trim(), mode: 'insensitive' },
        academicYear,
      },
    });
    const examIds = exams.map((e) => e.id);

    const marks = examIds.length > 0
      ? await prisma.cbseExamMark.findMany({
          where: { tenantId, examId: { in: examIds }, studentId: { in: students.map((s) => s.id) } },
          include: { subject: { select: { name: true, theoryMarks: true } } },
        })
      : [];

    const marksByStudent = new Map<string, typeof marks>();
    for (const m of marks) {
      if (!marksByStudent.has(m.studentId)) marksByStudent.set(m.studentId, []);
      marksByStudent.get(m.studentId)!.push(m);
    }

    const rows = students.map((s) => {
      const studentMarks = marksByStudent.get(s.id) || [];

      const bySubject = new Map<string, { obtained: number; max: number }>();
      for (const m of studentMarks) {
        const base = m.subject.name.split(' — ')[0];
        const obtained = m.totalMarks ? Number(m.totalMarks) : 0;
        const max = m.maxMarks ? Number(m.maxMarks) : (m.subject.theoryMarks ?? 100);
        const cur = bySubject.get(base) || { obtained: 0, max: 0 };
        cur.obtained += obtained;
        cur.max += max;
        bySubject.set(base, cur);
      }

      const subjects = Array.from(bySubject.entries()).map(([name, v]) => ({
        name, obtained: v.obtained, max: v.max,
      }));
      const totalObtained = subjects.reduce((sum, sub) => sum + sub.obtained, 0);
      const totalMax = subjects.reduce((sum, sub) => sum + sub.max, 0);
      const hasMarks = totalMax > 0;
      const percentage = hasMarks ? Math.round((totalObtained / totalMax) * 10000) / 100 : null;

      return {
        studentId: s.id,
        admissionNo: s.admissionNo,
        rollNumber: s.rollNumber,
        name: [s.firstName, s.middleName, s.lastName].filter(Boolean).join(' '),
        className: s.class.name,
        sectionName: s.section?.name || '',
        subjects,
        totalObtained,
        totalMax,
        percentage,
        grade: percentage !== null ? gradeFor(percentage) : null,
      };
    });

    return { examName: examName.trim(), academicYear, rows };
  }

  /**
   * CBSE Primary Results — every active Class 1-5 student, every section,
   * pulled straight from Student Management. Same grouping/percentage
   * logic as getHighSchoolResults, scoped to the primary band instead of
   * 9-10. classId/sectionId optionally narrow down from "all classes 1-5"
   * to one specific class (and section).
   */
  static async getPrimaryResults(params: {
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
        .filter((c) => { const g = parseGrade(c.name); return g !== null && g >= 1 && g <= 5; })
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

    const exams = await prisma.cbseExam.findMany({
      where: {
        tenantId,
        classId: { in: targetClassIds },
        name: { equals: examName.trim(), mode: 'insensitive' },
        academicYear,
      },
    });
    const examIds = exams.map((e) => e.id);

    const marks = examIds.length > 0
      ? await prisma.cbseExamMark.findMany({
          where: { tenantId, examId: { in: examIds }, studentId: { in: students.map((s) => s.id) } },
          include: { subject: { select: { name: true, theoryMarks: true } } },
        })
      : [];

    const marksByStudent = new Map<string, typeof marks>();
    for (const m of marks) {
      if (!marksByStudent.has(m.studentId)) marksByStudent.set(m.studentId, []);
      marksByStudent.get(m.studentId)!.push(m);
    }

    const rows = students.map((s) => {
      const studentMarks = marksByStudent.get(s.id) || [];

      const bySubject = new Map<string, { obtained: number; max: number }>();
      for (const m of studentMarks) {
        const base = m.subject.name.split(' — ')[0];
        const obtained = m.totalMarks ? Number(m.totalMarks) : 0;
        const max = m.maxMarks ? Number(m.maxMarks) : (m.subject.theoryMarks ?? 100);
        const cur = bySubject.get(base) || { obtained: 0, max: 0 };
        cur.obtained += obtained;
        cur.max += max;
        bySubject.set(base, cur);
      }

      const subjects = Array.from(bySubject.entries()).map(([name, v]) => ({
        name, obtained: v.obtained, max: v.max,
      }));
      const totalObtained = subjects.reduce((sum, sub) => sum + sub.obtained, 0);
      const totalMax = subjects.reduce((sum, sub) => sum + sub.max, 0);
      const hasMarks = totalMax > 0;
      const percentage = hasMarks ? Math.round((totalObtained / totalMax) * 10000) / 100 : null;

      return {
        studentId: s.id,
        admissionNo: s.admissionNo,
        rollNumber: s.rollNumber,
        name: [s.firstName, s.middleName, s.lastName].filter(Boolean).join(' '),
        className: s.class.name,
        sectionName: s.section?.name || '',
        subjects,
        totalObtained,
        totalMax,
        percentage,
        grade: percentage !== null ? gradeFor(percentage) : null,
      };
    });

    return { examName: examName.trim(), academicYear, rows };
  }

  /**
   * Average/highest/lowest marks per (virtual) subject and class, across
   * every CBSE class that has this exam — mirrors ICSE Subject-wise
   * Results. Grouped by the raw subject name saved (e.g. "Physics —
   * Theory"), same granularity as ICSE, not collapsed back to base
   * subject.
   */
  static async getSubjectWiseResults(params: {
    tenantId: string;
    examName: string;
    academicYear: string;
  }) {
    const { tenantId, examName, academicYear } = params;
    if (!examName?.trim()) throw new AppError(400, 'Exam name is required');

    const exams = await prisma.cbseExam.findMany({
      where: { tenantId, name: { equals: examName.trim(), mode: 'insensitive' }, academicYear },
      include: { class: { select: { name: true } } },
    });

    if (exams.length === 0) {
      return { examName: examName.trim(), academicYear, examExists: false, rows: [] as any[] };
    }

    const examIdToClassName = new Map(exams.map((e) => [e.id, e.class?.name || '']));

    const marks = await prisma.cbseExamMark.findMany({
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
}