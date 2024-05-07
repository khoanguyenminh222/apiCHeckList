const mongoose = require('mongoose');
const CheckListSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    status: {
        type: Number,
        default: 0, // Giá trị mặc định: chưa xoá
        enum: [0, 1]
    }
},{ timestamps: true }
);
module.exports = mongoose.model('CheckList', CheckListSchema);