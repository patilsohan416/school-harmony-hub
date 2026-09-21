import { Router } from "express";
import {
  getPayrollList,
  createPayroll,
  updatePayroll,
  deletePayroll,
} from "./payroll.controller";
// Adjust this import to match whatever auth middleware your other
// staff routes use (e.g. authenticate, requireAuth, etc.)
// import { authenticate } from "../../middleware/auth";

const router = Router();

// router.use(authenticate); // uncomment if your other routes require it

router.get("/", getPayrollList);
router.post("/", createPayroll);
router.put("/:id", updatePayroll);
router.delete("/:id", deletePayroll);

export default router;