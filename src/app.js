import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();
app.use(cors({
    origin : process.env.CORS_ORIGIN,
    credentials:true
}));

app.use(express.json({limit:"16kb"}));
app.use(express.urlencoded({extended:true,limit:"16kb"}));
app.use(express.static("public"));
app.use(cookieParser());

//routes
import userRouter from "./routes/user.routes.js";

//routes declaration

//what happens now is whenever a url is hit
//http://localhost:8000/users... the control is passed onto user.routes.js where there can be several
//sub routes like http://localhost:8000/api/v1/users/register or http://localhost:8000/api/v1/users/login 

//console.log("✅ userRouter loaded:", userRouter);
app.post("/test", (req, res) => res.send("POST /test works"));

app.use("/api/v1/users",userRouter)


export default app;