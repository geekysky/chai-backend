import asynchandler from "../utils/asynchandler.js";
import { Apierror } from "../utils/ApiError.js";
import {User} from "../model/user.model.js";
import { upload } from "../middleware/multer.middleware.js";
import { uploadonCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/Apiresponse.js";

export const registerUser = asynchandler(async (req,res)=>{
    // get user details from frontend/postman
    // validation - not empty 
    // check if user already exists: check using username,email 
    // check for images,avatar -> multer ka check
    // upload them to cloudinary -> URL mil jaana chahiye
    // create user object (MongoDB) - create entry db
    // remove password and refresh token field from response (jo bhi mongoDB m create hota hai vo sab reponse m aa jata hai)
    // check for valid response for successful user creation 
    // return response or send error 


    // step 1 - catch details from frontend or postman 
    const  {fullName,email,username,password} = req.body;
    console.log("email:",email);

    // if(fullName === ""){
    //     throw new Apierror(400,"Full Name is Required");
    // }

    // step 2 - empty field check 
    if(
        [fullName,email,username,password].some((field)=> field?.trim() === "")
    ){
        //if any of the field returns true then it means it was empty 
        throw new Apierror(400,"All fields are required");
    }
    
    // step 3 - duplicate user check from DB 

    // is method se first user jiski field match ho jaati hai mongoDB se use return karta hai 
    const existedUser = await User.findOne({
        //either username match hogaya or email match hogaya from DB, we can look up for any variable we want 
        $or: [{username},{email}]
    });

    if(existedUser){
        throw new Apierror(409,"User with email or username already exists");
    }

    // step 4 - check if multer fetches the avatr and image files onto our server's disk storage 

    // this ? is used like for when the action/object is found or not...like it's doubtful 
    // ye Local Paths ho bhi sakte hai and nahi bhi...gurantee nahi hai 

    console.log(req.files);
    
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if(!avatarLocalPath){
        throw new Apierror(400,"Avatar to chahiye beta!");
    }


    // step 5 - upload on Cloudinary 
    const avatar = await uploadonCloudinary(avatarLocalPath);
    const coverImage = await uploadonCloudinary(coverImageLocalPath);

    if(!avatar){
        throw new Apierror(400,"avatar couldn't get uploaded on Cloudinary");
    }


    // step 6 - create entry on DB
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    });
    
    // step 7 - deselect password and refresh token 
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    if(!createdUser){
        throw new Apierror(500,"Something went wrong while registering the user");
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser,"User registered successfully!")
    );

});

export const loginUser = asynchandler(async(req,res)=> {
    res.status(200).json({
        message: "api successfully hit"
    });
});


