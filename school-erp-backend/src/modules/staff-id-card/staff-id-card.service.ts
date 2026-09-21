import prisma from '../../lib/prisma';
import { AppError } from '../../utils/AppError';

interface IDCardData {
  id: string;
  employeeId: string;
  name: string;
  designation: string;
  department: string;
  phone: string;
  email: string;
  profileImage: string | null;
  isActive: boolean;
  cardNumber: string;
  issueDate: string;
  expiryDate: string;
}

export class StaffIDCardService {
  static generateCardNumber(employeeId: string): string {
    const prefix = 'ID-';
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${prefix}${year}-${employeeId}-${random}`;
  }

  // ✅ Staff table only — Teacher table lookups removed entirely,
  // per request to only show employees added via the Add Staff form.
  static async getAllIDCards(tenantId: string): Promise<IDCardData[]> {
    console.log('📊 Fetching ID cards from Staff table...');

    const staff = await prisma.staff.findMany({
      where: { tenantId },
      select: {
        id: true,
        employeeId: true,
        firstName: true,
        middleName: true,
        lastName: true,
        designation: true,
        department: true,
        phone: true,
        email: true,
        profileImage: true,
        isActive: true,
        joiningDate: true,
        dateOfBirth: true,
        gender: true,
      },
      orderBy: { firstName: 'asc' },
    });

    console.log(`✅ Found ${staff.length} staff members`);

    const issueDate = new Date().toISOString().split('T')[0];
    const expiryDate = new Date(new Date().setFullYear(new Date().getFullYear() + 1))
      .toISOString()
      .split('T')[0];

    return staff.map((s) => ({
      id: s.id,
      employeeId: s.employeeId,
      name: [s.firstName, s.middleName, s.lastName].filter(Boolean).join(' '),
      designation: s.designation || 'Staff',
      department: s.department || '-',
      phone: s.phone || '-',
      email: s.email || '-',
      profileImage: s.profileImage || null,
      isActive: s.isActive,
      cardNumber: this.generateCardNumber(s.employeeId),
      issueDate,
      expiryDate,
    }));
  }

  static async getIDCardById(tenantId: string, staffId: string): Promise<IDCardData> {
    const staff = await prisma.staff.findFirst({
      where: { id: staffId, tenantId },
      select: {
        id: true,
        employeeId: true,
        firstName: true,
        middleName: true,
        lastName: true,
        designation: true,
        department: true,
        phone: true,
        email: true,
        profileImage: true,
        isActive: true,
        joiningDate: true,
        dateOfBirth: true,
        gender: true,
      },
    });

    if (!staff) {
      throw new AppError(404, 'Staff member not found');
    }

    const issueDate = new Date().toISOString().split('T')[0];
    const expiryDate = new Date(new Date().setFullYear(new Date().getFullYear() + 1))
      .toISOString()
      .split('T')[0];

    return {
      id: staff.id,
      employeeId: staff.employeeId,
      name: [staff.firstName, staff.middleName, staff.lastName].filter(Boolean).join(' '),
      designation: staff.designation || 'Staff',
      department: staff.department || '-',
      phone: staff.phone || '-',
      email: staff.email || '-',
      profileImage: staff.profileImage || null,
      isActive: staff.isActive,
      cardNumber: this.generateCardNumber(staff.employeeId),
      issueDate,
      expiryDate,
    };
  }

  static async searchStaff(tenantId: string, search: string) {
    const staff = await prisma.staff.findMany({
      where: {
        tenantId,
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { middleName: { contains: search, mode: 'insensitive' } },
          { employeeId: { contains: search, mode: 'insensitive' } },
          { designation: { contains: search, mode: 'insensitive' } },
          { department: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        employeeId: true,
        firstName: true,
        middleName: true,
        lastName: true,
        designation: true,
        department: true,
        phone: true,
        email: true,
        profileImage: true,
        isActive: true,
      },
      orderBy: { firstName: 'asc' },
    });

    return staff.map((s) => ({
      id: s.id,
      employeeId: s.employeeId,
      name: [s.firstName, s.middleName, s.lastName].filter(Boolean).join(' '),
      designation: s.designation || 'Staff',
      department: s.department || '-',
      phone: s.phone || '-',
      email: s.email || '-',
      profileImage: s.profileImage || null,
      isActive: s.isActive,
      cardNumber: this.generateCardNumber(s.employeeId),
    }));
  }

  static getIDCardHTML(data: any): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Staff ID Card</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        body { 
          font-family: 'Segoe UI', Arial, sans-serif;
          background: #f0f2f5;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          padding: 20px;
        }
        .id-card {
          width: 320px;
          background: linear-gradient(135deg, #1a3c6e 0%, #2c5a8c 100%);
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.3);
          color: white;
          position: relative;
          overflow: hidden;
        }
        .id-card::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -50%;
          width: 100%;
          height: 100%;
          background: rgba(255,255,255,0.05);
          border-radius: 50%;
        }
        .card-header {
          text-align: center;
          border-bottom: 2px solid rgba(255,255,255,0.3);
          padding-bottom: 10px;
          margin-bottom: 12px;
        }
        .card-header h2 {
          font-size: 16px;
          font-weight: 700;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
        .card-header p {
          font-size: 10px;
          opacity: 0.8;
          margin-top: 2px;
        }
        .card-body {
          display: flex;
          gap: 14px;
          align-items: center;
        }
        .photo-placeholder {
          width: 80px;
          height: 100px;
          border: 2px solid rgba(255,255,255,0.4);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,0.1);
          font-size: 9px;
          text-align: center;
          color: rgba(255,255,255,0.6);
          flex-shrink: 0;
          padding: 4px;
        }
        .photo-placeholder img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 6px;
        }
        .info-section {
          flex: 1;
        }
        .info-row {
          display: flex;
          flex-direction: column;
          margin-bottom: 4px;
        }
        .info-label {
          font-size: 7px;
          text-transform: uppercase;
          opacity: 0.75;
          letter-spacing: 0.5px;
          color: #e2e8f0;
        }
        .info-value {
          font-size: 11px;
          font-weight: 700;
          color: #ffffff;
        }
        .info-value.designation {
          font-size: 10px;
          font-weight: 500;
          opacity: 0.95;
          color: #f1f5f9;
        }
        .card-footer {
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid rgba(255,255,255,0.3);
          display: flex;
          justify-content: space-between;
          font-size: 8px;
          opacity: 0.85;
          color: #e2e8f0;
        }
        .status-badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 8px;
          font-weight: 700;
          text-transform: uppercase;
          margin-top: 4px;
        }
        .status-active {
          background: #22c55e;
          color: white;
        }
        .status-inactive {
          background: #ef4444;
          color: white;
        }
        .card-number {
          font-family: monospace;
          font-size: 8px;
          letter-spacing: 0.5px;
          background: rgba(255,255,255,0.15);
          color: #ffffff;
          padding: 2px 8px;
          border-radius: 4px;
          display: inline-block;
          margin-top: 4px;
        }
        @media print {
          body { background: white; padding: 0; }
          .id-card { box-shadow: none; }
        }
      </style>
    </head>
    <body>
      <div class="id-card">
        <div class="card-header">
          <h2>Staff ID Card</h2>
          <p>Employee Identity Card</p>
        </div>
        <div class="card-body">
          <div class="photo-placeholder">
            ${data.profileImage ? `<img src="${data.profileImage}" alt="Photo" />` : 'Photo'}
          </div>
          <div class="info-section">
            <div class="info-row">
              <span class="info-label">Employee ID</span>
              <span class="info-value">${data.employeeId || '-'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Name</span>
              <span class="info-value">${data.name || '-'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Designation</span>
              <span class="info-value designation">${data.designation || '-'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Department</span>
              <span class="info-value designation">${data.department || '-'}</span>
            </div>
            <div>
              <span class="status-badge ${data.isActive ? 'status-active' : 'status-inactive'}">
                ${data.isActive ? 'Active' : 'Inactive'}
              </span>
              <span class="card-number">${data.cardNumber || ''}</span>
            </div>
          </div>
        </div>
        <div class="card-footer">
          <span>Valid Till: ${data.expiryDate || 'N/A'}</span>
          <span>Issued: ${data.issueDate || 'N/A'}</span>
        </div>
      </div>
      <script>
        window.print();
      <\/script>
    </body>
    </html>
  `;
  }

  static async getStatistics(tenantId: string) {
    console.log('📊 Fetching statistics from Staff table...');

    const [total, active, inactive] = await Promise.all([
      prisma.staff.count({ where: { tenantId } }),
      prisma.staff.count({ where: { tenantId, isActive: true } }),
      prisma.staff.count({ where: { tenantId, isActive: false } }),
    ]);

    console.log(`📊 Statistics: Total=${total}, Active=${active}, Inactive=${inactive}`);

    return { total, active, inactive };
  }
}