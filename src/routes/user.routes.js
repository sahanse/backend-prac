import { Router } from "express";
import { 
    loginUser, 
    registerUser, 
    logoutUser, 
    refreshAccessToken, 
    changePassword, 
    getCurrentUser,
    updateEmail,
    updateUsername,
    updatefullName,
    updateAvatar,
    updateCoverImage,
    getChannelUserProfile
} from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.middleware.js"
import {verifyJWT} from "../middlewares/auth.middleware.js"

const router=Router()

router.route("/register").post(
    upload.fields([
       {
        name:"avatar",
        maxCount:1
       },
       {
        name:"coverImage",
        maxCount:1
       } 
    ]),
    registerUser
)

router.route("/login").post(loginUser)

//secured routes
router.route("/logout").post(verifyJWT, logoutUser)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/reset-pass").post(verifyJWT,changePassword)
router.route("/current-user").get(verifyJWT, getCurrentUser)
router.route("/update-email").patch(verifyJWT, updateEmail)
router.route("/update-username").patch(verifyJWT, updateUsername)
router.route("/update-fullname").patch(verifyJWT, updatefullName)
router.route("/update-avatar").patch(verifyJWT, upload.single("avatar"), updateAvatar)
router.route("/update-coverImage").patch(verifyJWT, upload.single("coverImage"), updateCoverImage)
router.route("/c/:username").get(verifyJWT, getChannelUserProfile)

export default router
