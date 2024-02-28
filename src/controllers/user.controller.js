import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { apiResponse } from "../utils/apiResponse.js";
import jwt from 'jsonwebtoken';


const generateAccessAndRefreshTokens = async (userId) => {
   try {
      const user = await User.findById(userId);
      const refreshToken = await user.generateRefreshToken();
      const accessToken = await user.generateAccessToken();

      user.referehToken = refreshToken;
      await user.save({ validateBeforeSave: false })

      return { accessToken, refreshToken }

   } catch (error) {
      throw new apiError(500, "Something went wrong while generating access and refresh tokens")
   }
}


const registerUser = asyncHandler(async (req, res) => {
   // get user details from frontend
   // validation - not empty
   // check if user already exists
   // check for images , check for avatar
   // upload them to cloudinary, avatar
   // create user object - create entry in db
   // remove password and refresh token field from response
   // check user created
   // return res

   const { username, email, fullname, password } = req.body
   // res.send({email})

   if (
      [fullname, email, username, password].some((field) =>
         field?.trim() === "")
   ) {
      throw new apiError(400, "All fields must be required")
   }
   const existedUser = await User.findOne({
      //mongodb operators
      $or: [{ username }, { email }]
   })

   if (existedUser) {
      throw new apiError(409, "User with email or username already exists")
   }
   //.files? means it is optional
   const avatarLocalPath = req.files?.avatar[0]?.path;
   //   const coverLocalpath = req.files?.coverImage[0]?.path;

   let coverLocalpath;
   if (req.files && Array.isArray(req.files.coverImage) &&
      req.files.coverImage.length > 0) {
      coverLocalpath = req.files.coverImage[0].path;
   }


   if (!avatarLocalPath) {
      throw new apiError(400, "Avatar file is required")
   }

   const avatar = await uploadOnCloudinary(avatarLocalPath);
   const cover = await uploadOnCloudinary(coverLocalpath);

   if (!avatar) {
      throw new apiError(400, "Avatar file is required")
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

   if (!checkuser) {
      throw new apiError(500, "Somethimg went wrong in creating user")
   }

   return res.status(201).json(
      new apiResponse(200, checkuser, "user register successfully")
   )
})

const loginUser = asyncHandler(async (req, res) => {
   //get login details from frontend
   //validation
   //check for user in database
   // if user not present, request to register first
   //match details of user
   // generate access and refresh token
   //send this in cookie

   const { username, email, password } = req.body;

   if ((!(username || email)) && !password) {
      throw new apiError(400, "Username or email and password is required for login")
   }

   const user = await User.findOne({
      // finds user on the basis of username or email
      $or: [{ username }, { email }]
   })

   if (!user) {
      throw new apiError(404, "User in not found please register first")
   }

   const isPasswordValid = await user.isPasswordCorrect(password);

   if (!isPasswordValid) {
      throw new apiError(401, "password is not correct")
   }

   const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);
   // we find again so thar we can get the refresh token and access token
   const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

   // cookie send
   const options = {
      httpOnly: true,
      secure: true
   }

   return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", refreshToken, options).json(
      new apiResponse(
         200,
         {
            user: loggedInUser,
            accessToken, refreshToken
         },
         "user logged in successfully"
      )
   )

})


const logoutUser = asyncHandler(async (req, res) => {
   // remove cookie
   // reset refresh token

   await User.findByIdAndUpdate(
      req.user._id,
      {
         $set: {
            refreshToken: undefined
         }
      },
      {
         new: true
      }
   )
   const options = {
      httpOnly: true,
      secure: true
   }

   return res.status(200).clearCookie("accessToken", options).
      clearCookie("refreshToken", options).json(new apiResponse(200, {}, "User logout"))

})

const refreshAccessToken = asyncHandler( async(req, res) => {
   const incomingRefreshToken = req.cookies?.refreshToken || req.body.refreshToken

   if(!incomingRefreshToken){
      throw new apiError(401, "unauthorized request")
   }

   try {
      const decodedToken= jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
   
      const user = User.findById(decodedToken?._id).select("-password")
   
      if(!user){
         throw new apiError(401,"invalid refresh token")
      }
      
      if(incomingRefreshToken !== user?.refreshToken){
         throw new apiError(401,"Refresh token is expired")
      }
   
      const options={
         httpOnly: true,
         secure: true,
      }
   
     const {accessToken,newRefreshToken} =await generateAccessAndRefreshTokens(user._id)
   
      return res.status(200).cookie("accessToken",accessToken,options).cookie("refreshToken",newRefreshToken,options).json(new apiResponse(200,{accessToken, refreshToken:newRefreshToken},"Access token refreshed"))
   }
    catch (error) {
      throw new apiError(401,error?.message || "invalid refresh token")
   }
}
)

const changeCurrentPassword = asyncHandler( async(req,res) => {
   //give old password and new password
   // validate old password and new password
   // check old password is true 

   const {oldPassword, newPassword} = req.body;

   if(!oldPassword && !newPassword) throw new apiError(400,"old password and new password is required")
   
   const user = await User.findById(req.user?._id);

   const isPasswordCorrect =await user.isPasswordCorrect(oldPassword);
    
   if(!isPasswordCorrect) throw new apiError(400,"Enter correct old password");

   user.password = newPassword;

   await user.save({validateBeforeSave: false})
    
   return res.status(200).json(new apiResponse(200,{},"password updated"))

})

const getCurrentUser = asyncHandler( async (req, res) => {
   return res.status(200).json(new apiResponse(200,req.user,"current user fetched successfully"))
})

const updateAccountDetails = asyncHandler( async (req, res) => {

   const {newFullname,newEmail} = req.body;

   if(!(newFullname || newEmail)) throw new apiError(403,"Fullname and Email is required")

   const user = await User.findByIdAndUpdate(req.user?._id,{
    $set:{
      email: newEmail,
      fullname:newFullname,
    }
   },{
      new: true
   }).select("-password")

   return res.status(200).json(new apiResponse(200,user,"Account details updated"))
})

const updateUserAvatar = asyncHandler( async(req,res) => {
   const newAvatarLocalPath = req.file?.path
   
   if(!newAvatarLocalPath) throw new apiError(403,"Avatar is required")

   const newAvatar = await uploadOnCloudinary(newAvatarLocalPath)

   if(!newAvatar.url) throw new apiError(400,"Error while uploading avatar")

   const user = await User.findByIdAndUpdate(req.user?._id,{
        $set : {avatar : newAvatar.url}
   },{
      new:true
   }).select("-password")

   return res.status(200).json(new apiResponse(200,user,"Avatar updated successfully"))
})

const updateUserCover = asyncHandler( async(req,res) => {
   const newCoverLocalPath = req.file?.path
   
   if(!newCoverLocalPath) throw new apiError(403,"Avatar is required")

   const newCover = await uploadOnCloudinary(newCoverLocalPath)

   if(!newCover.url) throw new apiError(400,"Error while uploading cover image")

   const user = await User.findByIdAndUpdate(req.user?._id,{
        $set : {coverImage : newCover.url}
   },{
      new:true
   }).select("-password")

   return res.status(200).json(new apiResponse(200,user,"Cover image updated successfully"))
})

export { registerUser, loginUser, logoutUser, refreshAccessToken, changeCurrentPassword, getCurrentUser,updateAccountDetails ,updateUserAvatar ,updateUserCover } 