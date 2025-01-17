import dotenv from "dotenv"
import {app} from "./app.js"
import connectnDB from "./db/index.js"

dotenv.config({path:"./.env"})

connectnDB().then((data)=>{
    console.log("MONGODB Connection success:", data.connection.host)

    app.on("error",((error)=>{
       console.log("error", error)
       throw error 
    }))

    app.listen(process.env.PORT || 8000, ()=>{
        console.log(`listening to port: ${process.env.PORT}`)
    })

}).catch((error)=>{
    console.log("MONGODB connection failed:", error)
    process.exit(1)
})

