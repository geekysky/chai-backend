import asynchandler from "../utils/asynchandler.js";
import { Apierror } from "../utils/ApiError.js";
import { User } from "../model/user.model.js";
import { upload } from "../middleware/multer.middleware.js";
import { uploadonCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/Apiresponse.js";
import jwt from "jsonwebtoken";

// requires mondoDB's document _id as a parameter
async function generateAccessAndRefreshTokens(userId) {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        //user is an object 
        user.refreshToken = refreshToken;

        //don't scan for entire schema and it's fields like which are required and which are not 
        // just refresh token add karke baaki vaise ka vaisa save kardo 
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };

    } catch (error) {
        throw new Apierror(500, "Something went wrong while generating Refresh and Access Token");
    }
}


export const registerUser = asynchandler(async (req, res) => {
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
    const { fullName, email, username, password } = req.body;
    console.log("email:", email);

    // if(fullName === ""){
    //     throw new Apierror(400,"Full Name is Required");
    // }

    // step 2 - empty field check 
    if (
        [fullName, email, username, password].some((field) => field?.trim() === "")
    ) {
        //if any of the field returns true then it means it was empty 
        throw new Apierror(400, "All fields are required");
    }

    // step 3 - duplicate user check from DB 

    // is method se first user jiski field match ho jaati hai mongoDB se use return karta hai 
    const existedUser = await User.findOne({
        //either username match hogaya or email match hogaya from DB, we can look up for any variable we want 
        $or: [{ username }, { email }]
    });

    if (existedUser) {
        throw new Apierror(409, "User with email or username already exists");
    }

    // step 4 - check if multer fetches the avatr and image files onto our server's disk storage 

    // this ? is used like for when the action/object is found or not...like it's doubtful 
    // ye Local Paths ho bhi sakte hai and nahi bhi...gurantee nahi hai 

    console.log(req.files);

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if (!avatarLocalPath) {
        throw new Apierror(400, "Avatar to chahiye beta!");
    }


    // step 5 - upload on Cloudinary 
    const avatar = await uploadonCloudinary(avatarLocalPath);
    const coverImage = await uploadonCloudinary(coverImageLocalPath);

    if (!avatar) {
        throw new Apierror(400, "avatar couldn't get uploaded on Cloudinary");
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

    if (!createdUser) {
        throw new Apierror(500, "Something went wrong while registering the user");
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully!")
    );

});


export const loginUser = asynchandler(async (req, res) => {
    // req body -> data 
    // username/email
    // find the user 
    //password check 
    // access and refresh token 
    //send cookie

    const { email, username, password } = req.body;

    if (!username && !email) {
        //both unavailable
        throw new Apierror(400, "Username or email is required");
    }

    //at this pt user is registered (db m present hai)
    const user = await User.findOne({
        $or: [{ username }, { email }]
    });

    if (!user) {
        //user to mila hi nahi 
        throw new Apierror(404, "User does not exist");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new Apierror(401, "Password Incorrect");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser, accessToken, refreshToken
                },
                "User logged In Successfully"
            )
        );

});


export const logoutUser = asynchandler(async (req, res) => {
    //cookies clear karni padegi 
    //refresh token clear karna padega 

    //at this point we have user details in req.user jo humne explicitly 
    //auth middleware m add kiya tha before executing this logout function 

    //db se remove kar diya using the $ operator 
    await User.findByIdAndUpdate(req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            //new updated value dena hai and not old wala jaha p refresh token visible ho 
            new: true
        }
    );

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out!"));

});

export const refreshAcessToken = asynchandler(async (req, res) => {
    //refresh token to chahiye 
    //cookies m send kiye the...so cookies se access kar sakte hai 

    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
        throw new Apierror(401, "unauthorized request");
    }

    //verify karenge refresh toke ko 

    try {
        const decodedToken = await jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
        //refresh token m humne explicitly _id daali thi user.model.js m so decoded token m vo rehna chahiye
        //jwt token format - HEADER , PAYLOAD , SIGNATURE(SECRET)
        // _id header m humne push karwaya tha 

        // _id se mongoDB se query karke information le sakte hai
        const user = await User.findById(decodedToken?._id);

        if (!user) {
            throw new Apierror(404, "User Not Found");
        }

        // dono encrypted hai -> check based on encrypted ones 
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new Apierror(401, "Refresh Token is Expired or used");
        }

        //cookies m set karne k liye options 
        const options = {
            httpOnly: true,
            secure: true
        }

        // generate new tokens 
        const { newAccessToken, newRefreshToken } = await generateAccessAndRefreshTokens(user._id);

        return res
            .status(200)
            .cookie("accessToken", newAccessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(200, { accessToken: newAccessToken, refreshToken: newRefreshToken }, "Access Token refreshed!")
            );
    } catch (error) {
        throw new Apierror(401, error?.message || "Invalid Refresh Token");
    }

});

export const changeCurrentUserPassword = asynchandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user?._id);

    const isPasswordValid = await user.isPasswordCorrect(oldPassword);

    if (!isPasswordValid) {
        throw new Apierror(400, "Invalid Password");
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password Changed Successfully"));
});

export const getCurrentUser = asynchandler(async (req, res) => {
    return res
        .status(200)
        .json(200, req.user, "Current user fetched successfully");
});

export const updateAccountDetails = asynchandler(async (req, res) => {
    const { fullName, email } = req.body;

    if (!fullName || !email) {
        throw new Apierror(400, "All fields are required");
    }

    const user = User.findByIdAndUpdate(req.user?._id,
        {
            $set: {
                fullName: fullName,
                email: email
            }
        }
        , { new: true }
    ).select("-password");

    return res
    .status(200)
    .json(new ApiResponse(200,user,"Account details updated successfully"));
});

export const updateUserAvatar = asynchandler(async (req,res) => {
    const avatarLocalPath = req.file?.path;

    if(!avatarLocalPath){
        throw new Apierror(400,"Avatar file is missing");
    }

    //upload this avatar on Cloudinary 
    //pura object mila hai isme se URL extract karna hai 
    const avatar = await uploadonCloudinary(avatarLocalPath);

    if(!avatar.url){
        throw new Apierror(400,"Error while uploading avatar on CLoudinary");
    }

    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password");

    return res
    .status(200)
    .json(
        new ApiResponse(200,user,"Avatar Image updated successfully")
    );

});

export const updateUserCoverImage = asynchandler(async (req,res) => {
    const coverImageLocalPath = req.file?.path;

    if(!coverImageLocalPath){
        throw new Apierror(400,"Cover Image is missing");
    }

    //upload this avatar on Cloudinary 
    //pura object mila hai isme se URL extract karna hai 
    const coverImage = await uploadonCloudinary(coverImageLocalPath);

    if(!coverImage.url){
        throw new Apierror(400,"Error while uploading cover image on Cloudinary");
    }

    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password");

    return res
    .status(200)
    .json(
        new ApiResponse(200,user,"Cover Image updated successfully")
    );

});
