import User from "../models/user.model.js";
import { generateToken } from "../utils/jwt.js";
import { StatusCodes } from "http-status-codes";
import createError from "http-errors";

export const registerUser = async (req, res) => {
  const { fullName, email, password } = req.body;

  const user = await User.create({
    fullName,
    email,
    password,
  });

  return res.status(StatusCodes.CREATED).json({
    message: "User registered successfully",
    data: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      createdAt: user.createdAt,
    },
  });
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  const isPasswordValid = user ? await user.comparePassword(password) : false;

  if (!user || !isPasswordValid) {
    throw createError(StatusCodes.UNAUTHORIZED, "Invalid email or password");
  }

  const token = generateToken(user._id.toString());

  return res.status(StatusCodes.OK).json({
    message: "Login successful",
    data: {
      token,
      id: user._id,
      fullName: user.fullName,
      email: user.email,
    },
  });
};

export const getCurrentUser = async (req, res) => {
  const user = await User.findById(req.user.userId).select("-password");

  if (!user) {
    throw createError(StatusCodes.NOT_FOUND, "User not found");
  }

  return res.status(StatusCodes.OK).json({
    message: "User fetched successfully",
    data: user,
  });
};
