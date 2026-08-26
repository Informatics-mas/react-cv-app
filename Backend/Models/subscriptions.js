import mongoose from "mongoose";

const SubscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', 
    required: [true, "L'identifiant de l'utilisateur est requis"]
  },
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plans',
    required: [true, "L'identifiant du plan est requis"]
  },
  startDate: {
    type: Date,
    default: Date.now,
    required: true
  },
  endDate: {
    type: Date,
    required: [true, "La date de fin de l'abonnement est requise"]
  },
  status: {
    type: String,
    enum: {
      values: ['active', 'expired', 'canceled'],
      message: '{VALUE} n\'est pas un statut valide'
    },
    default: 'active'
  },
  // Optionnel : pour savoir si le renouvellement auto est activé
  autoRenew: {
    type: Boolean,
    default: false
  }
}, { 
  timestamps: true 
});

// Indexation pour accélérer les recherches par utilisateur
SubscriptionSchema.index({ userId: 1 });

const Subscription = mongoose.models.Subscription || mongoose.model("Subscription", SubscriptionSchema);

export default Subscription;