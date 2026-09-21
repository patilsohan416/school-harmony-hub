import { Response, NextFunction } from 'express';
import { StaffIDCardService } from './staff-id-card.service';
import { AuthRequest } from '../../middleware/auth';

const DEFAULT_TENANT_ID = '79896939-b3c3-48ff-bb3d-89048d985620';

export const getAllIDCards = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log('🔄 GET /api/staff-id-card - Fetching all ID cards...');
    const cards = await StaffIDCardService.getAllIDCards(
      req.user?.tenantId || DEFAULT_TENANT_ID
    );

    console.log(`✅ Found ${cards.length} ID cards`);
    res.json({
      success: true,
      data: cards,
    });
  } catch (error) {
    console.error('❌ Error in getAllIDCards:', error);
    next(error);
  }
};

export const getIDCardById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { staffId } = req.params;
    console.log(`🔄 GET /api/staff-id-card/${staffId} - Fetching ID card...`);

    const card = await StaffIDCardService.getIDCardById(
      req.user?.tenantId || DEFAULT_TENANT_ID,
      staffId
    );

    res.json({
      success: true,
      data: card,
    });
  } catch (error) {
    console.error('❌ Error in getIDCardById:', error);
    next(error);
  }
};

export const searchStaff = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { q } = req.query as { q: string };
    console.log(`🔄 GET /api/staff-id-card/search?q=${q} - Searching...`);

    if (!q) {
      res.json({
        success: true,
        data: [],
      });
      return;
    }

    const results = await StaffIDCardService.searchStaff(
      req.user?.tenantId || DEFAULT_TENANT_ID,
      q
    );

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('❌ Error in searchStaff:', error);
    next(error);
  }
};

// ✅ FIXED: removed the old query-param JWT decoding block entirely.
// window.open(url) can't send an Authorization header, which is why
// that hack existed — but decoding a token from a query string and
// re-resolving tenantId from it is fragile (wrong localStorage key,
// invalid/expired token, decode errors all silently fell back to
// DEFAULT_TENANT_ID, causing some employees' cards to 404).
//
// The frontend now fetches this endpoint with a normal Authorization
// header (see the updated handlePrint in StaffIDCardPage.tsx), so this
// route is authenticated exactly like every other route here — the
// `authenticate` middleware populates req.user before this ever runs.
export const printIDCard = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { staffId } = req.params;
    const tenantId = req.user?.tenantId || DEFAULT_TENANT_ID;

    console.log(`🔄 GET /api/staff-id-card/print/${staffId} - Printing ID card...`);
    console.log('🏫 tenantId:', tenantId, 'staffId:', staffId);

    const cardData = await StaffIDCardService.getIDCardById(tenantId, staffId);
    const html = StaffIDCardService.getIDCardHTML(cardData);

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('❌ Error in printIDCard:', error);
    next(error);
  }
};

export const getStatistics = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log('🔄 GET /api/staff-id-card/statistics - Fetching statistics...');
    
    const stats = await StaffIDCardService.getStatistics(
      req.user?.tenantId || DEFAULT_TENANT_ID
    );

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('❌ Error in getStatistics:', error);
    next(error);
  }
};