import prisma from '../../lib/prisma';
import { AppError } from '../../utils/AppError';
import logger from '../../lib/logger';

function slugifyCode(name: string): string {
  const base = name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (base.length <= 40) return base || 'SUBJECT';

  // Marks Entry saves each grading component as its own "virtual subject"
  // named "<Subject> — <Component>" (e.g. "Social Sciences (History,
  // Democratic Politics, Geography, Economics) — Theory" and the same
  // subject's "... — Internal / Project" sibling). Once the shared subject
  // name alone runs past 40 characters, a blind truncation collapses both
  // components to the exact same code — which then fails the (tenantId,
  // code) unique constraint as a 409, no matter how it's retried, since
  // it's the same collision every time. Keep a readable truncated prefix,
  // but append a short deterministic hash of the FULL name so two
  // genuinely different names can never collide here.
  const hash = Math.abs(
    Array.from(name).reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) | 0, 0)
  ).toString(36).toUpperCase().padStart(6, '0').slice(0, 6);
  return `${base.slice(0, 32)}_${hash}`;
}

// Same thresholds used on the frontend (Progress Report / Consolidated
// Results), kept in sync so Grade-wise Results tallies the same letters.
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

export class MarksService {
  /**
   * Finds a Subject by (tenantId, name) case-insensitively, or creates one.
   * Subjects aren't pre-configured anywhere in this app yet, so entries get
   * provisioned automatically the first time a mark is saved against them.
   */
  private static async findOrCreateSubject(tenantId: string, name: string, maxMarks?: number) {
    const existing = await prisma.subject.findFirst({
      where: { tenantId, name: { equals: name, mode: 'insensitive' } },
    });
    if (existing) return existing;

    let code = slugifyCode(name);
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await prisma.subject.create({
          data: {
            tenantId,
            name,
            code: attempt === 0 ? code : `${code}_${attempt}`,
            theoryMarks: maxMarks ?? 100,
          },
        });
      } catch (err: any) {
        if (err?.code === 'P2002' && attempt < 2) continue; // code collision, retry with suffix
        throw err;
      }
    }
    throw new AppError(500, `Could not create subject: ${name}`);
  }

  /**
   * Finds an Exam by (tenantId, classId, sectionId, name, academicYear), or
   * creates one with sensible defaults. Like Subject, exams aren't set up
   * in a separate screen — they're created the first time marks are saved.
   */
  private static async findOrCreateExam(params: {
    tenantId: string;
    classId: string;
    sectionId?: string;
    name: string;
    academicYear: string;
  }) {
    const { tenantId, classId, sectionId, name, academicYear } = params;

    const existing = await prisma.exam.findFirst({
      where: {
        tenantId,
        classId,
        sectionId: sectionId || null,
        name: { equals: name, mode: 'insensitive' },
        academicYear,
      },
    });
    if (existing) return existing;

    const today = new Date();
    return prisma.exam.create({
      data: {
        tenantId,
        classId,
        sectionId: sectionId || null,
        name,
        academicYear,
        type: 'UNIT_TEST',
        startDate: today,
        endDate: today,
      },
    });
  }

  /**
   * Pulls the class/section roster (same active-student source as
   * Attendance) plus whatever marks already exist for this exam+subjects
   * combination, so re-opening the grid shows previously entered marks.
   */
  static async getRoster(params: {
    tenantId: string;
    classId: string;
    sectionId: string;
    examName: string;
    academicYear: string;
    subjects: string[];
  }) {
    const { tenantId, classId, sectionId, examName, academicYear, subjects } = params;

    if (!classId || !sectionId) {
      throw new AppError(400, 'Class and Section are required');
    }

    const students = await prisma.student.findMany({
      where: { tenantId, classId, sectionId, status: 'ACTIVE' },
      orderBy: { rollNumber: 'asc' },
      select: { id: true, admissionNo: true, rollNumber: true, firstName: true, middleName: true, lastName: true },
    });

    const exam = await prisma.exam.findFirst({
      where: {
        tenantId, classId, sectionId,
        name: { equals: examName, mode: 'insensitive' },
        academicYear,
      },
    });

    // Max marks per subject — looked up regardless of whether the exam has
    // been created yet, so callers (e.g. the component-based Marks Entry
    // grid) can pre-fill each column with whatever was saved before. Only
    // subjects that have actually been saved before are included here —
    // an entry is NOT synthesized for brand-new subjects, so the frontend
    // falls through to its own curriculum-defined default (e.g. Theory 80,
    // Internal Assessment 20) instead of every column defaulting to 100.
    const knownSubjects = await prisma.subject.findMany({
      where: { tenantId, name: { in: subjects, mode: 'insensitive' } },
    });
    const maxMarksByName: Record<string, number> = {};
    for (const s of subjects) {
      const match = knownSubjects.find((k) => k.name.toLowerCase() === s.toLowerCase());
      if (match) maxMarksByName[s] = match.theoryMarks ?? 100;
    }

    let existingMarks: Record<string, Record<string, number>> = {};
    if (exam) {
      const subjectIdToName = new Map(knownSubjects.map((s) => [s.id, s.name]));

      const marks = await prisma.examMark.findMany({
        where: { tenantId, examId: exam.id, studentId: { in: students.map((s) => s.id) } },
      });

      existingMarks = {};
      for (const m of marks) {
        const subjName = subjectIdToName.get(m.subjectId);
        if (!subjName) continue;
        if (!existingMarks[m.studentId]) existingMarks[m.studentId] = {};
        existingMarks[m.studentId][subjName] = m.totalMarks ? Number(m.totalMarks) : 0;
      }
    }

    const roster = students.map((s) => ({
      studentId: s.id,
      admissionNo: s.admissionNo,
      rollNumber: s.rollNumber,
      name: [s.firstName, s.middleName, s.lastName].filter(Boolean).join(' '),
      marks: existingMarks[s.id] || {},
    }));

    return { roster, examExists: !!exam, maxMarks: maxMarksByName };
  }

  /**
   * Saves marks for a whole class/section/exam in one shot — one row per
   * student per subject, upserted so re-saving corrects rather than
   * duplicates.
   */
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

      const maxMarks = maxMarksByName.get(r.subjectName.toLowerCase()) || 100;
      const percentage = maxMarks > 0 ? Math.round((r.marks / maxMarks) * 10000) / 100 : null;

      await prisma.examMark.upsert({
        where: {
          studentId_examId_subjectId: {
            studentId: r.studentId,
            examId: exam.id,
            subjectId: subject.id,
          },
        },
        update: {
          totalMarks: r.marks,
          percentage: percentage ?? undefined,
          marksEnteredBy: markedBy || null,
        },
        create: {
          tenantId,
          studentId: r.studentId,
          examId: exam.id,
          subjectId: subject.id,
          totalMarks: r.marks,
          percentage: percentage ?? undefined,
          marksEnteredBy: markedBy || null,
        },
      });
      saved++;
    }

    logger.info(`Marks saved: exam "${examName}", ${saved} entries, class/section ${classId}/${sectionId}`);

    return { examId: exam.id, saved };
  }

  /**
   * Full progress report for one student on one exam — marks across every
   * subject (with each subject's own max marks), the overall percentage,
   * and attendance percentage across the academic year. Everything a
   * printable report card needs, pulled from data that already exists.
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

    const exam = await prisma.exam.findFirst({
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
      const marks = await prisma.examMark.findMany({
        where: { tenantId, studentId, examId: exam.id },
        include: { subject: { select: { name: true, theoryMarks: true } } },
      });

      // Marks Entry saves each grading component (Theory, Internal
      // Assessment, Unit Test, Internal Marks, Practical, ...) as its own
      // "virtual subject" row, named "<Subject> — <Component>". Group
      // those back into one row per real subject here, summing obtained
      // and max, so the report shows e.g. "English: 35/40" instead of
      // "English — Unit Test" and "English — Internal Marks" as two rows.
      const grouped = new Map<string, { obtained: number; max: number }>();
      for (const m of marks) {
        const fullName = m.subject.name;
        const baseName = fullName.includes(' — ') ? fullName.split(' — ')[0] : fullName;
        const obtained = m.totalMarks ? Number(m.totalMarks) : 0;
        const max = m.subject.theoryMarks ?? 100;
        const existing = grouped.get(baseName) || { obtained: 0, max: 0 };
        grouped.set(baseName, { obtained: existing.obtained + obtained, max: existing.max + max });
      }
      subjects = Array.from(grouped.entries())
        .map(([name, v]) => ({ name, obtained: v.obtained, max: v.max }))
        .sort((a, b) => a.name.localeCompare(b.name));
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
   * Whole-class result sheet for one exam — every active student, their
   * marks across every subject that actually has marks recorded for this
   * exam, total/percentage, and Pass/Fail (a subject fails a student if
   * they scored below that subject's pass mark).
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
      prisma.exam.findFirst({
        where: {
          tenantId, classId, sectionId,
          name: { equals: examName.trim(), mode: 'insensitive' },
          academicYear,
        },
      }),
    ]);

    if (!exam) {
      return {
        class: classInfo?.name || '', section: sectionInfo?.name || '',
        examName: examName.trim(), academicYear, examExists: false,
        subjectNames: [] as string[], results: [] as any[],
        summary: { total: students.length, passed: 0, failed: 0, notEntered: students.length },
      };
    }

    const allMarks = await prisma.examMark.findMany({
      where: { tenantId, examId: exam.id, studentId: { in: students.map((s) => s.id) } },
      include: { subject: { select: { name: true, passMarks: true, theoryMarks: true } } },
    });

    // Marks Entry saves each grading component (Theory, Internal
    // Assessment, Unit Test, Internal Marks, Practical, ...) as its own
    // "virtual subject" row, named "<Subject> — <Component>". Group those
    // back into one entry per real subject here, summing obtained and max,
    // so Consolidated/HSC/SSC results show one row per actual subject
    // instead of a split row per component. This also fixes pass/fail:
    // comparing a component's raw marks (e.g. Internal Assessment, max 20)
    // against the flat default passMarks of 35 made it impossible to ever
    // pass that component — now pass/fail is judged on the grouped
    // subject's percentage against PASS_PERCENTAGE below.
    const PASS_PERCENTAGE = 33;

    function baseSubjectName(fullName: string): string {
      return fullName.includes(' — ') ? fullName.split(' — ')[0] : fullName;
    }

    const subjectNames = Array.from(new Set(allMarks.map((m) => baseSubjectName(m.subject.name)))).sort();

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
          marksBySubject: {} as Record<string, number>,
          totalObtained: 0,
          totalMax: 0,
          percentage: 0,
          result: 'NOT ENTERED' as const,
        };
      }

      // Group this student's rows by real subject, summing obtained/max
      // across every component of that subject.
      const bySubject = new Map<string, { obtained: number; max: number }>();
      for (const m of marks) {
        const name = baseSubjectName(m.subject.name);
        const obtained = m.totalMarks ? Number(m.totalMarks) : 0;
        const max = m.subject.theoryMarks ?? 100;
        const existing = bySubject.get(name) || { obtained: 0, max: 0 };
        bySubject.set(name, { obtained: existing.obtained + obtained, max: existing.max + max });
      }

      const marksBySubject: Record<string, number> = {};
      let totalObtained = 0, totalMax = 0, anyFailedSubject = false;

      for (const [name, v] of bySubject.entries()) {
        marksBySubject[name] = v.obtained;
        totalObtained += v.obtained;
        totalMax += v.max;
        const subjectPct = v.max > 0 ? (v.obtained / v.max) * 100 : 0;
        if (subjectPct < PASS_PERCENTAGE) anyFailedSubject = true;
      }

      const percentage = totalMax > 0 ? Math.round((totalObtained / totalMax) * 10000) / 100 : 0;
      const result = anyFailedSubject ? 'FAIL' : 'PASS';
      if (result === 'PASS') passed++; else failed++;

      return {
        studentId: s.id,
        admissionNo: s.admissionNo,
        rollNumber: s.rollNumber,
        name: [s.firstName, s.middleName, s.lastName].filter(Boolean).join(' '),
        marksBySubject,
        totalObtained,
        totalMax,
        percentage,
        result,
      };
    });

    return {
      class: classInfo?.name || '',
      section: sectionInfo?.name || '',
      examName: examName.trim(),
      academicYear,
      examExists: true,
      subjectNames,
      results,
      summary: { total: students.length, passed, failed, notEntered },
    };
  }

  /**
   * Subject-wise average/highest/lowest across every class and section for
   * a given exam — one row per (subject, class) combination, computed
   * straight from whatever's already in Marks Entry.
   */
  static async getSubjectWiseResults(params: {
    tenantId: string;
    examName: string;
    academicYear: string;
  }) {
    const { tenantId, examName, academicYear } = params;
    if (!examName?.trim()) throw new AppError(400, 'Exam name is required');

    const exams = await prisma.exam.findMany({
      where: { tenantId, name: { equals: examName.trim(), mode: 'insensitive' }, academicYear },
      include: { class: { select: { name: true } } },
    });

    if (exams.length === 0) {
      return { examName: examName.trim(), academicYear, examExists: false, rows: [] as any[] };
    }

    const examIdToClassName = new Map(exams.map((e) => [e.id, e.class?.name || '']));

    const marks = await prisma.examMark.findMany({
      where: { tenantId, examId: { in: exams.map((e) => e.id) } },
      include: { subject: { select: { name: true } } },
    });

    // Marks Entry saves each grading component as its own "virtual
    // subject" row, named "<Subject> — <Component>". Sum each student's
    // components back into one real-subject total per (student, exam)
    // first, so average/highest/lowest are computed on whole-subject
    // totals — not on a single component in isolation.
    function baseSubjectName(fullName: string): string {
      return fullName.includes(' — ') ? fullName.split(' — ')[0] : fullName;
    }

    const perStudentSubjectTotal = new Map<string, number>(); // key: studentId__examId__subject
    for (const m of marks) {
      const subject = baseSubjectName(m.subject.name);
      const key = `${m.studentId}__${m.examId}__${subject}`;
      const obtained = m.totalMarks ? Number(m.totalMarks) : 0;
      perStudentSubjectTotal.set(key, (perStudentSubjectTotal.get(key) || 0) + obtained);
    }

    const groups = new Map<string, { subject: string; className: string; values: number[] }>();
    for (const [key, total] of perStudentSubjectTotal.entries()) {
      const [, examId, subject] = key.split('__');
      const className = examIdToClassName.get(examId) || '';
      const groupKey = `${subject}__${className}`;
      if (!groups.has(groupKey)) groups.set(groupKey, { subject, className, values: [] });
      groups.get(groupKey)!.values.push(total);
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
   * Buckets every student's overall percentage for an exam into a letter
   * grade (same thresholds as Progress Report) and counts how many land
   * in each — reuses getConsolidatedResults so the numbers always agree
   * with what Consolidated Results shows.
   */
  static async getGradeWiseResults(params: {
    tenantId: string;
    classId: string;
    sectionId: string;
    examName: string;
    academicYear: string;
  }) {
    const consolidated = await this.getConsolidatedResults(params);

    if (!consolidated.examExists) {
      return {
        class: consolidated.class, section: consolidated.section,
        examName: consolidated.examName, academicYear: consolidated.academicYear,
        examExists: false, rows: [] as any[], totalGraded: 0,
      };
    }

    const graded = consolidated.results.filter((r) => r.result !== 'NOT ENTERED');
    const counts = new Map<string, number>();
    for (const r of graded) {
      const g = gradeFor(r.percentage);
      counts.set(g, (counts.get(g) || 0) + 1);
    }

    const rows = GRADE_ORDER
      .filter((g) => counts.has(g))
      .map((g) => ({
        grade: g,
        count: counts.get(g)!,
        percentage: graded.length > 0 ? Math.round((counts.get(g)! / graded.length) * 10000) / 100 : 0,
      }));

    return {
      class: consolidated.class,
      section: consolidated.section,
      examName: consolidated.examName,
      academicYear: consolidated.academicYear,
      examExists: true,
      rows,
      totalGraded: graded.length,
    };
  }

  /**
   * Combines every section of Grade 5, 8, 9, and 10 into one Pass/Fail
   * report — the milestone grades a school typically tracks together.
   * Reuses getConsolidatedResults per class/section so the numbers always
   * agree with what that page shows individually.
   */
  static async getGrade5And8Results(params: {
    tenantId: string;
    examName: string;
    academicYear: string;
  }) {
    const { tenantId, examName, academicYear } = params;
    if (!examName?.trim()) throw new AppError(400, 'Exam name is required');

    const classes = await prisma.class.findMany({
      where: { tenantId },
      include: { sections: true },
    });

    const parseGrade = (className: string): number | null => {
      const norm = className.toLowerCase().replace(/class|grade|std\.?/g, '').trim();
      const m = norm.match(/\d+/);
      return m ? parseInt(m[0], 10) : null;
    };

    const targetClasses = classes.filter((c) => {
      const g = parseGrade(c.name);
      return g === 5 || g === 8 || g === 9 || g === 10;
    });

    const results: any[] = [];
    const classesChecked: { class: string; section: string; studentsInSection: number; examFound: boolean }[] = [];
    let examFoundAny = false;

    for (const cls of targetClasses) {
      if (cls.sections.length === 0) {
        classesChecked.push({ class: cls.name, section: '(no sections)', studentsInSection: 0, examFound: false });
        continue;
      }
      for (const sec of cls.sections) {
        const consolidated = await this.getConsolidatedResults({
          tenantId, classId: cls.id, sectionId: sec.id, examName, academicYear,
        });
        if (consolidated.examExists) examFoundAny = true;

        classesChecked.push({
          class: cls.name,
          section: sec.name,
          studentsInSection: consolidated.results.length,
          examFound: consolidated.examExists,
        });

        for (const r of consolidated.results) {
          if (r.result === 'NOT ENTERED') continue;
          results.push({
            studentId: r.studentId,
            name: r.name,
            admissionNo: r.admissionNo,
            rollNumber: r.rollNumber,
            class: `${cls.name} - ${sec.name}`,
            percentage: r.percentage,
            result: r.result,
          });
        }
      }
    }

    results.sort((a, b) => a.class.localeCompare(b.class) || (a.rollNumber ?? 0) - (b.rollNumber ?? 0));

    return {
      examName: examName.trim(),
      academicYear,
      examExists: examFoundAny,
      results,
      classesChecked,
      allClassNames: classes.map((c) => c.name),
      summary: {
        total: results.length,
        passed: results.filter((r) => r.result === 'PASS').length,
        failed: results.filter((r) => r.result === 'FAIL').length,
      },
    };
  }
}