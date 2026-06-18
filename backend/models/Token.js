import mongoose from 'mongoose';

const tokenSchema = new mongoose.Schema(
  {
    number: {
      type: Number,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['waiting', 'serving', 'done', 'removed'],
      default: 'waiting',
      index: true,
    },
    calledAt: Date,
    completedAt: Date,
  },
  { timestamps: true }
);

tokenSchema.index({ status: 1, number: 1 });

export default mongoose.model('Token', tokenSchema);
