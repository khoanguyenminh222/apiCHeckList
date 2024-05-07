const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        unique: true // Đảm bảo không có hai tài khoản có cùng tên đăng nhập
    },
    password: {
        type: String,
    },
    fullname: {
        type: String,
        required: true,
    },
    district: { type: String},
    role: {
        type: String,
        enum: ['admin', 'user'], // Phân quyền cho người dùng
        default: 'user' // Mặc định là 'user' nếu không được chỉ định
    }
},
{ timestamps: true });
module.exports = mongoose.model('User', UserSchema);