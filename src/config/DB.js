/* needed */
import mongoose from "mongoose";

export const connectToMongoDB = () => {
  const connectionString = process.env.MONGO_CONNECTION;
  try {
    mongoose.connect(connectionString);
    console.log("Mongo is here");
  } catch (error) {
    console.log("Mongo is NOT here");
    console.log(error);
  }
};
