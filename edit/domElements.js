const runMode = document.getElementById('run-mode');
const editMode = document.getElementById('edit-mode');

const worldsButton = document.getElementById('worlds-button');
const worldSaveButton = document.getElementById('world-save-button');
const worldRevertButton = document.getElementById('world-revert-button');
const packagesButton = document.getElementById('packages-button');
const inventoryButton = document.getElementById('inventory-button');
const avatarButton = document.getElementById('avatar-button');
const micButton = document.getElementById('mic-button');
const dropdownButton = document.getElementById('dropdown-button');
const dropdown = document.getElementById('dropdown');
const worldsSubpage = document.getElementById('worlds-subpage');
const packagesSubpage = document.getElementById('packages-subpage');
const inventorySubpage = document.getElementById('inventory-subpage');
const avatarSubpage = document.getElementById('avatar-subpage');
const avatarSubpageContent = avatarSubpage.querySelector('.subtab-content');
const tabs = Array.from(dropdown.querySelectorAll('.tab'));
const tabContents = Array.from(dropdown.querySelectorAll('.tab-content'));
const worldsSubtabs = Array.from(worldsSubpage.querySelectorAll('.subtab'));
const worldsCloseButton = worldsSubpage.querySelector('.close-button');
const worldsSubtabContents = Array.from(worldsSubpage.querySelectorAll('.subtab-content'));
const packagesCloseButton = packagesSubpage.querySelector('.close-button');
const inventorySubtabs = Array.from(inventorySubpage.querySelectorAll('.subtab'));
const inventoryCloseButton = inventorySubpage.querySelector('.close-button');
const inventorySubtabContent = inventorySubpage.querySelector('.subtab-content');
const avatarCloseButton = avatarSubpage.querySelector('.close-button');

const scaleSlider = document.getElementById('scale-slider');
const shieldSlider = document.getElementById('shield-slider');

const sandboxButton = document.getElementById('sandbox-button');
const newWorldButton = document.getElementById('new-world-button');

export {
  runMode,
  editMode,

  worldsButton,
  worldSaveButton,
  worldRevertButton,
  packagesButton,
  inventoryButton,
  avatarButton,
  micButton,
  dropdownButton,
  dropdown,
  worldsSubpage,
  packagesSubpage,
  inventorySubpage,
  avatarSubpage,
  avatarSubpageContent,
  tabs,
  tabContents,
  worldsSubtabs,
  worldsCloseButton,
  worldsSubtabContents,
  packagesCloseButton,
  inventorySubtabs,
  inventoryCloseButton,
  inventorySubtabContent,
  avatarCloseButton,

  scaleSlider,
  shieldSlider,

  sandboxButton,
  newWorldButton,
};
