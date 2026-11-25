'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');

const PORT = Number(process.env.PORT) || 3000;
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || 'flashcards';
const COLLECTION = 'user_sets';

if (!MONGODB_URI) {
  console.error('Thieu MONGODB_URI trong file .env');
  process.exit(1);
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

const client = new MongoClient(MONGODB_URI, {
  serverSelectionTimeoutMS: 8000,
});

let collectionPromise = null;

function getCollection() {
  if (!collectionPromise) {
    collectionPromise = client
      .connect()
      .then(() => client.db(DB_NAME).collection(COLLECTION));
    collectionPromise = collectionPromise.catch((err) => {
      collectionPromise = null;
      throw err;
    });
  }
  return collectionPromise;
}

const USER_ID_RE = /^[A-Za-z0-9_-]{8,64}$/;

function sanitizeSets(raw) {
  return raw.slice(0, 500).map((s) => ({
    id: String(s?.id || '').slice(0, 64),
    name: String(s?.name || 'Bo the').slice(0, 100),
    createdAt: Number(s?.createdAt) || Date.now(),
    words: Array.isArray(s?.words)
      ? s.words.slice(0, 5000).map((w) => ({
          id: String(w?.id || '').slice(0, 64),
          term: String(w?.term || '').slice(0, 200),
          definition: String(w?.definition || '').slice(0, 500),
          createdAt: Number(w?.createdAt) || Date.now(),
          ...(w?.updatedAt ? { updatedAt: Number(w.updatedAt) } : {}),
        }))
      : [],
  }));
}

app.get('/api/health', async (req, res) => {
  try {
    const col = await getCollection();
    await col.db.command({ ping: 1 });
    res.json({ ok: true, db: DB_NAME });
  } catch (err) {
    res.status(503).json({ ok: false, error: 'db_unavailable' });
  }
});

app.get('/api/sets/:userId', async (req, res) => {
  const { userId } = req.params;
  if (!USER_ID_RE.test(userId)) {
    return res.status(400).json({ error: 'invalid_user_id' });
  }

  try {
    const col = await getCollection();
    const doc = await col.findOne({ _id: userId });
    if (!doc) {
      return res.status(404).json({ error: 'not_found' });
    }
    res.json({ sets: doc.sets || [], updatedAt: doc.updatedAt || 0 });
  } catch (err) {
    res.status(503).json({ error: 'db_unavailable' });
  }
});

app.put('/api/sets/:userId', async (req, res) => {
  const { userId } = req.params;
  if (!USER_ID_RE.test(userId)) {
    return res.status(400).json({ error: 'invalid_user_id' });
  }

  const { sets, updatedAt } = req.body || {};
  if (!Array.isArray(sets)) {
    return res.status(400).json({ error: 'invalid_sets' });
  }

  const at = Number(updatedAt) || Date.now();

  try {
    const col = await getCollection();
    await col.updateOne(
      { _id: userId },
      {
        $set: {
          sets: sanitizeSets(sets),
          updatedAt: at,
          lastSeenAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );
    res.json({ ok: true, updatedAt: at });
  } catch (err) {
    res.status(503).json({ error: 'db_unavailable' });
  }
});

app.delete('/api/sets/:userId', async (req, res) => {
  const { userId } = req.params;
  if (!USER_ID_RE.test(userId)) {
    return res.status(400).json({ error: 'invalid_user_id' });
  }

  try {
    const col = await getCollection();
    await col.deleteOne({ _id: userId });
    res.json({ ok: true });
  } catch (err) {
    res.status(503).json({ error: 'db_unavailable' });
  }
});

app.listen(PORT, () => {
  console.log(`Flashcards API chay tai http://localhost:${PORT}`);
});
