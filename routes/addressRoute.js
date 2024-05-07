const express = require('express');
const router = express.Router();
const multer = require('multer');
const ExcelJS = require('exceljs');
const { Quan, Phuong, Pho } = require('../models/Address'); // Import các model đã tạo

const upload = multer({ dest: 'uploads/' });


// Route để lấy danh sách quận
router.get('/quan', async (req, res) => {
    try {
        const quanList = await Quan.find();
        res.json(quanList);
    } catch (error) {
        console.error('Lỗi khi lấy danh sách quận:', error);
        res.status(500).json({ error: 'Đã xảy ra lỗi khi lấy danh sách quận.' });
    }
});

// Route để lấy thông tin quận theo idQuan
router.get('/quan/:idQuan', async (req, res) => {
    try {
        const { idQuan } = req.params;
        const quanInfo = await Quan.findOne({ idQuan });
        if (!quanInfo) {
            return res.status(404).json({ error: 'Không tìm thấy thông tin quận.' });
        }
        res.json(quanInfo);
    } catch (error) {
        console.error('Lỗi khi lấy thông tin quận:', error);
        res.status(500).json({ error: 'Đã xảy ra lỗi khi lấy thông tin quận.' });
    }
});

// Route để lấy thông tin phường theo idPhuong
router.get('/phuong/getById/:idPhuong', async (req, res) => {
    try {
        const { idPhuong } = req.params;
        const phuongInfo = await Phuong.findOne({ idPhuong });
        if (!phuongInfo) {
            return res.status(404).json({ error: 'Không tìm thấy thông tin phường.' });
        }
        res.json(phuongInfo);
    } catch (error) {
        console.error('Lỗi khi lấy thông tin phường:', error);
        res.status(500).json({ error: 'Đã xảy ra lỗi khi lấy thông tin phường.' });
    }
});

// Route để lấy thông tin phố theo idPho
router.get('/pho/getById/:idPho', async (req, res) => {
    try {
        const { idPho } = req.params;
        const phoInfo = await Pho.findOne({ idPho });
        if (!phoInfo) {
            return res.status(404).json({ error: 'Không tìm thấy thông tin phố.' });
        }
        res.json(phoInfo);
    } catch (error) {
        console.error('Lỗi khi lấy thông tin phố:', error);
        res.status(500).json({ error: 'Đã xảy ra lỗi khi lấy thông tin phố.' });
    }
});

// Route để lấy danh sách phường theo quận
router.get('/phuong/:idQuan', async (req, res) => {
    try {
        const { idQuan } = req.params;
        const phuongList = await Phuong.find({ idQuan });
        res.json(phuongList);
    } catch (error) {
        console.error('Lỗi khi lấy danh sách phường:', error);
        res.status(500).json({ error: 'Đã xảy ra lỗi khi lấy danh sách phường.' });
    }
});

// Route để lấy danh sách phố theo phường
router.get('/pho/:idPhuong', async (req, res) => {
    try {
        const { idPhuong } = req.params;
        const phoList = await Pho.find({ idPhuong });
        res.json(phoList);
    } catch (error) {
        console.error('Lỗi khi lấy danh sách phố:', error);
        res.status(500).json({ error: 'Đã xảy ra lỗi khi lấy danh sách phố.' });
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

// Đọc dữ liệu từ file Excel
router.post('/import', upload.single('excelFile'), async (req, res) => {
    try {
        // Đọc dữ liệu từ file Excel
        const workbook = new ExcelJS.Workbook();
        const filePath = req.file.path;
        await workbook.xlsx.readFile(filePath)
            .then(async () => {
                const worksheet = workbook.getWorksheet(1); // Lấy sheet đầu tiên
                let headerRow = null;
                worksheet.eachRow((row, rowNumber) => {
                    if (rowNumber === 2) { // Lưu dòng tiêu đề
                        headerRow = row;
                        // Dừng vòng lặp khi tìm thấy dòng tiêu đề
                        return false;
                    }
                });

                if (!headerRow) {
                    console.log('Header row not found');
                    return false;
                }

                const QUAN_IDColumnIndex = findColumnIndexByHeader(headerRow, 'QUAN_ID');
                const TEN_QUANColumnIndex = findColumnIndexByHeader(headerRow, 'TEN_QUAN');
                const PHUONG_IDColumnIndex = findColumnIndexByHeader(headerRow, 'PHUONG_ID');
                const TEN_PHUONGColumnIndex = findColumnIndexByHeader(headerRow, 'TEN_PHUONG');
                const PHO_IDColumnIndex = findColumnIndexByHeader(headerRow, 'PHO_ID');
                const TEN_PHOColumnIndex = findColumnIndexByHeader(headerRow, 'TEN_PHO');

                // Lặp qua từng dòng trong file Excel và nhập dữ liệu vào MongoDB
                worksheet.eachRow({ includeEmpty: false }, async (row, rowNumber) => {
                    if (rowNumber >= 3) { // Bỏ qua dòng tiêu đề
                        // Lưu thông tin về quận
                        let quanExists = await Quan.exists({ idQuan: row.getCell(QUAN_IDColumnIndex).value });
                        if (!quanExists) {
                            // Nếu chưa tồn tại, thì mới tạo mới thông tin về quận
                            try {
                                // Thêm dữ liệu vào cơ sở dữ liệu
                                await Quan.create({
                                    idQuan: row.getCell(QUAN_IDColumnIndex).value,
                                    tenQuan: row.getCell(TEN_QUANColumnIndex).value,
                                });
                                console.log(`Row ${rowNumber}: Quan with ${row.getCell(QUAN_IDColumnIndex).value} added to database`);
                            } catch (error) {
                                if (error.code === 11000) {
                                    console.log(`Row ${rowNumber}: Quan with ${row.getCell(QUAN_IDColumnIndex).value} already exists in database`);
                                } else {
                                    // Xử lý các loại lỗi khác nếu cần
                                    console.error('Error:', error);
                                }
                            }
                        } else {
                            await Quan.findOneAndUpdate(
                                { idQuan: row.getCell(QUAN_IDColumnIndex).value },
                                { tenQuan: row.getCell(TEN_QUANColumnIndex).value },
                                { new: true } // Trả về bản ghi đã được cập nhật
                            );
                            console.log(`Row ${rowNumber}: Quan with ${row.getCell(QUAN_IDColumnIndex).value} updated in database`);
                        }

                        let phuong = await Phuong.exists({ idPhuong: row.getCell(PHUONG_IDColumnIndex).value });
                        if (!phuong) {
                            // Nếu không tìm thấy bản ghi phường với idPhuong và idQuan đã cho, tạo mới
                            try {
                                phuong = await Phuong.create({
                                    idPhuong: row.getCell(PHUONG_IDColumnIndex).value,
                                    tenPhuong: row.getCell(TEN_PHUONGColumnIndex).value,
                                    idQuan: row.getCell(QUAN_IDColumnIndex).value,
                                });
                                console.log(`Row ${rowNumber}: Phuong with ${row.getCell(PHUONG_IDColumnIndex).value} added to database`);
                            } catch (error) {
                                if (error.code === 11000) {
                                    console.log(`Row ${rowNumber}: Phuong with ${row.getCell(PHUONG_IDColumnIndex).value} already exists in database`);
                                } else {
                                    // Xử lý các loại lỗi khác nếu cần
                                    console.error('Error:', error);
                                }
                            }
                            
                        } else {
                            // Nếu tìm thấy bản ghi phường với idPhuong và idQuan đã cho, cập nhật lại thông tin
                            await Phuong.findOneAndUpdate(
                                { idPhuong: row.getCell(PHUONG_IDColumnIndex).value },
                                {
                                    tenPhuong: row.getCell(TEN_PHUONGColumnIndex).value,
                                    idQuan: row.getCell(QUAN_IDColumnIndex).value // Cập nhật lại idQuan
                                },
                                { new: true } // Trả về bản ghi đã được cập nhật
                            );
                            console.log(`Row ${rowNumber}: Phuong with ${row.getCell(PHUONG_IDColumnIndex).value} updated in database`);
                        }

                        // Lưu thông tin về phố
                        let pho = await Pho.exists({ idPho: row.getCell(PHO_IDColumnIndex).value, idPhuong: row.getCell(PHUONG_IDColumnIndex).value });
                        if (!pho) {
                            // Nếu chưa tồn tại, thì mới lưu thông tin về phố
                            try {
                                await Pho.create({
                                    idPho: row.getCell(PHO_IDColumnIndex).value,
                                    tenPho: row.getCell(TEN_PHOColumnIndex).value,
                                    idPhuong: row.getCell(PHUONG_IDColumnIndex).value, // Tham chiếu đến phường
                                });
                                console.log(`Row ${rowNumber}: Pho with ${row.getCell(PHO_IDColumnIndex).value} added to database`);
                            } catch (error) {
                                if (error.code === 11000) {
                                    console.log(`Row ${rowNumber}: Pho with ${row.getCell(PHO_IDColumnIndex).value} already exists in database`);
                                } else {
                                    // Xử lý các loại lỗi khác nếu cần
                                    console.error('Error:', error);
                                }
                            }

                        } else {
                            // Nếu đã tồn tại, thì cập nhật thông tin về quận
                            pho = await Pho.findOneAndUpdate(
                                { idPho: row.getCell(PHO_IDColumnIndex).value, idPhuong: row.getCell(PHUONG_IDColumnIndex).value },
                                {
                                    tenPho: row.getCell(TEN_PHOColumnIndex).value,
                                    idPhuong: row.getCell(PHUONG_IDColumnIndex).value
                                },
                                { new: true } // Trả về bản ghi đã được cập nhật
                            );
                            console.log(`Row ${rowNumber}: Pho with ${row.getCell(PHO_IDColumnIndex).value} updated in database`);
                        }
                    }
                });
            })

        res.status(200).json({ message: 'Dữ liệu đã được nhập thành công từ file Excel.' });
    } catch (error) {
        console.error('Lỗi khi nhập dữ liệu từ file Excel:', error);
        res.status(500).json({ error: 'Đã xảy ra lỗi khi nhập dữ liệu từ file Excel.' });
    }
});

// Hàm xử lý từng dòng


module.exports = router;