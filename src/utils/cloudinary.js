import {v2 as cloudinary} from 'cloudinary'
import { response } from 'express';
import fs from "fs"


cloudinary.config({ 
    cloud_name:process.env.CLOUDINARY_CLOUD_NAME, 
    api_key:process.env.CLOUDINARY_API_KEY,
    api_secret:process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary=async(localFilePath)=>{
    try{
        if(!localFilePath) return null
        //upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type:"auto"
        })
        //file has been uploaded succesdfully
        // console.log("file is uploded on cloudinary", response.url)
        fs.unlinkSync(localFilePath)
        return response
    }catch(error){
        fs.unlinkSync(localFilePath) // remove the locally saved tem file
        return null
    }
}

const deleteFromCloudinary=async(imageUrl)=>{

    function extractPublicId(url) {
        // Split the URL to isolate the file name with version and extension
        const parts = url.split('/');
        const fileNameWithExtension = parts[parts.length - 1]; // e.g., jvwpsz7ya8a6l3uqpblp.jpg
      
        // Remove the file extension (.jpg)
        const publicId = fileNameWithExtension.split('.')[0];
      
        return publicId;
      }

      try{
        const publicId= extractPublicId(imageUrl)
        const result= await cloudinary.uploader.destroy(publicId)
        return result
      }catch(error){
        return null
      }
}

export {uploadOnCloudinary, deleteFromCloudinary}