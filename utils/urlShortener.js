const { MongoClient } = require('mongodb');
const { nanoid } = require('nanoid');

let db;

async function connectDB() {
  if (db) return db;
  
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn('MONGODB_URI no configurada, usando acortador en memoria');
    return null;
  }

  try {
    const client = new MongoClient(uri);
    await client.connect();
    db = client.db('urlshortener');
    return db;
  } catch (error) {
    console.error('Error conectando a MongoDB:', error);
    return null;
  }
}

// Almacenamiento en memoria como fallback
const memoryStore = new Map();

async function shortenUrl(originalUrl) {
  const shortId = nanoid(8);
  
  try {
    const database = await connectDB();
    if (database) {
      const collection = database.collection('urls');
      await collection.insertOne({
        shortId,
        originalUrl,
        createdAt: new Date()
      });
    } else {
      // Fallback a memoria
      memoryStore.set(shortId, originalUrl);
    }
    
    return shortId;
  } catch (error) {
    console.error('Error al acortar URL:', error);
    // Fallback a memoria
    memoryStore.set(shortId, originalUrl);
    return shortId;
  }
}

async function getOriginalUrl(shortId) {
  try {
    const database = await connectDB();
    if (database) {
      const collection = database.collection('urls');
      const doc = await collection.findOne({ shortId });
      return doc ? doc.originalUrl : null;
    } else {
      // Fallback a memoria
      return memoryStore.get(shortId) || null;
    }
  } catch (error) {
    console.error('Error al obtener URL original:', error);
    // Fallback a memoria
    return memoryStore.get(shortId) || null;
  }
}

module.exports = {
  shortenUrl,
  getOriginalUrl
}; 