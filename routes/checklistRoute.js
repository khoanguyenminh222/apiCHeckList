const express = require('express');
const router = express.Router();
const CheckList = require('../models/CheckList');

// Route để lấy tất cả các checklist
router.get('/', async (req, res) => {
    try {
        const checklists = await CheckList.find();
        res.json(checklists);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Route để lấy một checklist theo ID
router.get('/:id', getCheckList, (req, res) => {
    res.json(res.checklist);
});

// Route để tạo một checklist mới
router.post('/', async (req, res) => {
    let checklist = new CheckList({
        name: req.body.name,
    });
    try {
        const newCheckList = await checklist.save();
        res.status(201).json(newCheckList);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Route để xoá một checklist theo ID
router.put('/delete/:id', getCheckList, async (req, res) => {
    try {
        if (req.body.status != null) {
            res.checklist.status = req.body.status;
        }
        const updatedCheckList = await res.checklist.save();
        res.status(201).json(updatedCheckList);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Route để cập nhật một checklist theo ID
router.put('/:id', getCheckList, async (req, res) => {
    if (req.body.name != null) {
        res.checklist.name = req.body.name;
    }
    try {
        const updatedCheckList = await res.checklist.save();
        res.json(updatedCheckList);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

async function getCheckList(req, res, next) {
    let checklist;
    try {
        checklist = await CheckList.findById(req.params.id);
        if (checklist == null) {
            return res.status(404).json({ message: 'Không tìm thấy checklist' });
        }
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }

    res.checklist = checklist;
    console.log(res.checklist)
    next();
}

module.exports = router;