import prisma from '../../lib/prisma';
import { AppError } from '../../utils/AppError';
import logger from '../../lib/logger';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';

interface CreateStaffInput {
  tenantId: string;
  employeeId?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  qualification?: string;
  experience?: number;
  specialization?: string;
  joiningDate: string;
  designation: string;
  department?: string;
  profileImage?: string;
  createdBy?: string;
  /** Optional login password for the staff member's portal account. If left
   *  blank, a temporary password is generated and returned once so the
   *  admin can share it with the staff member. */
  password?: string;
}

/**
 * Maps a free-text designation (chosen in the Add Staff form) to the
 * platform Role enum, so the staff member's login account gets the right
 * permissions and sees the right dashboard/module access automatically.
 */
function mapDesignationToRole(designation: string): Role {
  const d = (designation || '').toLowerCase();
  if (d.includes('vice principal')) return 'VICE_PRINCIPAL';
  if (d.includes('principal')) return 'PRINCIPAL';
  if (d.includes('accountant')) return 'ACCOUNTANT';
  if (d.includes('librarian')) return 'LIBRARIAN';
  if (d.includes('teacher')) return 'TEACHER';
  return 'USER';
}

/** Any designation containing "teacher" gets a mirrored Teacher record so
 *  they can be assigned classes/subjects/timetable like teachers added
 *  through the dedicated Teachers module. */
function isTeachingDesignation(designation: string): boolean {
  return (designation || '').toLowerCase().includes('teacher');
}

/** Default login password for every new staff member: a fixed value
 *  ('123456') so they can log in immediately with the email entered on
 *  the Add Staff form. They should change it after first login. */
const DEFAULT_STAFF_PASSWORD = '123456';

function defaultStaffPassword(): string {
  return DEFAULT_STAFF_PASSWORD;
}

interface UpdateStaffInput extends Partial<CreateStaffInput> {
  isActive?: boolean;
}

export class StaffService {
  /**
   * Auto-generate employee ID
   */
  static async generateEmployeeId(tenantId: string): Promise<string> {
    const count = await prisma.staff.count({
      where: { tenantId },
    });
    
    const year = new Date().getFullYear();
    const prefix = `EMP-${year}-`;
    const number = String(count + 1).padStart(4, '0');
    
    return `${prefix}${number}`;
  }

  /**
   * Get all staff with filters
   */
  static async getStaff(params: {
    tenantId: string;
    page?: number;
    limit?: number;
    search?: string;
    department?: string;
    designation?: string;
    isActive?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const {
      tenantId,
      page = 1,
      limit = 100,
      search,
      department,
      designation,
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params;

    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (search) {
      where.OR = [
        { employeeId: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { designation: { contains: search, mode: 'insensitive' } },
        { department: { contains: search, mode: 'insensitive' } },
        { specialization: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (department) {
      where.department = department;
    }

    if (designation) {
      where.designation = designation;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    const [staff, total] = await Promise.all([
      prisma.staff.findMany({
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
            },
          },
        },
      }),
      prisma.staff.count({ where }),
    ]);

    return {
      data: staff,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get staff by ID
   */
  static async getStaffById(id: string, tenantId: string) {
    const staff = await prisma.staff.findFirst({
      where: { id, tenantId },
      include: {
        user: true,
      },
    });

    if (!staff) {
      throw new AppError(404, 'Staff member not found');
    }

    return staff;
  }

  /**
   * Get staff by employee ID
   */
  static async getStaffByEmployeeId(employeeId: string, tenantId: string) {
    const staff = await prisma.staff.findFirst({
      where: { employeeId, tenantId },
      include: {
        user: true,
      },
    });

    if (!staff) {
      throw new AppError(404, `Staff member with ID ${employeeId} not found`);
    }

    return staff;
  }

  /**
   * Create staff
   */
  static async createStaff(tenantId: string, data: CreateStaffInput) {
    console.log('📥 Creating staff member:', data);

    // Validate required fields
    if (!data.firstName) {
      throw new AppError(400, 'First name is required');
    }
    if (!data.lastName) {
      throw new AppError(400, 'Last name is required');
    }
    if (!data.email) {
      throw new AppError(400, 'Email is required');
    }
    if (!data.phone) {
      throw new AppError(400, 'Phone number is required');
    }
    if (!data.dateOfBirth) {
      throw new AppError(400, 'Date of birth is required');
    }
    if (!data.gender) {
      throw new AppError(400, 'Gender is required');
    }
    if (!data.joiningDate) {
      throw new AppError(400, 'Joining date is required');
    }
    if (!data.designation) {
      throw new AppError(400, 'Designation is required');
    }

    // Auto-generate employee ID if not provided
    let employeeId = data.employeeId;
    if (!employeeId) {
      employeeId = await this.generateEmployeeId(tenantId);
    } else {
      // Check if employee ID already exists
      const existingEmpId = await prisma.staff.findFirst({
        where: { employeeId, tenantId },
      });

      if (existingEmpId) {
        throw new AppError(400, 'Employee ID already exists');
      }
    }

    // Check if email already exists (as staff OR as a login account)
    const existingEmail = await prisma.staff.findFirst({
      where: { email: data.email },
    });

    if (existingEmail) {
      throw new AppError(400, 'Email already exists');
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new AppError(400, 'A login account with this email already exists');
    }

    // Check if phone already exists
    const existingPhone = await prisma.staff.findFirst({
      where: { phone: data.phone, tenantId },
    });

    if (existingPhone) {
      throw new AppError(400, 'Phone number already exists');
    }

    // Age validation (18-65 years)
    const age = this.calculateAge(new Date(data.dateOfBirth));
    if (age < 18) {
      throw new AppError(400, 'Staff must be at least 18 years old');
    }
    if (age > 65) {
      throw new AppError(400, 'Staff age exceeds maximum allowed (65 years)');
    }

    // ✅ FIX: Cast gender to the proper enum type
    const genderEnum = data.gender as any;

    // ✅ Give the staff member an actual login account so they can sign in
    // with the email entered here, on the "Sign in as <role>" screen.
    const role = mapDesignationToRole(data.designation);
    const passwordWasGenerated = !data.password;
    const plainPassword = data.password || defaultStaffPassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const { staff, user } = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          password: hashedPassword,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          role,
          tenantId,
          isActive: true,
          createdBy: data.createdBy,
        },
      });

      const staff = await tx.staff.create({
        data: {
          tenantId,
          employeeId,
          firstName: data.firstName,
          middleName: data.middleName || null,
          lastName: data.lastName,
          dateOfBirth: new Date(data.dateOfBirth),
          gender: genderEnum,
          email: data.email,
          phone: data.phone,
          address: data.address || null,
          city: data.city || null,
          state: data.state || null,
          pincode: data.pincode || null,
          qualification: data.qualification || null,
          experience: data.experience || null,
          specialization: data.specialization || null,
          joiningDate: new Date(data.joiningDate),
          designation: data.designation,
          department: data.department || null,
          profileImage: data.profileImage || null,
          userId: user.id,
          isActive: true,
        },
        include: {
          user: true,
        },
      });

      return { staff, user };
    });

    logger.info(`Staff created: ${staff.employeeId} - ${staff.firstName} ${staff.lastName} (login role: ${role})`);

    // Best-effort: also mirror teaching staff into the Teacher table so they
    // show up in class/subject/timetable assignment (which is keyed off
    // Teacher, not Staff, elsewhere in the app). This is not required for
    // login and must never block staff creation if it fails.
    let teacherId: string | null = null;
    if (isTeachingDesignation(data.designation)) {
      try {
        const teacher = await prisma.teacher.create({
          data: {
            tenantId,
            employeeId: `${employeeId}-T`,
            firstName: data.firstName,
            lastName: data.lastName,
            dateOfBirth: new Date(data.dateOfBirth),
            gender: genderEnum,
            email: data.email,
            phone: data.phone,
            address: data.address || null,
            city: data.city || null,
            state: data.state || null,
            pincode: data.pincode || null,
            qualification: data.qualification || null,
            experience: data.experience || null,
            specialization: data.specialization || null,
            joiningDate: new Date(data.joiningDate),
            designation: data.designation,
            department: data.department || null,
            profileImage: data.profileImage || null,
            userId: user.id,
            isActive: true,
          },
        });
        teacherId = teacher.id;
      } catch (mirrorError) {
        logger.warn(`Could not mirror staff ${staff.employeeId} into Teacher table:`, mirrorError);
      }
    }

    return {
      ...staff,
      teacherId,
      credentials: passwordWasGenerated
        ? { email: data.email, tempPassword: plainPassword }
        : undefined,
    };
  }

  /**
   * Update staff
   */
  static async updateStaff(id: string, tenantId: string, data: UpdateStaffInput) {
    const existing = await prisma.staff.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new AppError(404, 'Staff member not found');
    }

    // Check email uniqueness if updating
    if (data.email && data.email !== existing.email) {
      const conflict = await prisma.staff.findFirst({
        where: { email: data.email, NOT: { id } },
      });

      if (conflict) {
        throw new AppError(400, 'Email already exists');
      }
    }

    // Check phone uniqueness if updating
    if (data.phone && data.phone !== existing.phone) {
      const conflict = await prisma.staff.findFirst({
        where: { phone: data.phone, tenantId, NOT: { id } },
      });

      if (conflict) {
        throw new AppError(400, 'Phone number already exists');
      }
    }

    // Age validation if DOB is being updated
    if (data.dateOfBirth) {
      const age = this.calculateAge(new Date(data.dateOfBirth));
      if (age < 18) {
        throw new AppError(400, 'Staff must be at least 18 years old');
      }
      if (age > 65) {
        throw new AppError(400, 'Staff age exceeds maximum allowed (65 years)');
      }
    }

    // Don't allow employee ID to be changed
    delete (data as any).employeeId;

    const updateData: any = { ...data };

    // ✅ FIX: Cast gender to the proper enum type if provided
    if (data.gender) {
      updateData.gender = data.gender as any;
    }

    // Convert date strings to Date objects
    if (data.dateOfBirth) {
      updateData.dateOfBirth = new Date(data.dateOfBirth);
    }
    if (data.joiningDate) {
      updateData.joiningDate = new Date(data.joiningDate);
    }

    const staff = await prisma.staff.update({
      where: { id },
      data: updateData,
      include: {
        user: true,
      },
    });

    // Keep the linked login account in sync so name/email/phone/active
    // status changes here are reflected the next time the staff member logs in.
    if (staff.userId) {
      try {
        await prisma.user.update({
          where: { id: staff.userId },
          data: {
            ...(data.firstName ? { firstName: data.firstName } : {}),
            ...(data.lastName ? { lastName: data.lastName } : {}),
            ...(data.email ? { email: data.email } : {}),
            ...(data.phone ? { phone: data.phone } : {}),
            ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
          },
        });
      } catch (syncError) {
        logger.warn(`Could not sync login account for staff ${staff.employeeId}:`, syncError);
      }
    }

    logger.info(`Staff updated: ${staff.employeeId}`);

    return staff;
  }

  /**
   * Delete staff (soft delete)
   */
  static async deleteStaff(id: string, tenantId: string) {
    const existing = await prisma.staff.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new AppError(404, 'Staff member not found');
    }

    // Check if staff has any dependencies
    const hasPayroll = await prisma.staffPayroll.count({
      where: { staffId: id },
    });

    if (hasPayroll > 0) {
      throw new AppError(400, 'Cannot delete staff with payroll records');
    }

    await prisma.staff.delete({
      where: { id },
    });

    logger.info(`Staff deleted: ${existing.employeeId}`);

    return { success: true, message: 'Staff member deleted successfully' };
  }

  /**
   * Toggle staff active status
   */
  static async toggleStaffStatus(id: string, tenantId: string) {
    const existing = await prisma.staff.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new AppError(404, 'Staff member not found');
    }

    const staff = await prisma.staff.update({
      where: { id },
      data: { isActive: !existing.isActive },
    });

    // Toggling a staff member off should also block their portal login.
    if (staff.userId) {
      try {
        await prisma.user.update({
          where: { id: staff.userId },
          data: { isActive: staff.isActive },
        });
      } catch (syncError) {
        logger.warn(`Could not sync login account status for staff ${staff.employeeId}:`, syncError);
      }
    }

    logger.info(`Staff status toggled: ${staff.employeeId} -> ${staff.isActive ? 'Active' : 'Inactive'}`);

    return staff;
  }

  /**
   * Get staff statistics
   */
  static async getStaffStatistics(tenantId: string) {
    const [total, active, inactive, byDepartment, byDesignation] = await Promise.all([
      prisma.staff.count({ where: { tenantId } }),
      prisma.staff.count({ where: { tenantId, isActive: true } }),
      prisma.staff.count({ where: { tenantId, isActive: false } }),
      prisma.staff.groupBy({
        by: ['department'],
        where: { tenantId },
        _count: true,
      }),
      prisma.staff.groupBy({
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
      inactive,
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

  /**
   * Aggregated staff-wide overview for the Principal Dashboard — everything
   * here is derived straight from the Staff table (the same source Add
   * Staff writes to), no separate reporting tables involved.
   */
  static async getPrincipalDashboard(tenantId: string) {
    const [total, active, inactive, byDepartment, byDesignation, recentStaff] = await Promise.all([
      prisma.staff.count({ where: { tenantId } }),
      prisma.staff.count({ where: { tenantId, isActive: true } }),
      prisma.staff.count({ where: { tenantId, isActive: false } }),
      prisma.staff.groupBy({
        by: ['department'],
        where: { tenantId },
        _count: true,
      }),
      prisma.staff.groupBy({
        by: ['designation'],
        where: { tenantId },
        _count: true,
        orderBy: { _count: { designation: 'desc' } },
      }),
      prisma.staff.findMany({
        where: { tenantId },
        orderBy: { joiningDate: 'desc' },
        take: 5,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          designation: true,
          department: true,
          joiningDate: true,
          profileImage: true,
          isActive: true,
        },
      }),
    ]);

    // Teaching vs non-teaching split, using the same "designation contains
    // 'teacher'" rule as isTeachingDesignation() above, so these numbers
    // stay consistent with what Add Staff mirrors into the Teacher table.
    const teachingStaff = byDesignation
      .filter((d) => (d.designation || '').toLowerCase().includes('teacher'))
      .reduce((sum, d) => sum + d._count, 0);
    const nonTeachingStaff = total - teachingStaff;

    return {
      totalStaff: total,
      activeStaff: active,
      inactiveStaff: inactive,
      teachingStaff,
      nonTeachingStaff,
      byDepartment: byDepartment.map((d) => ({
        department: d.department || 'Not Assigned',
        count: d._count,
      })),
      byDesignation: byDesignation.map((d) => ({
        designation: d.designation || 'Not Assigned',
        count: d._count,
      })),
      recentStaff: recentStaff.map((s) => ({
        id: s.id,
        name: [s.firstName, s.lastName].filter(Boolean).join(' '),
        designation: s.designation,
        department: s.department,
        joiningDate: s.joiningDate ? s.joiningDate.toISOString().slice(0, 10) : null,
        profileImage: s.profileImage,
        isActive: s.isActive,
      })),
    };
  }

  /**
   * Get departments list
   */
  static async getDepartments(tenantId: string) {
    const departments = await prisma.staff.findMany({
      where: { tenantId },
      select: { department: true },
      distinct: ['department'],
    });

    return departments.map((d) => d.department).filter(Boolean);
  }

  /**
   * Get designations list
   */
  static async getDesignations(tenantId: string) {
    const designations = await prisma.staff.findMany({
      where: { tenantId },
      select: { designation: true },
      distinct: ['designation'],
    });

    return designations.map((d) => d.designation).filter(Boolean);
  }

  /**
   * Calculate age from date of birth
   */
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