const mongoose = require('mongoose');

// Định nghĩa schema cho ChecklistSubmission
const listSubmitSchema = new mongoose.Schema({
    customerName: {
        type: String,
        required: true
    },
    idQuan: {
        type: Number,
        required: true
    },
    idPhuong: {
        type: Number,
        required: true
    },
    idPho: {
        type: Number,
    },
    phoneNumber: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: true
    },
    vnptAccount: {
        type: String,
        default: '' // Mặc định là chuỗi rỗng nếu không có giá trị
    },
    checkedItems: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CheckList' // Tham chiếu tới schema của các mục đã chọn
    }],
    networks: {
        type: String,
        default: ''
    },
    paymentTime: {
        type: String,
        required: true
    },
    date: { 
        type: Date,
        required: true
    },
    note: {
        type: String,
        default: ''
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    location: {
        type: {
            latitude: Number,
            longitude: Number
        },
        required: true
    },
    image: {
        type: String, // Lưu trữ hình ảnh dưới dạng Buffer
        default: ''
    }
},{ timestamps: true }
);

module.exports = mongoose.model('ListSubmit', listSubmitSchema);
