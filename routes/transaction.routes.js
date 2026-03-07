import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import amountMiddleware from "../middleware/amount.middleware.js";
import {
  deposit,
  getBalance,
  getTransactions,
  transfer,
  withdraw,
} from "../controllers/transaction.controller.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/balance", getBalance);
router.get("/transactions", getTransactions);
router.post("/deposit", amountMiddleware, deposit);
router.post("/withdraw", amountMiddleware, withdraw);
router.post("/transfer", amountMiddleware, transfer);

export default router;
