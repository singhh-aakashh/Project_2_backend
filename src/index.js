import dotenv from "dotenv"
import app from "./app.js"

import connectDB from './db/dbConnect.js';

dotenv.config({
    path: './env'
});
connectDB()
.then(()=>{
   app.listen(process.env.PORT , ()=>{
   console.log(`App is running on ${process.env.PORT}`)
}); 
})
.catch((err) => {
    console.log("Mongo DB connect failed", err);
})



