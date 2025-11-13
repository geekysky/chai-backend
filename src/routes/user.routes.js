import { Router } from "express";
import { registerUser, loginUser, logoutUser, refreshAcessToken } from "../controllers/user.controller.js";
import { upload } from "../middleware/multer.middleware.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
const router = Router();

// REGISTER ROUTE
// registerUser method execute karne k pehle multer ka middleware run karwa dena 
router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser);

// LOGIN ROUTE 
router.route("/login").post(loginUser);

//securd routes

// LOGOUT ROUTE
//verifyJWT is a middleware 
router.route("/logout").post(verifyJWT,logoutUser);

// REFRESH ACCESS TOKEN ROUTE 
router.route("/refresh-token").post(refreshAcessToken);


export default router;