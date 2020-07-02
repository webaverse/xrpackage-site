/* eslint no-unused-vars: 0 */
import * as THREE from 'https://static.xrpackage.org/xrpackage/three.module.js';
import {TransformControls} from './TransformControls.js';
// import address from 'https://contracts.webaverse.com/address.js';
// import abi from 'https://contracts.webaverse.com/abi.js';
import {XRPackage, pe, renderer, scene, camera, floorMesh, proxySession, getRealSession, loginManager} from './run.js';
import {readFile, bindUploadFileButton} from 'https://static.xrpackage.org/xrpackage/util.js';
import {wireframeMaterial, getWireframeMesh, meshIdToArray, decorateRaycastMesh, VolumeRaycaster} from './volume.js';
// import {makeWristMenu, makeHighlightMesh, makeRayMesh} from './vr-ui.js';
import {makeLineMesh, makeTeleportMesh} from './teleport.js';

import {handleUrl, addPackage} from './edit/utils.js';
import attachEventListeners from './edit/classlistHandlers.js';
import dragHandlers from './edit/dragHandlers.js';
import {updateWorldSaveButton, worldHandlers} from './edit/worlds.js';
import {apiHost, loadMeshMaterial} from './edit/constants.js';
import {ensureLoadMesh, ensurePlaceholdMesh, ensureVolumeMesh} from './edit/meshes.js';
import {packagesHandlers, startPackageDrag} from './edit/packagesHandlers.js';
import {
  tabs, tabContents,
  scaleSlider, shieldSlider,
  micButton, dropdownButton,
} from './edit/domElements.js';

const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();
const localVector3 = new THREE.Vector3();
const localVector4 = new THREE.Vector3();
const localQuaternion = new THREE.Quaternion();
const localQuaternion2 = new THREE.Quaternion();
const localEuler = new THREE.Euler();
const localMatrix = new THREE.Matrix4();
const localMatrix2 = new THREE.Matrix4();

const keys = {
  up: false,
  down: false,
  left: false,
  right: false,
  shift: false,
};

let shieldLevel = parseInt(shieldSlider.value, 10);
let selectedTool = 'camera';
let hoverTarget = null;
let selectTarget = null;
let jumpState = null;

const _resetKeys = () => {
  for (const k in keys) {
    keys[k] = false;
  }
};

const lineMeshes = [
  makeLineMesh(),
  makeLineMesh(),
];
lineMeshes.forEach(lineMesh => {
  scene.add(lineMesh);
});
const teleportMeshes = lineMeshes.map((lineMesh, i) => makeTeleportMesh(lineMesh, i));
teleportMeshes.forEach(teleportMesh => {
  scene.add(teleportMesh);
});

/* const rayMesh = makeRayMesh();
scene.add(rayMesh);

const highlightScene = new THREE.Scene();
const highlightMesh = makeHighlightMesh();
highlightScene.add(highlightMesh);

const wristMenu = makeWristMenu({scene, ray: rayMesh, highlightMesh, addPackage: _addPackage});
wristMenu.position.y = 1;
scene.add(wristMenu); */

/* window.downloadTargetMesh = async () => {
  const {GLTFExporter} = await import('./GLTFExporter.js');
  const targetMesh = _makeTargetMesh();
  targetMesh.material = new THREE.MeshBasicMaterial({
    color: 0x000000,
  });
  const data = await new Promise((accept, reject) => {
    const exporter = new GLTFExporter();
    const exportScene = new THREE.Scene();
    exportScene.add(targetMesh);
    exporter.parse(exportScene, gltf => {
      accept(gltf);
    }, {
      binary: true,
      includeCustomExtensions: true,
    });
  });
  console.log('got data', data);
  const b = new Blob([data], {
    type: 'application/octet-stream',
  });
  downloadFile(b, 'target.glb');
}; */

const velocity = new THREE.Vector3();
const lastGrabs = [false, false];
const lastAxes = [[0, 0], [0, 0]];
let lastTeleport = false;
const timeFactor = 500;
let lastTimestamp = performance.now();
function animate(timestamp, frame) {
  const timeDiff = Math.min((timestamp - lastTimestamp) / 1000, 0.05);
  lastTimestamp = timestamp;

  loadMeshMaterial.uniforms.uTime.value = (Date.now() % timeFactor) / timeFactor;

  const session = renderer.xr.getSession();
  if (session) {
    const inputSource = session.inputSources[1];
    let pose;
    if (pose = frame.getPose(inputSource.targetRaySpace, renderer.xr.getReferenceSpace())) {
      localMatrix.fromArray(pose.transform.matrix)
        .decompose(localVector, localQuaternion, localVector2);
      teleportMeshes[1].update(localVector, localQuaternion, lastTeleport, (position, quaternion) => {
        switch (selectedTool) {
          case 'thirdperson': {
            pe.camera.position.add(localVector.copy(avatarCameraOffset).applyQuaternion(pe.camera.quaternion));
            break;
          }
          case 'isometric': {
            pe.camera.position.add(localVector.copy(isometricCameraOffset).applyQuaternion(pe.camera.quaternion));
            break;
          }
        }

        pe.camera.position.x = position.x;
        pe.camera.position.z = position.z;

        switch (selectedTool) {
          case 'thirdperson': {
            pe.camera.position.sub(localVector.copy(avatarCameraOffset).applyQuaternion(pe.camera.quaternion));
            break;
          }
          case 'isometric': {
            pe.camera.position.sub(localVector.copy(isometricCameraOffset).applyQuaternion(pe.camera.quaternion));
            break;
          }
        }

        pe.camera.updateMatrixWorld();
      });
    }
  }

  const currentSession = getRealSession();
  if (currentSession) {
    const {inputSources} = currentSession;
    for (let i = 0; i < inputSources.length; i++) {
      const inputSource = inputSources[i];
      const {handedness, gamepad} = inputSource;
      if (gamepad && gamepad.buttons.length >= 2) {
        const index = handedness === 'right' ? 1 : 0;

        // buttons
        const {buttons} = gamepad;
        const grab = buttons[1].pressed;
        const lastGrab = lastGrabs[index];
        if (!lastGrab && grab) { // grip
          // console.log('gripped', handedness);
          pe.grabdown(handedness);
        } else if (lastGrab && !grab) {
          pe.grabup(handedness);
        }
        lastGrabs[index] = grab;

        // axes
        const {axes: axesSrc} = gamepad;
        const axes = [
          axesSrc[0] || 0,
          axesSrc[1] || 0,
          axesSrc[2] || 0,
          axesSrc[3] || 0,
        ];
        if (handedness === 'left') {
          localVector.set(-(axes[0] + axes[2]), 0, -(axes[1] + axes[3]))
            .multiplyScalar(0.01);
          pe.matrix.decompose(localVector2, localQuaternion, localVector3);
          const xrCamera = renderer.xr.getCamera(pe.camera);
          localQuaternion2.copy(xrCamera.quaternion).premultiply(localQuaternion);
          localEuler.setFromQuaternion(localQuaternion2, 'YXZ');
          localEuler.x = 0;
          localEuler.z = 0;
          localVector.applyEuler(localEuler);
          localVector2.add(localVector);
          pe.setMatrix(localMatrix.compose(localVector2, localQuaternion, localVector3));
        } else if (handedness === 'right') {
          const _applyRotation = r => {
            const xrCamera = renderer.xr.getCamera(pe.camera);
            localMatrix
              .copy(xrCamera.matrix)
              .premultiply(pe.matrix)
              .decompose(localVector, localQuaternion, localVector2);
            localQuaternion.premultiply(localQuaternion2.setFromAxisAngle(localVector3.set(0, 1, 0), r));
            localMatrix
              .compose(localVector, localQuaternion, localVector2)
              .multiply(localMatrix2.getInverse(xrCamera.matrix));
            pe.setMatrix(localMatrix);
          };
          if (
            (axes[0] < -0.5 && !(lastAxes[index][0] < -0.5)) ||
            (axes[2] < -0.5 && !(lastAxes[index][2] < -0.5))
          ) {
            _applyRotation(-Math.PI * 0.2);
          } else if (
            (axes[0] > 0.5 && !(lastAxes[index][0] > 0.5)) ||
            (axes[2] > 0.5 && !(lastAxes[index][2] > 0.5))
          ) {
            _applyRotation(Math.PI * 0.2);
          }
          lastTeleport = (axes[1] < -0.5 || axes[3] < -0.5);
        }
        lastAxes[index][0] = axes[0];
        lastAxes[index][1] = axes[1];
        lastAxes[index][2] = axes[2];
        lastAxes[index][3] = axes[3];
      }
    }

    pe.setRigMatrix(null);
  } else if (document.pointerLockElement) {
    const speed = 30 * (keys.shift ? 3 : 1);
    const cameraEuler = pe.camera.rotation.clone();
    cameraEuler.x = 0;
    cameraEuler.z = 0;
    localVector.set(0, 0, 0);
    if (keys.left) {
      localVector.add(new THREE.Vector3(-1, 0, 0).applyEuler(cameraEuler));
    }
    if (keys.right) {
      localVector.add(new THREE.Vector3(1, 0, 0).applyEuler(cameraEuler));
    }
    if (keys.up) {
      localVector.add(new THREE.Vector3(0, 0, -1).applyEuler(cameraEuler));
    }
    if (keys.down) {
      localVector.add(new THREE.Vector3(0, 0, 1).applyEuler(cameraEuler));
    }
    if (localVector.length() > 0) {
      localVector.normalize().multiplyScalar(speed);
    }

    if (jumpState) {
      localVector.y -= 9.8;
    }
    localVector.multiplyScalar(timeDiff);
    velocity.add(localVector);
    pe.camera.position.add(localVector.copy(velocity).multiplyScalar(timeDiff));
    pe.camera.updateMatrixWorld();
    velocity.x *= 0.7;
    velocity.z *= 0.7;

    const _collideFloor = matrix => {
      matrix.decompose(localVector, localQuaternion, localVector2);
      const {rig, rigPackage} = pe;
      if (rig || rigPackage) {
        const avatarHeight = rig ? _getAvatarHeight() : 1;
        if (localVector.y < avatarHeight) {
          localVector.y = avatarHeight;
          matrix.compose(localVector, localQuaternion, localVector2);
          velocity.y = 0;
          jumpState = null;
        }
      }
    };

    if (selectedTool === 'firstperson') {
      _collideFloor(pe.camera.matrix);
      pe.setRigMatrix(null);
    } else if (selectedTool === 'thirdperson') {
      pe.camera.matrixWorld.decompose(localVector, localQuaternion, localVector2);
      localVector.add(localVector3.copy(avatarCameraOffset).applyQuaternion(localQuaternion));
      if (velocity.lengthSq() > 0) {
        localQuaternion.setFromUnitVectors(localVector3.set(0, 0, -1), localVector4.set(velocity.x, 0, velocity.z).normalize());
      }
      pe.setRigMatrix(localMatrix.compose(localVector, localQuaternion, localVector2));
      _collideFloor(pe.rigMatrix);
    } else if (selectedTool === 'isometric') {
      pe.camera.matrixWorld.decompose(localVector, localQuaternion, localVector2);
      localVector.add(localVector3.copy(isometricCameraOffset).applyQuaternion(localQuaternion));
      if (velocity.lengthSq() > 0) {
        localQuaternion.setFromUnitVectors(localVector3.set(0, 0, -1), localVector4.set(velocity.x, 0, velocity.z).normalize());
      }
      pe.setRigMatrix(localMatrix.compose(localVector, localQuaternion, localVector2));
      _collideFloor(pe.rigMatrix);
    } else if (selectedTool === 'birdseye') {
      pe.camera.matrixWorld.decompose(localVector, localQuaternion, localVector2);
      localVector.add(localVector3.set(0, -birdsEyeHeight + _getAvatarHeight(), 0));
      if (velocity.lengthSq() > 0) {
        localQuaternion.setFromUnitVectors(localVector3.set(0, 0, -1), localVector4.set(velocity.x, 0, velocity.z).normalize());
      }
      pe.setRigMatrix(localMatrix.compose(localVector, localQuaternion, localVector2));
      _collideFloor(pe.rigMatrix);
    } else {
      pe.setRigMatrix(null);
    }
  } else {
    pe.setRigMatrix(null);
  }

  /* if (session) {
    wristMenu.update(frame, session, renderer.xr.getReferenceSpace());
  } */

  // packages
  const isVisible = shieldLevel === 2;
  const isTarget = shieldLevel === 0 && selectedTool !== 'select';
  const isVolume = shieldLevel === 1 || selectedTool === 'select';
  for (const p of pe.children) {
    p.visible = isVisible;
    if (p.placeholderBox) {
      p.placeholderBox.visible = isTarget;
    }
    if (p.volumeMesh) {
      p.volumeMesh.visible = isVolume;
    }
  }
  if (hoverTarget) {
    wireframeMaterial.uniforms.uHoverId.value.fromArray(meshIdToArray(hoverTarget.meshId).map(n => n / 255));
    wireframeMaterial.uniforms.uHoverColor.value.fromArray(new THREE.Color(0x5c6bc0).toArray());
  } else {
    wireframeMaterial.uniforms.uHoverId.value.set(0, 0, 0);
  }
  if (selectTarget) {
    wireframeMaterial.uniforms.uSelectId.value.fromArray(meshIdToArray(selectTarget.meshId).map(n => n / 255));
    wireframeMaterial.uniforms.uSelectColor.value.fromArray(new THREE.Color(0x66bb6a).toArray());
  } else {
    wireframeMaterial.uniforms.uSelectId.value.set(0, 0, 0);
  }

  renderer.render(scene, camera);
  // renderer.render(highlightScene, camera);
}
renderer.setAnimationLoop(animate);
renderer.xr.setSession(proxySession);

const volumeRaycaster = new VolumeRaycaster();

bindUploadFileButton(document.getElementById('import-scene-input'), async file => {
  const uint8Array = await readFile(file);
  await pe.importScene(uint8Array);
});

const _getAvatarHeight = () => (pe.rig ? pe.rig.height : 1) * 0.9;
const birdsEyeHeight = 10;
const avatarCameraOffset = new THREE.Vector3(0, 0, -1);
const isometricCameraOffset = new THREE.Vector3(0, 0, -5);
const tools = Array.from(document.querySelectorAll('.tool'));
for (let i = 0; i < tools.length; i++) {
  const tool = document.getElementById('tool-' + (i + 1));
  tool.addEventListener('click', e => {
    for (let i = 0; i < tools.length; i++) {
      tools[i].classList.remove('selected');
    }
    tool.classList.add('selected');

    const oldSelectedTool = selectedTool;
    selectedTool = tool.getAttribute('tool');

    if (selectedTool !== oldSelectedTool) {
      hoverTarget = null;
      _setSelectTarget(null);

      switch (oldSelectedTool) {
        case 'thirdperson': {
          pe.camera.position.add(localVector.copy(avatarCameraOffset).applyQuaternion(pe.camera.quaternion));
          pe.camera.updateMatrixWorld();
          pe.setCamera(camera);
          break;
        }
        case 'isometric': {
          pe.camera.position.add(localVector.copy(isometricCameraOffset).applyQuaternion(pe.camera.quaternion));
          pe.camera.updateMatrixWorld();
          pe.setCamera(camera);
          break;
        }
        /* case 'birdseye': {
          pe.camera.position.add(localVector.copy(avatarCameraOffset).applyQuaternion(pe.camera.quaternion));
          pe.camera.updateMatrixWorld();
          pe.setCamera(camera);
          break;
        } */
      }

      let decapitate = true;
      switch (selectedTool) {
        case 'camera': {
          document.exitPointerLock();
          pe.orbitControls.enabled = true;
          pe.orbitControls.target.copy(pe.camera.position).add(new THREE.Vector3(0, 0, -3).applyQuaternion(pe.camera.quaternion));
          _resetKeys();
          velocity.set(0, 0, 0);
          break;
        }
        case 'firstperson': {
          pe.camera.position.y = _getAvatarHeight();
          pe.camera.updateMatrixWorld();
          pe.setCamera(camera);

          document.dispatchEvent(new MouseEvent('mouseup'));
          pe.orbitControls.enabled = false;
          pe.domElement.requestPointerLock();
          break;
        }
        case 'thirdperson': {
          pe.camera.position.y = _getAvatarHeight();
          pe.camera.position.sub(localVector.copy(avatarCameraOffset).applyQuaternion(pe.camera.quaternion));
          pe.camera.updateMatrixWorld();
          pe.setCamera(camera);

          document.dispatchEvent(new MouseEvent('mouseup'));
          pe.orbitControls.enabled = false;
          pe.domElement.requestPointerLock();
          decapitate = false;
          break;
        }
        case 'isometric': {
          pe.camera.rotation.x = -Math.PI / 4;
          pe.camera.quaternion.setFromEuler(pe.camera.rotation);
          pe.camera.position.y = _getAvatarHeight();
          pe.camera.position.sub(localVector.copy(isometricCameraOffset).applyQuaternion(pe.camera.quaternion));
          pe.camera.updateMatrixWorld();
          pe.setCamera(camera);

          document.dispatchEvent(new MouseEvent('mouseup'));
          pe.orbitControls.enabled = false;
          pe.domElement.requestPointerLock();
          decapitate = false;
          break;
        }
        case 'birdseye': {
          pe.camera.position.y = birdsEyeHeight;
          pe.camera.rotation.x = -Math.PI / 2;
          pe.camera.quaternion.setFromEuler(pe.camera.rotation);
          pe.camera.updateMatrixWorld();
          pe.setCamera(camera);

          document.dispatchEvent(new MouseEvent('mouseup'));
          pe.orbitControls.enabled = false;
          pe.domElement.requestPointerLock();
          decapitate = false;
          break;
        }
        case 'select': {
          pe.orbitControls.enabled = false;
          _resetKeys();
          velocity.set(0, 0, 0);
          break;
        }
      }
      if (pe.rig) {
        if (decapitate) {
          pe.rig.decapitate();
        } else {
          pe.rig.undecapitate();
        }
      }
    }
  });
}
document.addEventListener('pointerlockchange', e => {
  if (!document.pointerLockElement) {
    tools.find(tool => tool.matches('.tool[tool=camera]')).click();
  }
});

window.addEventListener('keydown', e => {
  switch (e.which) {
    case 49: // 1
    case 50:
    case 51:
    case 52:
    case 53:
    case 54:
    {
      tools[e.which - 49].click();
      break;
    }
    case 87: { // W
      if (!document.pointerLockElement) {
        // nothing
      } else {
        keys.up = true;
      }
      break;
    }
    case 65: { // A
      if (!document.pointerLockElement) {
        // nothing
      } else {
        keys.left = true;
      }
      break;
    }
    case 83: { // S
      if (!document.pointerLockElement) {
        // nothing
      } else {
        keys.down = true;
      }
      break;
    }
    case 68: { // D
      if (!document.pointerLockElement) {
        // nothing
      } else {
        keys.right = true;
      }
      break;
    }
    case 69: { // E
      if (document.pointerLockElement) {
        // nothing
      } else {
        if (selectTarget && selectTarget.control) {
          selectTarget.control.setMode('rotate');
        }
      }
      break;
    }
    case 82: { // R
      if (document.pointerLockElement) {
        pe.equip('back');
      } else {
        if (selectTarget && selectTarget.control) {
          selectTarget.control.setMode('scale');
        }
      }
      break;
    }
    case 70: { // F
      pe.grabdown('right');
      break;
    }
    case 16: { // shift
      if (document.pointerLockElement) {
        keys.shift = true;
      }
      break;
    }
    case 32: { // space
      if (document.pointerLockElement) {
        if (!jumpState) {
          jumpState = {
            air: true,
          };
          velocity.y += 5;
        }
      }
      break;
    }
    case 8: // backspace
    case 46: // del
    {
      /* if (selectedObjectMeshes.length > 0) {
          const oldSelectedObjectMeshes = selectedObjectMeshes;

          _setHoveredObjectMesh(null);
          _setSelectedObjectMesh(null, false);

          const action = createAction('removeObjects', {
            oldObjectMeshes: oldSelectedObjectMeshes,
            container,
            objectMeshes,
          });
          execute(action);
        } */
      break;
    }
  }
});
window.addEventListener('keyup', e => {
  switch (e.which) {
    case 87: { // W
      if (document.pointerLockElement) {
        keys.up = false;
      }
      break;
    }
    case 65: { // A
      if (document.pointerLockElement) {
        keys.left = false;
      }
      break;
    }
    case 83: { // S
      if (document.pointerLockElement) {
        keys.down = false;
      }
      break;
    }
    case 68: { // D
      if (document.pointerLockElement) {
        keys.right = false;
      }
      break;
    }
    case 70: { // F
      pe.grabup('right');
      break;
    }
    case 16: { // shift
      if (document.pointerLockElement) {
        keys.shift = false;
      }
      break;
    }
  }
});
window.addEventListener('mousedown', e => {
  if (document.pointerLockElement) {
    if (e.button === 0) {
      pe.grabtriggerdown('right');
      pe.grabuse('right');
    } else if (e.button === 2) {
      lastTeleport = true;
    }
  }
});
window.addEventListener('mouseup', e => {
  if (document.pointerLockElement) {
    pe.grabtriggerup('right');
  }
  lastTeleport = false;
});

shieldSlider.addEventListener('change', async e => {
  const newShieldLevel = parseInt(e.target.value, 10);
  const {packages} = pe;
  switch (newShieldLevel) {
    case 0: {
      shieldLevel = newShieldLevel;
      hoverTarget = null;
      _setSelectTarget(null);
      break;
    }
    case 1: {
      shieldLevel = newShieldLevel;
      hoverTarget = null;
      _setSelectTarget(null);
      break;
    }
    case 2: {
      shieldLevel = newShieldLevel;
      hoverTarget = null;
      _setSelectTarget(null);
      break;
    }
  }
});
scaleSlider.addEventListener('change', async e => {
  const newScale = parseFloat(e.target.value);
  pe.setScale(newScale);
});
document.getElementById('toggle-stage-button').addEventListener('click', e => {
  floorMesh.visible = !floorMesh.visible;
});

const _setSelectTarget = newSelectTarget => {
  if (selectTarget && selectTarget.control) {
    _unbindTransformControls(selectTarget);
  }
  if (newSelectTarget !== selectTarget) {
    selectTarget = newSelectTarget;
    if (selectTarget) {
      if (!dropdownButton.classList.contains('open')) {
        dropdownButton.click();
      }

      _bindTransformControls(selectTarget);
    }
    _renderObjects();
  }
};

const _packageadd = async e => {
  const {
    package: p,
    reason,
  } = e.data;

  ensureLoadMesh(p, scene);
  ensurePlaceholdMesh(p, scene);
  await ensureVolumeMesh(p, scene);
  _renderObjects();

  _bindObject(p);

  if (!reason) updateWorldSaveButton(true);
};
const _packageremove = e => {
  const {
    package: p,
    reason,
  } = e.data;

  if (p.loadMesh) {
    scene.remove(p.loadMesh);
  }

  if (p.placeholderBox) {
    scene.remove(p.placeholderBox);
  }

  if (selectTarget === p) {
    _setSelectTarget(null);
  } else {
    _renderObjects();
  }

  _unbindObject(p);

  if (!reason) updateWorldSaveButton(true);
};

function _matrixUpdate(e) {
  const p = this;
  const matrix = e.data;
  p.placeholderBox && p.placeholderBox.matrix.copy(matrix).decompose(p.placeholderBox.position, p.placeholderBox.quaternion, p.placeholderBox.scale);
  p.volumeMesh && p.volumeMesh.matrix.copy(matrix).decompose(p.volumeMesh.position, p.volumeMesh.quaternion, p.volumeMesh.scale);
  _updateObjectDetailsTransform(matrix);
}
const _bindObject = p => {
  p.addEventListener('matrixupdate', _matrixUpdate);
  p.addEventListener('packageadd', _packageadd);
  p.addEventListener('packageremove', _packageremove);
};
const _unbindObject = p => {
  p.removeEventListener('matrixupdate', _matrixUpdate);
  p.removeEventListener('packageadd', _packageadd);
  p.removeEventListener('packageremove', _packageremove);
};
pe.children.forEach(p => {
  _bindObject(p);
});
pe.addEventListener('packageadd', _packageadd);
pe.addEventListener('packageremove', _packageremove);

let transformControlsHovered = false;
const _bindTransformControls = o => {
  const control = new TransformControls(pe.camera, renderer.domElement);
  control.size = 3;
  control.addEventListener('mouseEnter', () => {
    transformControlsHovered = true;
  });
  control.addEventListener('mouseLeave', () => {
    transformControlsHovered = false;
  });
  control.addEventListener('objectChange', e => {
    o.updateMatrixWorld();
    o.package.setMatrix(o.matrix);
  });
  control.attach(o);
  pe.scene.add(control);
  o.control = control;
};
const _unbindTransformControls = o => {
  o.control.parent.remove(o.control);
  o.control.dispose();
  o.control = null;
  transformControlsHovered = false;
};

const raycaster = new THREE.Raycaster();
const _updateRaycasterFromMouseEvent = (raycaster, e) => {
  const mouse = new THREE.Vector2(((e.clientX) / window.innerWidth) * 2 - 1, -((e.clientY) / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(mouse, pe.camera);
  const candidateMeshes = pe.children
    .map(p => p.volumeMesh)
    .filter(o => !!o);
  hoverTarget = volumeRaycaster.raycastMeshes(candidateMeshes, raycaster.ray.origin, raycaster.ray.direction);
};
const _updateMouseMovement = e => {
  const {movementX, movementY} = e;
  if (selectedTool === 'thirdperson') {
    pe.camera.position.add(localVector.copy(avatarCameraOffset).applyQuaternion(pe.camera.quaternion));
  } else if (selectedTool === 'isometric') {
    pe.camera.position.add(localVector.copy(isometricCameraOffset).applyQuaternion(pe.camera.quaternion));
  } else if (selectedTool === 'birdseye') {
    pe.camera.rotation.x = -Math.PI / 2;
    pe.camera.quaternion.setFromEuler(pe.camera.rotation);
    // pe.camera.updateMatrixWorld();
    // pe.setCamera(camera);
  }

  pe.camera.rotation.y -= movementX * Math.PI * 2 * 0.001;
  if (selectedTool !== 'isometric' && selectedTool !== 'birdseye') {
    pe.camera.rotation.x -= movementY * Math.PI * 2 * 0.001;
    pe.camera.rotation.x = Math.min(Math.max(pe.camera.rotation.x, -Math.PI / 2), Math.PI / 2);
    pe.camera.quaternion.setFromEuler(pe.camera.rotation);
  }

  if (selectedTool === 'thirdperson') {
    pe.camera.position.sub(localVector.copy(avatarCameraOffset).applyQuaternion(pe.camera.quaternion));
  } else if (selectedTool === 'isometric') {
    pe.camera.position.sub(localVector.copy(isometricCameraOffset).applyQuaternion(pe.camera.quaternion));
  }
  pe.camera.updateMatrixWorld();
  pe.setCamera(camera);
};
renderer.domElement.addEventListener('mousemove', e => {
  if (selectedTool === 'firstperson' || selectedTool === 'thirdperson' || selectedTool === 'isometric' || selectedTool === 'birdseye') {
    _updateMouseMovement(e);
  } else if (selectedTool === 'select' && !getRealSession()) {
    _updateRaycasterFromMouseEvent(raycaster, e);
  }
});

renderer.domElement.addEventListener('mousedown', e => {
  if (!transformControlsHovered) {
    _setSelectTarget(hoverTarget);
  }
  /* if (document.pointerLockElement) {
    highlightMesh.onmousedown && highlightMesh.onmousedown();
  } */
});
/* renderer.domElement.addEventListener('mouseup', e => {
  if (document.pointerLockElement) {
    highlightMesh.onmouseup && highlightMesh.onmouseup();
  }
}); */

micButton.addEventListener('click', async e => {
  micButton.classList.toggle('enabled');
  if (micButton.classList.contains('enabled')) {
    const mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });
    pe.setMicrophoneMediaStream(mediaStream);
  } else {
    pe.setMicrophoneMediaStream(null);
  }
});
for (let i = 0; i < tabs.length; i++) {
  const tab = tabs[i];
  const tabContent = tabContents[i];
  tab.addEventListener('click', e => {
    for (let i = 0; i < tabs.length; i++) {
      const tab = tabs[i];
      const tabContent = tabContents[i];
      tab.classList.remove('open');
      tabContent.classList.remove('open');
    }

    tab.classList.add('open');
    tabContent.classList.add('open');

    _setSelectTarget(null);
  });
}

const tokens = document.getElementById('tokens');
/* async function getTokenByIndex(index) {
  const metadataHash = await contract.methods.getMetadata(index, 'hash').call();
  const metadata = await fetch(`${apiHost}/${metadataHash}`).then(res => res.json());
  const {dataHash, screenshotHash, modelHash} = metadata;
  return {
    index: index,
    name: metadata.objectName,
    img: `${apiHost}/${screenshotHash}`,
    metadataHash: metadataHash,
    dataHash: dataHash,
    modelHash: modelHash,
  };
} */
pe.domElement.addEventListener('dragover', e => {
  e.preventDefault();
});
pe.domElement.addEventListener('drop', async e => {
  e.preventDefault();

  const jsonItem = Array.from(e.dataTransfer.items).find(i => i.type === 'application/json+package');
  if (jsonItem) {
    const s = await new Promise((resolve, reject) => {
      jsonItem.getAsString(resolve);
    });
    const j = JSON.parse(s);
    const {type, dataHash} = j;
    if (dataHash) {
      _updateRaycasterFromMouseEvent(raycaster, e);
      localMatrix.compose(
        raycaster.ray.origin.clone()
          .add(raycaster.ray.direction.clone().multiplyScalar(2)),
        new THREE.Quaternion(),
        new THREE.Vector3(1, 1, 1),
      );

      const p = await XRPackage.download(dataHash);
      await addPackage(p, pe, localMatrix);
    }
  }
});
/* const _getTokenHtml = cardData => {
  const {index, name, img, metadataHash, dataHash, modelHash} = cardData;
  return `\
    <div class="token card">
      <a href="/run.html?i=${index}">
        <img src="${img}" width=256 height=256>
      </a>
      <div class=text>
        <div class="name cardTitle">${name}</div>
        <input type=text value="xrpk install ${index}" readonly class="cardCode">
        <nav class="cardAction add-action"><span>Add</span><i class="fa fa-chevron-right"></i></nav>
        <a href="/run.html?i=${index}" target="_blank" class="cardAction"><span>Test</span><i class="fa fa-chevron-right"></i></a>
        <a href="https://cryptopolys.com/create.html?o=${encodeURIComponent(metadataHash)}" class="cardAction"><span>Edit</span><i class="fa fa-chevron-right"></i></a>
        <a href="https://ipfs.exokit.org/ipfs/${dataHash}.wbn" class="cardAction"><span>Download package</span><i class="fa fa-chevron-right"></i></a>
        <a href="https://ipfs.exokit.org/ipfs/${modelHash}.glb" class="cardAction"><span>Download model</span><i class="fa fa-chevron-right"></i></a>
        <a href="https://${network}.opensea.io/assets/${address}/${index}" class="cardAction"><span>Opensea</span><i class="fa fa-chevron-right"></i></a>
      </div>
    </div>
  `;
};
(async () => {
  const totalObjects = await contract.methods.getNonce().call();
  const ts = [];
  for (let i = 1; i <= totalObjects; i++) {
    const t = await getTokenByIndex(i);
    ts.push(t);
    const h = _getTokenHtml(t);
    tokens.innerHTML += h;

    Array.from(tokens.querySelectorAll('.token')).forEach((token, i) => {
      const addAction = token.querySelector('.add-action');
      addAction.addEventListener('click', async e => {
        const t = ts[i];
        const {dataHash} = t;
        const p = await XRPackage.download(dataHash);
        p.hash = dataHash;
        pe.add(p);
      });
      const input = token.querySelector('input');
      input.addEventListener('click', e => {
        input.select();
      });
    });
  }
})(); */
/* const scenes = document.getElementById('scenes');
(async () => {
  const res = await fetch(scenesEndpoint);
  const children = await res.json();
  const ss = await Promise.all(children.map(child =>
    fetch(scenesEndpoint + '/' + child)
      .then(res => res.json())
  ));
  scenes.innerHTML = ss.map(s => `
    <div class=scene>${s.name}</div>
  `).join('\n');
  Array.from(scenes.querySelectorAll('.scene')).forEach((s, i) => {
    s.addEventListener('click', async e => {
      const s = ss[i];
      const {hash} = s;
      pe.downloadScene(hash);
    });
  });
})(); */

const objectsEl = document.getElementById('objects');
const _getObjectDetailEls = () => {
  const objectDetail = objectsEl.querySelector('.object-detail');
  if (objectDetail) {
    const positionX = objectDetail.querySelector('.position-x');
    const positionY = objectDetail.querySelector('.position-y');
    const positionZ = objectDetail.querySelector('.position-z');
    const quaternionX = objectDetail.querySelector('.quaternion-x');
    const quaternionY = objectDetail.querySelector('.quaternion-y');
    const quaternionZ = objectDetail.querySelector('.quaternion-z');
    const quaternionW = objectDetail.querySelector('.quaternion-w');
    const scaleX = objectDetail.querySelector('.scale-x');
    const scaleY = objectDetail.querySelector('.scale-y');
    const scaleZ = objectDetail.querySelector('.scale-z');
    return {
      positionX,
      positionY,
      positionZ,
      quaternionX,
      quaternionY,
      quaternionZ,
      quaternionW,
      scaleX,
      scaleY,
      scaleZ,
    };
  } else {
    return null;
  }
};
const _updateObjectDetailsTransform = matrix => {
  matrix.decompose(localVector, localQuaternion, localVector2);
  const details = _getObjectDetailEls();
  if (details) {
    const {
      positionX,
      positionY,
      positionZ,
      quaternionX,
      quaternionY,
      quaternionZ,
      quaternionW,
      scaleX,
      scaleY,
      scaleZ,
    } = details;

    positionX.value = localVector.x;
    positionY.value = localVector.y;
    positionZ.value = localVector.z;
    quaternionX.value = localQuaternion.x;
    quaternionY.value = localQuaternion.y;
    quaternionZ.value = localQuaternion.z;
    quaternionW.value = localQuaternion.w;
    scaleX.value = localVector2.x;
    scaleY.value = localVector2.y;
    scaleZ.value = localVector2.z;
  }
};
const _bindObjectDetails = p => {
  const {
    positionX,
    positionY,
    positionZ,
    quaternionX,
    quaternionY,
    quaternionZ,
    quaternionW,
    scaleX,
    scaleY,
    scaleZ,
  } = _getObjectDetailEls();

  const _setPosition = (e, key) => {
    p.matrix.decompose(localVector, localQuaternion, localVector2);
    localVector[key] = parseFloat(e.target.value);
    p.setMatrix(localMatrix.compose(localVector, localQuaternion, localVector2));
  };
  const _setQuaternion = (e, key) => {
    p.matrix.decompose(localVector, localQuaternion, localVector2);
    localQuaternion[key] = e.target.value;
    localQuaternion.normalize();
    ['x', 'y', 'z', 'w'].forEach(k => {
      objectsEl.querySelector('.quaternion-' + k).value = parseFloat(localQuaternion[k]);
    });
    p.setMatrix(localMatrix.compose(localVector, localQuaternion, localVector2));
  };
  const _setScale = (e, key) => {
    p.matrix.decompose(localVector, localQuaternion, localVector2);
    localVector2[key] = parseFloat(e.target.value);
    p.setMatrix(localMatrix.compose(localVector, localQuaternion, localVector2));
  };
  positionX.addEventListener('change', e => {
    _setPosition(e, 'x');
  });
  positionY.addEventListener('change', e => {
    _setPosition(e, 'y');
  });
  positionZ.addEventListener('change', e => {
    _setPosition(e, 'z');
  });
  quaternionX.addEventListener('change', e => {
    _setQuaternion(e, 'x');
  });
  quaternionY.addEventListener('change', e => {
    _setQuaternion(e, 'y');
  });
  quaternionZ.addEventListener('change', e => {
    _setQuaternion(e, 'z');
  });
  quaternionW.addEventListener('change', e => {
    _setQuaternion(e, 'w');
  });
  scaleX.addEventListener('change', e => {
    _setScale(e, 'x');
  });
  scaleY.addEventListener('change', e => {
    _setScale(e, 'y');
  });
  scaleZ.addEventListener('change', e => {
    _setScale(e, 'z');
  });
};
const _renderObjects = () => {
  if (selectTarget) {
    const {package: p} = selectTarget;
    const schemas = Object.keys(p.schema);
    objectsEl.innerHTML = `
      <div class=object-detail>
        <h1><nav class=back-button><i class="fa fa-arrow-left"></i></nav>${p.name}</h1>
        <img class=screenshot draggable=true style="display: none;">
        ${p.hash ? `\
          <nav class="button inspect-button">Inspect</nav>
          <nav class="button wear-button">Wear</nav>
        ` : `\
          <nav class="button upload-button">Upload</nav>
        `}
        <nav class="button remove-button">Remove</nav>
        <b>Position</b>
        <div class=row>
          <label>
            <span>X</span>
            <input type=number class=position-x value=0 step=0.1>
          </label>
          <label>
            <span>Y</span>
            <input type=number class=position-y value=0 step=0.1>
          </label>
          <label>
            <span>Z</span>
            <input type=number class=position-z value=0 step=0.1>
          </label>
        </div>
        <b>Quaternion</b>
        <div class=row>
          <label>
            <span>X</span>
            <input type=number class=quaternion-x value=0 step=0.1>
          </label>
          <label>
            <span>Y</span>
            <input type=number class=quaternion-y value=0 step=0.1>
          </label>
          <label>
            <span>Z</span>
            <input type=number class=quaternion-z value=0 step=0.1>
          </label>
          <label>
            <span>W</span>
            <input type=number class=quaternion-w value=1 step=0.1>
          </label>
        </div>
        <b>Scale</b>
        <div class=row>
          <label>
            <span>X</span>
            <input type=number class=scale-x value=1 step=0.1>
          </label>
          <label>
            <span>Y</span>
            <input type=number class=scale-y value=1 step=0.1>
          </label>
          <label>
            <span>Z</span>
            <input type=number class=scale-z value=1 step=0.1>
          </label>
        </div>
        ${schemas.length > 0 ? `
          <b>Schema</b>
          <div class=row>
            ${schemas.map(name => `
              <label class=schema>
                <span class=name>${name}</span>
                <input class="schema-input" name="${escape(name)}" type=text value="${escape(p.schema[name])}">
              </label>
            `).join('\n')}
          </div>
        ` : ''}
      </div>
    `;
    const backButton = objectsEl.querySelector('.back-button');
    backButton.addEventListener('click', e => {
      _setSelectTarget(null);
    });
    (async () => {
      const img = objectsEl.querySelector('.screenshot');
      const u = await p.getScreenshotImageUrl();
      img.src = u;
      img.onload = () => {
        URL.revokeObjectURL(u);
        img.style.display = null;
      };
      img.onerror = err => {
        console.warn(err);
        URL.revokeObjectURL(u);
      };
      img.addEventListener('dragstart', e => {
        startPackageDrag(e, {
          name: p.name,
          id: p.id,
        });
      });
    })();
    if (p.hash) {
      const inspectButton = objectsEl.querySelector('.inspect-button');
      inspectButton.addEventListener('click', async e => {
        const b = new Blob([p.data], {
          type: 'application/webbundle',
        });
        const u = URL.createObjectURL(b);
        window.open(`inspect.html?u=${u}`, '_blank');
      });
      const wearButton = objectsEl.querySelector('.wear-button');
      wearButton.addEventListener('click', async e => {
        const dataHash = await p.getHash();
        loginManager.setAvatar(dataHash);
      });
    } else {
      const uploadButton = objectsEl.querySelector('.upload-button');
      uploadButton.addEventListener('click', async e => {
        const {hash} = await fetch(`${apiHost}/`, {
          method: 'PUT',
          body: p.data,
        })
          .then(res => res.json());
        p.hash = hash;
        _renderObjects();
      });
    }
    const removeButton = objectsEl.querySelector('.remove-button');
    removeButton.addEventListener('click', e => {
      pe.remove(p);
    });

    _updateObjectDetailsTransform(p.matrix);
    _bindObjectDetails(p);

    Array.from(objectsEl.querySelectorAll('.schema-input')).forEach(schemaInput => {
      const name = schemaInput.getAttribute('name');
      const value = p.schema[name] || '';
      schemaInput.value = value;
      schemaInput.addEventListener('change', e => {
        const value = e.target.value;
        p.setSchema(name, value);
      });
    });
  } else {
    if (pe.children.length > 0) {
      const _renderChildren = (objectsEl, children, depth) => {
        objectsEl.innerHTML = children.map((p, i) => `
          <div class="object depth-${depth}" draggable=true packageid="${p.id}" index="${i}">
            <span class=name>${p.name}</span>
            <nav class=close-button><i class="fa fa-times"></i></nav>
          </div>
          <div class=children></div>
        `).join('\n');
        const packageEls = Array.from(objectsEl.querySelectorAll('.object'));
        const childrenEls = Array.from(objectsEl.querySelectorAll('.children'));
        packageEls.forEach((packageEl, i) => {
          const index = parseInt(packageEl.getAttribute('index'), 10);
          const p = children[i];
          const childrenEl = childrenEls[i];

          packageEl.addEventListener('dragstart', e => {
            e.dataTransfer.setData('application/json+object', JSON.stringify({
              index,
            }));
          });
          packageEl.addEventListener('dragover', e => {
            e.preventDefault();
          });
          packageEl.addEventListener('dragenter', e => {
            packageEl.classList.add('hover');
          });
          packageEl.addEventListener('dragleave', e => {
            packageEl.classList.remove('hover');
          });
          packageEl.addEventListener('drop', async e => {
            e.preventDefault();

            const jsonItem = Array.from(e.dataTransfer.items).find(i => i.type === 'application/json+object');
            if (jsonItem) {
              const s = await new Promise((resolve, reject) => {
                jsonItem.getAsString(resolve);
              });
              const j = JSON.parse(s);
              const {index} = j;
              const cp = pe.children[index];

              localMatrix.copy(cp.matrixWorld)
                .premultiply(localMatrix2.getInverse(p.matrixWorld));
              cp.setMatrix(localMatrix);
              p.add(cp);
            }
          });
          packageEl.addEventListener('click', e => {
            e.preventDefault();
            e.stopPropagation();

            document.querySelector('.tool[tool="select"]').click();
            _setSelectTarget(p.volumeMesh);
          });
          const closeButton = packageEl.querySelector('.close-button');
          closeButton.addEventListener('click', e => {
            e.preventDefault();
            e.stopPropagation();

            p.parent.remove(p);
          });

          _renderChildren(childrenEl, p.children, depth + 1);
        });
      };
      _renderChildren(objectsEl, pe.children, 0);

      // wristMenu.objectsSide.setObjects(pe.children);
    } else {
      objectsEl.innerHTML = '<h1 class=placeholder>No objects in scene</h1>';
    }
  }
};
_renderObjects();
window.addEventListener('popstate', e => {
  handleUrl(window.location.href, pe);
});
handleUrl(window.location.href, pe);

attachEventListeners();
dragHandlers(pe, loginManager);
worldHandlers(pe);
packagesHandlers();
