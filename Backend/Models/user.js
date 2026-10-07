import mongoose from "mongoose";
import { USER_ROLES } from "../constants.js";

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true,
    trim: true       
  },
  password: { 
    type: String, 
    required: true 
  },
  role: {
    type: String,
    enum: Object.values(USER_ROLES),
    default: USER_ROLES.USER
  },
  user_plan: {
    type: String,
    default: "Free"
  },
  user_max_downloads: {
    type: Number,
    default: 5
  },
  // Compteur de téléchargements (incrémenté uniquement par le serveur, façon atomique)
  downloadsUsed: {
    type: Number,
    default: 0,
    min: 0
  }
}, { 
  timestamps: true 
});

const User = mongoose.models.User || mongoose.model("User", UserSchema);

export default User;