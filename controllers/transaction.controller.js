import createError from "http-errors";
import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import User from "../models/user.model.js";
import Transaction from "../models/transaction.model.js";

export const getBalance = async (req, res) => {
  const user = await User.findById(req.user.userId);

  return res.status(StatusCodes.OK).json({
    message: "Balance fetched successfully",
    data: {
      balance: user.balance,
    },
  });
};

export const getTransactions = async (req, res) => {
  const transactions = await Transaction.find({
    $or: [{ fromAccount: req.user.userId }, { toAccount: req.user.userId }],
  })
    .sort({ createdAt: -1 })
    .populate("fromAccount", "fullName email")
    .populate("toAccount", "fullName email");

  return res.status(StatusCodes.OK).json({
    message: "Transactions fetched successfully",
    data: {
      transactions,
    },
  });
};

export const deposit = async (req, res) => {
  const { description = "" } = req.body;
  const amount = req.validatedAmount;
  const updatedUser = await User.findByIdAndUpdate(
    req.user.userId,
    { $inc: { balance: amount } },
    { new: true },
  );

  await Transaction.create({
    type: "deposit",
    amount,
    description,
    fromAccount: null,
    toAccount: req.user.userId,
  });

  return res.status(StatusCodes.OK).json({
    message: "Deposit successful",
    data: {
      balance: updatedUser.balance,
      amount,
    },
  });
};

export const withdraw = async (req, res) => {
  const { description = "" } = req.body;
  const amount = req.validatedAmount;
  const updatedUser = await User.findOneAndUpdate(
    { _id: req.user.userId, balance: { $gte: amount } },
    { $inc: { balance: -amount } },
    { new: true },
  );

  if (!updatedUser) {
    throw createError(StatusCodes.BAD_REQUEST, "Insufficient funds");
  }

  await Transaction.create({
    type: "withdrawal",
    amount,
    description,
    fromAccount: req.user.userId,
    toAccount: null,
  });

  return res.status(StatusCodes.OK).json({
    message: "Withdrawal successful",
    data: {
      balance: updatedUser.balance,
      amount,
    },
  });
};

export const transfer = async (req, res) => {
  const { toEmail, description = "" } = req.body;
  const amount = req.validatedAmount;

  if (!toEmail) {
    throw createError(StatusCodes.BAD_REQUEST, "Recipient email is required");
  }

  const receiver = await User.findOne({ email: toEmail.toLowerCase().trim() });

  if (!receiver) {
    throw createError(StatusCodes.NOT_FOUND, "Recipient not found");
  }

  if (req.user.userId === receiver._id.toString()) {
    throw createError(
      StatusCodes.BAD_REQUEST,
      "Cannot transfer to same account",
    );
  }

  let responseBalance;

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const debitedSender = await User.findOneAndUpdate(
        { _id: req.user.userId, balance: { $gte: amount } },
        { $inc: { balance: -amount } },
        { new: true, session },
      );

      if (!debitedSender) {
        throw createError(StatusCodes.BAD_REQUEST, "Insufficient funds");
      }

      await User.findByIdAndUpdate(
        receiver._id,
        { $inc: { balance: amount } },
        { session },
      );

      await Transaction.create(
        [
          {
            type: "transfer",
            amount,
            description,
            fromAccount: req.user.userId,
            toAccount: receiver._id,
          },
        ],
        { session },
      );

      responseBalance = debitedSender.balance;
    });
  } finally {
    await session.endSession();
  }

  return res.status(StatusCodes.OK).json({
    message: "Transfer successful",
    data: {
      toEmail: receiver.email,
      amount,
      balance: responseBalance,
    },
  });
};
