const {MongoClient}  = require('mongodb');
const { nanoid } = require('nanoid');

const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = 'shortener';
const COLLECTION = 'urls';

let db, urls, client;

async function init() {
  if (!db) {
    client = await MongoClient.connect(MONGO_URI, {});
    db = client.db(DB_NAME);
    urls = db.collection(COLLECTION);
  }
}

// Acorta una URL, devuelve shortId (si existe la retorna)
async function shortenUrl(originalUrl) {
  await init();
  if (!/^https?:\/\//i.test(originalUrl)) throw new Error('URL inválida');
  let doc = await urls.findOne({ originalUrl });
  if (doc) return doc.shortId;
  const shortId = nanoid(6);
  await urls.insertOne({ shortId, originalUrl, createdAt: new Date() });
  return shortId;
}

// Obtiene la URL original desde un shortId
async function getOriginalUrl(shortId) {
  await init();
  const doc = await urls.findOne({ shortId });
  return doc ? doc.originalUrl : null;
}

// Limpieza (opcional)
async function close() {
  if (client) await client.close();
}

module.exports = {
  shortenUrl,
  getOriginalUrl,
  close
};
