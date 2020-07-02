import * as THREE from 'https://static.xrpackage.org/xrpackage/three.module.js';
import {getWireframeMesh, decorateRaycastMesh} from '../volume.js';
import {loadMeshMaterial} from './constants.js';
import targetMeshGeometry from './targetMeshGeometry.js';

const targetVsh = `
#define M_PI 3.1415926535897932384626433832795
uniform float uTime;
// varying vec2 vUv;
void main() {
  float f = 1.0 + pow(sin(uTime * M_PI), 0.5) * 0.2;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position * f, 1.);
}
`;

const targetFsh = `
uniform float uHighlight;
uniform float uTime;
void main() {
  float f = max(1.0 - pow(uTime, 0.5), 0.1);
  gl_FragColor = vec4(vec3(f * uHighlight), 1.0);
}
`;

const _makeTargetMesh = p => {
  const geometry = targetMeshGeometry;
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uHighlight: {
        type: 'f',
        value: 0,
      },
      uTime: {
        type: 'f',
        value: 0,
      },
    },
    vertexShader: targetVsh,
    fragmentShader: targetFsh,
  // transparent: true,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  return mesh;
};

const _makeVolumeMesh = async p => {
  const volumeMesh = await p.getVolumeMesh();
  if (volumeMesh) {
    volumeMesh.frustumCulled = false;
    return volumeMesh;
  } else {
    return new THREE.Object3D();
  }
};

const _makeLoadMesh = (() => {
  const geometry = new THREE.RingBufferGeometry(0.05, 0.08, 128, 0, Math.PI / 2, Math.PI * 2 * 0.9);
  // .applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI)));
  return () => {
    const mesh = new THREE.Mesh(geometry, loadMeshMaterial);
    // mesh.frustumCulled = false;
    return mesh;
  };
})();

const ensureLoadMesh = (p, scene) => {
  if (!p.loadMesh) {
    p.loadMesh = _makeLoadMesh();
    p.loadMesh.matrix.copy(p.matrix).decompose(p.loadMesh.position, p.loadMesh.quaternion, p.loadMesh.scale);
    scene.add(p.loadMesh);

    p.waitForRun()
      .then(() => {
        p.loadMesh.visible = false;
      });
  }
};

const ensurePlaceholdMesh = (p, scene) => {
  if (!p.placeholderBox) {
    p.placeholderBox = _makeTargetMesh();
    p.placeholderBox.package = p;
    p.placeholderBox.matrix.copy(p.matrix).decompose(p.placeholderBox.position, p.placeholderBox.quaternion, p.placeholderBox.scale);
    p.placeholderBox.visible = false;
    scene.add(p.placeholderBox);
  }
};

const ensureVolumeMesh = async (p, scene) => {
  if (!p.volumeMesh) {
    p.volumeMesh = await _makeVolumeMesh(p);
    p.volumeMesh = getWireframeMesh(p.volumeMesh);
    decorateRaycastMesh(p.volumeMesh, p.id);
    p.volumeMesh.package = p;
    p.volumeMesh.matrix.copy(p.matrix).decompose(p.volumeMesh.position, p.volumeMesh.quaternion, p.volumeMesh.scale);
    p.volumeMesh.visible = false;
    scene.add(p.volumeMesh);
  }
};

export {ensureLoadMesh, ensurePlaceholdMesh, ensureVolumeMesh};
