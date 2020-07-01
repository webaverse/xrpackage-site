import * as THREE from 'https://static.xrpackage.org/xrpackage/three.module.js';
import {BufferGeometryUtils} from 'https://static.xrpackage.org/BufferGeometryUtils.js';

const targetGeometry = BufferGeometryUtils.mergeBufferGeometries([
  new THREE.BoxBufferGeometry(0.03, 0.2, 0.03)
    .applyMatrix4(new THREE.Matrix4().makeTranslation(0, -0.1, 0)),
  new THREE.BoxBufferGeometry(0.03, 0.2, 0.03)
    .applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 0, 1))))
    .applyMatrix4(new THREE.Matrix4().makeTranslation(0, 0, 0.1)),
  new THREE.BoxBufferGeometry(0.03, 0.2, 0.03)
    .applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), new THREE.Vector3(1, 0, 0))))
    .applyMatrix4(new THREE.Matrix4().makeTranslation(0.1, 0, 0)),
]);

export default BufferGeometryUtils.mergeBufferGeometries([
  targetGeometry.clone()
    .applyMatrix4(new THREE.Matrix4().makeTranslation(-0.5, 0.5, -0.5)),
  targetGeometry.clone()
    .applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, -1, 0))))
    .applyMatrix4(new THREE.Matrix4().makeTranslation(-0.5, -0.5, -0.5)),
  targetGeometry.clone()
    .applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1))))
    .applyMatrix4(new THREE.Matrix4().makeTranslation(-0.5, 0.5, 0.5)),
  targetGeometry.clone()
    .applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0))))
    .applyMatrix4(new THREE.Matrix4().makeTranslation(0.5, 0.5, -0.5)),
  targetGeometry.clone()
    .applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0))))
    .applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1))))
    .applyMatrix4(new THREE.Matrix4().makeTranslation(0.5, 0.5, 0.5)),
  targetGeometry.clone()
    .applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1))))
    .applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, -1, 0))))
    .applyMatrix4(new THREE.Matrix4().makeTranslation(-0.5, -0.5, 0.5)),
  targetGeometry.clone()
    .applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0))))
    .applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, -1, 0))))
    .applyMatrix4(new THREE.Matrix4().makeTranslation(0.5, -0.5, -0.5)),
  targetGeometry.clone()
    .applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(-1, 1, 0).normalize(), new THREE.Vector3(1, -1, 0).normalize())))
    .applyMatrix4(new THREE.Matrix4().makeTranslation(0.5, -0.5, 0.5)),
]);// .applyMatrix4(new THREE.Matrix4().makeTranslation(0, 0.5, 0));
