import { Router, Request, Response } from 'express';
import { authenticate } from '../../middleware/auth';
import prisma from '../../lib/prisma'; 

const router = Router();

router.use(authenticate);

router.post('/items', async (req: Request, res: Response) => {
  try {
    const newItem = await prisma.inventoryItem.create({
      data: {
        tenantId: (req as any).user.tenantId,
        ...req.body,
        reorderLevel: Number(req.body.reorderLevel || 0),
        requiredQuantity: Number(req.body.requiredQuantity || 0),
        purchasePrice: Number(req.body.purchasePrice || 0),
        sellingPrice: Number(req.body.sellingPrice || 0),
      }
    });

    return res.status(201).json({ success: true, data: newItem });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Failed to create item' });
  }
});

router.get('/items', async (req: Request, res: Response) => {
  try {
    const data = await prisma.inventoryItem.findMany({ 
      where: { tenantId: (req as any).user.tenantId },
      orderBy: { createdAt: 'desc' }
    });
    return res.json({ success: true, rows: data });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Failed to fetch items' });
  }
});

router.post('/stock-in', async (req: Request, res: Response) => {
  try {
    const { category, material, brandName, receiptNumber, quantity, requiredQuantity, pricePerUnit, totalAmount } = req.body;
    
    if (!category || !material || !quantity || !pricePerUnit) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const newEntry = await prisma.stockInEntry.create({
      data: {
        tenantId: (req as any).user.tenantId,
        category,
        material,
        brandName,
        receiptNumber,
        quantity: Number(quantity),
        requiredQuantity: Number(requiredQuantity || 0),
        pricePerUnit: Number(pricePerUnit),
        totalAmount: Number(totalAmount || quantity * pricePerUnit),
      }
    });

    return res.status(201).json({ success: true, data: newEntry });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Failed to record stock entry' });
  }
});

router.post('/suppliers', async (req: Request, res: Response) => {
  try {
    const { supplierName, contactPerson, phone, email, address } = req.body;

    if (!supplierName || !phone) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const newSupplier = await prisma.supplier.create({
      data: {
        tenantId: (req as any).user.tenantId,
        supplierName,
        contactPerson,
        phone,
        email,
        address,
      }
    });

    return res.status(201).json({ success: true, data: newSupplier });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Failed to create supplier' });
  }
});

router.post('/reports', async (req: Request, res: Response) => {
  try {
    const { month, monthLabel, totalItems, totalQuantity, totalValue, lowStockItems, categories, generatedOn } = req.body;

    const newReport = await prisma.inventoryReport.create({
      data: {
        tenantId: (req as any).user.tenantId,
        month,
        monthLabel,
        totalItems,
        totalQuantity,
        totalValue: Number(totalValue),
        lowStockItems,
        categories: categories || {},
        generatedOn,
      }
    });

    return res.status(201).json({ success: true, data: newReport });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Failed to create report' });
  }
});

router.get('/stock-in', async (req: Request, res: Response) => {
  try {
    const data = await prisma.stockInEntry.findMany({ 
      where: { tenantId: (req as any).user.tenantId },
      orderBy: { createdAt: 'desc' }
    });
    return res.json({ success: true, rows: data });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Failed to fetch stock-in records' });
  }
});

router.get('/suppliers', async (req: Request, res: Response) => {
  try {
    const data = await prisma.supplier.findMany({ 
      where: { tenantId: (req as any).user.tenantId },
      orderBy: { createdAt: 'desc' }
    });
    return res.json({ success: true, rows: data });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Failed to fetch suppliers' });
  }
});

router.get('/reports', async (req: Request, res: Response) => {
  try {
    const data = await prisma.inventoryReport.findMany({ 
      where: { tenantId: (req as any).user.tenantId },
      orderBy: { createdAt: 'desc' }
    });
    return res.json({ success: true, rows: data });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Failed to fetch reports' });
  }
});

export { router as inventoryRoutes };