import createError from "http-errors";
import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import User from "../models/user.model.js";
import Account from "../models/account.model.js";
import Transaction from "../models/transaction.model.js";

const getOrCreateAccount = async (userId, session = null) => {
  const findAccount = () => {
    const query = Account.findOne({ user: userId });
    if (session) {
      query.session(session);
    }
    return query;
  };

  let account = await findAccount();

  if (account) {
    return account;
  }

  try {
    account = new Account({ user: userId });
    await account.save({ session });
  } catch (error) {
    // Handle concurrent account creation attempts for the same user.
    if (error?.code === 11000) {
      account = await findAccount();
    } else {
      throw error;
    }
  }

  if (!account) {
    throw createError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Failed to resolve account",
    );
  }

  return account;
};

export const getBalance = async (req, res) => {
  const account = await getOrCreateAccount(req.user.userId);

  return res.status(StatusCodes.OK).json({
    message: "Balance fetched successfully",
    data: {
      balance: account.balance,
    },
  });
};

export const getTransactions = async (req, res) => {
  const account = await getOrCreateAccount(req.user.userId);
  const transactions = await Transaction.find({
    $or: [{ fromAccount: account._id }, { toAccount: account._id }],
  })
    .sort({ createdAt: -1 })
    .populate("fromAccount", "user")
    .populate("toAccount", "user");

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
  const account = await getOrCreateAccount(req.user.userId);
  const updatedAccount = await Account.findByIdAndUpdate(
    account._id,
    { $inc: { balance: amount } },
    { new: true },
  );

  await Transaction.create({
    type: "deposit",
    amount,
    description,
    fromAccount: null,
    toAccount: account._id,
  });

  return res.status(StatusCodes.OK).json({
    message: "Deposit successful",
    data: {
      balance: updatedAccount.balance,
      amount,
    },
  });
};

export const withdraw = async (req, res) => {
  const { description = "" } = req.body;
  const amount = req.validatedAmount;
  const account = await getOrCreateAccount(req.user.userId);
  const updatedAccount = await Account.findOneAndUpdate(
    { _id: account._id, balance: { $gte: amount } },
    { $inc: { balance: -amount } },
    { new: true },
  );

  if (!updatedAccount) {
    throw createError(StatusCodes.BAD_REQUEST, "Insufficient funds");
  }

  await Transaction.create({
    type: "withdrawal",
    amount,
    description,
    fromAccount: account._id,
    toAccount: null,
  });

  return res.status(StatusCodes.OK).json({
    message: "Withdrawal successful",
    data: {
      balance: updatedAccount.balance,
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

  const sender = await User.findById(req.user.userId);

  if (!sender) {
    throw createError(StatusCodes.NOT_FOUND, "Sender not found");
  }

  const receiver = await User.findOne({ email: toEmail.toLowerCase().trim() });

  if (!receiver) {
    throw createError(StatusCodes.NOT_FOUND, "Recipient not found");
  }

  if (sender._id.toString() === receiver._id.toString()) {
    throw createError(StatusCodes.BAD_REQUEST, "Cannot transfer to same account");
  }

  let responseBalance;

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const senderAccount = await getOrCreateAccount(sender._id, session);
      const receiverAccount = await getOrCreateAccount(receiver._id, session);
      const debitedSenderAccount = await Account.findOneAndUpdate(
        { _id: senderAccount._id, balance: { $gte: amount } },
        { $inc: { balance: -amount } },
        { new: true, session },
      );

      if (!debitedSenderAccount) {
        throw createError(StatusCodes.BAD_REQUEST, "Insufficient funds");
      }

      await Account.findByIdAndUpdate(
        receiverAccount._id,
        {
          $inc: { balance: amount },
        },
        { session },
      );

      await Transaction.create(
        [
          {
            type: "transfer",
            amount,
            description,
            fromAccount: senderAccount._id,
            toAccount: receiverAccount._id,
          },
        ],
        { session },
      );

      responseBalance = debitedSenderAccount.balance;
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
