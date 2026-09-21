import prisma from '../../lib/prisma';
import { AppError } from '../../utils/AppError';
import logger from '../../lib/logger';
import { DayOfWeek } from '@prisma/client';

const DOW_BY_JS_DAY: DayOfWeek[] = [
  'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY',
];

function toApiShape(t: any) {
  return {
    id: t.id,
    // ✅ Simplified fields (for the frontend table)
    empId: t.employeeId,
    name: [t.firstName, t.lastName].filter(Boolean).join(' '),
    role: t.designation,
    phone: t.phone,
    email: t.email,
    joiningDate: t.joiningDate ? t.joiningDate.toISOString().slice(0, 10) : null,
    dateOfBirth: t.dateOfBirth ? t.dateOfBirth.toISOString().slice(0, 10) : null,
    gender: t.gender,
    isActive: t.isActive,
    department: t.department,
    qualification: t.qualification,
    experience: t.experience,
    specialization: t.specialization,
    address: t.address,
    city: t.city,
    state: t.state,
    pincode: t.pincode,
    profileImage: t.profileImage,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    // ✅ Raw fields (for frontend compatibility)
    employeeId: t.employeeId,
    firstName: t.firstName,
    lastName: t.lastName,
    designation: t.designation,
  };
}

function fromApiShape(data: any) {
  const out: any = {};
  
  // Handle direct firstName/lastName (from frontend form)
  if (data.firstName !== undefined) {
    out.firstName = data.firstName;
  }
  
  if (data.lastName !== undefined) {
    out.lastName = data.lastName || null;
  }
  
  // Handle combined name field (from simplified API)
  if (data.name !== undefined) {
    const nameParts = (data.name || '').trim().split(/\s+/);
    out.firstName = nameParts[0] || data.name || '';
    out.lastName = nameParts.slice(1).join(' ') || null;
  }
  
  // Employee ID
  if (data.empId !== undefined) {
    out.employeeId = data.empId;
  }
  
  // Role
  if (data.role !== undefined) {
    out.designation = data.role;
  }
  
  // Contact
  if (data.phone !== undefined) {
    out.phone = data.phone;
  }
  
  if (data.email !== undefined) {
    out.email = data.email;
  }
  
  // Organization
  if (data.department !== undefined) {
    out.department = data.department;
  }
  
  if (data.qualification !== undefined) {
    out.qualification = data.qualification;
  }
  
  if (data.experience !== undefined) {
    out.experience = data.experience ? parseInt(data.experience) : null;
  }
  
  if (data.specialization !== undefined) {
    out.specialization = data.specialization;
  }
  
  // Address
  if (data.address !== undefined) {
    out.address = data.address;
  }
  
  if (data.city !== undefined) {
    out.city = data.city;
  }
  
  if (data.state !== undefined) {
    out.state = data.state;
  }
  
  if (data.pincode !== undefined) {
    out.pincode = data.pincode;
  }
  
  // Profile
  if (data.profileImage !== undefined) {
    out.profileImage = data.profileImage;
  }
  
  // Gender
  if (data.gender !== undefined) {
    out.gender = data.gender;
  }
  
  // Joining Date
  if (data.joiningDate !== undefined) {
    out.joiningDate = data.joiningDate ? new Date(data.joiningDate) : null;
  }
  
  // Date of Birth
  if (data.dateOfBirth !== undefined) {
    out.dateOfBirth = data.dateOfBirth ? new Date(data.dateOfBirth) : null;
  }
  
  return out;
}

export class TeacherService {
  static async getTeachers(params: {
    tenantId: string;
    page: number;
    limit: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const { tenantId, page, limit, search, sortBy = 'createdAt', sortOrder = 'desc' } = params;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { employeeId: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { designation: { contains: search, mode: 'insensitive' } },
        { department: { contains: search, mode: 'insensitive' } },
      ];
    }

    const sortMap: Record<string, string> = { 
      empId: 'employeeId', 
      name: 'firstName', 
      role: 'designation',
      phone: 'phone',
      email: 'email',
      joiningDate: 'joiningDate',
      dateOfBirth: 'dateOfBirth',
      gender: 'gender',
    };
    const orderBy: any = { [sortMap[sortBy] || sortBy]: sortOrder };

    const [teachers, total] = await Promise.all([
      prisma.teacher.findMany({ 
        where, 
        skip, 
        take: limit, 
        orderBy,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            }
          }
        }
      }),
      prisma.teacher.count({ where }),
    ]);

    return {
      data: teachers.map(toApiShape),
      pagination: { 
        total, 
        page, 
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getTeacherById(tenantId: string, id: string) {
    const teacher = await prisma.teacher.findFirst({ 
      where: { id, tenantId },
      include: {
        user: true,
      }
    });
    
    if (!teacher) throw new AppError(404, 'Teacher not found');
    return toApiShape(teacher);
  }

  static async getTeacherByEmployeeId(tenantId: string, employeeId: string) {
    const teacher = await prisma.teacher.findFirst({
      where: { tenantId, employeeId },
      include: {
        user: true,
      },
    });

    if (!teacher) {
      throw new AppError(404, `Teacher with ID ${employeeId} not found`);
    }

    return toApiShape(teacher);
  }

  static async createTeacher(tenantId: string, data: any) {
    const mapped = fromApiShape(data);

    // Auto-generate employee ID if not provided
    if (!mapped.employeeId) {
      const count = await prisma.teacher.count({ where: { tenantId } });
      const year = new Date().getFullYear();
      mapped.employeeId = `TCH-${year}-${String(count + 1).padStart(4, '0')}`;
    }

    // Required fields validation
    if (!mapped.firstName) throw new AppError(400, 'First name is required');
    if (!mapped.email) throw new AppError(400, 'Email is required');
    if (!mapped.phone) throw new AppError(400, 'Phone number is required');
    if (!mapped.dateOfBirth) throw new AppError(400, 'Date of birth is required');

    // Check duplicates
    const existingEmpId = await prisma.teacher.findFirst({ 
      where: { employeeId: mapped.employeeId, tenantId } 
    });
    if (existingEmpId) throw new AppError(400, 'Employee ID already exists');

    const existingEmail = await prisma.teacher.findFirst({ 
      where: { email: mapped.email } 
    });
    if (existingEmail) throw new AppError(400, 'Email already exists');

    const existingPhone = await prisma.teacher.findFirst({ 
      where: { phone: mapped.phone, tenantId } 
    });
    if (existingPhone) throw new AppError(400, 'Phone number already exists');

    // Age validation
    const age = this.calculateAge(mapped.dateOfBirth);
    if (age < 18) throw new AppError(400, 'Teacher must be at least 18 years old');
    if (age > 65) throw new AppError(400, 'Teacher age exceeds maximum allowed (65 years)');

    const teacher = await prisma.teacher.create({
      data: {
        tenantId,
        employeeId: mapped.employeeId,
        firstName: mapped.firstName,
        lastName: mapped.lastName || null,
        email: mapped.email,
        phone: mapped.phone,
        designation: mapped.designation || 'Teacher',
        department: mapped.department || null,
        qualification: mapped.qualification || null,
        experience: mapped.experience || null,
        specialization: mapped.specialization || null,
        address: mapped.address || null,
        city: mapped.city || null,
        state: mapped.state || null,
        pincode: mapped.pincode || null,
        profileImage: mapped.profileImage || null,
        dateOfBirth: mapped.dateOfBirth,
        gender: mapped.gender || 'OTHER',
        joiningDate: mapped.joiningDate || new Date(),
        isActive: true,
      },
      include: {
        user: true,
      },
    });

    logger.info(`Teacher created: ${teacher.employeeId} - ${teacher.firstName} ${teacher.lastName || ''}`);
    return toApiShape(teacher);
  }

  static async updateTeacher(tenantId: string, id: string, data: any) {
    const existing = await prisma.teacher.findFirst({ where: { id, tenantId } });
    if (!existing) throw new AppError(404, 'Teacher not found');

    const mapped = fromApiShape(data);
    delete mapped.employeeId;

    if (mapped.email && mapped.email !== existing.email) {
      const conflict = await prisma.teacher.findFirst({ 
        where: { email: mapped.email, NOT: { id } } 
      });
      if (conflict) throw new AppError(400, 'Email already exists');
    }

    if (mapped.phone && mapped.phone !== existing.phone) {
      const conflict = await prisma.teacher.findFirst({ 
        where: { phone: mapped.phone, tenantId, NOT: { id } } 
      });
      if (conflict) throw new AppError(400, 'Phone number already exists');
    }

    if (mapped.dateOfBirth) {
      const age = this.calculateAge(mapped.dateOfBirth);
      if (age < 18) throw new AppError(400, 'Teacher must be at least 18 years old');
      if (age > 65) throw new AppError(400, 'Teacher age exceeds maximum allowed (65 years)');
    }

    const teacher = await prisma.teacher.update({ 
      where: { id }, 
      data: mapped,
      include: {
        user: true,
      }
    });
    
    logger.info(`Teacher updated: ${teacher.employeeId}`);
    return toApiShape(teacher);
  }

  static async deleteTeacher(tenantId: string, id: string) {
    const existing = await prisma.teacher.findFirst({ where: { id, tenantId } });
    if (!existing) throw new AppError(404, 'Teacher not found');

    await prisma.teacher.update({ where: { id }, data: { isActive: false } });
    logger.info(`Teacher deactivated: ${existing.employeeId}`);
    
    return { success: true, message: 'Teacher deactivated successfully' };
  }

  static async toggleTeacherStatus(tenantId: string, id: string) {
    const existing = await prisma.teacher.findFirst({ where: { id, tenantId } });
    if (!existing) throw new AppError(404, 'Teacher not found');

    const teacher = await prisma.teacher.update({ 
      where: { id }, 
      data: { isActive: !existing.isActive } 
    });
    
    logger.info(`Teacher status toggled: ${teacher.employeeId} -> ${teacher.isActive ? 'Active' : 'Inactive'}`);
    return toApiShape(teacher);
  }

  static async getTeacherStatistics(tenantId: string) {
    const [total, active, byDepartment, byDesignation] = await Promise.all([
      prisma.teacher.count({ where: { tenantId } }),
      prisma.teacher.count({ where: { tenantId, isActive: true } }),
      prisma.teacher.groupBy({
        by: ['department'],
        where: { tenantId },
        _count: true,
      }),
      prisma.teacher.groupBy({
        by: ['designation'],
        where: { tenantId },
        _count: true,
        orderBy: {
          _count: {
            designation: 'desc',
          },
        },
      }),
    ]);

    return {
      total,
      active,
      inactive: total - active,
      byDepartment: byDepartment.map((d) => ({
        department: d.department || 'Not Assigned',
        count: d._count,
      })),
      byDesignation: byDesignation.map((d) => ({
        designation: d.designation || 'Not Assigned',
        count: d._count,
      })),
    };
  }

  static async getDepartmentList(tenantId: string) {
    const departments = await prisma.teacher.findMany({
      where: {
        tenantId: tenantId,
      },
      select: {
        department: true,
      },
      distinct: ['department'],
    });

    return departments
      .map((d) => d.department)
      .filter((dept): dept is string => dept !== null && dept !== undefined && dept !== '');
  }

  static async getDesignationList(tenantId: string) {
    const designations = await prisma.teacher.findMany({
      where: {
        tenantId: tenantId,
      },
      select: {
        designation: true,
      },
      distinct: ['designation'],
    });

    return designations
      .map((d) => d.designation)
      .filter((desig): desig is string => desig !== null && desig !== undefined && desig !== '');
  }

  /**
   * Aggregated data for the logged-in teacher's own dashboard: profile,
   * assigned classes/sections/subjects, today's timetable, and a live
   * student count — all pulled straight from the database for this teacher.
   */
  static async getMyDashboardData(tenantId: string, userId: string) {
    const teacher = await prisma.teacher.findFirst({
      where: { tenantId, userId },
    });

    // A teacher record may not exist yet (e.g. legacy staff-only accounts
    // created before class/subject assignment was wired up). Fall back to
    // the Staff profile so the dashboard still shows who they are.
    if (!teacher) {
      const staff = await prisma.staff.findFirst({ where: { tenantId, userId } });

      return {
        hasTeacherRecord: false,
        profile: staff
          ? {
              name: [staff.firstName, staff.lastName].filter(Boolean).join(' '),
              employeeId: staff.employeeId,
              designation: staff.designation,
              department: staff.department,
              email: staff.email,
              phone: staff.phone,
              profileImage: staff.profileImage,
            }
          : null,
        classes: [],
        subjects: [],
        todayTimetable: [],
        totalStudents: 0,
        totalClasses: 0,
        totalSubjects: 0,
      };
    }

    const today = DOW_BY_JS_DAY[new Date().getDay()];

    const [sections, subjects, todayEntries] = await Promise.all([
      prisma.teacherSection.findMany({
        where: { teacherId: teacher.id },
        include: { section: { include: { class: true } } },
      }),
      prisma.teacherSubject.findMany({
        where: { teacherId: teacher.id },
        include: { subject: true, class: true },
      }),
      prisma.timetable.findMany({
        where: { tenantId, teacherId: teacher.id, dayOfWeek: today },
        include: { subject: true, class: true, section: true },
        orderBy: { startTime: 'asc' },
      }),
    ]);

    const sectionIds = [...new Set(sections.map((s) => s.sectionId))];
    const totalStudents = sectionIds.length
      ? await prisma.student.count({ where: { sectionId: { in: sectionIds }, status: 'ACTIVE' } })
      : 0;

    return {
      hasTeacherRecord: true,
      profile: {
        name: [teacher.firstName, teacher.lastName].filter(Boolean).join(' '),
        employeeId: teacher.employeeId,
        designation: teacher.designation,
        department: teacher.department,
        email: teacher.email,
        phone: teacher.phone,
        profileImage: teacher.profileImage,
      },
      classes: sections.map((s) => ({
        sectionId: s.sectionId,
        sectionName: s.section.name,
        classId: s.section.classId,
        className: s.section.class.name,
        isClassTeacher: s.isClassTeacher,
      })),
      subjects: subjects.map((ts) => ({
        subjectId: ts.subjectId,
        subjectName: ts.subject.name,
        classId: ts.classId,
        className: ts.class.name,
        isPrimary: ts.isPrimary,
      })),
      todayTimetable: todayEntries.map((e) => ({
        id: e.id,
        startTime: e.startTime,
        endTime: e.endTime,
        subject: e.subject.name,
        class: e.class.name,
        section: e.section.name,
        room: e.roomNo,
      })),
      totalStudents,
      totalClasses: sectionIds.length,
      totalSubjects: new Set(subjects.map((s) => s.subjectId)).size,
    };
  }

  static calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    let age = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - dateOfBirth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
      age--;
    }
    return age;
  }
}