/* needed */
// models/aliexpress.token.model.js
import mongoose from "mongoose";

const tokenSchema = new mongoose.Schema({
  access_token: { type: String, required: true },
  refresh_token: { type: String, required: true },
  expires_at: { type: Date, required: true },
  refresh_expires_at: { type: Date, required: true }
});

tokenSchema.methods.isExpired = function() {
  return new Date() >= this.expires_at;
};

export const AliexpressToken = mongoose.model('AliexpressToken', tokenSchema);