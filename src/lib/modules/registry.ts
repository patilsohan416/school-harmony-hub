import type { ModuleDef } from "./types";

// ✅ API Endpoint Mapping - Maps frontend slug to backend API endpoint
export const API_ENDPOINT_MAP: Record<string, string> = {
  "new-student": "students",
  "admission-form": "generic/admission-form",
  "admission-open-classes": "generic/admission-open-classes",
  "roll-number": "generic/roll-number",
  "student-reports": "generic/student-reports",
  "leaving-certificate": "generic/leaving-certificate",
  "bonafide-certificate": "generic/bonafide-certificate",
  "outgoing-students": "generic/outgoing-students",
  "dispatch-register": "generic/dispatch-register",
  "caste-report": "generic/caste-report",
  "minority-report": "generic/minority-report",
  
  // ── Attendance (Core - Real Backend) ──
  "mark-attendance": "attendance",
  "attendance-register": "attendance/register",
  
  // ── Student Register (Core - Real Backend) ──
  "student-register": "students/register",
  
  // ── Fee Management (Core - Real Backend) ──
  "fee-collection": "fees",
  "fee-report": "fees/report",
  
  // ── Staff Management (Core - Real Backend) ──
  "add-staff": "staff",
  "staff-payroll": "generic/staff-payroll",
  "staff-id-card": "teachers/id-cards",
  
  // ── Timetable (Core - Real Backend) ──
  "view-timetable": "timetable",
  
  // ── Online Test (Core - Real Backend) ──
  "create-test": "tests",
  "take-test": "tests/take",
  "test-results": "tests/results",
  
  // ── Inventory (Core - Real Backend) ──
  "add-item": "inventory/items",
  "stock-in": "inventory/stock-in",
 // "inventory-current-stock": "generic/inventory-current-stock",
  //"purchase-order": "generic/purchase-order",
  "supplier-management": "inventory/suppliers",
  "inventory-report": "inventory/reports",

  
  // ── Examination (Core - Real Backend) ──
  "marks-entry": "exams/marks",
  "progress-report": "exams/progress",
  "consolidated-results": "exams/consolidated",
  "subject-wise-results": "exams/subject-wise",
  "grade-wise-results": "exams/grade-wise",
  "exam-daily-register": "generic/exam-daily-register",
  "grade-5-8-results": "exams/grade-5-8",
  "ssc-results": "generic/ssc-results",
  "hsc-results": "exams/hsc",
  "view-reports": "exams/reports",
  "student-promotion": "generic/student-promotion",
  
  // ── ICSE ──
  "icse-marks-entry": "icse/marks",
  "icse-progress-report": "icse/progress",
  "icse-subject-wise-results": "icse/subject-wise",
  "icse-grade-wise-results": "icse/grade-wise",
  "icse-student-promotion": "generic/icse-student-promotion",
  "icse-preliminary-progress": "icse/preliminary",
  "icse-view-reports": "icse/reports",
  
  // ── CBSE ──
  "cbse-marks-entry": "cbse/marks",
  "cbse-high-school-results": "cbse/high-school",
  "cbse-primary-results": "cbse/primary",
  "cbse-pre-primary-results": "generic/cbse-pre-primary-results",
  "cbse-subject-wise-results": "cbse/subject-wise",
  "cbse-student-promotion": "cbse/promotion",
  "study-material": "study-material",

  // ── Student Dashboard ──
  "my-results": "exams/my-results",

  // ── Accountant ──
  "accountant-dashboard": "accountant/dashboard",
  "fee-setup": "accountant-modules/fee-setup",
  "receipts": "accountant-modules/receipts",
  "pending-fees": "accountant-modules/pending-fees",
  "accountant-defaulters": "accountant-modules/defaulters",
  "expenses": "accountant-modules/expenses",
  "salary": "accountant-modules/salary",
  "discounts": "accountant-modules/discounts",
  "payment-plans": "accountant-modules/payment-plans",
  "bank-accounts": "accountant-modules/bank-accounts",
  "financial-reports": "accountant-modules/reports",
  "accountant-notifications": "accountant-modules/notifications",
  "accountant-audit": "accountant-modules/audit-log",
};

// ✅ Helper function to get API endpoint
export function getApiEndpoint(slug: string): string {
  return API_ENDPOINT_MAP[slug] || `generic/${slug}`;
}

// ✅ Default permissions
const DEFAULT_PERMISSIONS = {
  view: ["SUPER_ADMIN", "PRINCIPAL", "ADMIN", "TEACHER", "ACCOUNTANT", "RECEPTIONIST"],
  create: ["SUPER_ADMIN", "PRINCIPAL", "ADMIN", "RECEPTIONIST"],
  update: ["SUPER_ADMIN", "PRINCIPAL", "ADMIN", "RECEPTIONIST"],
  delete: ["SUPER_ADMIN", "PRINCIPAL", "ADMIN"],
};

// ✅ Accountant-only permissions (financial data restricted to admin roles + accountant)
const ACCOUNTANT_PERMISSIONS = {
  view: ["SUPER_ADMIN", "PRINCIPAL", "ADMIN", "ACCOUNTANT"],
  create: ["SUPER_ADMIN", "PRINCIPAL", "ADMIN", "ACCOUNTANT"],
  update: ["SUPER_ADMIN", "PRINCIPAL", "ADMIN", "ACCOUNTANT"],
  delete: ["SUPER_ADMIN", "PRINCIPAL", "ADMIN"],
};

export function getPermissions(module: ModuleDef) {
  return { ...DEFAULT_PERMISSIONS, ...module.permissions };
}

export const MODULES: ModuleDef[] = [
  // ── Student Management ─────────────────────────────────────────
  {
    slug: "new-student", title: "New Student", group: "Student Management", icon: "UserPlus",
    fields: [
      { name: "admissionNo", label: "Admission No", type: "text", readOnly: true, searchable: true, helper: "Auto-generated on save" },
      { name: "rollNumber", label: "Roll Number", type: "number", required: true, min: 1, helper: "Must be unique within the section" },
      { name: "firstName", label: "First Name", type: "text", required: true, searchable: true },
      { name: "middleName", label: "Middle Name", type: "text", hideInTable: true },
      { name: "lastName", label: "Last Name", type: "text", required: true, searchable: true },
      { name: "class", label: "Class", type: "select", required: true, options: ["Nursery","LKG","UKG","1","2","3","4","5","6","7","8","9","10","11","12"] },
      { name: "section", label: "Section", type: "select", required: true, options: ["A","B","C","D"] },
      { name: "gender", label: "Gender", type: "select", required: true, options: ["Male","Female","Other"] },
      { name: "dob", label: "Date of Birth", type: "date", required: true, helper: "Cannot be a future date" },
      { name: "bloodGroup", label: "Blood Group", type: "select", required: true, options: ["A+","A-","B+","B-","AB+","AB-","O+","O-"], hideInTable: true },
      { name: "heightCm", label: "Height (cm)", type: "number", hideInTable: true, helper: "Optional" },
      { name: "weightKg", label: "Weight (kg)", type: "number", hideInTable: true, helper: "Optional" },
      { name: "category", label: "Category", type: "select", required: true, options: ["General","OBC","SC","ST","EWS"], hideInTable: true },
      { name: "religion", label: "Religion", type: "text", required: true, hideInTable: true },
      { name: "nationality", label: "Nationality", type: "text", required: true, placeholder: "Indian", hideInTable: true },
      { name: "aadhaar", label: "Aadhaar Number", type: "text", hideInTable: true, helper: "12 digits, optional" },
      { name: "passportNumber", label: "Passport Number", type: "text", hideInTable: true, helper: "Optional" },
      { name: "mobile", label: "Student Mobile Number", type: "tel", hideInTable: true, helper: "Optional, 10 digits" },
      { name: "email", label: "Email Address", type: "email", required: true, searchable: true },
      { name: "photo", label: "Profile Photo", type: "file", accept: "image/jpeg,image/png", maxFileSize: 2 * 1024 * 1024, hideInTable: true, helper: "JPG/PNG, max 2 MB" },
      { name: "password", label: "Login Password (optional)", type: "text", hideInTable: true, helper: "Leave blank to use the default password (123456). Min 6 characters if set." },
      { name: "guardian", label: "Guardian", type: "text", required: true, searchable: true },
      { name: "phone", label: "Guardian Phone", type: "tel", required: true, searchable: true },
      { name: "address", label: "Address", type: "textarea", hideInTable: true },
    ],
  },
  {
    slug: "admission-form", title: "Admission Form", group: "Student Management", icon: "FileText",
    fields: [
      { name: "appliedOn", label: "Applied On", type: "date", required: true },
      { name: "firstName", label: "First Name", type: "text", required: true, searchable: true },
      { name: "middleName", label: "Middle Name", type: "text", hideInTable: true },
      { name: "lastName", label: "Last Name", type: "text", required: true, searchable: true },
      { name: "classAppliedName", label: "Class Applied", type: "text", required: true, searchable: true },
      { name: "gender", label: "Gender", type: "select", options: ["Male","Female","Other"], hideInTable: true },
      { name: "dateOfBirth", label: "Date of Birth", type: "date", hideInTable: true },
      { name: "bloodGroup", label: "Blood Group", type: "text", hideInTable: true },
      { name: "category", label: "Category", type: "text", hideInTable: true },
      { name: "religion", label: "Religion", type: "text", hideInTable: true },
      { name: "nationality", label: "Nationality", type: "text", hideInTable: true },
      { name: "aadhaar", label: "Aadhaar Number", type: "text", searchable: true, hideInTable: true },
      { name: "mobile", label: "Student Mobile", type: "tel", hideInTable: true },
      { name: "email", label: "Email", type: "email", hideInTable: true },
      { name: "guardian", label: "Guardian", type: "text", searchable: true },
      { name: "phone", label: "Guardian Phone", type: "tel", searchable: true },
      { name: "address", label: "Address", type: "textarea", hideInTable: true },
      { name: "status", label: "Status", type: "select", options: ["Pending","Approved","Rejected","Waitlist"] },
    ],
  },
  
  {
    slug: "roll-number", title: "Roll Number Management", group: "Student Management", icon: "Hash",
    fields: [
      { name: "class", label: "Class", type: "select", required: true, options: ["1","2","3","4","5","6","7","8","9","10","11","12"] },
      { name: "section", label: "Section", type: "select", required: true, options: ["A","B","C","D"] },
      { name: "admissionNo", label: "Admission No", type: "text", required: true },
      { name: "name", label: "Student", type: "text", required: true, searchable: true },
      { name: "rollNo", label: "Roll No", type: "number", required: true, min: 1 },
    ],
  },
  {
    slug: "student-reports", title: "Student Reports", group: "Student Management", icon: "BarChart3",
    fields: [
      { name: "reportName", label: "Report Name", type: "text", required: true, searchable: true },
      { name: "class", label: "Class", type: "text", searchable: true },
      { name: "term", label: "Term", type: "select", options: ["Term 1","Term 2","Term 3","Annual"] },
      { name: "generatedOn", label: "Generated On", type: "date" },
      { name: "remarks", label: "Remarks", type: "textarea", hideInTable: true },
    ],
  },
  {
    slug: "leaving-certificate", title: "School Leaving Certificate", group: "Student Management", icon: "ScrollText",
    fields: [
      { name: "certNo", label: "Certificate No", type: "text", required: true, unique: true },
      { name: "admissionNo", label: "Admission No", type: "text", searchable: true },
      { name: "grNo", label: "GR No", type: "text" },
      { name: "name", label: "Student", type: "text", required: true, searchable: true },
      { name: "nameEnglish", label: "Student Name (English)", type: "text" },
      { name: "fatherName", label: "Father's Name", type: "text" },
      { name: "dateOfBirth", label: "Date of Birth", type: "date" },
      { name: "dateOfBirthWords", label: "Date of Birth (words)", type: "text" },
      { name: "gender", label: "Gender", type: "text" },
      { name: "class", label: "Class", type: "text" },
      { name: "division", label: "Division", type: "text" },
      { name: "rollNo", label: "Roll No", type: "text" },
      { name: "studyingSince", label: "Studying Since", type: "date" },
      { name: "registerNo", label: "Register No", type: "text" },
      { name: "academicYear", label: "Academic Year", type: "text" },
      { name: "motherTongue", label: "Mother Tongue", type: "text" },
      { name: "penNo", label: "PEN No", type: "text" },
      { name: "motherName", label: "Mother's Name", type: "text" },
      { name: "religion", label: "Religion", type: "text" },
      { name: "caste", label: "Caste / Sub-caste", type: "text" },
      { name: "nationality", label: "Nationality", type: "text" },
      { name: "placeOfBirth", label: "Place of Birth", type: "text" },
      { name: "previousSchool", label: "Previous School Attended", type: "text" },
      { name: "dateOfLeaving", label: "Date of Leaving", type: "date" },
      { name: "progress", label: "Progress", type: "text" },
      { name: "conduct", label: "Conduct", type: "text" },
      { name: "reason", label: "Reason", type: "text" },
      { name: "remark", label: "Remark", type: "text" },
      { name: "issueDate", label: "Issue Date", type: "date" },
    ],
  },
  {
    slug: "bonafide-certificate", title: "Bonafide Certificate", group: "Student Management", icon: "Award",
    fields: [
      { name: "admissionNo", label: "Admission No", type: "text", searchable: true },
      { name: "name", label: "Student", type: "text", required: true, searchable: true },
      { name: "fatherName", label: "Father's Name", type: "text" },
      { name: "rollNo", label: "Roll No", type: "text" },
      { name: "class", label: "Class", type: "text" },
      { name: "division", label: "Section", type: "text" },
      { name: "purpose", label: "Purpose", type: "text", required: true },
      { name: "issueDate", label: "Issue Date", type: "date" },
    ],
  },
  {
    slug: "outgoing-students", title: "Outgoing Student Records", group: "Student Management", icon: "LogOut",
    fields: [
      { name: "name", label: "Student", type: "text", required: true, searchable: true },
      { name: "class", label: "Class", type: "text" },
      { name: "leavingDate", label: "Leaving Date", type: "date" },
      { name: "destination", label: "Destination", type: "text" },
    ],
  },
  {
    slug: "dispatch-register", title: "Dispatch Register", group: "Student Management", icon: "Send",
    fields: [
      { name: "dispatchNo", label: "Dispatch No", type: "text", required: true, unique: true },
      { name: "date", label: "Date", type: "date", required: true },
      { name: "to", label: "Recipient", type: "text", required: true, searchable: true },
      { name: "subject", label: "Subject", type: "text", searchable: true },
      { name: "mode", label: "Mode", type: "select", options: ["Post","Courier","Email","Hand"] },
    ],
  },
  {
    slug: "caste-report", title: "Caste Report", group: "Student Management", icon: "Users",
    fields: [
      { name: "name", label: "Student", type: "text", required: true, searchable: true },
      { name: "class", label: "Class", type: "text" },
      { name: "caste", label: "Caste", type: "text" },
      { name: "category", label: "Category", type: "select", options: ["General","OBC","SC","ST","VJNT","SBC"] },
    ],
  },
  {
    slug: "minority-report", title: "Minority Report", group: "Student Management", icon: "Users",
    fields: [
      { name: "name", label: "Student", type: "text", required: true, searchable: true },
      { name: "class", label: "Class", type: "text" },
      { name: "religion", label: "Religion", type: "text" },
      { name: "minorityCategory", label: "Minority Category", type: "text" },
    ],
  },

  // ── Attendance ────────────────────────────────────────────────
  {
    slug: "mark-attendance", title: "Mark Attendance", group: "Attendance Management", icon: "CheckSquare",
    fields: [
      { name: "date", label: "Date", type: "date", required: true },
      { name: "class", label: "Class", type: "select", required: true, options: ["1","2","3","4","5","6","7","8","9","10","11","12"] },
      { name: "section", label: "Section", type: "select", options: ["A","B","C","D"] },
      { name: "present", label: "Present", type: "number", min: 0 },
      { name: "absent", label: "Absent", type: "number", min: 0 },
      { name: "total", label: "Total", type: "number", min: 0 },
    ],
  },
  {
    slug: "attendance-register", title: "Attendance Register", group: "Attendance Management", icon: "BookOpen",
    fields: [
      { name: "date", label: "Date", type: "date", required: true },
      { name: "name", label: "Student", type: "text", required: true, searchable: true },
      { name: "class", label: "Class", type: "text" },
      { name: "status", label: "Status", type: "select", required: true, options: ["Present","Absent","Late","Leave"] },
    ],
  },

  // ── Student Register ──────────────────────────────────────────
  {
    slug: "student-register", title: "Student Register", group: "Student Register", icon: "ClipboardList",
    fields: [
      { name: "srNo", label: "Sr. No", type: "number", min: 1 },
      { name: "admissionNo", label: "Admission No", type: "text", required: true, unique: true, searchable: true },
      { name: "name", label: "Student", type: "text", required: true, searchable: true },
      { name: "class", label: "Class", type: "text" },
      { name: "dob", label: "Date of Birth", type: "date" },
      { name: "admissionDate", label: "Admission Date", type: "date" },
    ],
  },

  // ── Fee Management ────────────────────────────────────────────
  {
    slug: "fee-collection", title: "Fee Collection", group: "Fee Management", icon: "Receipt",
    fields: [
      { name: "receiptNo", label: "Receipt No", type: "text", required: true, unique: true },
      { name: "date", label: "Date", type: "date", required: true },
      { name: "name", label: "Student", type: "text", required: true, searchable: true },
      { name: "class", label: "Class", type: "text" },
      { name: "amount", label: "Amount (₹)", type: "number", required: true, min: 0 },
      { name: "mode", label: "Payment Mode", type: "select", options: ["Cash","UPI","Card","Cheque","Bank transfer"] },
    ],
  },
  {
    slug: "fee-report", title: "Fee Report", group: "Fee Management", icon: "IndianRupee",
    fields: [
      { name: "month", label: "Month", type: "text", required: true },
      { name: "class", label: "Class", type: "text" },
      { name: "collected", label: "Collected (₹)", type: "number", min: 0 },
      { name: "pending", label: "Pending (₹)", type: "number", min: 0 },
    ],
  },

  // ── Mid-Day Meal ──────────────────────────────────────────────
  { slug: "meal-quantity", title: "Meal Quantity", group: "Mid-Day Meal", icon: "Utensils",
    fields: [
      { name: "date", label: "Date", type: "date", required: true },
      { name: "class", label: "Class", type: "text", required: true },
      { name: "students", label: "Students", type: "number", min: 0 },
      { name: "quantityKg", label: "Quantity (kg)", type: "number", min: 0 },
    ]},
  { slug: "meal-menu", title: "Meal Menu", group: "Mid-Day Meal", icon: "Utensils",
    fields: [
      { name: "day", label: "Day", type: "select", required: true, options: ["Mon","Tue","Wed","Thu","Fri","Sat"] },
      { name: "breakfast", label: "Breakfast", type: "text" },
      { name: "lunch", label: "Lunch", type: "text" },
      { name: "snacks", label: "Snacks", type: "text" },
    ]},
  { slug: "stock-receipt", title: "Stock Receipt", group: "Mid-Day Meal", icon: "PackagePlus",
    fields: [
      { name: "date", label: "Date", type: "date", required: true },
      { name: "item", label: "Item", type: "text", required: true, searchable: true },
      { name: "quantity", label: "Quantity", type: "number", min: 0 },
      { name: "unit", label: "Unit", type: "select", options: ["kg","g","L","ml","pcs"] },
      { name: "supplier", label: "Supplier", type: "text", searchable: true },
      { name: "invoiceNo", label: "Invoice No", type: "text" },
    ]},
  { slug: "mdm-daily-register", title: "MDM Daily Register", group: "Mid-Day Meal", icon: "BookOpen",
    fields: [
      { name: "date", label: "Date", type: "date", required: true },
      { name: "class", label: "Class", type: "text" },
      { name: "students", label: "Students", type: "number", min: 0 },
      { name: "mealServed", label: "Meal Served", type: "text" },
    ]},
  { slug: "mdm-current-stock", title: "MDM Current Stock", group: "Mid-Day Meal", icon: "Package",
    fields: [
      { name: "item", label: "Item", type: "text", required: true, searchable: true },
      { name: "quantity", label: "Quantity", type: "number", min: 0 },
      { name: "unit", label: "Unit", type: "select", options: ["kg","g","L","ml","pcs"] },
      { name: "lastUpdate", label: "Last Update", type: "date" },
    ]},
  { slug: "indent-request", title: "Indent Request", group: "Mid-Day Meal", icon: "ClipboardCheck",
    fields: [
      { name: "reqNo", label: "Request No", type: "text", required: true, unique: true },
      { name: "date", label: "Date", type: "date", required: true },
      { name: "item", label: "Item", type: "text", required: true, searchable: true },
      { name: "quantity", label: "Quantity", type: "number", min: 0 },
      { name: "status", label: "Status", type: "select", options: ["Pending","Approved","Received","Rejected"] },
    ]},
  { slug: "egg-banana-report", title: "Egg & Banana Report", group: "Mid-Day Meal", icon: "Egg",
    fields: [
      { name: "date", label: "Date", type: "date", required: true },
      { name: "class", label: "Class", type: "text" },
      { name: "eggs", label: "Eggs", type: "number", min: 0 },
      { name: "bananas", label: "Bananas", type: "number", min: 0 },
    ]},
  { slug: "food-taste-report", title: "Food Taste Report", group: "Mid-Day Meal", icon: "Star",
    fields: [
      { name: "date", label: "Date", type: "date", required: true },
      { name: "tester", label: "Tester", type: "text" },
      { name: "rating", label: "Rating (1-5)", type: "number", min: 1, max: 5 },
      { name: "remarks", label: "Remarks", type: "textarea", hideInTable: true },
    ]},
  { slug: "bmi-report", title: "BMI Report", group: "Mid-Day Meal", icon: "Activity",
    fields: [
      { name: "name", label: "Student", type: "text", required: true, searchable: true },
      { name: "class", label: "Class", type: "text" },
      { name: "heightCm", label: "Height (cm)", type: "number", min: 0 },
      { name: "weightKg", label: "Weight (kg)", type: "number", min: 0 },
      { name: "bmi", label: "BMI", type: "number", min: 0 },
    ]},
  { slug: "mdm-certificate", title: "MDM Certificate", group: "Mid-Day Meal", icon: "Award",
    fields: [
      { name: "certNo", label: "Certificate No", type: "text", required: true, unique: true },
      { name: "name", label: "Student", type: "text", required: true, searchable: true },
      { name: "class", label: "Class", type: "text" },
      { name: "issueDate", label: "Issue Date", type: "date" },
    ]},

  // ── Examination (State Board) ─────────────────────────────────
  ...examBoardModules("Examination & Results", "", ""),
  // ── ICSE ──────────────────────────────────────────────────────
  ...examBoardModules("ICSE Examination & Results", "icse-", "ICSE "),
  // ── CBSE ──────────────────────────────────────────────────────
  ...cbseModules(),

  // ── Staff ─────────────────────────────────────────────────────
  { slug: "add-staff", title: "Add Staff", group: "Staff Management", icon: "UserCog",
    fields: [
      { name: "employeeId", label: "Employee ID", type: "text", unique: true, searchable: true, helper: "Leave blank to auto-generate" },
      { name: "firstName", label: "First Name", type: "text", required: true, searchable: true },
      { name: "middleName", label: "Middle Name", type: "text" },
      { name: "lastName", label: "Last Name", type: "text", required: true, searchable: true },
      { name: "dateOfBirth", label: "Date of Birth", type: "date", required: true },
      { name: "gender", label: "Gender", type: "select", options: ["MALE", "FEMALE", "OTHER"], required: true },
      { name: "email", label: "Email", type: "email", required: true, searchable: true, unique: true },
      { name: "phone", label: "Phone", type: "tel", required: true, searchable: true },
      { name: "designation", label: "Designation", type: "text", required: true, searchable: true },
      { name: "department", label: "Department", type: "text", searchable: true },
      { name: "joiningDate", label: "Joining Date", type: "date", required: true },
      { name: "address", label: "Address", type: "textarea", hideInTable: true },
    ]},
  { slug: "staff-payroll", title: "Staff Payroll", group: "Staff Management", icon: "Wallet",
    fields: [
      { name: "empId", label: "Employee ID", type: "text", required: true },
      { name: "name", label: "Name", type: "text", required: true, searchable: true },
      { name: "month", label: "Month", type: "text", required: true },
      { name: "gross", label: "Gross (₹)", type: "number", min: 0 },
      { name: "deductions", label: "Deductions (₹)", type: "number", min: 0 },
      { name: "net", label: "Net (₹)", type: "number", min: 0 },
    ]},
  { slug: "staff-id-card", title: "Staff ID Card", group: "Staff Management", icon: "IdCard",
    fields: [
      { name: "empId", label: "Employee ID", type: "text", required: true },
      { name: "name", label: "Name", type: "text", required: true, searchable: true },
      { name: "role", label: "Role", type: "text" },
      { name: "issueDate", label: "Issue Date", type: "date" },
    ]},

  // ── Online Test ───────────────────────────────────────────────
  { slug: "create-test", title: "Create Test", group: "Online Test", icon: "PenSquare",
    fields: [
      { name: "testName", label: "Test Name", type: "text", required: true, searchable: true },
      { name: "subject", label: "Subject", type: "text", searchable: true },
      { name: "class", label: "Class", type: "text" },
      { name: "date", label: "Date", type: "date" },
      { name: "durationMin", label: "Duration (min)", type: "number", min: 1 },
    ]},
  { slug: "take-test", title: "Take Test", group: "Online Test", icon: "MonitorPlay",
    fields: [
      { name: "testName", label: "Test", type: "text", required: true },
      { name: "student", label: "Student", type: "text", required: true, searchable: true },
      { name: "startedAt", label: "Started At", type: "date" },
      { name: "submittedAt", label: "Submitted At", type: "date" },
    ]},
  { slug: "test-results", title: "Test Results", group: "Online Test", icon: "Trophy",
    fields: [
      { name: "testName", label: "Test", type: "text", required: true },
      { name: "student", label: "Student", type: "text", required: true, searchable: true },
      { name: "score", label: "Score", type: "number", min: 0 },
      { name: "percentage", label: "Percentage", type: "number", min: 0, max: 100 },
    ]},

  // ── Timetable ─────────────────────────────────────────────────
  { slug: "view-timetable", title: "Timetable", group: "Timetable", icon: "CalendarClock",
    fields: [
      { name: "class", label: "Class", type: "text", required: true },
      { name: "day", label: "Day", type: "select", required: true, options: ["Mon","Tue","Wed","Thu","Fri","Sat"] },
      { name: "period", label: "Period", type: "number", min: 1, max: 10 },
      { name: "subject", label: "Subject", type: "text" },
      { name: "teacher", label: "Teacher", type: "text" },
    ]},

  // ── Inventory ─────────────────────────────────────────────────
  { slug: "add-item", title: "Add Item", group: "Inventory", icon: "PackagePlus",
    fields: [
      { name: "itemCode", label: "Item Code", type: "text", required: true, unique: true, searchable: true },
      { name: "name", label: "Item Name", type: "text", required: true, searchable: true },
      { name: "category", label: "Category", type: "text", searchable: true },
      { name: "unit", label: "Unit", type: "select", options: ["kg","g","L","ml","pcs","box"] },
      { name: "reorderLevel", label: "Reorder Level", type: "number", min: 0 },
    ]},
  
  { slug: "stock-in", title: "Stock In", group: "Inventory", icon: "ArrowDownToLine",
    fields: [
      { name: "category", label: "Category", type: "text", required: true, searchable: true },
      { name: "material", label: "Material", type: "text", required: true, searchable: true },
      { name: "brandName", label: "Brand Name", type: "text" },
      { name: "receiptNumber", label: "Receipt Number", type: "text" },
      { name: "quantity", label: "Quantity", type: "number", required: true, min: 0 },
      { name: "requiredQuantity", label: "Required Quantity", type: "number", min: 0 },
      { name: "pricePerUnit", label: "Price Per Unit (₹)", type: "number", required: true, min: 0 },
    ]},
    
  
  //{ slug: "inventory-current-stock", title: "Current Stock", group: "Inventory", icon: "Package",
   // fields: [
    //  { name: "item", label: "Item", type: "text", required: true, searchable: true },
    //  { name: "quantity", label: "Quantity", type: "number", min: 0 },
    //  { name: "unit", label: "Unit", type: "text" },
   // ]},
  

  // ✅ SUPPLIER MANAGEMENT - CORRECTLY PLACED
  { slug: "supplier-management", title: "Supplier Management", group: "Inventory", icon: "Truck",
    fields: [
      { name: "name", label: "Supplier Name", type: "text", required: true, searchable: true },
      { name: "contact", label: "Contact Person", type: "text", searchable: true },
      { name: "phone", label: "Phone", type: "tel", required: true, searchable: true },
      { name: "email", label: "Email", type: "email", searchable: true },
      { name: "category", label: "Category", type: "select", options: ["Stationery","Books","Furniture","Electronics","Computer Equipment","Cleaning Supplies","Sports Equipment","Laboratory Equipment","Office Supplies","Uniform","Grocery","Other"] },
      { name: "gstNumber", label: "GST Number", type: "text" },
      { name: "city", label: "City", type: "text", searchable: true },
      { name: "address", label: "Address", type: "textarea", hideInTable: true },
      { name: "status", label: "Status", type: "select", options: ["active","inactive"] },
      { name: "notes", label: "Notes", type: "textarea", hideInTable: true },
    ]},

  { slug: "inventory-report", title: "Inventory Report", group: "Inventory", icon: "BarChart3",
    fields: [
      { name: "month", label: "Month (e.g. 2026-08)", type: "text", required: true, searchable: true },
      { name: "monthLabel", label: "Month Label (e.g. August 2026)", type: "text", required: true },
      { name: "totalItems", label: "Total Items", type: "number", required: true, min: 0 },
      { name: "totalQuantity", label: "Total Quantity", type: "number", required: true, min: 0 },
      { name: "totalValue", label: "Total Value (₹)", type: "number", required: true, min: 0 },
      { name: "lowStockItems", label: "Low Stock Items", type: "number", required: true, min: 0 },
      { name: "categories", label: "Categories Summary", type: "textarea", required: true, hideInTable: true, helper: "Free-text summary, e.g. \"Stationery: 40, Sports: 12\"" },
      { name: "generatedOn", label: "Generated On", type: "date", required: true },
    ]},

  // ── Teacher Dashboard ──────────────────────────────────────────
  {
    slug: "study-material", title: "Study Material", group: "Teacher Dashboard", icon: "BookOpen",
    description: "Upload and manage study material for your classes",
    fields: [
      { name: "title", label: "Title", type: "text", required: true, searchable: true },
      { name: "class", label: "Class", type: "select", required: true, options: ["Nursery","LKG","UKG","1","2","3","4","5","6","7","8","9","10","11","12"] },
      { name: "section", label: "Section", type: "select", options: ["A","B","C","D"] },
      { name: "subject", label: "Subject", type: "text", required: true, searchable: true },
      { name: "description", label: "Description", type: "textarea", hideInTable: true },
      { name: "file", label: "Material File", type: "file", accept: "application/pdf,image/jpeg,image/png", maxFileSize: 5 * 1024 * 1024, helper: "PDF/JPG/PNG, max 5 MB" },
      { name: "uploadedOn", label: "Uploaded On", type: "date", required: true },
    ],
    permissions: {
      view: ["SUPER_ADMIN", "PRINCIPAL", "ADMIN", "TEACHER"],
      create: ["SUPER_ADMIN", "PRINCIPAL", "ADMIN", "TEACHER"],
      update: ["SUPER_ADMIN", "PRINCIPAL", "ADMIN", "TEACHER"],
      delete: ["SUPER_ADMIN", "PRINCIPAL", "ADMIN", "TEACHER"],
    },
  },

  // ── Student Dashboard ──────────────────────────────────────────
  {
    slug: "my-results", title: "My Results", group: "Student Dashboard", icon: "Award",
    description: "View your own exam results",
    fields: [],
    permissions: {
      view: ["STUDENT"],
      create: [],
      update: [],
      delete: [],
    },
  },

  // ── Accountant ───────────────────────────────────────────────
  {
    slug: "accountant-dashboard", title: "Accountant Dashboard", group: "Accountant", icon: "LayoutDashboard",
    description: "Overview of collections, dues, and quick fee collection",
    fields: [],
    permissions: ACCOUNTANT_PERMISSIONS,
  },
   {
    slug: "fee-collection", title: "Fee Setup", group: "Accountant", icon: "Settings",
    description: "Configure fee heads and structures",
    fields: [],
    permissions: ACCOUNTANT_PERMISSIONS,
  },
  {
    slug: "receipts", title: "Receipts", group: "Accountant", icon: "Receipt",
    description: "View and issue payment receipts",
    fields: [],
    permissions: ACCOUNTANT_PERMISSIONS,
  },
  {
    slug: "pending-fees", title: "Pending Fees", group: "Accountant", icon: "TrendingDown",
    description: "Track outstanding student fee dues",
    fields: [],
    permissions: ACCOUNTANT_PERMISSIONS,
  },
  {
    slug: "accountant-defaulters", title: "Defaulters", group: "Accountant", icon: "AlertTriangle",
    description: "Students overdue on fee payments",
    fields: [],
    permissions: ACCOUNTANT_PERMISSIONS,
  },
  {
    slug: "expenses", title: "Expenses", group: "Accountant", icon: "Wallet",
    description: "Track school expenses by category",
    fields: [],
    permissions: ACCOUNTANT_PERMISSIONS,
  },
  {
    slug: "salary", title: "Salary", group: "Accountant", icon: "Banknote",
    description: "Staff salary disbursement records",
    fields: [],
    permissions: ACCOUNTANT_PERMISSIONS,
  },
  {
    slug: "discounts", title: "Discounts", group: "Accountant", icon: "Percent",
    description: "Manage fee discounts and waivers",
    fields: [],
    permissions: ACCOUNTANT_PERMISSIONS,
  },
  {
    slug: "payment-plans", title: "Payment Plans", group: "Accountant", icon: "CalendarClock",
    description: "Installment-based fee payment plans",
    fields: [],
    permissions: ACCOUNTANT_PERMISSIONS,
  },
  {
    slug: "bank-accounts", title: "Bank Accounts", group: "Accountant", icon: "Landmark",
    description: "School bank account management",
    fields: [],
    permissions: ACCOUNTANT_PERMISSIONS,
  },
  {
    slug: "financial-reports", title: "Financial Reports", group: "Accountant", icon: "BarChart3",
    description: "Overall financial summary and reports",
    fields: [],
    permissions: ACCOUNTANT_PERMISSIONS,
  },
  {
    slug: "accountant-notifications", title: "Notifications", group: "Accountant", icon: "Bell",
    description: "Accountant module notifications",
    fields: [],
    permissions: ACCOUNTANT_PERMISSIONS,
  },
  {
    slug: "accountant-audit", title: "Audit Log", group: "Accountant", icon: "History",
    description: "Audit trail of accountant actions",
    fields: [],
    permissions: ACCOUNTANT_PERMISSIONS,
  },

 // {
   // slug: "fee-setup", title: "Fee Setup", group: "Accountant", icon: "Settings",
   // description: "Configure fee heads and structures",
    //fields: [],
    //permissions: ACCOUNTANT_PERMISSIONS,
  //},
  ///{
   // slug: "receipts", title: "Receipts", group: "Accountant", icon: "Receipt",
    //description: "View and issue payment receipts",
   // fields: [],
    //permissions: ACCOUNTANT_PERMISSIONS,
  //},
 // {
  //  slug: "pending-fees", title: "Pending Fees", group: "Accountant", icon: "TrendingDown",
  //  description: "Track outstanding student fee dues",
   // fields: [],
   // permissions: ACCOUNTANT_PERMISSIONS,
  //},
  //{
    //slug: "accountant-defaulters", title: "Defaulters", group: "Accountant", icon: "AlertTriangle",
    //description: "Students overdue on fee payments",
    //fields: [],
    //permissions: ACCOUNTANT_PERMISSIONS,
  //},
  //{
   // slug: "expenses", title: "Expenses", group: "Accountant", icon: "Wallet",
    //description: "Track school expenses by category",
    //fields: [],
    //permissions: ACCOUNTANT_PERMISSIONS,
  //},
 // {
  //  slug: "salary", title: "Salary", group: "Accountant", icon: "Banknote",
   // description: "Staff salary disbursement records",
    //fields: [],
    //permissions: ACCOUNTANT_PERMISSIONS,
  //},
  //{
   // slug: "discounts", title: "Discounts", group: "Accountant", icon: "Percent",
    //description: "Manage fee discounts and waivers",
    //fields: [],
    //permissions: ACCOUNTANT_PERMISSIONS,
  //},
  //{
   // slug: "payment-plans", title: "Payment Plans", group: "Accountant", icon: "CalendarClock",
    //description: "Installment-based fee payment plans",
   // fields: [],
    //permissions: ACCOUNTANT_PERMISSIONS,
  //},
  //{
   // slug: "bank-accounts", title: "Bank Accounts", group: "Accountant", icon: "Landmark",
    //description: "School bank account management",
    //fields: [],
    //permissions: ACCOUNTANT_PERMISSIONS,
  //},
  //{
   // slug: "financial-reports", title: "Financial Reports", group: "Accountant", icon: "BarChart3",
    //description: "Overall financial summary and reports",
    //fields: [],
    //permissions: ACCOUNTANT_PERMISSIONS,
  //},
  //{
   // slug: "accountant-notifications", title: "Notifications", group: "Accountant", icon: "Bell",
    //description: "Accountant module notifications",
    //fields: [],
    //permissions: ACCOUNTANT_PERMISSIONS,
  //},
  //{
    //slug: "accountant-audit", title: "Audit Log", group: "Accountant", icon: "History",
    //description: "Audit trail of accountant actions",
   // fields: [],
    //permissions: ACCOUNTANT_PERMISSIONS,
  //},
];

function examBoardModules(group: string, slugPrefix: string, titlePrefix: string): ModuleDef[] {
  return [
    { slug: slugPrefix + "marks-entry", title: titlePrefix + "Marks Entry", group, icon: "PenLine",
      fields: [
        { name: "examName", label: "Exam", type: "text", required: true, searchable: true },
        { name: "class", label: "Class", type: "text", required: true },
        { name: "subject", label: "Subject", type: "text", required: true, searchable: true },
        { name: "name", label: "Student", type: "text", required: true, searchable: true },
        { name: "marks", label: "Marks", type: "number", required: true, min: 0 },
        { name: "maxMarks", label: "Max Marks", type: "number", min: 1 },
      ]},
    { slug: slugPrefix + "progress-report", title: titlePrefix + "Progress Report", group, icon: "TrendingUp",
      fields: [
        { name: "name", label: "Student", type: "text", required: true, searchable: true },
        { name: "class", label: "Class", type: "text" },
        { name: "term", label: "Term", type: "select", options: ["Term 1","Term 2","Term 3","Annual"] },
        { name: "percentage", label: "Percentage", type: "number", min: 0, max: 100 },
        { name: "remarks", label: "Remarks", type: "textarea", hideInTable: true },
      ]},
    ...(slugPrefix === "" ? [
      { slug: "consolidated-results", title: "Consolidated Results", group, icon: "BarChart3",
        fields: [
          { name: "class", label: "Class", type: "text", required: true },
          { name: "term", label: "Term", type: "text" },
          { name: "passCount", label: "Passed", type: "number", min: 0 },
          { name: "failCount", label: "Failed", type: "number", min: 0 },
        ]} as ModuleDef,
    ] : []),
    { slug: slugPrefix + "subject-wise-results", title: titlePrefix + "Subject-wise Results", group, icon: "Layers",
      fields: [
        { name: "subject", label: "Subject", type: "text", required: true, searchable: true },
        { name: "class", label: "Class", type: "text" },
        { name: "avgMarks", label: "Average", type: "number", min: 0 },
        ...(slugPrefix === "" ? [
          { name: "highest", label: "Highest", type: "number" as const, min: 0 },
          { name: "lowest", label: "Lowest", type: "number" as const, min: 0 },
        ] : []),
      ]},
    { slug: slugPrefix + "grade-wise-results", title: titlePrefix + "Grade-wise Results", group, icon: "Award",
      fields: [
        { name: "grade", label: "Grade", type: "select", required: true, options: ["A+","A","B+","B","C","D","F"] },
        { name: "count", label: "Count", type: "number", min: 0 },
        ...(slugPrefix === "" ? [{ name: "percentage", label: "Percentage", type: "number" as const, min: 0, max: 100 }] : []),
      ]},
    ...(slugPrefix === "" ? [
      { slug: "exam-daily-register", title: "Exam Daily Register", group, icon: "BookOpen",
        fields: [
          { name: "date", label: "Date", type: "date", required: true },
          { name: "class", label: "Class", type: "text" },
          { name: "subject", label: "Subject", type: "text" },
          { name: "attended", label: "Attended", type: "number", min: 0 },
          { name: "absent", label: "Absent", type: "number", min: 0 },
        ]} as ModuleDef,
      { slug: "grade-5-8-results", title: "Grade 5, 8, 9 & 10 Results", group, icon: "GraduationCap",
        fields: [
          { name: "name", label: "Student", type: "text", required: true, searchable: true },
          { name: "class", label: "Class", type: "select", options: ["5","8","9","10"] },
          { name: "percentage", label: "Percentage", type: "number", min: 0, max: 100 },
          { name: "result", label: "Result", type: "select", options: ["Pass","Fail"] },
        ]} as ModuleDef,
      { slug: "ssc-results", title: "SSC Results", group, icon: "GraduationCap",
        fields: [
          { name: "name", label: "Student", type: "text", required: true, searchable: true },
          { name: "rollNo", label: "Roll No", type: "text", searchable: true },
          { name: "percentage", label: "Percentage", type: "number", min: 0, max: 100 },
          { name: "grade", label: "Grade", type: "text" },
        ]} as ModuleDef,
      { slug: "hsc-results", title: "HSC Results", group, icon: "GraduationCap",
        fields: [
          { name: "name", label: "Student", type: "text", required: true, searchable: true },
          { name: "rollNo", label: "Roll No", type: "text", searchable: true },
          { name: "percentage", label: "Percentage", type: "number", min: 0, max: 100 },
          { name: "grade", label: "Grade", type: "text" },
        ]} as ModuleDef,
      { slug: "view-reports", title: "View Reports", group, icon: "FileBarChart",
        fields: [
          { name: "title", label: "Title", type: "text", required: true, searchable: true },
          { name: "type", label: "Type", type: "text" },
          { name: "date", label: "Date", type: "date" },
          { name: "generatedBy", label: "Generated By", type: "text" },
        ]} as ModuleDef,
    ] : []),
    ...(slugPrefix === "icse-" ? [
      { slug: "icse-preliminary-progress", title: "ICSE Preliminary Progress", group, icon: "TrendingUp",
        fields: [
          { name: "name", label: "Student", type: "text", required: true, searchable: true },
          { name: "class", label: "Class", type: "text" },
          { name: "percentage", label: "Percentage", type: "number", min: 0, max: 100 },
        ]} as ModuleDef,
      { slug: "icse-view-reports", title: "ICSE View Reports", group, icon: "FileBarChart",
        fields: [
          { name: "title", label: "Title", type: "text", required: true, searchable: true },
          { name: "type", label: "Type", type: "text" },
          { name: "date", label: "Date", type: "date" },
        ]} as ModuleDef,
    ] : []),
    { slug: slugPrefix + "student-promotion", title: titlePrefix + "Student Promotion", group, icon: "ArrowUpCircle",
      fields: [
        { name: "name", label: "Student", type: "text", required: true, searchable: true },
        { name: "fromClass", label: "From Class", type: "text" },
        { name: "toClass", label: "To Class", type: "text" },
        { name: "status", label: "Status", type: "select", options: slugPrefix ? ["Promoted","Detained"] : ["Promoted","Detained","Passed with grace"] },
      ]},
  ];
}

function cbseModules(): ModuleDef[] {
  const g = "CBSE Examination & Results";
  return [
    { slug: "cbse-marks-entry", title: "CBSE Marks Entry", group: g, icon: "PenLine",
      fields: [
        { name: "examName", label: "Exam", type: "text", required: true, searchable: true },
        { name: "class", label: "Class", type: "text", required: true },
        { name: "subject", label: "Subject", type: "text", required: true, searchable: true },
        { name: "name", label: "Student", type: "text", required: true, searchable: true },
        { name: "marks", label: "Marks", type: "number", required: true, min: 0 },
        { name: "maxMarks", label: "Max Marks", type: "number", min: 1 },
      ]},
    { slug: "cbse-high-school-results", title: "CBSE High School Results", group: g, icon: "GraduationCap",
      fields: [
        { name: "name", label: "Student", type: "text", required: true, searchable: true },
        { name: "class", label: "Class", type: "text" },
        { name: "percentage", label: "Percentage", type: "number", min: 0, max: 100 },
        { name: "grade", label: "Grade", type: "text" },
      ]},
    { slug: "cbse-primary-results", title: "CBSE Primary Results", group: g, icon: "GraduationCap",
      fields: [
        { name: "name", label: "Student", type: "text", required: true, searchable: true },
        { name: "class", label: "Class", type: "text" },
        { name: "percentage", label: "Percentage", type: "number", min: 0, max: 100 },
      ]},
    { slug: "cbse-pre-primary-results", title: "CBSE Pre-Primary Results", group: g, icon: "GraduationCap",
      fields: [
        { name: "name", label: "Student", type: "text", required: true, searchable: true },
        { name: "class", label: "Class", type: "text" },
        { name: "remarks", label: "Remarks", type: "text" },
      ]},
    { slug: "cbse-subject-wise-results", title: "CBSE Subject-wise Results", group: g, icon: "Layers",
      fields: [
        { name: "subject", label: "Subject", type: "text", required: true, searchable: true },
        { name: "class", label: "Class", type: "text" },
        { name: "avgMarks", label: "Average", type: "number", min: 0 },
      ]},
    { slug: "cbse-student-promotion", title: "CBSE Student Promotion", group: g, icon: "ArrowUpCircle",
      fields: [
        { name: "name", label: "Student", type: "text", required: true, searchable: true },
        { name: "fromClass", label: "From Class", type: "text" },
        { name: "toClass", label: "To Class", type: "text" },
        { name: "status", label: "Status", type: "select", options: ["Promoted","Detained"] },
      ]},
  ];
}

export function getModule(slug: string): ModuleDef | undefined {
  return MODULES.find((m) => m.slug === slug);
}

export function modulesByGroup(): Record<string, ModuleDef[]> {
  return MODULES.reduce<Record<string, ModuleDef[]>>((acc, m) => {
    (acc[m.group] ||= []).push(m);
    return acc;
  }, {});
}