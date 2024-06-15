const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');
const nodemailer = require('nodemailer'); 
require('dotenv').config();

// Secret key for JWT
const secret = process.env.JWT_SECRET;

// Register
router.post('/register', async (req, res) => {
    const { email, password, role, name, description, address, phoneNumber, confirmPassword } = req.body;

    // Validasi Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: true, message: 'Invalid email format' });
    }

    // Validasi Password
    if (password.length < 8) {
        return res.status(400).json({ error: true, message: 'Password must be at least 8 characters' });
    }
    if (password !== confirmPassword) {
        return res.status(400).json({ error: true, message: 'Passwords do not match' });
    }

    // Validasi Phone Number
    if (phoneNumber.length < 12 || phoneNumber.length > 20) {
        return res.status(400).json({ error: true, message: 'Phone number must be between 12 and 20 characters' });
    }

    // Validasi Role
    const validRoles = ['supplier', 'umkm'];
    if (!validRoles.includes(role)) {
        return res.status(400).json({ error: true, message: 'Invalid role' });
    }

    // Validasi Name
    if (!name || name.trim().length === 0) {
        return res.status(400).json({ error: true, message: 'Name cannot be empty' });
    }

    // Validasi Description
    if (!description || description.trim().length === 0) {
        return res.status(400).json({ error: true, message: 'Description cannot be empty' });
    }

    // Validasi Address
    if (!address || address.trim().length === 0) {
        return res.status(400).json({ error: true, message: 'Address cannot be empty' });
    }

    // Check if email already exists in the database
    db.query('SELECT * FROM Auth WHERE email = ?', [email], async (err, results) => {
        if (err) {
            return res.status(500).json({ error: true, message: err.message });
        }

        if (results.length > 0) {
            return res.status(400).json({ error: true, message: 'Email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        let query = '';
        let insertValues = [];

        if (role === 'supplier') {
            query = 'INSERT INTO Supplier (nama_supplier, deskripsi_supplier, alamat_supplier, kontak_supplier) VALUES (?, ?, ?, ?)';
            insertValues = [name, description, address, phoneNumber];
        } else if (role === 'umkm') {
            query = 'INSERT INTO UMKM (nama_umkm, deskripsi_umkm, alamat_umkm, kontak_umkm) VALUES (?, ?, ?, ?)';
            insertValues = [name, description, address, phoneNumber];
        }

        db.query(query, insertValues, (err, result) => {
            if (err) {
                return res.status(500).json({ error: true, message: err.message });
            }

            const userId = result.insertId;

            db.query('INSERT INTO Auth (email, password, user_type, user_id) VALUES (?, ?, ?, ?)', [email, hashedPassword, role, userId], (err) => {
                if (err) {
                    return res.status(500).json({ error: true, message: err.message });
                }

                res.json({ error: false, message: 'User Created' });
            });
        });
    });
});


// Login
router.post('/login', (req, res) => {
    const { email, password, role } = req.body;

    // Validasi Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: true, message: 'Invalid email format' });
    }

    // Validasi Role
    const validRoles = ['supplier', 'umkm'];
    if (!validRoles.includes(role)) {
        return res.status(400).json({ error: true, message: 'Invalid role' });
    }

    db.query('SELECT * FROM Auth WHERE email = ? AND user_type = ?', [email, role], async (err, results) => {
        if (err) {
            return res.status(500).json({ error: true, message: err.message });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: true, message: 'User not found' });
        }

        const user = results[0];

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: true, message: 'Invalid password' });
        }

        const token = jwt.sign({ userId: user.user_id, user_type: user.user_type }, secret, { expiresIn: '1h' });

        if (user.user_type === 'supplier') {
            db.query('SELECT * FROM Supplier WHERE supplier_id = ?', [user.user_id], (err, results) => {
                if (err) {
                    return res.status(500).json({ error: true, message: err.message });
                }
                const supplier = results[0];
                res.json({
                    error: false,
                    message: 'success',
                    result: {
                        userId: `user-${user.user_id}`,
                        name: supplier.nama_supplier,
                        email: email,
                        description: supplier.deskripsi_supplier,
                        address: supplier.alamat_supplier,
                        phoneNumber: supplier.kontak_supplier,
                        token: token
                    }
                });
            });
        } else if (user.user_type === 'umkm') {
            db.query('SELECT * FROM UMKM WHERE umkm_id = ?', [user.user_id], (err, results) => {
                if (err) {
                    return res.status(500).json({ error: true, message: err.message });
                }
                const umkm = results[0];
                res.json({
                    error: false,
                    message: 'success',
                    result: {
                        userId: `user-${user.user_id}`,
                        name: umkm.nama_umkm,
                        email: email,
                        description: umkm.deskripsi_umkm,
                        address: umkm.alamat_umkm,
                        phoneNumber: umkm.kontak_umkm,
                        token: token
                    }
                });
            });
        }
    });
});


// Forgot password endpoint
router.post('/forgot-password', (req, res) => {
    const { email } = req.body;

    db.query('SELECT * FROM Auth WHERE email = ?', [email], (err, results) => {
        if (err) {
            return res.status(500).json({ error: true, message: err.message });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: true, message: 'Email not found' });
        }

        const user = results[0];
        const resetToken = jwt.sign({ userId: user.user_id }, secret, { expiresIn: '1h' });

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: 'Password Reset',
            text: `Click the link to reset your password: ${process.env.APP_URL}/reset-password/${resetToken}`
        };

        transporter.sendMail(mailOptions, (err, info) => {
            if (err) {
                return res.status(500).json({ error: true, message: err.message });
            }

            res.json({ error: false, message: 'Password reset email sent' });
        });
    });
});

module.exports = router;