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
    enum: ['user', 'admin', 'premium'], // 💡 Ajoute 'premium' ici !
    default: 'user' 
  },
  user_plan: {
    type: String,
    default: "Free" // 💡 Ajoute le champ pour correspondre aux routes
  },
  user_max_downloads: {
    type: Number,
    default: 5 // 💡 Ajoute le champ pour correspondre aux routes
  }
}, { 
  timestamps: true 
});

const User = mongoose.models.User || mongoose.model("User", UserSchema);

export default User;