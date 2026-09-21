import { Response, NextFunction } from 'express'; // ✅ Remove unused Request
import { GenericService } from './generic.service';
import { AuthRequest } from '../../middleware/auth';
import { z } from 'zod';
import { getModule } from '../../shared/modules-registry'; // ✅ Correct path

// req.files (from multer's .any()) is an array of files with a `fieldname`
// on each — merge those into the JSON body under their field name as a
// stored URL, so file fields end up in the record's data just like any
// other field once we're done.
function mergeAttachments(req: AuthRequest): Record<string, unknown> {
  const files = (req as any).files as Express.Multer.File[] | undefined;
  const body = { ...(req.body || {}) };

  if (files && files.length > 0) {
    const moduleSlug = req.params.module;
    for (const file of files) {
      body[file.fieldname] = `/uploads/generic/${moduleSlug}/${file.filename}`;
    }
  }

  return body;
}

const ListQuerySchema = z.object({
  page: z.string().optional().transform(Number).default('1'),
  limit: z.string().optional().transform(Number).default('20'),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  filters: z.record(z.string()).optional(),
});

export const list = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { module } = req.params;
    const query = ListQuerySchema.parse(req.query);
    const def = getModule(module);
    
    if (!def) {
      return res.status(404).json({ success: false, message: 'Module not found' });
    }

    const result = await GenericService.list({
      tenantId: req.user!.tenantId!,
      module,
      fields: def.fields,
      ...query,
    });
    
    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    return next(error);
  }
};

export const get = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { module, id } = req.params;
    const def = getModule(module);
    
    if (!def) {
      return res.status(404).json({ success: false, message: 'Module not found' });
    }

    const record = await GenericService.get(id, module, req.user!.tenantId!);
    return res.json({
      success: true,
      data: record,
    });
  } catch (error) {
    return next(error);
  }
};

export const create = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { module } = req.params;
    const def = getModule(module);
    
    if (!def) {
      return res.status(404).json({ success: false, message: 'Module not found' });
    }

    const record = await GenericService.create({
      tenantId: req.user!.tenantId!,
      module,
      data: mergeAttachments(req),
      createdBy: req.user!.id,
      fields: def.fields,
    });
    
    return res.status(201).json({
      success: true,
      message: `${module} created successfully`,
      data: record,
    });
  } catch (error) {
    return next(error);
  }
};

export const update = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { module, id } = req.params;
    const def = getModule(module);
    
    if (!def) {
      return res.status(404).json({ success: false, message: 'Module not found' });
    }

    const record = await GenericService.update(
      id,
      module,
      req.user!.tenantId!,
      mergeAttachments(req),
      req.user!.id,
      def.fields
    );
    
    return res.json({
      success: true,
      message: `${module} updated successfully`,
      data: record,
    });
  } catch (error) {
    return next(error);
  }
};

export const remove = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { module, id } = req.params;
    const def = getModule(module);
    
    if (!def) {
      return res.status(404).json({ success: false, message: 'Module not found' });
    }

    await GenericService.remove(id, module, req.user!.tenantId!, req.user!.id);
    return res.json({
      success: true,
      message: `${module} deleted successfully`,
    });
  } catch (error) {
    return next(error);
  }
};