const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const upload = multer({ dest: 'uploads/' });

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

// Create Product
router.post('/', authenticateToken, upload.single('image'), (req, res) => {
  const { name, type, description, sme_id, materialId, profileId } = req.body;
  const image = req.file ? req.file.path : null;

  db.query('INSERT INTO Produk_Batik (nama_produk, jenis_produk, deskripsi_produk, harga_produk, foto_produk, umkm_id, barang_mentah_id, pembatik_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [name, type, description, 0, image, sme_id, materialId.join(','), profileId], (err, result) => {
      if (err) return res.status(500).json({ error: true, message: err.message });

      res.json({ error: false, message: 'Success Add Product', productId: result.insertId });
    });
});

// Read all Products
router.get('/', authenticateToken, (req, res) => {
  const query = `
    SELECT pb.*, umkm.nama_umkm, s.nama_supplier, bm.nama_barang_mentah, pp.nama_pembatik 
    FROM Produk_Batik pb
    LEFT JOIN UMKM umkm ON pb.umkm_id = umkm.umkm_id
    LEFT JOIN Supplier s ON FIND_IN_SET(s.supplier_id, pb.supplier_id)
    LEFT JOIN Barang_Mentah bm ON FIND_IN_SET(bm.barang_mentah_id, pb.barang_mentah_id)
    LEFT JOIN Profil_Pembatik pp ON pb.pembatik_id = pp.pembatik_id`;

  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: true, message: err.message });
    const formattedResults = results.map(result => ({
      productId: `product-${result.produk_id}`,
      name: result.nama_produk,
      type: result.jenis_produk,
      description: result.deskripsi_produk,
      price: result.harga_produk,
      image: result.foto_produk,
      smeId: `user-${result.umkm_id}`
    }));
    res.json({ error: false, message: 'success', result: formattedResults });
  });
});

// Read single Product by ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const query = `
    SELECT pb.*, umkm.nama_umkm, s.nama_supplier, bm.nama_barang_mentah, pp.nama_pembatik 
    FROM Produk_Batik pb
    LEFT JOIN UMKM umkm ON pb.umkm_id = umkm.umkm_id
    LEFT JOIN Supplier s ON FIND_IN_SET(s.supplier_id, pb.supplier_id)
    LEFT JOIN Barang_Mentah bm ON FIND_IN_SET(bm.barang_mentah_id, pb.barang_mentah_id)
    LEFT JOIN Profil_Pembatik pp ON pb.pembatik_id = pp.pembatik_id
    WHERE pb.produk_id = ?`;

  db.query(query, [id], (err, results) => {
    if (err) return res.status(500).json({ error: true, message: err.message });
    if (results.length === 0) return res.status(404).json({ error: true, message: 'Product not found' });

    const product = results[0];
    const formattedProduct = {
      productId: `product-${product.produk_id}`,
      name: product.nama_produk,
      type: product.jenis_produk,
      description: product.deskripsi_produk,
      price: product.harga_produk,
      image: product.foto_produk,
      smeId: `user-${product.umkm_id}`,
      material: product.barang_mentah_id.split(',').map((materialId, index) => ({
        materialId: `material-${materialId}`,
        name: results[index].nama_barang_mentah,
        type: results[index].jenis_barang_mentah,
        description: results[index].deskripsi_barang_mentah,
        image: results[index].foto_barang_mentah,
        price: results[index].harga_barang_mentah,
        supplierId: `user-${results[index].supplier_id}`
      })),
      profile: {
        profileId: `profile-${product.pembatik_id}`,
        name: product.nama_pembatik,
        staredYear: product.tahun_mulai,
        image: product.foto_pembatik
      }
    };

    res.json({ error: false, message: 'success', result: formattedProduct });
  });
});

// Update Product
router.put('/:id', authenticateToken, upload.single('image'), (req, res) => {
  const { id } = req.params;
  const { name, type, description, sme_id, materialId, profileId } = req.body;
  const image = req.file ? req.file.path : null;

  db.query('UPDATE Produk_Batik SET nama_produk = ?, jenis_produk = ?, deskripsi_produk = ?, harga_produk = ?, foto_produk = ?, umkm_id = ?, barang_mentah_id = ?, pembatik_id = ? WHERE produk_id = ?',
    [name, type, description, 0, image, sme_id, materialId.join(','), profileId, id], (err) => {
      if (err) return res.status(500).json({ error: true, message: err.message });

      res.json({ error: false, message: 'Success Update Product' });
    });
});

// Delete Product
router.delete('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  db.query('DELETE FROM Produk_Batik WHERE produk_id = ?', [id], (err) => {
    if (err) return res.status(500).json({ error: true, message: err.message });
    res.json({ error: false, message: 'Success Delete Product' });
  });
});

// Read Product by UMKM ID
router.get('/umkm/:umkm_id', authenticateToken, (req, res) => {
  const { umkm_id } = req.params;
  const query = `
    SELECT pb.*, umkm.nama_umkm, s.nama_supplier, bm.nama_barang_mentah, pp.nama_pembatik 
    FROM Produk_Batik pb
    LEFT JOIN UMKM umkm ON pb.umkm_id = umkm.umkm_id
    LEFT JOIN Supplier s ON FIND_IN_SET(s.supplier_id, pb.supplier_id)
    LEFT JOIN Barang_Mentah bm ON FIND_IN_SET(bm.barang_mentah_id, pb.barang_mentah_id)
    LEFT JOIN Profil_Pembatik pp ON pb.pembatik_id = pp.pembatik_id
    WHERE pb.umkm_id = ?`;

  db.query(query, [umkm_id], (err, results) => {
    if (err) return res.status(500).json({ error: true, message: err.message });
    if (results.length === 0) return res.status(404).json({ error: true, message: 'Products not found' });

    const formattedResults = results.map(result => ({
      productId: `product-${result.produk_id}`,
      name: result.nama_produk,
      type: result.jenis_produk,
      description: result.deskripsi_produk,
      price: result.harga_produk,
      image: result.foto_produk,
      smeId: `user-${result.umkm_id}`
    }));
    res.json({ error: false, message: 'success', result: formattedResults });
  });
});

module.exports = router;