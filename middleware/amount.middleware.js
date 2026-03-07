import createError from "http-errors";
import { StatusCodes } from "http-status-codes";

const amountMiddleware = (req, res, next) => {
  const { amount: rawAmount } = req.body;

  if (rawAmount === undefined || rawAmount === null) {
    throw createError(StatusCodes.BAD_REQUEST, "Amount is required");
  }

  const amount = Number(rawAmount);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw createError(StatusCodes.BAD_REQUEST, "Amount must be a positive number");
  }

  req.validatedAmount = Number(amount.toFixed(2));
  next();
};

export default amountMiddleware;
