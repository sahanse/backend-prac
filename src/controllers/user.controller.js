import {asyncHandler} from "../utils/AsyncHandler.js"

const registerUser=asyncHandler(async(req, res)=>{
    res.status(200).json({
        message:"sucess register"
    })
})

const loginUser=asyncHandler(async(req, res)=>{
    res.status(200).json({
        message:"success login"
    })
})

export {registerUser, loginUser}
