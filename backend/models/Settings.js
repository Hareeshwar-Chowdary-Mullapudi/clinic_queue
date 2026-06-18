import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  avgConsultMinutes: {
    type: Number,
    default: 10,
    min: 1,
    max: 120,
  },
});

export default mongoose.model('Settings', settingsSchema);
