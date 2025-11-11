import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"

const userSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,

        //kisi bhi field p search karna hai for ex here it's username so it can be searched
        index: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    fullName: {
        type: String,
        required: true,
        trim: true,

        //kisi bhi field p search karna hai for ex here it's username so it can be searched
        index: true
    },
    avatar: {
        type: String, //S3 url...
        required: true,
    },
    coverImage: {
        type: String //S3 url... 
    },
    //watch history is an array of objects where
    //each object stores the details of the video imported from the video schema
    watchHistory: [
        {
            type: Schema.Types.ObjectId,
            ref: "Video"
        }
    ],
    password: {
        type: String,
        required: [true, 'Password is required']
    },
    refreshToken: {
        type: String
    }
}, { timestamps: true });

// arrow functions k andar ()=>{} this keyword nahi use kar sakte hai...
//so pre m current instacne k values manipulate hone chahiye
userSchema.pre("save", async function (next) {
    //pre() hook use karke we can directly access the values , this is the use of hooks...it already 

    //only hash password when it's being created/changed
    if (this.isModified("password")) {
        this.password = await bcrypt.hash(this.password, 10);
        next();
    }
    else{
        next();
    }
});

userSchema.methods.isPasswordCorrect = async function(password){
    // input m req se jo password aaya hai vo hai and db ka password is this.password
    return await bcrypt.compare(password,this.password);
}

userSchema.methods.generateAccessToken = function(){
    return jwt.sign(
        {
            _id : this._id,
            email: this.email,
            username: this.username,
            fullName : this.fullName
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    );
};

userSchema.methods.generateRefreshToken = function(){
    return jwt.sign(
        {
            _id : this._id
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    );
};


export const User = mongoose.model("User", userSchema);