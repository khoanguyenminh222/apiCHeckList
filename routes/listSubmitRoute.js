const express = require('express');
const router = express.Router();
const ListSubmit = require('../models/ListSubmit');
const exceljs = require('exceljs');
const User = require('../models/User');
const fs = require('fs-extra');
const path = require('path');
const multer = require('multer');
const moment = require('moment-timezone');
const CheckList = require('../models/CheckList');
const { Quan, Phuong, Pho } = require('../models/Address'); 
require('dotenv/config')


// Thiết lập multer để tải ảnh vào thư mục public/images
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/images');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });
// Route để tạo mới một ChecklistSubmission
router.post('/', upload.single('image'), async (req, res) => {
    try {
        let { customerName, idQuan, idPhuong, idPho, phoneNumber, address, vnptAccount, checkedItems, networks, paymentTime, date, note, userId, location } = req.body;
        console.log(req.file)
        // Kiểm tra xem file có tồn tại trong req.file không
        let imageUrl = '';
        if (req.file) {
            // Lấy đường dẫn ảnh từ req.file và lưu vào cơ sở dữ liệu
            imageUrl = req.file.path.replace('public', '').replace(/\\/g, '/');
        }
        // Tạo một đối tượng ChecklistSubmission mới từ dữ liệu yêu cầu
        const newChecklistSubmission = new ListSubmit({
            customerName,
            idQuan,
            idPhuong,
            idPho,
            phoneNumber,
            address,
            vnptAccount,
            checkedItems,
            networks,
            paymentTime,
            date,
            note,
            userId,
            location,
            image: imageUrl
        });
        console.log(newChecklistSubmission)
        // Lưu đối tượng mới vào cơ sở dữ liệu
        const savedChecklistSubmission = await newChecklistSubmission.save();
        
        res.status(201).json(savedChecklistSubmission);
    } catch (error) {
        res.status(400).json({ message: error.message });
        console.log(error)
    }
});

const PAGE_SIZE = 10;
// Route để lấy tất cả ChecklistSubmissions query: page, role, search
router.get('/', async (req, res) => {
    try {
        const {role, userId} = req.query
        const page = parseInt(req.query.page) || 1; // Trang mặc định là 1 nếu không được chỉ định
        const pageSize = parseInt(req.query.pageSize) || PAGE_SIZE;
        const skip = (page - 1) * pageSize;

        let search = req.query.search
        let queryOptions = {};
        //nếu là user
        if (role === 'user' && userId) {
            const checklists = await CheckList.find({
                name: { $regex: search, $options: 'i' },
            });
            const checklistIds = checklists.map(checklist => checklist._id);
            queryOptions = {
                userId: userId, // Chỉ lọc theo userId của người dùng
                $or: [
                    { checkedItems: { $in: checklistIds } }
                ]
            };
        } else { // nếu là admin
            // Tìm kiếm User với username hoặc fullname phù hợp
            const users = await User.find({
                $or: [
                    { username: { $regex: search, $options: 'i' } },
                    { fullname: { $regex: search, $options: 'i' } }
                ]
            });
            // Lấy danh sách các _id của User tìm được
            const userIds = users.map(user => user._id);

            //tìm kiếm theo name của checkedItems nếu có
            const checklists = await CheckList.find({
                name: { $regex: search, $options: 'i' } 
            });
            const checklistIds = checklists.map(checklist => checklist._id);
            queryOptions.$or = [
                { userId: { $in: userIds } },
                { checkedItems: { $in: checklistIds } }
            ];
        }

        // ListSubmit với userId thuộc danh sách userIds
        const checklistSubmissions = await ListSubmit.find(queryOptions)
            .populate('userId')
            .populate('checkedItems')
            .skip(skip).limit(pageSize)
            .sort({ createdAt: -1 });
        const totalCount = await ListSubmit.countDocuments(queryOptions);

        const result = [];
        for (const submission of checklistSubmissions) {
            const quan = await Quan.findOne({ idQuan: submission.idQuan });
            const phuong = await Phuong.findOne({ idPhuong: submission.idPhuong });
            const pho = await Pho.findOne({ idPho: submission.idPho });

            // Tạo một đối tượng mới chứa thông tin từ ListSubmit và các bảng liên quan
            const mergedSubmission = {
                ...submission.toObject(),
                quan: quan.toObject(),
                phuong: phuong.toObject(),
                pho: pho.toObject()
            };

            // Thêm đối tượng này vào mảng kết quả
            result.push(mergedSubmission);
        }
        res.json({
            checklistSubmissions: result,
            currentPage: page,
            totalPages: Math.ceil(totalCount / pageSize),
            totalItems: totalCount
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Route để lấy một ChecklistSubmission theo ID
router.get('/:id', getChecklistSubmission, (req, res) => {
    res.json(res.checklistSubmission);
});

// Middleware để lấy một ChecklistSubmission theo ID
async function getChecklistSubmission(req, res, next) {
    let checklistSubmission;
    try {
        checklistSubmission = await ListSubmit.findById(req.params.id);
        if (checklistSubmission === null) {
            return res.status(404).json({ message: 'Không tìm thấy ChecklistSubmission' });
        }
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
    res.checklistSubmission = checklistSubmission;
    next();
}

// Route để xóa một ChecklistSubmission theo ID
router.delete('/:id', getChecklistSubmission, async (req, res) => {
    try {
        await res.checklistSubmission.deleteOne();
        res.json({ message: 'Đã xóa ChecklistSubmission' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});
const baseUrl = process.env.domain;
router.post('/export', async (req, res) => {
    try {
        const { fromDate, endDate } = req.body;

        // Kiểm tra xem fromDate và endDate có tồn tại và hợp lệ không
        if (!fromDate || !endDate) {
            return res.status(400).json({ message: 'Vui lòng cung cấp fromDate và endDate' });
        }

        // Chuyển fromDate và endDate từ string sang đối tượng Date
        const fromDateObj = new Date(fromDate);
        const endDateObj = new Date(endDate);

        // Set thời gian của fromDate và endDate thành 00:00:00 và 23:59:59, tương ứng với bắt đầu và kết thúc của ngày đó
        fromDateObj.setHours(0, 0, 0, 0);
        endDateObj.setHours(23, 59, 59, 999);

        const filePath = await exportToExcel(fromDateObj, endDateObj);
        const fileUrl = `${baseUrl}/${filePath.replace(/\\/g, '/')}`; // Thay thế dấu gạch chéo ngược bằng dấu gạch chéo
        console.log(fileUrl)
        // Trả về URL của tệp Excel cho client
        res.status(201).json({ fileUrl });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
})

// Hàm này sẽ xuất dữ liệu vào file Excel
async function exportToExcel(fromDate, toDate) {
    try {
        const workbook = new exceljs.Workbook();
        const worksheet = workbook.addWorksheet('List Submit');

        // Định nghĩa các cột trong file Excel
        worksheet.columns = [
            { header: 'Nhân viên kiểm tra', key: 'fullname', width: 20 },
            { header: 'Tài khoản nhân viên', key: 'username', width: 20 },
            { header: 'Tên khách hàng', key: 'customerName', width: 20 },
            { header: 'Địa chỉ', key: 'address', width: 40 },
            { header: 'Sđt', key: 'phoneNumber', width: 15 },
            { header: 'tài khoản VNPT', key: 'vnptAccount', width: 20 },
            { header: 'Ngày gặp KH', key: 'date', width: 15 },
            { header: 'Các mục kiểm tra', key: 'checklist', width: 80 },
            { header: 'Nhà Mạng', key: 'networks', width: 15 },
            { header: 'Thời gian đóng tiền', key: 'paymentTime', width: 20 },
            { header: 'Ghi chú', key: 'note', width: 30 },
            { header: 'Ảnh', key: 'image', width: 20 },
            { header: 'Ngày tạo', key: 'createAt', width: 15 }
        ];

        // Chuyển đổi fromDate và toDate sang múi giờ UTC+7
        const utcFromDate = moment.utc(fromDate).add(7, 'hours').toDate();
        const utcToDate = moment.utc(toDate).add(7, 'hours').toDate();

        // Lấy dữ liệu từ cơ sở dữ liệu MongoDB trong khoảng thời gian từ fromDate đến toDate
        const listSubmits = await ListSubmit.find({
            date: { $gte: utcFromDate, $lte: utcToDate }
        }).populate('userId').populate('checkedItems').sort({ createdAt: -1 });

        const result = [];
        for (const submission of listSubmits) {
            const quan = await Quan.findOne({ idQuan: submission.idQuan });
            const phuong = await Phuong.findOne({ idPhuong: submission.idPhuong });
            const pho = await Pho.findOne({ idPho: submission.idPho });

            // Tạo một đối tượng mới chứa thông tin từ ListSubmit và các bảng liên quan
            const mergedSubmission = {
                ...submission.toObject(),
                quan: quan.toObject(),
                phuong: phuong.toObject(),
                pho: pho.toObject()
            };

            // Thêm đối tượng này vào mảng kết quả
            result.push(mergedSubmission);
        }

        // Thêm dữ liệu vào file Excel
        result.forEach(submit => {
            const checkedItems = submit.checkedItems.map(item => item.name).join('\n');
            const utcDate = moment.utc(submit.date).add(7, 'hours').toDate();
            const utcCreatedAt = moment.utc(submit.createdAt).add(7, 'hours').toDate();
            worksheet.addRow({
                fullname: submit.userId.fullname,
                username: submit.userId.username,
                customerName: submit.customerName,
                address: submit.address+", "+submit.pho.tenPho+", "+submit.phuong.tenPhuong+", "+submit.quan.tenQuan,
                phoneNumber: submit.phoneNumber,
                vnptAccount: submit.vnptAccount,
                date: utcDate.toLocaleDateString(),
                checklist: checkedItems,
                networks: submit.networks,
                paymentTime: submit.paymentTime,
                note: submit.note,
                image: submit.image ? { hyperlink: `${process.env.domain}${submit.image}`, text: 'View Image' } : '',
                createAt: utcCreatedAt.toLocaleDateString()
            });
        });

        // Lưu file Excel vào thư mục tạm trên máy chủ
        const startDate = utcFromDate.toLocaleDateString().replace(/\//g, '-'); // Chuyển ngày bắt đầu thành chuỗi và thay thế dấu /
        const endDate = utcToDate.toLocaleDateString().replace(/\//g, '-'); // Chuyển ngày kết thúc thành chuỗi và thay thế dấu /
        const fileName = `list_submit_${startDate}_to_${endDate}.xlsx`;
        const tempDir = 'temp';
        const tempFilePath = path.join(tempDir, fileName);
        await fs.ensureDir(tempDir);
        await workbook.xlsx.writeFile(tempFilePath);

        // Trả về đường dẫn tương đối của tệp Excel
        return tempFilePath;
    } catch (error) {
        console.error('Error exporting data to Excel:', error);
    }
}
module.exports = router;