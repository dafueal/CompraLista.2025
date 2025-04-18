// Agregar al inicio de script.js, después de la inicialización de Firebase

let isOnline = navigator.onLine;
let syncInProgress = false;
let localItemsLoaded = false;

// Inicializar la base de datos IndexedDB
initLocalDb().then(() => {
  console.log('Base de datos local lista');
  
  // Cargar cualquier lista guardada localmente
  if (currentCode) {
    loadLocalItems();
  }
  
  // Sincronizar cuando hay conexión
  if (isOnline) {
    syncWithServer();
  }
}).catch(error => {
  console.error('Error al inicializar la base de datos local:', error);
});

// Funciones para manejar eventos de conexión
window.addEventListener('online', handleOnline);
window.addEventListener('offline', handleOffline);

function handleOnline() {
  console.log('Conexión recuperada');
  isOnline = true;
  
  // Actualizar indicador de estado
  updateConnectionStatus(true);
  
  // Sincronizar los cambios pendientes
  if (!syncInProgress) {
    syncWithServer();
  }
}

function handleOffline() {
  console.log('Conexión perdida');
  isOnline = false;
  
  // Actualizar indicador de estado
  updateConnectionStatus(false);
}

function updateConnectionStatus(online) {
  const statusIndicator = document.getElementById('connection-status');
  if (statusIndicator) {
    statusIndicator.className = online ? 'status-online' : 'status-offline';
    statusIndicator.innerText = online ? 'En línea' : 'Sin conexión';
  }
}

// Función para sincronizar con el servidor
function syncWithServer() {
  syncInProgress = true;
  
  getPendingChanges().then(changes => {
    if (changes.length === 0) {
      syncInProgress = false;
      return;
    }
    
    const processNext = () => {
      if (changes.length === 0) {
        syncInProgress = false;
        return;
      }
      
      const change = changes.shift();
      
      // Aplicar el cambio al servidor
      let promise;
      
      if (change.type === 'add') {
        promise = addItemToFirebase(change.item);
      } else if (change.type === 'update') {
        promise = updateItemInFirebase(change.item);
      } else if (change.type === 'delete') {
        promise = deleteItemFromFirebase(change.itemId);
      }
      
      promise.then(() => {
        // Remover el cambio de pendingChanges después de procesarlo
        removePendingChange(change.timestamp).then(processNext);
      }).catch(error => {
        console.error('Error al sincronizar cambio:', error);
        syncInProgress = false;
      });
    };
    
    processNext();
  });
}

// Función para cargar elementos guardados localmente
function loadLocalItems() {
  if (localItemsLoaded) return;
  
  getLocalItems(currentCode).then(items => {
    if (items.length > 0) {
      // Actualizar la UI con elementos locales
      displayItems(items);
      localItemsLoaded = true;
    }
  }).catch(error => {
    console.error('Error al cargar elementos locales:', error);
  });
}

// Modificar las funciones actuales para trabajar offline

// Añadir un elemento
function addItem() {
  const input = document.getElementById('item-input');
  const itemText = input.value.trim();
  
  if (itemText) {
    const newItem = {
      id: Date.now().toString(),
      text: itemText,
      completed: false,
      listCode: currentCode,
      timestamp: Date.now()
    };
    
    // Guardar localmente
    saveItemLocally(newItem).then(() => {
      // Actualizar UI
      displayItem(newItem);
      input.value = '';
      
      // Si hay conexión, enviar al servidor
      if (isOnline) {
        addItemToFirebase(newItem);
      } else {
        // Si no hay conexión, guardar como pendiente
        savePendingChange({
          type: 'add',
          item: newItem
        });
      }
    });
  }
}

function addItemToFirebase(item) {
  return db.ref(`lists/${currentCode}/items/${item.id}`).set(item);
}

// Actualizar un elemento (marcar como completado o modificar)
function updateItem(itemId, updates) {
  // Primero actualizamos localmente
  getLocalItems(currentCode).then(items => {
    const item = items.find(i => i.id === itemId);
    if (item) {
      const updatedItem = { ...item, ...updates, timestamp: Date.now() };
      saveItemLocally(updatedItem).then(() => {
        // Actualizar UI
        updateItemUI(updatedItem);
        
        // Si hay conexión, actualizar en el servidor
        if (isOnline) {
          updateItemInFirebase(updatedItem);
        } else {
          // Si no hay conexión, guardar como pendiente
          savePendingChange({
            type: 'update',
            item: updatedItem
          });
        }
      });
    }
  });
}

function updateItemInFirebase(item) {
  return db.ref(`lists/${currentCode}/items/${item.id}`).update(item);
}

// Eliminar un elemento
function deleteItem(itemId) {
  // Eliminar de la interfaz
  document.getElementById(`item-${itemId}`).remove();
  
  // Eliminar localmente
  getLocalItems(currentCode).then(items => {
    const item = items.find(i => i.id === itemId);
    if (item) {
      const transaction = db.transaction(['items'], 'readwrite');
      const store = transaction.objectStore('items');
      store.delete(itemId);
      
      // Si hay conexión, eliminar del servidor
      if (isOnline) {
        deleteItemFromFirebase(itemId);
      } else {
        // Si no hay conexión, guardar como pendiente
        savePendingChange({
          type: 'delete',
          itemId: itemId
        });
      }
    }
  });
}

function deleteItemFromFirebase(itemId) {
  return db.ref(`lists/${currentCode}/items/${itemId}`).remove();
}

