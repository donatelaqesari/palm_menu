import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import QRCode from 'qrcode';
import { menuData } from './src/data/menu.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── In-memory reviews store (replace with a DB later) ───────
// Structure: [ { id, name, rating, text, date } ]
let reviews = [
  { id: 1, name: "Arta M.", rating: 5, text: "Ambiance incredible, cocktails even better. Amore is a must-try! 🌴", date: "2025-06-15" },
  { id: 2, name: "Luca R.", rating: 5, text: "Best cocktail bar on the boulevard. American Gangster is unreal.", date: "2025-06-18" },
  { id: 3, name: "Sofia K.", rating: 4, text: "Loved the Pina Colada and the vibe. Will definitely come back!", date: "2025-06-20" },
];
let nextReviewId = 4;

// ── Menu API ─────────────────────────────────────────────────
app.get('/api/menu', (req, res) => res.json(menuData));

app.get('/api/menu/:categoryId', (req, res) => {
  const cat = menuData.categories.find(c => c.id === req.params.categoryId);
  if (!cat) return res.status(404).json({ error: 'Category not found' });
  res.json(cat);
});

app.get('/api/search', (req, res) => {
  const q = (req.query.q || '').toLowerCase();
  if (!q) return res.json([]);
  const results = [];
  for (const cat of menuData.categories) {
    for (const item of cat.items) {
      if (item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q) || cat.name.toLowerCase().includes(q)) {
        results.push({ ...item, category: cat.name, categoryId: cat.id });
      }
    }
  }
  res.json(results);
});

app.get('/api/qr', async (req, res) => {
  try {
    const url = req.query.url || `http://localhost:${PORT}`;
    const qr = await QRCode.toDataURL(url, {
      width: 400, margin: 2,
      color: { dark: '#3d1a08', light: '#fff8ef' }
    });
    res.json({ qr, url });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate QR' });
  }
});

// ── Reviews API ───────────────────────────────────────────────
// GET all reviews
app.get('/api/reviews', (req, res) => {
  const sorted = [...reviews].sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json(sorted);
});

// POST a new review
app.post('/api/reviews', (req, res) => {
  const { name, rating, text } = req.body;

  if (!name || !rating || !text) {
    return res.status(400).json({ error: 'name, rating and text are required' });
  }
  if (typeof rating !== 'number' || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'rating must be 1–5' });
  }
  if (text.length > 300) {
    return res.status(400).json({ error: 'Review too long (max 300 chars)' });
  }

  const review = {
    id: nextReviewId++,
    name: String(name).trim().slice(0, 40),
    rating: Math.round(rating),
    text: String(text).trim(),
    date: new Date().toISOString().split('T')[0]
  };
  reviews.push(review);
  res.status(201).json(review);
});

// DELETE a review (admin use)
app.delete('/api/reviews/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const before = reviews.length;
  reviews = reviews.filter(r => r.id !== id);
  if (reviews.length === before) return res.status(404).json({ error: 'Review not found' });
  res.json({ ok: true });
});

// ── Health ────────────────────────────────────────────────────
app.get('/api/health', (_, res) => res.json({ status: 'ok', bar: 'Palm Beach Bar 🌴' }));

// ── Catch-all → frontend ──────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🌴 Palm Beach Bar Menu → http://localhost:${PORT}`);
  console.log(`📋 Reviews API      → http://localhost:${PORT}/api/reviews\n`);
});
