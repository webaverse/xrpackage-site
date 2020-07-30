/* eslint-disable no-inner-declarations */
/* global Web3 */

import './selector.js';
import {downloadFile, readFile, bindUploadFileButton} from './utils.js';
import {tryLogin} from './login.js';
import {getWireframeMesh} from './volume.js';
import {progress} from './progress.js';

const THREE = window.THREE;
const XRPackage = window.XRPackage;
const XRPackageEngine = window.XRPackageEngine;
const OrbitControls = window.OrbitControls;
const address = window.contractAddress;
const abi = window.contractAbi;

const apiHost = 'https://ipfs.exokit.org/ipfs';
const packagesEndpoint = 'https://packages.exokit.org';
const network = 'rinkeby';
const infuraApiKey = '4fb939301ec543a0969f3019d74f80c2';
const rpcUrl = `https://${network}.infura.io/v3/${infuraApiKey}`;
const web3 = new Web3(new Web3.providers.HttpProvider(rpcUrl));
const contract = new web3.eth.Contract(abi, address);

(async () => {
  await XRPackageEngine.waitForLoad();
  await tryLogin();
})();

const subtabs = Array.from(document.querySelectorAll('.subtab'));
const subcontents = Array.from(document.querySelectorAll('.subcontent'));
const closeTabs = i => {
  subtabs.forEach((subtab, i) => {
    subtab.classList.remove('open');
    subcontents[i].classList.remove('open');
  });
};
const openTab = i => {
  const subtab = subtabs[i];
  const subcontent = subcontents[i];
  closeTabs();
  subtab.classList.add('open');
  subcontent.classList.add('open');
};

for (let i = 0; i < subtabs.length; i++) {
  const subtab = subtabs[i];
  subtab.addEventListener('click', () => {
    closeTabs();
    openTab(i);
  });
}

const sidetabs = Array.from(document.querySelectorAll('.side-tab'));
for (let i = 0; i < sidetabs.length; i++) {
  const sidetab = sidetabs[i];
  sidetab.addEventListener('click', e => {
    const sidecontents = Array.from(document.querySelectorAll('.side-content'));
    const sidecontent = sidecontents[i];
    sidetabs.forEach((sidetab, i) => {
      sidetab.classList.remove('open');
      sidecontents[i].classList.remove('open');
    });
    sidetab.classList.add('open');
    sidecontent.classList.add('open');
  });
}

const size = 256;
const pe = new XRPackageEngine({
  width: size,
  height: size,
  pixelRatio: 1,
  autoListen: false,
});

function parseQuery(queryString) {
  const query = {};
  const pairs = (queryString[0] === '?' ? queryString.substr(1) : queryString).split('&');
  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i].split('=');
    query[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '');
  }
  return query;
}

const isValidManifest = str => {
  if (!str) return false;
  try {
    const json = JSON.parse(str);
    const {name, xr_type: xrType, start_url: startUrl} = json;
    if (!name || !xrType || !startUrl) return false;
    if (!(/^[a-z0-9][a-z0-9-._~]*$/.test(name))) return false;
  } catch (err) {
    console.warn('invalid manifest json', err);
    return false;
  }

  return true;
};

const _makeScene = () => {
  const renderer = new THREE.WebGLRenderer({
    // canvas: pe.domElement,
    // context: pe.getContext('webgl'),
    antialias: true,
    alpha: true,
    // preserveDrawingBuffer: true,
  });
  renderer.setSize(size, size);
  renderer.setPixelRatio(1);
  // renderer.autoClear = false;
  renderer.sortObjects = false;
  renderer.physicallyCorrectLights = true;
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(110, 1, 0.1, 1000);
  camera.position.set(0, 0.5, 1);

  const ambientLight = new THREE.AmbientLight(0xFFFFFF);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 3);
  scene.add(directionalLight);
  const directionalLight2 = new THREE.DirectionalLight(0xFFFFFF, 3);
  scene.add(directionalLight2);

  return {renderer, scene, camera};
};

const _renderFiles = p => {
  const manifestJson = p.getManifestJson();
  const files = document.getElementById('files');

  files.innerHTML = p.files.map(f => {
    const u = f.url.replace(/^https:\/\/xrpackage\.org\//, '');
    return `
        <div class=file pathname="${u}"">
          <a class=name href="${u}">${u}</a>
          ${u !== manifestJson.start_url ? `<nav class=remove-button>
            <i class="fa fa-times"></i>
          </nav>` : ''}
        </div>
      `;
  }).join('\n');

  Array.from(files.querySelectorAll('.file')).forEach(f => {
    const pathname = f.getAttribute('pathname');
    const removeButton = f.querySelector('.remove-button');
    removeButton && removeButton.addEventListener('click', e => {
      p.removeFile(pathname);
      _renderFiles(p);
    });
  });
};

const _renderPackage = async p => {
  // views
  const views = document.getElementById('views');
  views.innerHTML = '';
  {
    const canvas = pe.domElement;
    canvas.classList.add('side-content');
    canvas.classList.add('view');
    canvas.classList.add('open');
    views.appendChild(canvas);
  }
  {
    let screenshotImage = await p.getScreenshotImage();
    if (!screenshotImage) {
      screenshotImage = document.createElement('img');
    }
    screenshotImage.style.width = `${size}px`;
    screenshotImage.style.height = `${size}px`;
    screenshotImage.style.objectFit = 'contain';
    screenshotImage.classList.add('side-content');
    screenshotImage.classList.add('view');
    views.appendChild(screenshotImage);
  }
  {
    const {renderer, scene, camera} = _makeScene();

    const volumeMesh = await p.getVolumeMesh();
    if (volumeMesh) {
      const wireframeMesh = getWireframeMesh(volumeMesh);
      scene.add(wireframeMesh);
    }

    const orbitControls = new OrbitControls(camera, renderer.domElement, document);
    orbitControls.screenSpacePanning = true;
    orbitControls.enableMiddleZoom = false;
    orbitControls.update();

    function animate(timestamp, frame) {
      orbitControls.update();

      renderer.render(scene, camera);
    }
    renderer.setAnimationLoop(animate);

    const canvas = renderer.domElement;
    canvas.classList.add('side-content');
    canvas.classList.add('view');
    views.appendChild(canvas);
  }
  {
    const {renderer, scene, camera} = _makeScene();

    const modelMesh = await p.getModel();
    scene.add(modelMesh);

    const orbitControls = new OrbitControls(camera, renderer.domElement, document);
    orbitControls.screenSpacePanning = true;
    orbitControls.enableMiddleZoom = false;
    orbitControls.update();

    function animate(timestamp, frame) {
      orbitControls.update();

      renderer.render(scene, camera);
    }
    renderer.setAnimationLoop(animate);

    const canvas = renderer.domElement;
    canvas.classList.add('side-content');
    canvas.classList.add('view');
    views.appendChild(canvas);
  }

  // manifest
  const manifestJson = p.getManifestJson();

  const manifest = document.getElementById('manifest');
  manifest.value = JSON.stringify(manifestJson, null, 2);

  // files
  const type = document.getElementById('type');
  const name = document.getElementById('name');
  const description = document.getElementById('description');
  type.innerText = manifestJson.xr_type;
  name.innerText = manifestJson.name || '';
  description.innerText = manifestJson.description || '';

  _renderFiles(p);
};

const _updateManifest = (p, manifestString) => {
  const compileRawData = [{
    url: '/manifest.json',
    type: 'application/json',
    data: manifestString,
  }];

  p.files.forEach(f => {
    if (f.url.endsWith('/manifest.json')) return;

    const filename = f.url.match(/([^/]+$)/)[1];
    compileRawData.push({
      url: `/${filename}`,
      type: f.response.headers['content-type'],
      data: f.response.body,
    });
  });

  return new XRPackage(XRPackage.compileRaw(compileRawData));
};

const _bakePackage = async p => {
  const b = new Blob([p.data], {
    type: 'application/webbundle',
  });
  const srcWbn = URL.createObjectURL(b);
  const iframe = document.createElement('iframe');
  iframe.src = `bake.html?srcWbn=${srcWbn}`;
  iframe.style.top = '-10000px';
  iframe.style.left = '-10000px';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);
  const {screenshot, volume, aabb} = await new Promise((resolve, reject) => {
    iframe.addEventListener('load', e => {
      const _message = e => {
        if (e.data && e.data.method === 'result') {
          resolve(e.data.result);
          window.removeEventListener('message', _message);
        } else if (e.data && e.data.method === 'error') {
          reject(e.data.error);
          window.removeEventListener('message', _message);
        }
      };
      window.addEventListener('message', _message);
    });
    iframe.addEventListener('error', err => {
      reject(err);
    });
  });

  const manifestJson = p.getManifestJson();
  manifestJson.icons = Array.isArray(manifestJson.icons) ? manifestJson.icons : [];
  if (screenshot.length > 0) {
    p.addFile('xrpackage_icon.gif', screenshot, 'image/gif');
    let gifIcon = manifestJson.icons.find(icon => icon.type === 'image/gif');
    if (!gifIcon) {
      gifIcon = {
        src: '',
        type: 'image/gif',
      };
      manifestJson.icons.push(gifIcon);
    }
    gifIcon.src = 'xrpackage_icon.gif';
  }

  if (volume.length > 0) {
    p.addFile('xrpackage_volume.glb', volume, 'model/gltf-binary+preview');
    let volumeIcon = manifestJson.icons.find(icon => icon.type === 'model/gltf-binary+preview');
    if (!volumeIcon) {
      volumeIcon = {
        src: '',
        type: 'model/gltf-binary+preview',
      };
      manifestJson.icons.push(volumeIcon);
    }
    volumeIcon.src = 'xrpackage_volume.glb';
  }

  manifestJson.xr_details = manifestJson.xr_details || {aabb};
  let modelIcon = manifestJson.icons.find(icon => icon.type === 'model/gltf-binary');
  if (!modelIcon) {
    let modelPath;
    switch (manifestJson.xr_type) {
      case 'gltf@0.0.1':
      case 'vrm@0.0.1': {
        modelPath = manifestJson.start_url;
        break;
      }
      default: {
        modelPath = 'xrpackage_model.glb';

        const res = await fetch('/assets/w.glb');
        const modelUint8Array = await res.arrayBuffer();
        p.addFile(modelPath, modelUint8Array, 'model/gltf-binary');
        break;
      }
    }

    modelIcon = {
      src: modelPath,
      type: 'model/gltf-binary',
    };
    manifestJson.icons.push(modelIcon);
  }

  p = _updateManifest(p, JSON.stringify(manifestJson));
  openTab(0);
  await _renderPackage(p);
};

(async () => {
  const q = parseQuery(window.location.search);

  const inspectMode = document.getElementById('inspect-mode');
  const createMode = document.getElementById('create-mode');

  let p;
  if (q.p) { // package
    inspectMode.classList.add('open');

    progress.setNumeratorDenominator(0, 1);
    progress.trickle();
    const metadata = await fetch(packagesEndpoint + '/' + q.p)
      .then(res => res.json());
    const {dataHash} = metadata;

    const arrayBuffer = await fetch(`${apiHost}/${dataHash}.wbn`)
      .then(res => res.arrayBuffer());

    p = new XRPackage(new Uint8Array(arrayBuffer));
    await pe.add(p);
    progress.stopTrickle();
  } else if (q.i) { // index
    inspectMode.classList.add('open');

    progress.setNumeratorDenominator(0, 1);
    progress.trickle();
    const metadataHash = await contract.methods.getMetadata(parseInt(q.i, 10), 'hash').call();
    const metadata = await fetch(`${apiHost}/${metadataHash}`)
      .then(res => res.json());
    const {dataHash} = metadata;

    const arrayBuffer = await fetch(`${apiHost}/${dataHash}.wbn`)
      .then(res => res.arrayBuffer());

    p = new XRPackage(new Uint8Array(arrayBuffer));
    await pe.add(p);
    progress.stopTrickle();
  } else if (q.u) { // url
    inspectMode.classList.add('open');

    progress.setNumeratorDenominator(0, 1);
    progress.trickle();
    const arrayBuffer = await fetch(q.u)
      .then(res => res.arrayBuffer());

    p = new XRPackage(new Uint8Array(arrayBuffer));
    await pe.add(p);
    progress.stopTrickle();
  } else if (q.h) { // hash
    inspectMode.classList.add('open');

    progress.setNumeratorDenominator(0, 1);
    progress.trickle();
    p = await XRPackage.download(q.h);
    await pe.add(p);
    progress.stopTrickle();
  } else {
    createMode.classList.add('open');

    p = null;
  }

  if (p) await _renderPackage(p);

  const saveManifestButton = document.getElementById('save-manifest-button');
  saveManifestButton.addEventListener('click', async () => {
    progress.setNumeratorDenominator(0, 1);
    progress.trickle();

    const manifest = document.getElementById('manifest').value;
    console.log('save manifest', manifest);
    if (isValidManifest(manifest)) {
      p = _updateManifest(p, manifest);
      pe.reset();
      await pe.add(p);
      await _renderPackage(p);

      openTab(0);
    } else {
      window.alert('Error: invalid manifest!');
    }

    progress.stopTrickle();
  });

  // files
  const fileName = document.getElementById('file-name');
  const fileUploadInput = document.getElementById('file-upload-input');
  const addFileButton = document.getElementById('add-file-button');
  let file = null;
  bindUploadFileButton(fileUploadInput, f => {
    if (!fileName.value) {
      fileName.value = f.name;
    }
    file = f;
    addFileButton.disabled = false;
  });
  addFileButton.addEventListener('click', async e => {
    if (file && fileName.value) {
      const uint8Array = await readFile(file);
      p.addFile(fileName.value, uint8Array, file.type);
      _renderFiles(p);

      file = null;
      fileName.value = '';
      addFileButton.disabled = true;
    }
  });

  const _importPackage = async uint8Array => {
    p = new XRPackage(uint8Array);
    await p.waitForLoad();
    await pe.add(p);
    console.log('got new package', p);

    inspectMode.classList.add('open');
    createMode.classList.remove('open');
    openTab(0);
    await _renderPackage(p);
  };

  const _importFile = async file => {
    progress.setNumeratorDenominator(0, 1);
    progress.trickle();
    const uint8Array = await XRPackage.compileFromFile(file);
    await _importPackage(uint8Array);
    progress.stopTrickle();
  };

  // Create from file
  const createFromFileInput = document.getElementById('create-from-file-input');
  bindUploadFileButton(createFromFileInput, _importFile);

  // Import wbn package
  const importPackageInput = document.getElementById('import-package-input');
  bindUploadFileButton(importPackageInput, _importFile);

  const bakePackageButton = document.getElementById('bake-package-button');
  bakePackageButton.addEventListener('click', async () => {
    progress.setNumeratorDenominator(0, 1);
    progress.trickle();
    await _bakePackage(p);
    progress.stopTrickle();
  });

  const uploadPackageButton = document.getElementById('upload-package-button');
  uploadPackageButton.addEventListener('click', async () => {
    progress.setNumeratorDenominator(0, 1);
    progress.trickle();
    const hash = await p.upload();
    progress.stopTrickle();

    const url = `https://ipfs.exokit.org/ipfs/${hash}.wbn`;
    console.log('uploaded package to IPFS', url);
    window.alert(`Your package was uploaded to IPFS! ${url}`);
  });

  const exportPackageButton = document.getElementById('export-package-button');
  exportPackageButton.addEventListener('click', async e => {
    const uint8Array = await p.export();
    const file = new Blob([uint8Array], {
      type: 'application/webbundle',
    });
    downloadFile(file, 'package.wbn');
  });
})();
