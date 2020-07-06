import {XRPackage, pe, loginManager} from '../run.js';
import {apiHost, packagesEndpoint} from './constants.js';
import {addPackage} from './utils.js';
import {
  packagesSubpage, inventorySubpage, avatarSubpage, avatarSubpageContent,
  inventorySubtabContent, dropdown,
} from './domElements.js';

const _changeInventory = inventory => {
  inventorySubtabContent.innerHTML = inventory.map(item => `\
    <div class=item draggable=true>
      <img class=screenshot>
      <div class=name>${item.name}</div>
      <div class=details>
        <a class="button inspect-button" target="_blank" href="inspect.html?h=${item.hash}">Inspect</a>
        <nav class="button wear-button">Wear</nav>
        <nav class="button remove-button">Remove</nav>
      </div>
    </div>
  `).join('\n');
  const is = inventorySubtabContent.querySelectorAll('.item');
  is.forEach((itemEl, i) => {
    const item = inventory[i];
    const {name, dataHash, iconHash} = item;

    itemEl.addEventListener('dragstart', e => {
      startPackageDrag(e, {
        name,
        dataHash,
        iconHash,
      });
    });

    (async () => {
      const img = itemEl.querySelector('.screenshot');
      /* if (p) {
        const u = await p.getScreenshotImageUrl();
        img.src = u;
        img.onload = () => {
          URL.revokeObjectURL(u);
        };
        img.onerror = err => {
          console.warn(err);
          URL.revokeObjectURL(u);
        };
      } else { */
      img.src = `${apiHost}/${iconHash}.gif`;
      // }
    })();
    const wearButton = itemEl.querySelector('.wear-button');
    wearButton.addEventListener('click', () => {
      loginManager.setAvatar(dataHash);
    });
    const removeButton = itemEl.querySelector('.remove-button');
    removeButton.addEventListener('click', async () => {
      console.log('remove', item);
      const newInventory = inventory.filter(i => i.dataHash !== item.dataHash);
      await loginManager.setInventory(newInventory);
    });
  });
};

const _makePackageHtml = p => `
  <div class=package draggable=true>
    <!-- <img src="assets/question.png"> -->
    <img src="${apiHost}/${p.icons[0].hash}.gif" width=256 height=256>
    <div class=text>
      <div class=name>${p.name}</div>
    </div>
    <div class=background>
      <nav class="button add-button">Add</nav>
      <nav class="button wear-button">Wear</nav>
      <a class="button inspect-button" target="_blank" href="inspect.html?p=${p.name}">Inspect</a>
    </div>
  </div>
`;

const startPackageDrag = (e, j) => {
  e.dataTransfer.setData('application/json+package', JSON.stringify(j));
  setTimeout(() => {
    dropdown.classList.remove('open');
    packagesSubpage.classList.remove('open');
    inventorySubpage.classList.remove('open');
    avatarSubpage.classList.remove('open');
    document.body.classList.add('dragging-package');
  });
};

const _bindPackage = (pE, pJ) => {
  const {name, dataHash} = pJ;
  const iconHash = pJ.icons.find(i => i.type === 'image/gif').hash;
  pE.addEventListener('dragstart', e => {
    startPackageDrag(e, {name, dataHash, iconHash});
  });
  const addButton = pE.querySelector('.add-button');
  addButton.addEventListener('click', async () => {
    const p = await XRPackage.download(dataHash);
    await addPackage(p, pe);
  });
  const wearButton = pE.querySelector('.wear-button');
  wearButton.addEventListener('click', () => {
    loginManager.setAvatar(dataHash);
  });
  /* const inspectButton = pE.querySelector('.inspect-button');
  inspectButton.addEventListener('click', e => {
    e.preventDefault();
    console.log('open', inspectButton.getAttribute('href'));
    window.open(inspectButton.getAttribute('href'), '_blank');
  }); */
};

function packagesHandlers() {
  _changeInventory(loginManager.getInventory());
  loginManager.addEventListener('inventorychange', async e => {
    const inventory = e.data;
    _changeInventory(inventory);
  });

  const packages = document.getElementById('packages');
  (async () => {
    const res = await fetch(packagesEndpoint);
    const s = await res.text();
    const children = JSON.parse(s);
    const ps = await Promise.all(children.map(child =>
      fetch(packagesEndpoint + '/' + child)
        .then(res => res.json()),
    ));
    packages.innerHTML = ps.map(p => _makePackageHtml(p)).join('\n');
    Array.from(packages.querySelectorAll('.package')).forEach((pe, i) => _bindPackage(pe, ps[i]));

    // wristMenu.packageSide.setPackages(ps);
  })();

  window.addEventListener('avatarchange', e => {
    const p = e.data;

    avatarSubpageContent.innerHTML = `\
    <div class=avatar draggable=true>
      <img class=screenshot style="display: none;">
      <div class=wrap>
        ${p ? `\
          <div class=name>${p.name}</div>
          <div class=hash>${p.hash}</div>
          <nav class="button unwear-button">Unwear</nab>
        ` : `\
          <div class=name>No avatar</div>
        `}
      </div>
    </div>
  `;
    if (p) {
      avatarSubpageContent.addEventListener('dragstart', e => {
        startPackageDrag(e, {
          name: p.name,
          dataHash: p.hash,
          iconHash: null,
        });
      });
      (async () => {
        const img = avatarSubpageContent.querySelector('.screenshot');
        const u = await p.getScreenshotImageUrl();
        if (u) {
          img.src = u;
          img.onload = () => {
            img.style.display = null;
            URL.revokeObjectURL(u);
          };
          img.onerror = err => {
            console.warn(err);
            URL.revokeObjectURL(u);
          };
        } /* else {
        img.src = 'assets/question.png';
      } */
      })();
      const unwearButton = avatarSubpageContent.querySelector('.unwear-button');
      unwearButton && unwearButton.addEventListener('click', e => {
        loginManager.setAvatar(null);
      });
    }
  });
}

export {packagesHandlers, startPackageDrag};
