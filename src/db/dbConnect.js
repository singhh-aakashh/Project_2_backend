import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
    try {
        const connectionInstance=await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        console.log(`\n MongoDb connected || DB host: ${connectionInstance}`)

    } catch (error) {
        console.log("mongo db connection error", error);
        // read from node documentation 
        process.exit(1);
    }
}

export default connectDB;