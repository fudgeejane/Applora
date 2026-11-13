
import mongoose from "mongoose";
import process from "node:process";

const connectDB = async () => {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI,
      {
        serverSelectionTimeoutMS: 10000,
      }
    );

    console.log("MongoDB connected.");
  } catch (error) {
    console.error("MongoDB connection failed:", error.name);
    throw error;
  }
};

export default connectDB;
