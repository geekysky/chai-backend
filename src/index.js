import mongoose from "mongoose";
import { DB_NAME } from "./constants.js";
import dotenv from "dotenv"
/*
import express from "express"

const app = express()
async function connectDB() {
    try {
        await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`);
        app.on("error", (error) => {
            console.log("Application unable to talk to DB");
            throw error;
        })

        app.listen(process.env.PORT , ()=>{
            console.log(`App is listening on port ${process.env.PORT}`);
        })
    } catch (error) {
        console.log("ERROR:", error);
        throw error;
    }
}

connectDB();
*/


import connectDB from "./db/index.js";

dotenv.config({
    path : './env'
});

connectDB();

