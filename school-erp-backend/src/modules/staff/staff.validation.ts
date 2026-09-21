import { z } from 'zod';

// Helper function to calculate age
const calculateAge = (dateOfBirth: Date): number => {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    age--;
  }
  return age;
};

export const CreateStaffSchema = z.object({
  employeeId: z.string().optional(),
  firstName: z.string().min(1, 'First name is required'),
  middleName: z.string().optional(),
  lastName: z.string().min(1, 'Last name is required'),
  dateOfBirth: z.string()
    .min(1, 'Date of birth is required')
    // ✅ Staff-specific age validation (18-65 years)
    .refine((date) => {
      const age = calculateAge(new Date(date));
      return age >= 18;
    }, { message: 'Staff must be at least 18 years old' })
    .refine((date) => {
      const age = calculateAge(new Date(date));
      return age <= 65;
    }, { message: 'Staff age exceeds maximum allowed (65 years)' }),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  email: z.string().email('Invalid email format'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  qualification: z.string().optional(),
  experience: z.number().min(0).optional(),
  specialization: z.string().optional(),
  joiningDate: z.string().min(1, 'Joining date is required'),
  designation: z.string().min(1, 'Designation is required'),
  department: z.string().optional(),
  // Optional login password for the staff portal account. If omitted, the
  // server generates a temporary one and returns it once on creation.
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
});

export const UpdateStaffSchema = CreateStaffSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const GetStaffQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional(),
  department: z.string().optional(),
  designation: z.string().optional(),
  isActive: z.string().optional().transform((val) => val === 'true'),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});