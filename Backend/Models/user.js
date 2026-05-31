import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true // Enlève les espaces inutiles avant ou après
  },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true, // Transforme "Admin@Test.com" en "admin@test.com"
    trim: true       // Enlève les espaces inutiles avant ou après
  },
  password: { 
    type: String, 
    required: true 
  },
  role:{
    type: String,
    enum: ['user', 'admin'], // Limite les rôles possibles
    default: 'user' // Par défaut, un nouvel admin est un "admin"
  },
}, { 
  timestamps: true // Ajoute automatiquement "createdAt" et "updatedAt" (utile pour savoir quand un admin a été créé)
});

// Sécurité pour éviter les erreurs de re-déclaration du modèle par Mongoose
const User = mongoose.models.User || mongoose.model("User", UserSchema);

export default User;