function dragHandlers(pe, loginManager) {
  const dropZones = Array.from(document.querySelectorAll('.drop-zone'));
  dropZones.forEach(dropZone => {
    dropZone.addEventListener('dragenter', e => {
      dropZone.classList.add('hover');
    });
    dropZone.addEventListener('dragleave', e => {
      dropZone.classList.remove('hover');
    });
  });

  window.addEventListener('dragend', e => {
    document.body.classList.remove('dragging-package');
    dropZones.forEach(dropZone => {
      dropZone.classList.remove('hover');
    });
  });

  document.getElementById('inventory-drop-zone').addEventListener('drop', async e => {
    e.preventDefault();

    const jsonItem = Array.from(e.dataTransfer.items).find(i => i.type === 'application/json+package');
    if (jsonItem) {
      const s = await new Promise((resolve, reject) => {
        jsonItem.getAsString(resolve);
      });
      const j = JSON.parse(s);
      let {name, dataHash, id, iconHash} = j;
      if (!dataHash) {
        const p = pe.children.find(p => p.id === id);
        dataHash = await p.getHash();
      }

      const inventory = loginManager.getInventory();
      inventory.push({
        name,
        dataHash,
        iconHash,
      });
      await loginManager.setInventory(inventory);
    }
  });

  document.getElementById('avatar-drop-zone').addEventListener('drop', async e => {
    e.preventDefault();

    const jsonItem = Array.from(e.dataTransfer.items).find(i => i.type === 'application/json+package');
    if (jsonItem) {
      const s = await new Promise((resolve, reject) => {
        jsonItem.getAsString(resolve);
      });
      const j = JSON.parse(s);
      let {dataHash, id} = j;
      if (!dataHash) {
        const p = pe.children.find(p => p.id === id);
        dataHash = await p.getHash();
      }

      await loginManager.setAvatar(dataHash);
    }
  });
}

export default dragHandlers;
