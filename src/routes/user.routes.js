import {Router} from "express"

const router=Router()

router.route('/register').post((req, res)=>{
    res.send("register request accepted")
})

router.route("/login").post((req, res)=>{
    res.send("login request accepted")
})

export default router

