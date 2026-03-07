import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ["deposit", "withdrawal", "transfer"],
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: (value) => Number.isInteger(value * 100),
        message: "Amount must have at most 2 decimal places",
      },
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    fromAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      default: null,
      index: true,
    },
    toAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

const Transaction = mongoose.model("Transaction", transactionSchema);

export default Transaction;
