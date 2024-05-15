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
        enum: ['admin', 'manager','user'], // Phân quyền cho người dùng
        default: 'user' // Mặc định là 'user' nếu không được chỉ định
    },
    codeDistrict: [{
        idQuan: {  
            type: Number,
            required: true  
        },
        idPhuong: { 
            type: Number,
            required: true 
        }
    }]
},
{ timestamps: true });
module.exports = mongoose.model('User', UserSchema);