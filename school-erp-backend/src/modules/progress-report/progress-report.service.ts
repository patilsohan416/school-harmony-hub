import prisma from '../../lib/prisma';
import { AppError } from '../../utils/AppError';

const STANDARD_EXAMS = [
  'Unit Test 1',
  'Half Yearly Examination',
  'Unit Test 2',
  'Final Examination',
  'Annual Examination',
  'Board Examination',
  'SSC State Board Examination',
  'HSC State Board Examination',
];

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function academicYearRange(academicYear: string): { start: Date; end: Date } {
  // "2026-27" -> June 1 2026 through May 31 2027.
  const startYear = parseInt(academicYear.split('-')[0], 10);
  const start = new Date(Date.UTC(startYear, 5, 1)); // June (0-indexed month 5)
  const end = new Date(Date.UTC(startYear + 1, 4, 31, 23, 59, 59)); // May 31 next year
  return { start, end };
}

export class ProgressReportService {
  static async getForStudent(tenantId: string, studentId: string, academicYear: string) {
    const student = await prisma.student.findFirst({
      where: { id: studentId, tenantId },
      include: { class: true, section: true },
    });

    if (!student) {
      throw new AppError(404, 'Student not found');
    }

    const year = academicYear || new Date().getFullYear().toString();
    const { start, end } = academicYearRange(year.includes('-') ? year : `${year}-${String((parseInt(year, 10) + 1) % 100).padStart(2, '0')}`);

    // ── Monthly attendance ────────────────────────────────────────
    const attendanceRecords = await prisma.attendance.findMany({
      where: { tenantId, studentId, date: { gte: start, lte: end } },
      select: { date: true, status: true },
    });

    const monthlyAttendance = MONTH_LABELS.map((label, idx) => {
      // Academic year months run June(5)..Dec(11), Jan(0)..May(4) next year.
      const calendarMonth = (idx + 5) % 12;
      const recordsInMonth = attendanceRecords.filter((a: any) => new Date(a.date).getUTCMonth() === calendarMonth);
      const present = recordsInMonth.filter((a: any) => a.status === 'PRESENT').length;
      return { month: label, present, total: recordsInMonth.length };
    });

    // ── Exam performance across the 4 standard exams ────────────────
    const exams = await prisma.exam.findMany({
      where: {
        tenantId,
        classId: student.classId,
        sectionId: student.sectionId,
        academicYear: year,
        name: { in: STANDARD_EXAMS, mode: 'insensitive' },
      },
      select: { id: true, name: true },
    });

    const examPerformance = await Promise.all(
      STANDARD_EXAMS.map(async (examName) => {
        const exam = exams.find((e: any) => e.name.toLowerCase() === examName.toLowerCase());
        if (!exam) {
          return { examName, totalObtained: 0, totalMax: 0, percentage: 0, entered: false };
        }

        const marks = await prisma.examMark.findMany({
          where: { examId: exam.id, studentId },
        });

        let obtained = 0;
        let max = 0;
        for (const m of marks as any[]) {
          const o = m.totalMarks != null ? Number(m.totalMarks) : 0;
          const pct = m.percentage != null ? Number(m.percentage) : null;
          obtained += o;
          max += pct && pct > 0 ? (o / pct) * 100 : 0;
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
}