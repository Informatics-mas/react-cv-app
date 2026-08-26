import mongoose from "mongoose";

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
    enum: ['user', 'admin', 'premium'], 
    default: 'user' 
  },
  user_plan: {
    type: String,
    default: "Free"
  },
  user_max_downloads: {
    type: Number,
    default: 5
  }
}, { 
  timestamps: true 
});

const User = mongoose.models.User || mongoose.model("User", UserSchema);

export default User;