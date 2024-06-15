const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Middleware for token verification
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).send({ error: true, message: 'No token provided.' });

    jwt.verify(token.split(' ')[1], process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(500).send({ error: true, message: 'Failed to authenticate token.' });
        req.userId = decoded.userId;
        next();
    });
};

// Middleware for file upload
const upload = multer({
    storage: multer.memoryStorage(), // Store file in memory as a buffer
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
            cb(null, true);
        } else {
            cb(new Error('Only JPEG and PNG files are allowed'), false);
        }
    },
    limits: { fileSize: 1024 * 1024 } // Limit file size to 1MB
});

// Create Barang Mentah
router.post('/', verifyToken, upload.single('image'), (req, res) => {
    const { name, type, description, supplier_id, price } = req.body;
    const image = req.file ? req.file.buffer : null;

    if (!name || !type || !description || !supplier_id || !price) {
        return res.status(400).json({ error: true, message: 'All fields are required' });
    }

    if (isNaN(price) || price <= 0) {
        return res.status(400).json({ error: true, message: 'Price must be a positive number' });
    }

    // Check if supplier exists
    db.query('SELECT * FROM Supplier WHERE supplier_id = ?', [supplier_id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: true, message: err.message });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: true, message: 'Supplier not found' });
        }

        db.query('INSERT INTO Barang_Mentah (nama_barang_mentah, jenis_barang_mentah, deskripsi_barang_mentah, supplier_id, image, price) VALUES (?, ?, ?, ?, ?, ?)',
            [name, type, description, supplier_id, image, price], (err, result) => {
                if (err) {
                    return res.status(500).json({ error: true, message: err.message });
                }
                res.json({ error: false, message: 'success', result: [{ materialId: `material-${result.insertId}`, name, type, description, image, price, supplierId: `user-${supplier_id}` }] });
            });
    });
});

// Read all Barang Mentah
router.get('/', verifyToken, (req, res) => {
    db.query('SELECT * FROM Barang_Mentah', (err, results) => {
        if (err) {
            return res.status(500).json({ error: true, message: err.message });
        }
        const formattedResults = results.map(result => ({
            materialId: `material-${result.barang_mentah_id}`,
            name: result.nama_barang_mentah,
            type: result.jenis_barang_mentah,
            description: result.deskripsi_barang_mentah,
            image: result.image ? result.image.toString('base64') : null, // Convert image buffer to base64 string
            price: result.price,
            supplierId: `user-${result.supplier_id}`
        }));
        res.json({ error: false, message: 'success', results: formattedResults });
    });
});

// Read single Barang Mentah
router.get('/:id', verifyToken, (req, res) => {
    const { id } = req.params;

    db.query('SELECT * FROM Barang_Mentah WHERE barang_mentah_id = ?', [id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: true, message: err.message });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: true, message: 'Material not found' });
        }
        const result = results[0];
        res.json({
            error: false,
            message: 'success',
            result: {
                materialId: `material-${result.barang_mentah_id}`,
                name: result.nama_barang_mentah,
                type: result.jenis_barang_mentah,
                description: result.deskripsi_barang_mentah,
                image: result.image ? result.image.toString('base64') : null, // Convert image buffer to base64 string
                price: result.price,
                supplierId: `user-${result.supplier_id}`
            }
        });
    });
});

// Update Barang Mentah
router.put('/:id', verifyToken, upload.single('image'), (req, res) => {
    const { id } = req.params;
    const { name, type, description, supplier_id, price } = req.body;
    const image = req.file ? req.file.buffer : null;

    if (!name || !type || !description || !supplier_id || !price) {
        return res.status(400).json({ error: true, message: 'All fields are required' });
    }

    if (isNaN(price) || price <= 0) {
        return res.status(400).json({ error: true, message: 'Price must be a positive number' });
    }

    // Check if supplier exists
    db.query('SELECT * FROM Supplier WHERE supplier_id = ?', [supplier_id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: true, message: err.message });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: true, message: 'Supplier not found' });
        }

        // Check if the material exists
        db.query('SELECT * FROM Barang_Mentah WHERE barang_mentah_id = ?', [id], (err, results) => {
            if (err) {
                return res.status(500).json({ error: true, message: err.message });
            }
            if (results.length === 0) {
                return res.status(404).json({ error: true, message: 'Material not found' });
            }

            db.query('UPDATE Barang_Mentah SET nama_barang_mentah = ?, jenis_barang_mentah = ?, deskripsi_barang_mentah = ?, supplier_id = ?, image = ?, price = ? WHERE barang_mentah_id = ?',
                [name, type, description, supplier_id, image, price, id], (err) => {
                    if (err) {
                        return res.status(500).json({ error: true, message: err.message });
                    }
                    res.json({ error: false, message: 'Success Update Material' });
                });
        });
    });
});

// Delete Barang Mentah
router.delete('/:id', verifyToken, (req, res) => {
    const { id } = req.params;

    db.query('SELECT * FROM Barang_Mentah WHERE barang_mentah_id = ?', [id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: true, message: err.message });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: true, message: 'Material not found' });
        }

        db.query('DELETE FROM Barang_Mentah WHERE barang_mentah_id = ?', [id], (err) => {
            if (err) {
                return res.status(500).json({ error: true, message: err.message });
            }
            res.json({ error: false, message: 'Success Delete Material' });
        });
    });
});

// Read Barang Mentah By Supplier ID
router.get('/supplier/:supplier_id', verifyToken, (req, res) => {
    const { supplier_id } = req.params;

    db.query('SELECT * FROM Barang_Mentah WHERE supplier_id = ?', [supplier_id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: true, message: err.message });
        }
        const formattedResults = results.map(result => ({
            materialId: `material-${result.barang_mentah_id}`,
            name: result.nama_barang_mentah,
            type: result.jenis_barang_mentah,
            description: result.deskripsi_barang_mentah,
            image: result.image ? result.image.toString('base64') : null, // Convert image buffer to base64 string
            price: result.price,
            supplierId: `user-${result.supplier_id}`
        }));
        res.json({ error: false, message: 'success', result: formattedResults });
    });
});

module.exports = router;