import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';


const app = express();

// use is used to configure the middleware
// allow users to access your websites
app.use(cors({
    origin: process.env.CORS_ORIGIN
}));

// use to take data in json form
app.use(express.json({ 
    limit: "16kb"
}))

// take data from url
app.use(express.urlencoded({
    extended: true,
    limit:"16kb"
}))

// store some file on server
app.use(express.static("public"))

app.use(cookieParser())



//routes import

import userRouter from './routes/user.routes.js'

//routes
app.use("/users", userRouter)


export default app;