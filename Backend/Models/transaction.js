import mongoose from "mongoose";

const TransactionSchema = new mongoose.Schema({
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
    required: [true, "L'identifiant du paiement est requis"]
  },
  type: {
    type: String,
    enum: {
      values: ['paiement', 'remboursement'],
      message: '{VALUE} n\'est pas un type de transaction valide'
    },
    required: true
  },
  amount: {
    type: Number,
    required: [true, "Le montant est obligatoire"],
    // On peut avoir un montant négatif pour un remboursement selon ta logique comptable
  },
  description: {
    type: String,
    trim: true,
    default: function() {
      return this.type === 'paiement' ? 'Règlement d\'abonnement' : 'Remboursement client';
    }
  },
  transactionDate: {
    type: Date,
    default: Date.now
  }
}, { 
  timestamps: true 
});

// Index pour retrouver l'historique d'un paiement précis
TransactionSchema.index({ paymentId: 1 });

const Transaction = mongoose.models.Transaction || mongoose.model("Transaction", TransactionSchema);

export default Transaction;