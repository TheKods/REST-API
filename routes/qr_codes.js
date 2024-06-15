const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');

// Middleware for authentication
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Generate QR Code for a Product
router.post('/generate', authenticateToken, (req, res) => {
  const { productId } = req.body;

  if (!productId) {
    return res.status(400).json({ error: true, message: 'Product ID is required' });
  }

  const qrCodeUrl = `${req.protocol}://${req.get('host')}/produk/${productId}`;

  QRCode.toDataURL(qrCodeUrl, (err, url) => {
    if (err) return res.status(500).json({ error: true, message: err.message });

    db.query('INSERT INTO QR_Code (produk_id, kode_qr) VALUES (?, ?) ON DUPLICATE KEY UPDATE kode_qr = VALUES(kode_qr)', [productId, url], (err, result) => {
      if (err) return res.status(500).json({ error: true, message: err.message });

      res.json({ error: false, message: 'Success Generate QR Code', qrCodeUrl: url });
    });
  });
});

// Get QR Code for a Product
router.get('/:productId', authenticateToken, (req, res) => {
  const { productId } = req.params;

  db.query('SELECT kode_qr FROM QR_Code WHERE produk_id = ?', [productId], (err, results) => {
    if (err) return res.status(500).json({ error: true, message: err.message });
    if (results.length === 0) return res.status(404).json({ error: true, message: 'QR Code not found' });

    res.json({ error: false, message: 'success', qrCodeUrl: results[0].kode_qr });
  });
});

module.exports = router;