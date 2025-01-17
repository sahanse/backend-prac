import mongoose from "mongoose";
import {DB_NAME} from "../constants.js"

const connectnDB= async()=>{
    try{
        const connectionInstance= await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        return connectionInstance
    }catch(error){
       throw error
    }
}

export default connectnDB