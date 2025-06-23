const { Schema, model } = require('mongoose');

const CompanyProfileSchema = new Schema({
  owner:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name:     { type: String, required: true },
  address:  { type: String, required: true },
  address2: { type: String, default: "" }, // safe!
  email:    { type: String, required: true },
  phone:    { type: String, required: true },
  website:  { type: String, default: "" }
}, { timestamps: true });

module.exports = model('CompanyProfile', CompanyProfileSchema);
