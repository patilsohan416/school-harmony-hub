import { Request, Response, NextFunction } from 'express';
import { GenericService } from '../generic/generic.service';
import { AppError } from '../../utils/AppError';

export const getPublicOpenClasses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenant = String(req.query.tenant || '');
    if (!tenant) throw new AppError(400, 'Missing school reference');

    const result = await GenericService.list({
      tenantId: tenant,
      module: 'admission-open-classes',
      limit: 100,
      fields: [],
    });

    const classes = (result.data as any[]).map((r) => ({ id: r.id, name: r.name }));
    res.json({ success: true, data: classes });
  } catch (error) {
    next(error);
  }
};

export const submitPublicAdmission = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      tenant, applicantName, firstName, middleName, lastName,
      classAppliedName, guardian, phone, mobile, dateOfBirth, gender,
      email, address,
    } = req.body as {
      tenant?: string;
      applicantName?: string;
      firstName?: string;
      middleName?: string;
      lastName?: string;
      classAppliedName?: string;
      guardian?: string;
      phone?: string;
      mobile?: string;
      dateOfBirth?: string;
      gender?: string;
      email?: string;
      address?: string;
    };

    if (!tenant) throw new AppError(400, 'Missing school reference');

    // Accepts either a single "applicantName" (the in-app /apply form) or
    // split firstName/middleName/lastName (a Google Form synced via Apps
    // Script) — whichever arrives, both are stored so the admin list can
    // always render a full name.
    const resolvedFirstName = firstName?.trim() || applicantName?.trim().split(' ')[0] || '';
    const resolvedLastName = lastName?.trim() || applicantName?.trim().split(' ').slice(1).join(' ') || '';
    if (!resolvedFirstName) throw new AppError(400, 'Applicant name is required');
    if (!classAppliedName?.trim()) throw new AppError(400, 'Class applied is required');

    const record = await GenericService.create({
      tenantId: tenant,
      module: 'admission-form',
      createdBy: 'PUBLIC',
      fields: [],
      data: {
        appliedOn: new Date().toISOString().slice(0, 10),
        applicantName: applicantName?.trim() || [resolvedFirstName, middleName, resolvedLastName].filter(Boolean).join(' '),
        firstName: resolvedFirstName,
        middleName: middleName?.trim() || '',
        lastName: resolvedLastName,
        classAppliedId: '',
        classAppliedName: classAppliedName.trim(),
        guardian: guardian?.trim() || '',
        phone: (phone || mobile)?.trim() || '',
        mobile: (mobile || phone)?.trim() || '',
        dateOfBirth: dateOfBirth || '',
        gender: gender || '',
        email: email?.trim() || '',
        address: address?.trim() || '',
        status: 'Pending',
      },
    });

    res.status(201).json({ success: true, message: 'Application submitted successfully', data: record });
  } catch (error) {
    next(error);
  }
};