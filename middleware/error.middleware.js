import { StatusCodes } from "http-status-codes";

const errorMiddleware = (err, req, res, next) => {
  // Default status code to 500 if not specified
  const statusCode =
    err.statusCode || err.status || StatusCodes.INTERNAL_SERVER_ERROR;

  // Default message
  const message = err.message || "Internal Server Error";

  // Send JSON response
  return res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

export default errorMiddleware;
