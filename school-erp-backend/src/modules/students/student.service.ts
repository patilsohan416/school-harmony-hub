import prisma from '../../lib/prisma';
import { AppError } from '../../utils/AppError';
import logger from '../../lib/logger';
import bcrypt from 'bcryptjs';

/** Default login password for every new student: a fixed value ('123456')
 *  so they can log in immediately with the email entered on the admission
 *  form — same pattern used for Staff. They should change it after first
 *  login. */
const DEFAULT_STUDENT_PASSWORD = '123456';

export class StudentService {
  /**
   * Auto-generates a unique admission number, e.g. ADM-2026-0001.
   * Retries on the (very unlikely) chance of a race with another concurrent
   * admission, since the number is derived from a live count.
   */
  static async generateAdmissionNo(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `ADM-${year}-`;

    for (let attempt = 0; attempt < 5; attempt++) {
      const countThisYear = await prisma.student.count({
        where: { tenantId, admissionNo: { startsWith: prefix } },
      });

      const candidate = `${prefix}${String(countThisYear + 1 + attempt).padStart(4, '0')}`;

      const exists = await prisma.student.findUnique({
        where: { admissionNo: candidate },
      });

      if (!exists) return candidate;
    }

    // Extremely unlikely fallback to guarantee uniqueness.
    return `${prefix}${Date.now()}`;
  }

  /**
   * Get the next available roll number for a class and section
   */
  static async getNextRollNumber(
    tenantId: string,
    classId: string,
    sectionId: string
  ): Promise<number> {
    try {
      // Find the highest roll number for this class and section
      const result = await prisma.student.aggregate({
        where: {
          tenantId,
          classId,
          sectionId,
          status: 'ACTIVE',
        },
        _max: {
          rollNumber: true,
        },
      });

      const maxRollNumber = result._max.rollNumber || 0;
      return maxRollNumber + 1;
    } catch (error) {
      logger.error('Error fetching next roll number:', error);
      throw new AppError(500, 'Failed to fetch next roll number');
    }
  }

  static async getStudents(params: {
    tenantId: string;
    page: number;
    limit: number;
    search?: string;
    classId?: string;
    sectionId?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const {
      tenantId,
      page,
      limit,
      search,
      classId,
      sectionId,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params;

    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { admissionNo: { contains: search, mode: 'insensitive' } },
        { grNo: { contains: search, mode: 'insensitive' } },
        { mobile: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
        { aadhaar: { contains: search } },
      ];
    }

    if (classId) where.classId = classId;
    if (sectionId) where.sectionId = sectionId;
    if (status) where.status = status;

    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        include: {
          class: true,
          section: true,
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy,
      }),
      prisma.student.count({ where }),
    ]);

    return {
      data: students,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Exact-match lookup by admission number, used to auto-fill forms (e.g.
   * the Leaving Certificate) once the admin types/confirms an admission
   * number, instead of them re-typing a student's details by hand.
   */
  static async getStudentByAdmissionNo(tenantId: string, admissionNo: string) {
    const student = await prisma.student.findFirst({
      where: { tenantId, admissionNo },
      include: { class: true, section: true },
    });

    if (!student) {
      throw new AppError(404, `No student found with admission number ${admissionNo}`);
    }

    return student;
  }

  /**
   * Roll numbers are only unique within a section, so lookup requires both
   * — used by result-entry pages (SSC/HSC etc.) where you know a student's
   * roll number but want their name/admission-no filled in automatically.
   */
  static async getStudentByRollNumber(tenantId: string, sectionId: string, rollNumber: number) {
    const student = await prisma.student.findFirst({
      where: { tenantId, sectionId, rollNumber },
      include: { class: true, section: true },
    });

    if (!student) {
      throw new AppError(404, `No student found with roll number ${rollNumber} in that section`);
    }

    return student;
  }

  static async getStudent(id: string) {
    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        class: true,
        section: true,
        user: true,
        feePayments: {
          include: {
            fee: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        attendances: {
          orderBy: { date: 'desc' },
          take: 10,
        },
        examMarks: {
          include: {
            exam: true,
            subject: true,
          },
          take: 10,
        },
      },
    });

    if (!student) {
      throw new AppError(404, 'Student not found');
    }

    return student;
  }

  static async createStudent(data: any) {
    console.log("========================================");
    console.log("STUDENT SERVICE - CREATE STUDENT");
    console.log("========================================");
    console.log("Incoming student data:");
    console.log(JSON.stringify(data, null, 2));

    console.log("tenantId:", data.tenantId);
    console.log("classId:", data.classId);
    console.log("sectionId:", data.sectionId);

    // Validate tenant
    const tenant = await prisma.tenant.findUnique({
      where: { id: data.tenantId },
    });

    console.log("Tenant found:", tenant);

    if (!tenant) {
      throw new AppError(404, "Tenant not found");
    }

    // Admission number is always auto-generated by the server.
    data.admissionNo = await this.generateAdmissionNo(data.tenantId);
    if (!data.grNo) {
      data.grNo = data.admissionNo;
    }

    // Check if GR number already exists
    if (data.grNo) {
      const existingGrNo = await prisma.student.findFirst({
        where: { grNo: data.grNo, tenantId: data.tenantId },
      });

      if (existingGrNo) {
        throw new AppError(400, "GR number already exists");
      }
    }

    // Validate required IDs
    if (!data.classId) {
      throw new AppError(400, "Class is required");
    }

    if (!data.sectionId) {
      throw new AppError(400, "Section is required");
    }

    console.log("================================");
    console.log("Received classId:", data.classId);
    console.log("Received tenantId:", data.tenantId);
    console.log("Searching for class...");
    console.log("classId:", JSON.stringify(data.classId));
    console.log("tenantId:", JSON.stringify(data.tenantId));

    const allClasses = await prisma.class.findMany({
      where: {
        tenantId: data.tenantId,
      },
    });

    console.log("Available Classes:");
    console.table(allClasses);

    const classExists = await prisma.class.findFirst({
      where: {
        id: data.classId,
        tenantId: data.tenantId,
      },
    });

    console.log("Matched Class:");
    console.log(classExists);

    if (!classExists) {
      throw new AppError(404, "Class not found");
    }

    console.log("Class found:");
    console.log(classExists);
    console.log("================================");

    // ===================== SECTION VALIDATION =====================

    console.log("========== SECTION DEBUG ==========");
    console.log("Received classId:", data.classId);
    console.log("Received sectionId:", data.sectionId);

    // Show all sections for this class
    const sectionData = await prisma.section.findMany({
      where: {
        classId: data.classId,
      },
    });

    console.table(sectionData);

    // Check whether the section UUID exists for this class
    const sectionExists = await prisma.section.findFirst({
      where: {
        id: data.sectionId,
        classId: data.classId,
      },
    });

    console.log("Matched Section:");
    console.log(sectionExists);

   if (!sectionExists) {
  const availableSections = await prisma.section.findMany({
    where: { classId: data.classId },
    select: { id: true, name: true },
  });

  throw new AppError(
    404,
    `Section not found for this class. Available sections: ${availableSections
      .map((s: { id: string; name: string }) => `${s.name} (${s.id})`)
      .join(", ")}`
  );
}

    // Count active students in this section
    const currentStrength = await prisma.student.count({
      where: {
        sectionId: sectionExists.id,
        status: "ACTIVE",
      },
    });

    // Check section capacity
    if (
      sectionExists.capacity &&
      currentStrength >= sectionExists.capacity
    ) {
      throw new AppError(400, "Section is full");
    }

    // Ensure we use the validated section UUID
    data.sectionId = sectionExists.id;

    if (data.aadhaar) {
      const existingAadhaar = await prisma.student.findFirst({
        where: {
          aadhaar: data.aadhaar,
          tenantId: data.tenantId,
        },
      });

      if (existingAadhaar) {
        throw new AppError(400, "Aadhaar number already exists");
      }
    }

    if (data.passportNumber) {
      const existingPassport = await prisma.student.findFirst({
        where: { passportNumber: data.passportNumber },
      });

      if (existingPassport) {
        throw new AppError(400, "Passport number already exists");
      }
    }

    // Check for duplicate Email (as student, and as an existing login
    // account — Student.email doubles as the portal login email).
    if (data.email) {
      const existingEmail = await prisma.student.findFirst({
        where: { email: data.email },
      });

      if (existingEmail) {
        throw new AppError(400, "Email already exists");
      }

      const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser) {
        throw new AppError(400, "A login account with this email already exists");
      }
    }

    // Roll number must be unique within the section
    if (data.rollNumber !== undefined && data.rollNumber !== null) {
      const existingRollNumber = await prisma.student.findFirst({
        where: {
          sectionId: data.sectionId,
          rollNumber: data.rollNumber
        },
      });

      if (existingRollNumber) {
        throw new AppError(
          400,
          `Roll number ${data.rollNumber} is already assigned in this section`
        );
      }
    }

    // Enforce the same minimum length the frontend field's helper text
    // promises, instead of silently hashing and accepting anything.
    if (data.password && data.password.length < 6) {
      throw new AppError(400, "Password must be at least 6 characters");
    }

    const {
      createdBy,
      password,
      ...studentData
    } = data;

    // ✅ Give the student an actual login account so they can sign in with
    // the email entered here, on the "Sign in as Student" screen — same
    // pattern already used for Staff/Teacher logins.
    const plainPassword = password || DEFAULT_STUDENT_PASSWORD;
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const student = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: studentData.email,
          password: hashedPassword,
          firstName: studentData.firstName,
          lastName: studentData.lastName,
          phone: studentData.mobile || studentData.guardianMobile || null,
          role: 'STUDENT',
          tenantId: studentData.tenantId,
          isActive: true,
          createdBy,
        },
      });

      const created = await tx.student.create({
        data: {
          ...studentData,
          documents: studentData.documents || [],
          medicalInfo: studentData.medicalInfo || {},
          transportDetails: studentData.transportDetails || {},
          hostelDetails: studentData.hostelDetails || {},
          rollNumber: studentData.rollNumber || currentStrength + 1,
          userId: user.id,
        },
        include: {
          class: true,
          section: true,
        },
      });

      return created;
    });

    await prisma.section.update({
      where: {
        id: data.sectionId,
      },
      data: {
        currentStrength: {
          increment: 1,
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: data.tenantId,
        userId: data.createdBy,
        action: "CREATE",
        module: "students",
        entity: "student",
        entityId: student.id,
        newData: student,
      },
    });

    logger.info(
      `Student created: ${student.admissionNo} - ${student.firstName} ${student.lastName} (login enabled)`
    );

    return {
      ...student,
      credentials: !password
        ? { email: studentData.email, tempPassword: plainPassword }
        : undefined,
    };
  }

  static async updateStudent(id: string, data: any, userId?: string) {
    const student = await prisma.student.findUnique({
      where: { id },
      include: { class: true, section: true },
    });

    if (!student) {
      throw new AppError(404, 'Student not found');
    }

    // Roll number must stay unique within the section. Check against the
    // section this student will end up in (either the one they're moving
    // to, or their current one if section isn't changing), excluding
    // themselves.
    const effectiveSectionId = data.sectionId ?? student.sectionId;
    const effectiveRollNumber = data.rollNumber ?? student.rollNumber;

    if (effectiveRollNumber !== undefined && effectiveRollNumber !== null) {
      const conflict = await prisma.student.findFirst({
        where: {
          sectionId: effectiveSectionId,
          rollNumber: effectiveRollNumber,
          NOT: { id },
        },
        select: { id: true, firstName: true, lastName: true },
      });

      if (conflict) {
        throw new AppError(
          409,
          `Roll number ${effectiveRollNumber} is already assigned to ${conflict.firstName} ${conflict.lastName} in this section`
        );
      }
    }

    if (data.email) {
      const emailConflict = await prisma.student.findFirst({
        where: { email: data.email, NOT: { id } },
      });
      if (emailConflict) {
        throw new AppError(409, `Email ${data.email} is already used by another student`);
      }
    }

    if (data.aadhaar) {
      const aadhaarConflict = await prisma.student.findFirst({
        where: { aadhaar: data.aadhaar, NOT: { id } },
      });
      if (aadhaarConflict) {
        throw new AppError(409, `Aadhaar ${data.aadhaar} is already used by another student`);
      }
    }

    if (data.passportNumber) {
      const passportConflict = await prisma.student.findFirst({
        where: { passportNumber: data.passportNumber, NOT: { id } },
      });
      if (passportConflict) {
        throw new AppError(409, `Passport number ${data.passportNumber} is already used by another student`);
      }
    }

    // If changing section, update strengths
    if (data.sectionId && data.sectionId !== student.sectionId) {
      // Reduce old section strength
      await prisma.section.update({
        where: { id: student.sectionId },
        data: { currentStrength: { decrement: 1 } },
      });

      // Increase new section strength
      await prisma.section.update({
        where: { id: data.sectionId },
        data: { currentStrength: { increment: 1 } },
      });
    }

    const updated = await prisma.student.update({
      where: { id },
      data,
      include: {
        class: true,
        section: true,
      },
    });

    // Keep the linked login account in sync — name/email changes here
    // should carry through to how the student logs in.
    if (updated.userId) {
      try {
        await prisma.user.update({
          where: { id: updated.userId },
          data: {
            ...(data.firstName ? { firstName: data.firstName } : {}),
            ...(data.lastName ? { lastName: data.lastName } : {}),
            ...(data.email ? { email: data.email } : {}),
            ...(data.mobile ? { phone: data.mobile } : {}),
          },
        });
      } catch (syncError) {
        logger.warn(`Could not sync login account for student ${updated.admissionNo}:`, syncError);
      }
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        tenantId: updated.tenantId,
        userId,
        action: 'UPDATE',
        module: 'students',
        entity: 'student',
        entityId: updated.id,
        oldData: student,
        newData: updated,
      },
    });

    logger.info(`Student updated: ${updated.admissionNo}`);

    return updated;
  }

  static async deleteStudent(id: string, userId?: string) {
    const student = await prisma.student.findUnique({
      where: { id },
      include: { section: true },
    });

    if (!student) {
      throw new AppError(404, 'Student not found');
    }

    // Reduce section strength
    await prisma.section.update({
      where: { id: student.sectionId },
      data: { currentStrength: { decrement: 1 } },
    });

    await prisma.student.delete({ where: { id } });

    // Audit log
    await prisma.auditLog.create({
      data: {
        tenantId: student.tenantId,
        userId,
        action: 'DELETE',
        module: 'students',
        entity: 'student',
        entityId: student.id,
        oldData: student,
      },
    });

    logger.info(`Student deleted: ${student.admissionNo}`);
  }

  static async getStudentStatistics(tenantId: string) {
    const [total, active, byGender, byClass] = await Promise.all([
      prisma.student.count({ where: { tenantId } }),
      prisma.student.count({ where: { tenantId, status: 'ACTIVE' } }),
      prisma.student.groupBy({
        by: ['gender'],
        where: { tenantId },
        _count: true,
      }),
      prisma.student.groupBy({
        by: ['classId'],
        where: { tenantId, status: 'ACTIVE' },
        _count: true,
        orderBy: { _count: { classId: 'desc' } },
      }),
    ]);

    return {
      total,
      active,
      inactive: total - active,
      byGender,
      byClass: await Promise.all(
        byClass.map(async (item: { classId: string; _count: number }) => {
          const classData = await prisma.class.findUnique({
            where: { id: item.classId },
            select: { name: true },
          });
          return {
            className: classData?.name || 'Unknown',
            count: item._count,
          };
        })
      ),
    };
  }

  /**
   * Aggregated data for the logged-in student's own dashboard: profile,
   * class/section, attendance summary, recent exam marks, and today's
   * timetable — everything pulled straight from the DB for this student.
   */
  static async getMyDashboardData(tenantId: string, userId: string) {
    const student = await prisma.student.findFirst({
      where: { tenantId, userId },
      include: { class: true, section: true },
    });

    if (!student) {
      return {
        hasStudentRecord: false,
        profile: null,
        attendance: { present: 0, absent: 0, late: 0, leave: 0, total: 0, percentage: 0 },
        recentMarks: [],
        todayTimetable: [],
      };
    }

    const DOW_BY_JS_DAY = [
      'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY',
    ] as const;
    const today = DOW_BY_JS_DAY[new Date().getDay()];

    const [attendanceCounts, recentMarks, todayEntries] = await Promise.all([
      prisma.attendance.groupBy({
        by: ['status'],
        where: { tenantId, studentId: student.id },
        _count: true,
      }),
      prisma.examMark.findMany({
        where: { tenantId, studentId: student.id },
        include: { exam: true, subject: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.timetable.findMany({
        where: {
          tenantId,
          classId: student.classId,
          sectionId: student.sectionId,
          dayOfWeek: today,
        },
        include: { subject: true, staff: true },
        orderBy: { startTime: 'asc' },
      }),
    ]);

    const present = attendanceCounts.find((a) => a.status === 'PRESENT')?._count || 0;
    const absent = attendanceCounts.find((a) => a.status === 'ABSENT')?._count || 0;
    const late = attendanceCounts.find((a) => a.status === 'LATE')?._count || 0;
    const leave = attendanceCounts.find((a) => a.status === 'LEAVE')?._count || 0;
    const total = present + absent + late + leave;
    const percentage = total > 0 ? Math.round(((present + late) / total) * 1000) / 10 : 0;

    return {
      hasStudentRecord: true,
      profile: {
        name: [student.firstName, student.middleName, student.lastName].filter(Boolean).join(' '),
        admissionNo: student.admissionNo,
        rollNumber: student.rollNumber,
        className: student.class?.name || '',
        sectionName: student.section?.name || '',
        email: student.email,
        profileImage: student.profileImage,
      },
      attendance: { present, absent, late, leave, total, percentage },
      recentMarks: recentMarks.map((m) => ({
        id: m.id,
        examName: m.exam.name,
        subjectName: m.subject.name,
        totalMarks: m.totalMarks,
        maxMarks: m.maxMarks,
        percentage: m.percentage,
        grade: m.grade,
      })),
      todayTimetable: todayEntries.map((e) => ({
        id: e.id,
        startTime: e.startTime,
        endTime: e.endTime,
        subject: e.subject.name,
        teacher: e.staff ? [e.staff.firstName, e.staff.lastName].filter(Boolean).join(' ') : null,
        room: e.roomNo,
      })),
    };
  }

  /**
   * Full exam-results history for the logged-in student — read-only, and
   * always scoped to this student's own id (never accepts a studentId from
   * the request), so a student can never pull up anyone else's results by
   * tampering with a query param the way the staff-only marks endpoints do.
   */
  static async getMyResults(tenantId: string, userId: string) {
    const student = await prisma.student.findFirst({
      where: { tenantId, userId },
    });

    if (!student) {
      return { hasStudentRecord: false, results: [] };
    }

    const marks = await prisma.examMark.findMany({
      where: { tenantId, studentId: student.id },
      include: { exam: true, subject: true },
      orderBy: [{ exam: { startDate: 'desc' } }, { subject: { name: 'asc' } }],
    });

    // Group by exam so the student sees one card per exam, with every
    // subject's result underneath it, instead of one long flat list.
    const byExam = new Map<string, {
      examId: string;
      examName: string;
      examType: string;
      subjects: {
        subjectName: string;
        totalMarks: number | null;
        maxMarks: number | null;
        percentage: number | null;
        grade: string | null;
      }[];
    }>();

    for (const m of marks) {
      if (!byExam.has(m.examId)) {
        byExam.set(m.examId, {
          examId: m.examId,
          examName: m.exam.name,
          examType: m.exam.type,
          subjects: [],
        });
      }
      byExam.get(m.examId)!.subjects.push({
        subjectName: m.subject.name,
        totalMarks: m.totalMarks ? Number(m.totalMarks) : null,
        maxMarks: m.maxMarks ? Number(m.maxMarks) : null,
        percentage: m.percentage ? Number(m.percentage) : null,
        grade: m.grade,
      });
    }

    return {
      hasStudentRecord: true,
      results: Array.from(byExam.values()),
    };
  }
}