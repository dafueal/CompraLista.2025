// db.js - Nuevo archivo para gestionar el almacenamiento local

let db;

function initLocalDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('CompraListaDB', 1);
    
    request.onerror = (event) => {
      console.error('Error al abrir la base de datos:', event);
      reject('Error al inicializar la base de datos local');
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('items')) {
        const store = db.createObjectStore('items', { keyPath: 'id' });
        store.createIndex('listCode', 'listCode', { unique: false });
      }
      
      if (!db.objectStoreNames.contains('pendingChanges')) {
        db.createObjectStore('pendingChanges', { keyPath: 'timestamp' });
      }
    };
    
    request.onsuccess = (event) => {
      db = event.target.result;
      console.log('Base de datos local inicializada correctamente');
      resolve(db);
    };
  });
}

function saveItemLocally(item) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['items'], 'readwrite');
    const store = transaction.objectStore('items');
    const request = store.put(item);
    
    request.onsuccess = () => resolve(item);
    request.onerror = (event) => reject(event.target.error);
  });
}

function getLocalItems(listCode) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['items'], 'readonly');
    const store = transaction.objectStore('items');
    const index = store.index('listCode');
    const request = index.getAll(listCode);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

function savePendingChange(change) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pendingChanges'], 'readwrite');
    const store = transaction.objectStore('pendingChanges');
    change.timestamp = Date.now();
    const request = store.put(change);
    
    request.onsuccess = () => resolve(change);
    request.onerror = (event) => reject(event.target.error);
  });
}

function getPendingChanges() {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pendingChanges'], 'readonly');
    const store = transaction.objectStore('pendingChanges');
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

function removePendingChange(timestamp) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pendingChanges'], 'readwrite');
    const store = transaction.objectStore('pendingChanges');
    const request = store.delete(timestamp);
    
    request.onsuccess = () => resolve();
    request.onerror = (event) => reject(event.target.error);
  });
}

