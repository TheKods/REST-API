const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
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

// Helper function to validate year
const validateYear = (year) => {
    const currentYear = new Date().getFullYear();
    return year > 1900 && year <= currentYear;
};

// Helper function to validate name length
const validateName = (name) => {
    return name.length > 0 && name.length <= 100;
};

// Add Profile Pembatik
router.post('/', verifyToken, upload.single('image'), (req, res) => {
    const { name, startedYear, description, sme_id } = req.body;
    const image = req.file ? req.file.buffer : null;

    if (!image) {
        return res.status(400).json({ error: true, message: 'Image is required.' });
    }
    if (!validateName(name)) {
        return res.status(400).json({ error: true, message: 'Name must be between 1 and 100 characters long.' });
    }
    if (!validateYear(startedYear)) {
        return res.status(400).json({ error: true, message: 'Invalid started year.' });
    }

    db.query('INSERT INTO Profil_Pembatik (nama_pembatik, image, tanggal_mulai, deskripsi_pembatik, umkm_id) VALUES (?, ?, ?, ?, ?)',
        [name, image, startedYear, description, sme_id], (err, result) => {
            if (err) {
                return res.status(500).json({ error: true, message: err.message });
            }
            res.json({ error: false, message: 'Success Add Profile', pembatikId: result.insertId });
        });
});

// Read all Profile Pembatik
router.get('/', verifyToken, (req, res) => {
    db.query('SELECT * FROM Profil_Pembatik', (err, results) => {
        if (err) {
            return res.status(500).json({ error: true, message: err.message });
        }

        const formattedResults = results.map(result => ({
            profileId: `profile-${result.pembatik_id}`,
            name: result.nama_pembatik,
            startedYear: result.tanggal_mulai,
            description: result.deskripsi_pembatik,
            smeId: result.umkm_id,
            image: result.image.toString('base64') // Convert to base64
        }));

        res.json({ error: false, message: 'success', result: formattedResults });
    });
});

// Read single Profile Pembatik by ID
router.get('/:id', verifyToken, (req, res) => {
    const { id } = req.params;

    db.query('SELECT * FROM Profil_Pembatik WHERE pembatik_id = ?', [id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: true, message: err.message });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: true, message: 'Profile Pembatik not found' });
        }

        const result = results[0];

        res.json({
            error: false,
            message: 'success',
            result: {
                profileId: `profile-${result.pembatik_id}`,
                name: result.nama_pembatik,
                startedYear: result.tanggal_mulai,
                description: result.deskripsi_pembatik,
                smeId: result.umkm_id,
                image: result.image.toString('base64') // Convert to base64
            }
        });
    });
});

// Read Profile Pembatik by UMKM ID
router.get('/umkm/:umkm_id', verifyToken, (req, res) => {
    const { umkm_id } = req.params;

    db.query('SELECT * FROM Profil_Pembatik WHERE umkm_id = ?', [umkm_id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: true, message: err.message });
        }

        const formattedResults = results.map(result => ({
            profileId: `profile-${result.pembatik_id}`,
            name: result.nama_pembatik,
            startedYear: result.tanggal_mulai,
            description: result.deskripsi_pembatik,
            smeId: result.umkm_id,
            image: result.image.toString('base64') // Convert to base64
        }));

        res.json({ error: false, message: 'success', result: formattedResults });
    });
});

// Update Profile Pembatik
router.put('/:id', verifyToken, upload.single('image'), (req, res) => {
    const { id } = req.params;
    const { name, startedYear, description, sme_id } = req.body;
    const image = req.file ? req.file.buffer : null;

    if (!validateName(name)) {
        return res.status(400).json({ error: true, message: 'Name must be between 1 and 100 characters long.' });
    }
    if (!validateYear(startedYear)) {
        return res.status(400).json({ error: true, message: 'Invalid started year.' });
    }

    db.query('UPDATE Profil_Pembatik SET nama_pembatik = ?, image = ?, tanggal_mulai = ?, deskripsi_pembatik = ?, umkm_id = ? WHERE pembatik_id = ?',
        [name, image, startedYear, description, sme_id, id], (err) => {
            if (err) {
                return res.status(500).json({ error: true, message: err.message });
            }
            res.json({ error: false, message: 'Success Edit Profile' });
        });
});

// Delete Profile Pembatik
router.delete('/:id', verifyToken, (req, res) => {
    const { id } = req.params;

    db.query('DELETE FROM Profil_Pembatik WHERE pembatik_id = ?', [id], (err) => {
        if (err) {
            return res.status(500).json({ error: true, message: err.message });
        }
        res.json({ error: false, message: 'Success Delete Profile' });
    });
});

module.exports = router;