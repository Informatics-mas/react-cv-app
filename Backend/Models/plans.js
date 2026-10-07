import mongoose from "mongoose";
import { PLAN_NAMES } from "../constants.js";

const PlansSchema = new mongoose.Schema({
  name: { 
    type: String,
    required: true,
    enum: Object.values(PLAN_NAMES), 
  },
  price: { 
    type: Number, 
    required: [true, "Le prix est requis"],
    min: [0, "Le prix ne peut pas être inférieur à 0"] 
  },
  duree: {
    type: Number,
    required: [true, "La durée (en jours) est requise"],
    min: [0, "La durée ne peut pas être négative"]
  },
  // On remplace ou complète Description par un tableau pour les "checkmarks"
  features: {
    type: [String],
    default: []
  },
  description: { 
    type: String, 
    required: [true, "La Description est obligatoire"],
    minLength: [10, "La Description doit faire au moins 10 caractères"]
  },
  isPopular: {
    type: Boolean,
    default: false
  }, 
  maxDownloads: {
    type: Number,
    required: [true, "Le nombre de téléchargements est requis"],
    min: [2, "le nombre de telechargement doit être au moi 2 "]
  }
}, { 
  timestamps: true 
});

const Plans = mongoose.models.Plans || mongoose.model("Plans", PlansSchema);

export default Plans;