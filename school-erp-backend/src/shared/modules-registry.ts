// This should match your frontend registry

export interface FieldDef {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  searchable?: boolean;
  min?: number;
  max?: number;
  options?: string[];
  unique?: boolean;      // ✅ ADD THIS
  hideInTable?: boolean; // ✅ ADD THIS
  placeholder?: string;  // ✅ ADD THIS
  helper?: string;       // ✅ ADD THIS
  readOnly?: boolean;
  accept?: string;
  maxFileSize?: number;
}

export interface ModuleDef {
  slug: string;
  title: string;
  group: string;
  icon?: string;         // ✅ ADD THIS (optional)
  fields: FieldDef[];
  description?: string;  // ✅ ADD THIS
  permissions?: {
    view?: string[];
    create?: string[];
    update?: string[];
    delete?: string[];
  };
}

// ✅ API Endpoint Mapping - Maps frontend slug to backend API endpoint
export const API_ENDPOINT_MAP: Record<string, string> = {
  // ── Student Management (Core - Real Backend) ──
  "new-student": "students",
  "admission-form": "students",
  "admission-open-classes": "generic/admission-open-classes",
  "roll-number": "students",
  "student-reports": "students/reports",
  "leaving-certificate": "students/certificates",
  "bonafide-certificate": "students/certificates",
  "outgoing-students": "students/outgoing",
  "dispatch-register": "students/dispatch",
  "caste-report": "students/caste",
  "minority-report": "students/minority",
  
  // ── Attendance (Core - Real Backend) ──
  "mark-attendance": "attendance",
  "attendance-register": "attendance/register",
  
  // ── Student Register (Core - Real Backend) ──
  "student-register": "students/register",
  
  // ── Fee Management (Core - Real Backend) ──
  "fee-collection": "fees",
  "fee-report": "fees/report",
  
  // ── Staff Management (Core - Real Backend) ──
  "add-staff": "teachers",
  "staff-payroll": "payroll",
  "staff-id-card": "teachers/id-cards",
  
  // ── Timetable (Core - Real Backend) ──
  "view-timetable": "timetable",
  
  // ── Online Test (Core - Real Backend) ──
  "create-test": "tests",
  "take-test": "tests/take",
  "test-results": "tests/results",
  
  // ── Inventory (Core - Real Backend) ──
  "add-item": "inventory",  // ✅ UNCOMMENTED
  //"item-category": "inventory/categories",
  "stock-in": "inventory/stock-in",
  //"stock-out": "inventory/stock-out",
  //"inventory-current-stock": "inventory/stock",
  //"purchase-order": "inventory/purchase-orders",
  "supplier-management": "inventory/suppliers",
  "inventory-report": "inventory/reports",
  //"low-stock-alert": "inventory/low-stock",
  
  // ── Examination (Core - Real Backend) ──
  "marks-entry": "exams/marks",
  "progress-report": "exams/progress",
  "consolidated-results": "exams/consolidated",
  "subject-wise-results": "exams/subject-wise",
  "grade-wise-results": "exams/grade-wise",
  "exam-daily-register": "exams/daily-register",
  "grade-5-8-results": "exams/grade-5-8",
  "ssc-results": "exams/ssc",
  "hsc-results": "exams/hsc",
  "view-reports": "exams/reports",
  "student-promotion": "exams/promotion",
  "grade-9-10-results": "exams/grade-9-10",
  
  // ── ICSE ──
  "icse-marks-entry": "icse/marks",
  "icse-progress-report": "icse/progress",
  "icse-subject-wise-results": "icse/subject-wise",
  "icse-grade-wise-results": "icse/grade-wise",
  "icse-student-promotion": "icse/promotion",
  "icse-preliminary-progress": "icse/preliminary",
  "icse-view-reports": "icse/reports",
  
  // ── CBSE ──
  "cbse-marks-entry": "cbse/marks",
  "cbse-high-school-results": "cbse/high-school",
  "cbse-primary-results": "cbse/primary",
  "cbse-pre-primary-results": "cbse/pre-primary",
  "cbse-subject-wise-results": "cbse/subject-wise",
  "cbse-student-promotion": "cbse/promotion",

  // ── Teacher Dashboard ──
  "study-material": "generic/study-material",
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

export function getPermissions(module: ModuleDef) {
  return { ...DEFAULT_PERMISSIONS, ...module.permissions };
}

export const MODULES: ModuleDef[] = [
  // ── Student Management ─────────────────────────────────────────
  {
    slug: "new-student",
    title: "New Student",
    group: "Student Management",
    icon: "UserPlus",
    fields: [
      { name: "admissionNo", label: "Admission No", type: "text", required: true, searchable: true },
      { name: "grNo", label: "GR No", type: "text", required: true, searchable: true },
      { name: "firstName", label: "First Name", type: "text", required: true, searchable: true },
      { name: "lastName", label: "Last Name", type: "text", searchable: true },
      { name: "dateOfBirth", label: "Date of Birth", type: "date", required: true },
      { name: "gender", label: "Gender", type: "select", required: true, options: ["MALE", "FEMALE", "OTHER"] },
      { name: "mobile", label: "Mobile", type: "tel", required: true, searchable: true },
      { name: "email", label: "Email", type: "email", searchable: true },
      { name: "address", label: "Address", type: "textarea" },
      { name: "guardianName", label: "Guardian Name", type: "text", required: true, searchable: true },
      { name: "guardianRelation", label: "Guardian Relation", type: "select", required: true, options: ["FATHER", "MOTHER", "GUARDIAN", "UNCLE", "AUNT", "GRANDFATHER", "GRANDMOTHER", "SIBLING", "OTHER"] },
      { name: "guardianMobile", label: "Guardian Mobile", type: "tel", required: true, searchable: true },
      { name: "classId", label: "Class", type: "text", required: true },
      { name: "sectionId", label: "Section", type: "text", required: true },
    ],
  },
  {
    slug: "admission-form",
    title: "Admission Form",
    group: "Student Management",
    icon: "FileText",
    fields: [
      { name: "appliedOn", label: "Applied On", type: "date", required: true },
      { name: "firstName", label: "First Name", type: "text", required: true, searchable: true },
      { name: "middleName", label: "Middle Name", type: "text" },
      { name: "lastName", label: "Last Name", type: "text", required: true, searchable: true },
      { name: "classAppliedName", label: "Class Applied", type: "text", required: true, searchable: true },
      { name: "gender", label: "Gender", type: "select", options: ["Male", "Female", "Other"] },
      { name: "dateOfBirth", label: "Date of Birth", type: "date" },
      { name: "bloodGroup", label: "Blood Group", type: "text" },
      { name: "category", label: "Category", type: "text" },
      { name: "religion", label: "Religion", type: "text" },
      { name: "nationality", label: "Nationality", type: "text" },
      { name: "aadhaar", label: "Aadhaar Number", type: "text", searchable: true },
      { name: "mobile", label: "Student Mobile", type: "tel" },
      { name: "email", label: "Email", type: "email" },
      { name: "guardian", label: "Guardian", type: "text", searchable: true },
      { name: "phone", label: "Guardian Phone", type: "tel", searchable: true },
      { name: "address", label: "Address", type: "textarea" },
      { name: "status", label: "Status", type: "select", options: ["Pending", "Approved", "Rejected", "Waitlist"] },
    ],
  },
  // ✅ ADDED: admission-open-classes module
  {
    slug: "admission-open-classes",
    title: "Admission Open Classes",
    group: "Student Management",
    icon: "QrCode",
    fields: [
      { name: "name", label: "Class Name", type: "text", required: true, searchable: true },
    ],
  },
  {
    slug: "roll-number",
    title: "Roll Number Management",
    group: "Student Management",
    icon: "Hash",
    fields: [
      { name: "class", label: "Class", type: "select", required: true, options: ["1","2","3","4","5","6","7","8","9","10","11","12"] },
      { name: "section", label: "Section", type: "select", required: true, options: ["A","B","C","D"] },
      { name: "admissionNo", label: "Admission No", type: "text", required: true },
      { name: "name", label: "Student", type: "text", required: true, searchable: true },
      { name: "rollNo", label: "Roll No", type: "number", required: true, min: 1 },
    ],
  },
  {
    slug: "student-reports",
    title: "Student Reports",
    group: "Student Management",
    icon: "BarChart3",
    fields: [
      { name: "reportName", label: "Report Name", type: "text", required: true, searchable: true },
      { name: "class", label: "Class", type: "text", searchable: true },
      { name: "term", label: "Term", type: "select", options: ["Term 1","Term 2","Term 3","Annual"] },
      { name: "generatedOn", label: "Generated On", type: "date" },
      { name: "remarks", label: "Remarks", type: "textarea", hideInTable: true },
    ],
  },
  {
    slug: "leaving-certificate",
    title: "School Leaving Certificate",
    group: "Student Management",
    icon: "ScrollText",
    fields: [
      { name: "admissionNo", label: "Admission No", type: "text", required: true },
      { name: "certNo", label: "Certificate No", type: "text", required: true, unique: true },
      { name: "name", label: "Student Name", type: "text", required: true, searchable: true },
      { name: "nameEnglish", label: "Student Name (English)", type: "text", searchable: true },
      { name: "class", label: "Class", type: "select", options: ["Nursery","LKG","UKG","1","2","3","4","5","6","7","8","9","10","11","12"] },
      { name: "studyingSince", label: "Studying Since", type: "date" },
      { name: "progress", label: "Progress", type: "select", options: ["Excellent","Good","Average","Poor"] },
      { name: "conduct", label: "Conduct", type: "select", options: ["Excellent","Good","Average","Poor"] },
      { name: "reason", label: "Reason", type: "select", options: ["Passed / Graduated","Parent's Request","Transfer","Discontinued","Other"] },
      { name: "remark", label: "Remark", type: "select", options: ["Migrating to Another Place","Not Applicable","Other"] },
      { name: "dateOfLeaving", label: "Date of Leaving", type: "date" },
      { name: "issueDate", label: "Certificate Print Date", type: "date" },
    ],
  },
  {
    slug: "bonafide-certificate",
    title: "Bonafide Certificate",
    group: "Student Management",
    icon: "Award",
    fields: [
      { name: "certNo", label: "Certificate No", type: "text", required: true, unique: true },
      { name: "name", label: "Student", type: "text", required: true, searchable: true },
      { name: "class", label: "Class", type: "text" },
      { name: "purpose", label: "Purpose", type: "text" },
      { name: "issueDate", label: "Issue Date", type: "date" },
    ],
  },
  {
    slug: "outgoing-students",
    title: "Outgoing Student Records",
    group: "Student Management",
    icon: "LogOut",
    fields: [
      { name: "name", label: "Student", type: "text", required: true, searchable: true },
      { name: "class", label: "Class", type: "text" },
      { name: "leavingDate", label: "Leaving Date", type: "date" },
      { name: "destination", label: "Destination", type: "text" },
    ],
  },
  {
    slug: "dispatch-register",
    title: "Dispatch Register",
    group: "Student Management",
    icon: "Send",
    fields: [
      { name: "dispatchNo", label: "Dispatch No", type: "text", readOnly: true, helper: "Auto-generated" },
      { name: "date", label: "Dispatch Date", type: "date", required: true },
      { name: "to", label: "Recipient Name", type: "text", required: true, searchable: true },
      { name: "recipientType", label: "Recipient Type", type: "select", options: ["Student","Parent","Staff","Government Office","Education Department","Vendor","Bank","Other School","Other"] },
      { name: "subject", label: "Subject", type: "text", searchable: true },
      { name: "documentType", label: "Document Type", type: "select", options: ["School Leaving Certificate","Transfer Certificate","Bonafide Certificate","Character Certificate","Marksheet","Fee Receipt","Circular","Letter","Invoice","Notice","Other"] },
      { name: "recipientAddress", label: "Recipient Address", type: "textarea", hideInTable: true },
      { name: "mobile", label: "Mobile Number", type: "tel", hideInTable: true },
      { name: "email", label: "Email ID", type: "email", hideInTable: true },
      { name: "mode", label: "Mode of Dispatch", type: "select", options: ["Hand Delivery","Speed Post","Registered Post","Courier","Email","WhatsApp"] },
      { name: "courierService", label: "Courier / Postal Service", type: "text", hideInTable: true },
      { name: "trackingNo", label: "Tracking / Consignment Number", type: "text", hideInTable: true },
      { name: "dispatchCharges", label: "Dispatch Charges", type: "number", hideInTable: true, helper: "Optional" },
      { name: "department", label: "Department", type: "select", options: ["Administration","Accounts","Examination","Principal Office","Library","Other"], hideInTable: true },
      { name: "sentBy", label: "Sent By", type: "text", hideInTable: true },
      { name: "approvedBy", label: "Approved By", type: "text", hideInTable: true },
      { name: "referenceNo", label: "Reference Number", type: "text", hideInTable: true },
      { name: "relatedAdmissionNo", label: "Admission Number (if student-related)", type: "text", hideInTable: true },
      { name: "academicYear", label: "Academic Year", type: "text", hideInTable: true },
      { name: "status", label: "Dispatch Status", type: "select", options: ["Pending","Dispatched","Delivered","Returned","Cancelled"] },
      { name: "deliveryDate", label: "Delivery Date", type: "date", hideInTable: true },
      { name: "acknowledgementReceived", label: "Acknowledgement Received", type: "select", options: ["Yes","No"], hideInTable: true },
      { name: "document", label: "Upload Document / PDF", type: "file", accept: "application/pdf,image/jpeg,image/png", maxFileSize: 5 * 1024 * 1024, hideInTable: true, helper: "PDF/JPG/PNG, max 5 MB" },
      { name: "acknowledgementFile", label: "Upload Acknowledgement Receipt", type: "file", accept: "application/pdf,image/jpeg,image/png", maxFileSize: 5 * 1024 * 1024, hideInTable: true, helper: "Optional, PDF/JPG/PNG, max 5 MB" },
      { name: "remarks", label: "Remarks / Notes", type: "textarea", hideInTable: true },
    ],
  },
  {
    slug: "caste-report",
    title: "Caste Report",
    group: "Student Management",
    icon: "Users",
    fields: [
      { name: "name", label: "Student", type: "text", required: true, searchable: true },
      { name: "class", label: "Class", type: "text" },
      { name: "caste", label: "Caste", type: "text" },
      { name: "category", label: "Category", type: "select", options: ["General","OBC","SC","ST","VJNT","SBC"] },
    ],
  },
  {
    slug: "minority-report",
    title: "Minority Report",
    group: "Student Management",
    icon: "Users",
    fields: [
      { name: "name", label: "Student", type: "text", required: true, searchable: true },
      { name: "class", label: "Class", type: "text" },
      { name: "religion", label: "Religion", type: "text" },
      { name: "minorityCategory", label: "Minority Category", type: "text" },
    ],
  },

  // ── Attendance ────────────────────────────────────────────────
  {
    slug: "mark-attendance",
    title: "Mark Attendance",
    group: "Attendance Management",
    icon: "CheckSquare",
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
    slug: "attendance-register",
    title: "Attendance Register",
    group: "Attendance Management",
    icon: "BookOpen",
    fields: [
      { name: "date", label: "Date", type: "date", required: true },
      { name: "name", label: "Student", type: "text", required: true, searchable: true },
      { name: "class", label: "Class", type: "text" },
      { name: "status", label: "Status", type: "select", required: true, options: ["Present","Absent","Late","Leave"] },
    ],
  },

  // ── Student Register ──────────────────────────────────────────
  {
    slug: "student-register",
    title: "Student Register",
    group: "Student Register",
    icon: "ClipboardList",
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
    slug: "fee-collection",
    title: "Fee Collection",
    group: "Fee Management",
    icon: "Receipt",
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
    slug: "fee-report",
    title: "Fee Report",
    group: "Fee Management",
    icon: "IndianRupee",
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
      { name: "empId", label: "Employee ID", type: "text", required: true, unique: true, searchable: true },
      { name: "name", label: "Name", type: "text", required: true, searchable: true },
      { name: "role", label: "Role", type: "text", searchable: true },
      { name: "phone", label: "Phone", type: "tel", searchable: true },
      { name: "email", label: "Email", type: "email", searchable: true, unique: true },
      { name: "joiningDate", label: "Joining Date", type: "date" },
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
  { slug: "item-category", title: "Item Category", group: "Inventory", icon: "Layers",
    fields: [
      { name: "name", label: "Category", type: "text", required: true, unique: true, searchable: true },
      { name: "description", label: "Description", type: "text" },
    ]},
  { slug: "stock-in", title: "Stock In", group: "Inventory", icon: "ArrowDownToLine",
    fields: [
      { name: "date", label: "Date", type: "date", required: true },
      { name: "item", label: "Item", type: "text", required: true, searchable: true },
      { name: "quantity", label: "Quantity", type: "number", min: 0 },
      { name: "supplier", label: "Supplier", type: "text", searchable: true },
    ]},
 // { slug: "stock-out", title: "Stock Out", group: "Inventory", icon: "ArrowUpFromLine",
   // fields: [
     // { name: "date", label: "Date", type: "date", required: true },
      //{ name: "item", label: "Item", type: "text", required: true, searchable: true },
      //{ name: "quantity", label: "Quantity", type: "number", min: 0 },
      //{ name: "issuedTo", label: "Issued To", type: "text" },
    //]},
  { slug: "inventory-current-stock", title: "Current Stock", group: "Inventory", icon: "Package",
    fields: [
      { name: "item", label: "Item", type: "text", required: true, searchable: true },
      { name: "quantity", label: "Quantity", type: "number", min: 0 },
      { name: "unit", label: "Unit", type: "text" },
    ]},
  //{ slug: "purchase-order", title: "Purchase Order", group: "Inventory", icon: "FileSpreadsheet",
    //fields: [
      //{ name: "poNo", label: "PO No", type: "text", required: true, unique: true },
      //{ name: "date", label: "Date", type: "date", required: true },
      //{ name: "supplier", label: "Supplier", type: "text", searchable: true },
      //{ name: "amount", label: "Amount (₹)", type: "number", min: 0 },
      //{ name: "status", label: "Status", type: "select", options: ["Draft","Sent","Received","Cancelled"] },
    //]},
  { slug: "supplier-management", title: "Supplier Management", group: "Inventory", icon: "Truck",
    fields: [
      { name: "name", label: "Supplier", type: "text", required: true, searchable: true },
      { name: "contact", label: "Contact Person", type: "text", searchable: true },
      { name: "phone", label: "Phone", type: "tel", searchable: true },
      { name: "email", label: "Email", type: "email", searchable: true },
      { name: "address", label: "Address", type: "textarea", hideInTable: true },
    ]},
  { slug: "inventory-report", title: "Inventory Report", group: "Inventory", icon: "BarChart3",
    fields: [
      { name: "reportType", label: "Report Type", type: "text", required: true },
      { name: "month", label: "Month", type: "text" },
      { name: "items", label: "Items", type: "number", min: 0 },
    ]},
  //{ slug: "low-stock-alert", title: "Low Stock Alert", group: "Inventory", icon: "AlertTriangle",
    //fields: [
      //{ name: "item", label: "Item", type: "text", required: true, searchable: true },
      //{ name: "currentStock", label: "Current Stock", type: "number", min: 0 },
      //{ name: "reorderLevel", label: "Reorder Level", type: "number", min: 0 },
     // { name: "unit", label: "Unit", type: "text" },
    //]},

  // ── Teacher Dashboard ──────────────────────────────────────────
  {
    slug: "study-material",
    title: "Study Material",
    group: "Teacher Dashboard",
    icon: "BookOpen",
    description: "Upload and manage study material for your classes",
    fields: [
      { name: "title", label: "Title", type: "text", required: true, searchable: true },
      { name: "class", label: "Class", type: "select", required: true, options: ["Nursery","LKG","UKG","1","2","3","4","5","6","7","8","9","10","11","12"] },
      { name: "section", label: "Section", type: "select", options: ["A","B","C","D"] },
      { name: "subject", label: "Subject", type: "text", required: true, searchable: true },
      { name: "description", label: "Description", type: "textarea", hideInTable: true },
      { name: "file", label: "Material File", type: "file", accept: "application/pdf,image/jpeg,image/png", maxFileSize: 5 * 1024 * 1024, hideInTable: true, helper: "PDF/JPG/PNG, max 5 MB" },
      { name: "uploadedOn", label: "Uploaded On", type: "date", required: true },
    ],
    permissions: {
      view: ["SUPER_ADMIN", "PRINCIPAL", "ADMIN", "TEACHER"],
      create: ["SUPER_ADMIN", "PRINCIPAL", "ADMIN", "TEACHER"],
      update: ["SUPER_ADMIN", "PRINCIPAL", "ADMIN", "TEACHER"],
      delete: ["SUPER_ADMIN", "PRINCIPAL", "ADMIN", "TEACHER"],
    },
  },
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
      { slug: "grade-5-8-results", title: "Grade 5 & 8 Results", group, icon: "GraduationCap",
        fields: [
          { name: "name", label: "Student", type: "text", required: true, searchable: true },
          { name: "class", label: "Class", type: "select", options: ["5","8"] },
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
    ...(slugPrefix === "" ? [
      { slug: "grade-9-10-results", title: "Grade 9 & 10 Results", group, icon: "GraduationCap",
        fields: [
          { name: "name", label: "Student", type: "text", required: true, searchable: true },
          { name: "class", label: "Class", type: "select", options: ["9","10"] },
          { name: "percentage", label: "Percentage", type: "number", min: 0, max: 100 },
          { name: "grade", label: "Grade", type: "text" },
        ]} as ModuleDef,
    ] : []),
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