import {
  packagesButton, inventoryButton, avatarButton, worldsButton,
  packagesSubpage, inventorySubpage, avatarSubpage, worldsSubpage,
  packagesCloseButton, inventoryCloseButton, avatarCloseButton, worldsCloseButton,
  dropdownButton, dropdown,
} from './domElements.js';

function attachEventListeners() {
  worldsButton.addEventListener('click', () => {
    worldsButton.classList.toggle('open');
    worldsSubpage.classList.toggle('open');

    dropdownButton.classList.remove('open');
    dropdown.classList.remove('open');
    packagesButton.classList.remove('open');
    packagesSubpage.classList.remove('open');
    inventoryButton.classList.remove('open');
    inventorySubpage.classList.remove('open');
    avatarButton.classList.remove('open');
    avatarSubpage.classList.remove('open');
  });

  packagesButton.addEventListener('click', () => {
    packagesButton.classList.add('open');
    packagesSubpage.classList.add('open');

    dropdownButton.classList.remove('open');
    dropdown.classList.remove('open');
    inventoryButton.classList.remove('open');
    inventorySubpage.classList.remove('open');
    worldsButton.classList.remove('open');
    worldsSubpage.classList.remove('open');
    avatarButton.classList.remove('open');
    avatarSubpage.classList.remove('open');
  });

  inventoryButton.addEventListener('click', () => {
    inventoryButton.classList.toggle('open');
    inventorySubpage.classList.toggle('open');

    dropdownButton.classList.remove('open');
    dropdown.classList.remove('open');
    packagesButton.classList.remove('open');
    packagesSubpage.classList.remove('open');
    worldsButton.classList.remove('open');
    worldsSubpage.classList.remove('open');
    avatarButton.classList.remove('open');
    avatarSubpage.classList.remove('open');
  });

  avatarButton.addEventListener('click', () => {
    avatarButton.classList.toggle('open');
    avatarSubpage.classList.toggle('open');

    dropdownButton.classList.remove('open');
    dropdown.classList.remove('open');
    packagesButton.classList.remove('open');
    packagesSubpage.classList.remove('open');
    worldsButton.classList.remove('open');
    worldsSubpage.classList.remove('open');
    inventoryButton.classList.remove('open');
    inventorySubpage.classList.remove('open');
  });

  dropdownButton.addEventListener('click', () => {
    dropdownButton.classList.toggle('open');
    dropdown.classList.toggle('open');

    worldsButton.classList.remove('open');
    packagesButton.classList.remove('open');
    packagesSubpage.classList.remove('open');
    inventoryButton.classList.remove('open');
    inventorySubpage.classList.remove('open');
    worldsSubpage.classList.remove('open');
    avatarButton.classList.remove('open');
    avatarSubpage.classList.remove('open');
  });

  [worldsCloseButton, packagesCloseButton, inventoryCloseButton, avatarCloseButton].forEach(closeButton => {
    closeButton.addEventListener('click', e => {
      dropdownButton.classList.remove('open');
      dropdown.classList.remove('open');
      packagesButton.classList.remove('open');
      packagesSubpage.classList.remove('open');
      worldsButton.classList.remove('open');
      worldsSubpage.classList.remove('open');
      inventoryButton.classList.remove('open');
      inventorySubpage.classList.remove('open');
      avatarButton.classList.remove('open');
      avatarSubpage.classList.remove('open');
    });
  });
}

export default attachEventListeners;
