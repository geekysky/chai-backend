import {v2 as cloudinary} from "cloudinary"
import fs from "fs"

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY,  
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadonCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath){
            return null;
        }
        
        const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type: "auto"
        });

        //file has been uploaded successfully on cloudinary
        //console.log("File successfuly uploaded on cloudinary!",response.url);
        
        //unlink/delete file object from local file path 
        fs.unlinkSync(localFilePath);
        return response;


    } catch (error) {
        //file local server p to aa chuka hai but cloudinary for any reason upload nahi ho paya hai...
        
        //remove the locally saved temporary file as the upload operation failed 
        fs.unlinkSync(localFilePath);
        return null;
    }
};

// cloudinary.uploader
//   .upload("my_image.jpg")
//   .then(result=>console.log(result));


export {uploadonCloudinary};