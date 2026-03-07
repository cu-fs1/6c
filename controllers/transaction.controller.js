import createError from "http-errors";
import { StatusCodes } from "http-status-codes";
import User from "../models/user.model.js";
import Account from "../models/account.model.js";
import Transaction from "../models/transaction.model.js";

const getOrCreateAccount = async (userId) => {
  let account = await Account.findOne({ user: userId });

  if (account) {
    return account;
  }

  account = await Account.create({ user: userId });

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

  const senderAccount = await getOrCreateAccount(sender._id);
  const receiverAccount = await getOrCreateAccount(receiver._id);
  const debitedSenderAccount = await Account.findOneAndUpdate(
    { _id: senderAccount._id, balance: { $gte: amount } },
    { $inc: { balance: -amount } },
    { new: true },
  );

  if (!debitedSenderAccount) {
    throw createError(StatusCodes.BAD_REQUEST, "Insufficient funds");
  }

  await Account.findByIdAndUpdate(receiverAccount._id, {
    $inc: { balance: amount },
  });

  await Transaction.create({
    type: "transfer",
    amount,
    description,
    fromAccount: senderAccount._id,
    toAccount: receiverAccount._id,
  });

  return res.status(StatusCodes.OK).json({
    message: "Transfer successful",
    data: {
      toEmail: receiver.email,
      amount,
      balance: debitedSenderAccount.balance,
    },
  });
};
