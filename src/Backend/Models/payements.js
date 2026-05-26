import mongoose from "mongoose";

const PaymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, "L'utilisateur est obligatoire"]
  },
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
    required: [true, "L'abonnement lié est obligatoire"]
  },
  amount: {
    type: Number,
    required: [true, "Le montant est requis"],
    min: [0, "Le montant ne peut pas être négatif"]
  },
  currency: {
    type: String,
    default: 'XOF', // Par défaut en FCFA pour tes projets
    uppercase: true
  },
  method: {
    type: String,
    required: [true, "La méthode de paiement est requise"],
    enum: {
      values: ['orange_money', 'moov_money', 'mtn_money', 'wave', 'card', 'paypal'],
      message: '{VALUE} n\'est pas une méthode supportée'
    }
  },
  status: {
    type: String,
    enum: ['pending', 'succeeded', 'failed', 'refunded'],
    default: 'pending'
  },
  transactionReference: {
    type: String,
    unique: true, // Très important pour éviter les doubles paiements
    required: [true, "La référence de transaction est obligatoire"]
  },
  paymentDate: {
    type: Date,
    default: Date.now
  },
  // Pour stocker la réponse brute de l'API de paiement (CinetPay, FedaPay, etc.)
  rawGatewayResponse: {
    type: Object
  }
}, { 
  timestamps: true 
});

// Index pour retrouver rapidement les paiements d'un utilisateur
PaymentSchema.index({ transactionReference: 1 });
PaymentSchema.index({ userId: 1 });

const Payment = mongoose.models.Payment || mongoose.model("Payment", PaymentSchema);

export default Payment;