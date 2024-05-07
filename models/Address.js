const mongoose = require('mongoose');

// Định nghĩa schema cho quận
const quanSchema = new mongoose.Schema({
  idQuan: { type: Number, required: true, unique: true },
  tenQuan: { type: String, required: true },
});

// Định nghĩa schema cho phường
const phuongSchema = new mongoose.Schema({
  idPhuong: { type: Number, required: true },
  tenPhuong: { type: String, required: true },
  idQuan: { type: Number, required: true },
});
phuongSchema.index({ idPhuong: 1, idQuan: 1 }, { unique: true });

// Định nghĩa schema cho phố
const phoSchema = new mongoose.Schema({
  idPho: { type: Number, required: true },
  tenPho: { type: String, required: true },
  idPhuong: { type: Number, required: true },
});
phoSchema.index({ idPho: 1, idPhuong: 1 }, { unique: true });

// Tạo model từ schema
const Quan = mongoose.model('Quan', quanSchema);
const Phuong = mongoose.model('Phuong', phuongSchema);
const Pho = mongoose.model('Pho', phoSchema);

module.exports = { Quan, Phuong, Pho };
