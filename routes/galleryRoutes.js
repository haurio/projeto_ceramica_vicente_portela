const express = require('express');
const path = require('path');
const { listGalleryImages } = require('../utils/galleryList');

const router = express.Router();
const PUBLIC_DIR = path.join(__dirname, '../public');

router.get('/api/galeria', (req, res) => {
    try {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.json(listGalleryImages(PUBLIC_DIR));
    } catch {
        res.json([]);
    }
});

module.exports = router;
