// import address from 'https://contracts.webaverse.com/address.js';
// import abi from 'https://contracts.webaverse.com/abi.js';
import * as THREE from 'https://static.xrpackage.org/xrpackage/three.module.js';

const apiHost = 'https://ipfs.exokit.org/ipfs';
const presenceEndpoint = 'wss://presence.exokit.org';
const worldsEndpoint = 'https://worlds.exokit.org';
const packagesEndpoint = 'https://packages.exokit.org';
// const scenesEndpoint = 'https://scenes.exokit.org';
const network = 'rinkeby';
const infuraApiKey = '4fb939301ec543a0969f3019d74f80c2';
const rpcUrl = `https://${network}.infura.io/v3/${infuraApiKey}`;
// const web3 = new Web3(new Web3.providers.HttpProvider(rpcUrl));
// window.web3 = web3;
// const contract = new web3.eth.Contract(abi, address);

const loadVsh = `
  #define M_PI 3.1415926535897932384626433832795
  uniform float uTime;

  mat4 rotationMatrix(vec3 axis, float angle)
  {
      axis = normalize(axis);
      float s = sin(angle);
      float c = cos(angle);
      float oc = 1.0 - c;

      return mat4(oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,  0.0,
                  oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,  0.0,
                  oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c,           0.0,
                  0.0,                                0.0,                                0.0,                                1.0);
  }

  void main() {
    // float f = 1.0 + pow(sin(uTime * M_PI), 0.5) * 0.2;
    gl_Position = projectionMatrix * modelViewMatrix * rotationMatrix(vec3(0, 0, 1), -uTime * M_PI * 2.0) * vec4(position, 1.);
  }
`;

const loadFsh = `
  uniform float uHighlight;
  uniform float uTime;
  void main() {
    float f = 1.0 + max(1.0 - uTime, 0.0);
    gl_FragColor = vec4(vec3(${new THREE.Color(0xf4511e).toArray().join(', ')}) * f, 1.0);
  }
`;

const loadMeshMaterial = new THREE.ShaderMaterial({
  uniforms: {
    /* uHighlight: {
      type: 'f',
      value: 0,
    }, */
    uTime: {
      type: 'f',
      value: 0,
    },
  },
  vertexShader: loadVsh,
  fragmentShader: loadFsh,
  side: THREE.DoubleSide,
});

export {
  apiHost,
  presenceEndpoint,
  packagesEndpoint,
  worldsEndpoint,
  network,
  infuraApiKey,
  rpcUrl,
  // web3,
  // contract,

  loadMeshMaterial,
};
