const mongoose = require('mongoose');

const schemaFieldSchema = new mongoose.Schema({
  schemaName: { type: String, required: true },
  name: { type: String, required: true },
  type: { type: String, required: true, enum: ['string', 'number', 'date', 'boolean', 'email'] },
  required: { type: Boolean, default: false },
  label: String,
  order: Number,
  active: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('SchemaField', schemaFieldSchema);