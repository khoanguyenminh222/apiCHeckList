const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const multer = require('multer');
const exceljs = require('exceljs');

const User = require('../models/User');
const { Quan, Phuong, Pho } = require('../models/Address'); 

const upload = multer({ dest: 'uploads/' });

// Route để tạo người dùng mới
router.post('/register', async (req, res) => {
    try {
        // Nhận thông tin từ yêu cầu
        let { username, password, fullname, role, district } = req.body;

        // Kiểm tra xem người dùng đã tồn tại trong cơ sở dữ liệu chưa
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: 'Người dùng đã tồn tại' });
        }

        // Thiết lập giá trị mặc định cho username nếu không được cung cấp
        if (!password || password == '') {
            password = 'khoa';
        }

        // Khởi tạo một người dùng mới với các thông tin được truyền vào
        const newUser = new User({
            username,
            password: password ? await bcrypt.hash(password, 10) : undefined, // Mã hóa mật khẩu nếu được cung cấp
            fullname,
            role,
            district
        });
        // Lưu người dùng mới vào cơ sở dữ liệu
        await newUser.save();

        res.status(201).json({ message: 'Người dùng đã được tạo thành công' });
    } catch (error) {
        console.error('Lỗi khi tạo người dùng:', error);
        res.status(500).json({ message: 'Có lỗi xảy ra, vui lòng thử lại sau' });
    }
});


// Route để đăng nhập
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Kiểm tra xem username và password đã được cung cấp không
        if (!username || !password) {
            return res.status(400).json({ message: 'Vui lòng cung cấp tên đăng nhập và mật khẩu' });
        }

        // Tìm người dùng trong cơ sở dữ liệu
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ message: 'Tên đăng nhập không tồn tại' });
        }

        // So sánh mật khẩu
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ message: 'Mật khẩu không đúng' });
        }

        // Đăng nhập thành công
        res.status(201).json({ message: "Đăng nhập thành công", user: user});
    } catch (error) {
        console.error('Lỗi khi đăng nhập:', error);
        res.status(500).json({ message: 'Có lỗi xảy ra, vui lòng thử lại sau' });
    }
});

router.put('/change-password', async (req, res) => {
    try {
        const { username, currentPassword, newPassword } = req.body;

        // Tìm người dùng trong cơ sở dữ liệu
        const user = await User.findOne({ username });

        // Kiểm tra xem người dùng có tồn tại không
        if (!user) {
            return res.status(404).json({ message: 'Người dùng không tồn tại' });
        }

        // Kiểm tra xem mật khẩu hiện tại có khớp không
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Mật khẩu hiện tại không đúng' });
        }

        // Mã hóa mật khẩu mới
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Cập nhật mật khẩu mới cho người dùng
        user.password = hashedPassword;
        await user.save();

        res.status(200).json({ message: 'Mật khẩu đã được thay đổi thành công' });
    } catch (error) {
        console.error('Lỗi khi đổi mật khẩu:', error);
        res.status(500).json({ message: 'Có lỗi xảy ra, vui lòng thử lại sau' });
    }
});

router.post('/import', upload.single('excelFile'), async (req, res) => {
    try {
        const filePath = req.file.path;
        const result = await importFromExcel(filePath);
        console.log(result)
        if(result){
            console.log('Dữ liệu đã được nhập thành công, đang trong quá trình xử lý')
            res.status(200).json({ message: 'Dữ liệu đã được nhập thành công, đang trong quá trình xử lý' });
        }else{
            console.log('Tiêu đề của file không đúng')
            res.status(401).json({ message: 'Không tìm thấy tiêu đề cần nhập' });
        }
    } catch (error) {
        console.error('Lỗi khi xử lý yêu cầu import:', error);
        res.status(500).json({ message: 'Có lỗi xảy ra, vui lòng thử lại sau' });
    }
});

function findColumnIndexByHeader(headerRow, headerName) {
    let columnIndex = -1;
    headerRow.eachCell((cell, colNumber) => {
        if (cell.value === headerName) {
            columnIndex = colNumber;
            // Dừng vòng lặp khi tìm thấy cột chứa headerName
            return false;
        }
    });
    if (columnIndex === -1) {
        console.log(`Column with header "${headerName}" not found`);
        return false;
    }
    return columnIndex;
}

async function importFromExcel(filePath) {
    try {
        const workbook = new exceljs.Workbook();
        await workbook.xlsx.readFile(filePath);
        const worksheet = workbook.getWorksheet(1); // Lấy sheet đầu tiên

        let headerRow = null;
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) { // Lưu dòng tiêu đề
                headerRow = row;
                // Dừng vòng lặp khi tìm thấy dòng tiêu đề
                return false;
            }
        });

        if (!headerRow) {
            console.log('Header row not found');
            return false;
        }

        const emailColumnIndex = findColumnIndexByHeader(headerRow, 'EMAIL');
        const fullnameColumnIndex = findColumnIndexByHeader(headerRow, 'TEN_NV');
        const districtColumnIndex = findColumnIndexByHeader(headerRow, 'TEN_DV');
        if(emailColumnIndex && fullnameColumnIndex && districtColumnIndex){
            worksheet.eachRow(async (row, rowNumber) => {
                if (rowNumber !== 1) { // Bỏ qua dòng tiêu đề
                    const email = row.getCell(emailColumnIndex).value;
                    if (!email || email.trim() === '') {
                        console.log(`Row ${rowNumber}: Email is empty, skipping...`);
                        return; // Bỏ qua dòng nếu email là rỗng
                    }
                    // Kiểm tra xem user đã tồn tại trong cơ sở dữ liệu chưa
                    let user = await User.findOne({ username: email });
                    if (user) {
                        // Nếu người dùng đã tồn tại, cập nhật thông tin tên đầy đủ và quận/huyện
                        const fullname = row.getCell(fullnameColumnIndex).value;
                        const district = row.getCell(districtColumnIndex).value;
                        user = await User.findOneAndUpdate(
                            { username: email },
                            { fullname, district },
                            { new: true } // Trả về người dùng đã được cập nhật
                        );
                        console.log(`Row ${rowNumber}: User with email ${email} updated`);
                    } else {
                        // Nếu người dùng chưa tồn tại, thêm người dùng mới vào cơ sở dữ liệu
                        user = await User.create({
                            username: email,
                            fullname: row.getCell(fullnameColumnIndex).value,
                            district: row.getCell(districtColumnIndex).value,
                            password: await bcrypt.hash('khoa', 10)
                        });
                        console.log(`Row ${rowNumber}: User with email ${email} added to database`);
                    }
                }
            });
            console.log('All data added successfully');
            return true;
        }else{
            console.log('File not contains header');
            return false;
        }
    } catch (error) {
        console.error('Error importing data from Excel:', error);
        throw error;
    }
}


// Route để lấy tất cả người dùng
router.get('/all', async (req, res) => {
    try {
        const users = await User.find();
        res.status(200).json(users);
    } catch (error) {
        console.error('Lỗi khi lấy tất cả người dùng:', error);
        res.status(500).json({ message: 'Có lỗi xảy ra, vui lòng thử lại sau' });
    }
});

router.put('/:userId/codeDistrict', async (req, res) => {
    try {
        let userId = req.params.userId;
        let codeDistrictArray = req.body.codeDistrictArray; // Mảng các đối tượng { idQuan, idPhuong }

        // Tìm người dùng trong cơ sở dữ liệu
        let user = await User.findById(userId);
        
        // Kiểm tra nếu không tìm thấy người dùng
        if (!user) {
            return res.status(404).json({ message: 'Người dùng không tồn tại' });
        }
        console.log(codeDistrictArray)
        // Cập nhật codeDistrict của người dùng
        user.codeDistrict = codeDistrictArray;
        await user.save();

        // Trả về thông báo thành công
        return res.status(200).json({ message: 'codeDistrict cập nhật thành công' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Có lỗi xảy ra, vui lòng thử lại sau' });
    }
});

router.get('/:username', async (req, res) => {
    try {
        const username = req.params.username;

        // Tìm người dùng trong cơ sở dữ liệu dựa trên username
        const user = await User.findOne({ username: username });

        if (!user) {
            return res.status(404).json({ message: 'Không tìm thấy người dùng' });
        }

        res.status(200).json(user);
    } catch (error) {
        console.error('Lỗi khi lấy thông tin người dùng:', error);
        res.status(500).json({ message: 'Có lỗi xảy ra, vui lòng thử lại sau' });
    }
});
module.exports = router;