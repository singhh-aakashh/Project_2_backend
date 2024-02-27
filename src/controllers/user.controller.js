 import { asyncHandler} from "../utils/asyncHandler.js";
 import { apiError } from "../utils/apiError.js";
 import {User} from "../models/user.model.js";
 import { uploadOnCloudinary } from "../utils/cloudinary.js";
 import { apiResponse } from "../utils/apiResponse.js";

const registerUser = asyncHandler( async (req,res) =>{
    // get user details from frontend
    // validation - not empty
    // check if user already exists
    // check for images , check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check user created
    // return res
 
    const {username, email, fullname, password }=req.body
    // res.send({email})

    if (
        [fullname, email, username, password].some((field)=> 
        field?.trim()==="")
        ){
        throw new apiError(400,"All fields must be required")
    }
   const existedUser =await User.findOne({
    $or:[{username},{email}]
   })

   if(existedUser){
    throw new apiError(409,"User with email or username already exists")
   }
//.files? means it is optional
  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverLocalpath = req.files?.coverImage[0]?.path;
  
  if(!avatarLocalPath){
    throw new apiError(400,"Avatar file is required")
  }

 const avatar= await uploadOnCloudinary(avatarLocalPath);
 const cover = await uploadOnCloudinary(coverLocalpath);

 if(!avatar){
    throw new apiError(400,"Avatar file is required")
 }

 const user = await User.create({
    avatar: avatar.url,
    coverImage: cover?.url || "",
    email,
    password,
    username,
    fullname,
 })

   const checkuser = await User.findById(user._id).select("-password -refreshToken");

   if(!checkuser){
    throw new apiError(500,"Somethimg went wrong in creating user")
   }
    
   return res.status(201).json(
    new apiResponse(200,checkuser,"user register successfully")
   )
})



export { registerUser }