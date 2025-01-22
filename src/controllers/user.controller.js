import {asyncHandler} from "../utils/AsyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import { User} from "../models/user.model.js";
import {uploadOnCloudinary, deleteFromCloudinary} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import { compareSync } from "bcrypt";

const generate_access_and_refresh_token=async(user)=>{
    try{
        const accessToken= await user.generateAccessToken()
        const refreshToken= await user.generateRefreshToken()

        user.refreshToken=refreshToken

        await user.save({validateBeforeSave:false})

        return {accessToken, refreshToken}

    }catch(error){
        throw new ApiError(400, "Error while creating tokens")
    }
}

const registerUser = asyncHandler( async (req, res) => {
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res


    const {fullName, email, username, password } = req.body
    //console.log("email: ", email);

    if (
        [fullName, email, username, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }
    //console.log(req.files);

    const avatarLocalPath = req.files?.avatar[0]?.path;
    //const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }
    

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar local file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    if (!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }
   

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email, 
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )

} )

const loginUser= asyncHandler(async(req, res)=>{
    //access data from req.body
    //check all datas are available
    //check if user exits and get data
    //chek for password
    //ceate access and refesh token
    //set cookie
    const {email, username, password}=req.body;

    if(!email?.trim() && username?.trim()){
        throw new ApiError(400, "Username and email is required")
    }

    let user= await User.findOne({
       $or:[{username}, {email}] 
    })

    if(!user){
        throw new ApiError(400, "User not found")
    }

    const passwordCorrect= await user.isPasswordCorrect(password)

    if(!passwordCorrect){
        throw new ApiError(400, "Incorrect password")
    }

    const {accessToken,refreshToken}= await generate_access_and_refresh_token(user)

    let userData= user.toObject()
    delete userData.password;
    delete userData.refreshToken;

    const options={
        httpOnly:true,
        secure:true
    }

    return res
    .status(200)
    .cookie('accessToken', accessToken, options)
    .cookie('refreshToken', refreshToken, options)
    .json(
        new ApiResponse(200,
            {
                userData,
                accessToken,
                refreshToken
            }
        )
    )
})

const logoutUser= asyncHandler(async(req, res)=>{
    await User.findByIdAndUpdate(req.user._id,
        {
            $unset:{
                refreshToken:1 //removing the filed
            }
        },
        {
            new:true
        }
    )

    const options={
        httpOnly:true,
        secure:true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out"))
})

const refreshAccessToken=asyncHandler(async(req, res)=>{
    const incomingRefreshToken= req.cookies?.refreshToken || req.header("Authorization").replace("Bearer ", "")
    
    if(!incomingRefreshToken){
        throw new ApiError(401, "Unauthorized request")
    }

    const decodedAccessToken= jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)

    const user= await User.findById(decodedAccessToken?._id)

    if(!user){
        throw new ApiError(401, "Invalid refresh Token")
    }

    if(incomingRefreshToken !== user?.refreshToken){
        throw new ApiError(401, "Invalid refresh Tokne")
    }

    const {accessToken, refreshToken}= await generate_access_and_refresh_token(user)

    const options={
        httpOnly:true,
        secure:true
    }

    let userData= user.toObject()
    delete userData.password;
    delete userData.refreshToken;

    return res.status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(200,
            {
                userData,
                accessToken,
                refreshToken
            },
            "Refresh Token refresh SuccessFully"
        )
    )

})

const changePassword= asyncHandler(async(req, res)=>{
    //require Oldpass, newPass, confPass
    //check all filed are there
    //check newpass and conf pass are same
    //req.user=> _id and check in db for user
    //if user exist
    //check oldpass and storde pass are same
    //replace the oldpass from new

    const {oldPass, newPass, confPass}=req.body;

    if([oldPass, newPass, confPass].some((field)=> field.trim()==="")){
       throw new ApiError(400, "All fields are required")
    }

    if(newPass !== confPass){
        throw new ApiError(400, "Confirm new Password again")
    }

    const user= await User.findById(req.user._id).select("_id, password")

    if(!user){
        throw new ApiError(400, "Invalid user credentials")
    }

    const isPasswordCorrect= await user.isPasswordCorrect(oldPass)

    if(!isPasswordCorrect){
        throw new ApiError(400, "Incorrect password")
    }

    user.password=newPass;
    await user.save({validateBeforeSave:false})

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successFully"))

})

const getCurrentUser= asyncHandler(async(req, res)=>{
    return res
    .status(200)
    .json(new ApiResponse(200, req.user, "User fetched successfully"))
})

const updateEmail= asyncHandler(async(req, res)=>{
    const {email, password}=req.body;

    if([email, password].some((filed)=> filed?.trim()==="")){
        throw new ApiError(400, "All fields are required")
    }

    const user= await User.findById(req.user?._id).select("_id, password")

    if(!user){
        throw ApiError(400, "Invalid credentials")
    }

    const passwordCorrect=await user.isPasswordCorrect(password)
    
    if(!passwordCorrect){
        throw new ApiError(400, "Incorrect Password")
    }

    user.email=email;
    await user.save({validateBeforeSave:false})

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Email reset successfull"))
})

const updateUsername= asyncHandler(async(req, res)=>{
    //req.body-> usernme, password
    //username, password?
    //passowrd correct?
    //update username.
    const {username, password}=req.body

    if([username, password].some((filed)=> filed?.trim()==="")){
        throw new ApiError(400, "All filelds are required")
    }

    const user= await User.findById(req.user?._id).select("_id password username")

    if(!user){
        throw ApiError(400, "Invalid credentials")
    }

    const paswordCorrect= await user.isPasswordCorrect(password)
    
    if(!paswordCorrect){
        throw new ApiError(400, "Password didnt match")
    }

    user.username=username
    await user.save({validateBeforeSave:false})

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Username reset successfully"))
})

const updatefullName=asyncHandler(async(req, res)=>{
    const {fullName, password}=req.body;

    if([fullName, password].some((filed)=> filed?.trim()==="")){
        throw new ApiError(400, "All filelds are required")
    }

    const user= await User.findById(req.user?._id).select("_id password username")

    if(!user){
        throw ApiError(400, "Invalid credentials")
    }

    const paswordCorrect= await user.isPasswordCorrect(password)
    
    if(!paswordCorrect){
        throw new ApiError(400, "Password didnt match")
    }

    user.fullName=fullName
    await user.save({validateBeforeSave:false})

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "fullName reset successfully"))
})

const updateAvatar=asyncHandler(async(req, res)=>{
    const avatarLocalPath= req.file?.path
    
    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar image is required")
    }

    const cloudinaryAvatarUrl= req.user.avatar;

    const deleteAvatar= await deleteFromCloudinary(cloudinaryAvatarUrl)
    
    if(!deleteAvatar){
        throw new ApiError(400, "Error while deleting the avatar")
    }

    const updatedAvatar=await uploadOnCloudinary(avatarLocalPath);

    const user=await User.findByIdAndUpdate(req.user?._id,
        {
            $set:{
                avatar:updatedAvatar.url
            }
        },
        {
            new:true
        }
    ).select("-password")

    if(!user){
        throw new ApiError(500, "Error while updating Avatar")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Aatar image updated succesfully"))
})

const updateCoverImage=asyncHandler(async(req, res)=>{
    const coverLocalPath= req.file?.path
    
    if(!coverLocalPath){
        throw new ApiError(400, "Cover image is required")
    }

    const cloudinaryCoverUrl= req.user.coverImage;

    const deleteCover= await deleteFromCloudinary(cloudinaryCoverUrl)
    
    if(!deleteCover){
        throw new ApiError(400, "Error while deleting the Cover Image")
    }

    const updatedCover=await uploadOnCloudinary(coverLocalPath);

    const user=await User.findByIdAndUpdate(req.user?._id,
        {
            $set:{
                coverImage:updatedCover.url
            }
        },
        {
            new:true
        }
    ).select("-password")

    if(!user){
        throw new ApiError(500, "Error while updating Cover Image")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover image updated succesfully"))
})

export {
   registerUser,
   loginUser,
   logoutUser,
   refreshAccessToken,
   changePassword,
   getCurrentUser,
   updateEmail,
   updateUsername,
   updatefullName,
   updateAvatar,
   updateCoverImage
}
