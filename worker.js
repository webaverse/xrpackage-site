importScripts('./bin/objectize2.js');

const PARCEL_SIZE = 30;
const PARCEL_SIZE_P2 = PARCEL_SIZE+2;
const SUBPARCEL_SIZE = 10;
const SUBPARCEL_SIZE_P2 = SUBPARCEL_SIZE+2;
const NUM_PARCELS = PARCEL_SIZE/SUBPARCEL_SIZE;
const maxDistScale = 1;
const maxDist = Math.sqrt(maxDistScale*maxDistScale + maxDistScale*maxDistScale + maxDistScale*maxDistScale);

class Allocator {
  constructor() {
    this.offsets = [];
  }
  alloc(constructor, size) {
    const offset = self.Module._malloc(size * constructor.BYTES_PER_ELEMENT);
    const b = new constructor(self.Module.HEAP8.buffer, self.Module.HEAP8.byteOffset + offset, size);
    b.offset = offset;
    this.offsets.push(offset);
    return b;
  }
  freeAll() {
    for (let i = 0; i < this.offsets.length; i++) {
      self.Module._doFree(this.offsets[i]);
    }
    this.offsets.length = 0;
  }
}

const _getSliceIndex = (x, y, z) => z + y*NUM_PARCELS + x*NUM_PARCELS*NUM_PARCELS;
const _getPotentialIndex = (x, y, z) => x + y*SUBPARCEL_SIZE_P2*SUBPARCEL_SIZE_P2 + z*SUBPARCEL_SIZE_P2;
const _makePotentials = (seedData, shiftsData) => {
  const allocator = new Allocator();

  const potentials = allocator.alloc(Float32Array, SUBPARCEL_SIZE_P2 * SUBPARCEL_SIZE_P2 * SUBPARCEL_SIZE_P2);
  const dims = allocator.alloc(Int32Array, 3);
  dims.set(Int32Array.from([SUBPARCEL_SIZE_P2, SUBPARCEL_SIZE_P2, SUBPARCEL_SIZE_P2]));
  const shifts = allocator.alloc(Float32Array, 3);
  shifts.set(Float32Array.from(shiftsData));

  Module._doNoise2(
    seedData,
    0.02,
    4,
    dims.offset,
    shifts.offset,
    0,
    -0.5,
    potentials.offset
  );

  return {potentials, dims, shifts/*, allocator*/};
};
const _getChunkSpec = (potentials, dims, shifts, meshId, indexOffset) => {
  const allocator = new Allocator();

  const positions = allocator.alloc(Float32Array, 1024 * 1024 * Float32Array.BYTES_PER_ELEMENT);
  const barycentrics = allocator.alloc(Float32Array, 1024 * 1024 * Float32Array.BYTES_PER_ELEMENT);
  // const indices = allocator.alloc(Uint32Array, 1024 * 1024 * Uint32Array.BYTES_PER_ELEMENT);

  const numPositions = allocator.alloc(Uint32Array, 1);
  numPositions[0] = positions.length;
  const numBarycentrics = allocator.alloc(Uint32Array, 1);
  numBarycentrics[0] = barycentrics.length;
  // const numIndices = allocator.alloc(Uint32Array, 1);
  // numIndices[0] = indices.length;

  const scale = allocator.alloc(Float32Array, 3);
  scale.set(Float32Array.from([1, 1, 1]));

  self.Module._doMarchingCubes2(
    dims.offset,
    potentials.offset,
    shifts.offset,
    scale.offset,
    positions.offset,
    barycentrics.offset,
    // indices.offset,
    numPositions.offset,
    // numIndices.offset,
    numBarycentrics.offset
  );

  const arrayBuffer2 = new ArrayBuffer(
    potentials.length * Float32Array.BYTES_PER_ELEMENT +
    // Uint32Array.BYTES_PER_ELEMENT +
    numPositions[0] * Float32Array.BYTES_PER_ELEMENT +
    // Uint32Array.BYTES_PER_ELEMENT +
    numBarycentrics[0] * Float32Array.BYTES_PER_ELEMENT +
    // Uint32Array.BYTES_PER_ELEMENT +
    numPositions[0]/3 * Float32Array.BYTES_PER_ELEMENT +
    // Uint32Array.BYTES_PER_ELEMENT +
    numPositions[0]/3 * Float32Array.BYTES_PER_ELEMENT
  );

  let index = 0;

  const outPotentials = new Float32Array(arrayBuffer2, index, potentials.length);
  outPotentials.set(potentials);
  index += Float32Array.BYTES_PER_ELEMENT * potentials.length;

  const outP = new Float32Array(arrayBuffer2, index, numPositions[0]);
  outP.set(new Float32Array(positions.buffer, positions.byteOffset, numPositions[0]));
  index += Float32Array.BYTES_PER_ELEMENT * numPositions[0];

  const outB = new Float32Array(arrayBuffer2, index, numBarycentrics[0]);
  outB.set(new Float32Array(barycentrics.buffer, barycentrics.byteOffset, numBarycentrics[0]));
  index += Float32Array.BYTES_PER_ELEMENT * numBarycentrics[0];

  /* const outI = new Uint32Array(arrayBuffer2, index, numIndices[0]);
  outI.set(new Uint32Array(indices.buffer, indices.byteOffset, numIndices[0]));
  index += Uint32Array.BYTES_PER_ELEMENT * numIndices[0]; */

  allocator.freeAll();

  /* const colors = new Float32Array(outP.length);
  const c = new THREE.Color(0xaed581).toArray(new Float32Array(3));
  for (let i = 0; i < colors.length; i += 3) {
    colors.set(c, i);
  } */

  const ids = new Float32Array(arrayBuffer2, index, numPositions[0]/3);
  index += numPositions[0]/3 * Float32Array.BYTES_PER_ELEMENT;
  const indices = new Float32Array(arrayBuffer2, index, numPositions[0]/3);
  index += numPositions[0]/3 * Float32Array.BYTES_PER_ELEMENT;
  for (let i = 0; i < numPositions[0]/3/3; i++) {
    ids[i*3] = meshId;
    ids[i*3+1] = meshId;
    ids[i*3+2] = meshId;
    const i2 = i + indexOffset;
    indices[i*3] = i2;
    indices[i*3+1] = i2;
    indices[i*3+2] = i2;
  }

  return {
    // result: {
    potentials: outPotentials,
    positions: outP,
    barycentrics: outB,
    ids,
    indices,
    arrayBuffer: arrayBuffer2,
    // colors,
    // indices: outI,
    /* },
    cleanup: () => {
      allocator.freeAll();

      this.running = false;
      if (this.queue.length > 0) {
        const fn = this.queue.shift();
        fn();
      }
    }, */
  };
};

const queue = [];
let loaded = false;
const _handleMessage = data => {
  const {method} = data;
  switch (method) {
    case 'march': {
      const {seed: seedData, meshId: meshIdData, slabSliceTris} = data;

      const results = [];
      const transfers = [];

      const meshId = meshIdData;
      for (let ix = 0; ix < NUM_PARCELS; ix++) {
        for (let iy = 0; iy < NUM_PARCELS; iy++) {
          for (let iz = 0; iz < NUM_PARCELS; iz++) {
            const shiftsData = [ix*SUBPARCEL_SIZE-1, iy*SUBPARCEL_SIZE-1, iz*SUBPARCEL_SIZE-1];
            const {potentials, dims, shifts/*, allocator*/} = _makePotentials(seedData, shiftsData);

            if (ix === 0) {
              for (let dy = 0; dy < SUBPARCEL_SIZE_P2; dy++) {
                for (let dz = 0; dz < SUBPARCEL_SIZE_P2; dz++) {
                  potentials[_getPotentialIndex(0, dy, dz)] = 0;
                }
              }
            }
            if (iy === 0) {
              for (let dx = 0; dx < SUBPARCEL_SIZE_P2; dx++) {
                for (let dz = 0; dz < SUBPARCEL_SIZE_P2; dz++) {
                  potentials[_getPotentialIndex(dx, 0, dz)] = 0;
                }
              }
            }
            if (iz === 0) {
              for (let dx = 0; dx < SUBPARCEL_SIZE_P2; dx++) {
                for (let dy = 0; dy < SUBPARCEL_SIZE_P2; dy++) {
                  potentials[_getPotentialIndex(dx, dy, 0)] = 0;
                }
              }
            }
            if (ix === NUM_PARCELS-1) {
              for (let dy = 0; dy < SUBPARCEL_SIZE_P2; dy++) {
                for (let dz = 0; dz < SUBPARCEL_SIZE_P2; dz++) {
                  potentials[_getPotentialIndex(SUBPARCEL_SIZE_P2-1, dy, dz)] = 0;
                }
              }
            }
            if (iy === NUM_PARCELS-1) {
              for (let dx = 0; dx < SUBPARCEL_SIZE_P2; dx++) {
                for (let dz = 0; dz < SUBPARCEL_SIZE_P2; dz++) {
                  potentials[_getPotentialIndex(dx, SUBPARCEL_SIZE_P2-1, dz)] = 0;
                }
              }
            }
            if (iz === NUM_PARCELS-1) {
              for (let dx = 0; dx < SUBPARCEL_SIZE_P2; dx++) {
                for (let dy = 0; dy < SUBPARCEL_SIZE_P2; dy++) {
                  potentials[_getPotentialIndex(dx, dy, SUBPARCEL_SIZE_P2-1)] = 0;
                }
              }
            }

            const {positions, barycentrics, ids, indices, arrayBuffer: arrayBuffer2} = _getChunkSpec(potentials, dims, shifts, meshId, results.length*slabSliceTris);
            results.push({
              potentialsAddress: potentials.offset,
              potentialsLength: potentials.length,
              dimsAddress: dims.offset,
              dimsLength: dims.length,
              shiftsAddress: shifts.offset,
              shiftsLength: shifts.length,
              positions,
              barycentrics,
              ids,
              indices,
              // arrayBuffer2,
            });
            transfers.push(arrayBuffer2);
          }
        }
      }

      self.postMessage({
        result: results,
      }, transfers);
      // allocator.freeAll();
      break;
    }
    case 'mine': {
      const {specsBuffer, /*potentialsAddress, potentialsLength, dimsAddress, dimsLength,*/ delta, meshId, position, slabSliceTris} = data;

      const requiredSlices = [];
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          for (let dx = -1; dx <= 1; dx++) {
            const ax = position[0] + dx;
            const ay = position[1] + dy;
            const az = position[2] + dz;

            if (ax >= 0 && ax < PARCEL_SIZE && ay >=0 && ay < PARCEL_SIZE && az >=0 && az < PARCEL_SIZE) {
              const sx = Math.floor(ax/SUBPARCEL_SIZE);
              const sy = Math.floor(ay/SUBPARCEL_SIZE);
              const sz = Math.floor(az/SUBPARCEL_SIZE);
              const sliceIndex = _getSliceIndex(sx, sy, sz);

              const potentialsAddress = specsBuffer[sliceIndex*6];
              const potentialsLength = specsBuffer[sliceIndex*6+1];
              const dimsAddress = specsBuffer[sliceIndex*6+2];
              const dimsLength = specsBuffer[sliceIndex*6+3];
              const shiftsAddress = specsBuffer[sliceIndex*6+4];
              const shiftsLength = specsBuffer[sliceIndex*6+5];

              const potentials = new Float32Array(self.Module.HEAP8.buffer, self.Module.HEAP8.byteOffset + potentialsAddress, potentialsLength);
              potentials.offset = potentialsAddress;
              const dims = new Int32Array(self.Module.HEAP8.buffer, self.Module.HEAP8.byteOffset + dimsAddress, dimsLength);
              dims.offset = dimsAddress;
              const shifts = new Int32Array(self.Module.HEAP8.buffer, self.Module.HEAP8.byteOffset + shiftsAddress, shiftsLength);
              shifts.offset = shiftsAddress;

              const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
              const lx = ax - sx*SUBPARCEL_SIZE + 1;
              const ly = ay - sy*SUBPARCEL_SIZE + 1;
              const lz = az - sz*SUBPARCEL_SIZE + 1;
              const potentialIndex = _getPotentialIndex(lx, ly, lz);
              // console.log('set index', lx, ly, lz, potentialIndex)
              potentials[potentialIndex] = Math.min(Math.max(potentials[potentialIndex] + (maxDist - dist) * delta, -2), 2);

              if (!requiredSlices.some(slice => slice.x === sx && slice.y === sy && slice.z === sz)) {
                requiredSlices.push({
                  x: sx,
                  y: sy,
                  z: sz,
                  potentials,
                  dims,
                  shifts,
                  potentialsAddress,
                  potentialsLength,
                  dimsAddress,
                  dimsLength,
                  sliceIndex,
                });
              }
            }
          }
        }
      }

      const results = [];
      const transfers = [];
      for (let i = 0; i < requiredSlices.length; i++) {
        const slice = requiredSlices[i];
        const {x, y, z, potentials, dims, shifts, potentialsAddress, potentialsLength, dimsAddress, dimsLength, shiftsAddress, shiftsLength, sliceIndex} = slice;
        const {positions, barycentrics, ids, indices, arrayBuffer: arrayBuffer2} = _getChunkSpec(potentials, dims, shifts, meshId, sliceIndex*slabSliceTris);
        results.push({
          x,
          y,
          z,
          positions,
          barycentrics,
          ids,
          indices,
          potentialsAddress,
          potentialsLength,
          dimsAddress,
          dimsLength,
          shiftsAddress,
          shiftsLength,
        });
        transfers.push(arrayBuffer2);
      }

      self.postMessage({
        result: results,
      }, transfers);
      // allocator.freeAll();
      break;
    }
    /* case 'uvParameterize': {
      const allocator = new Allocator();

      const {positions: positionsData, normals: normalsData, faces: facesData, arrayBuffer} = data;

      const positions = allocator.alloc(Float32Array, positionsData.length);
      positions.set(positionsData);
      const normals = allocator.alloc(Float32Array, normalsData.length);
      normals.set(normalsData);
      const faces = allocator.alloc(Uint32Array, facesData.length);
      faces.set(facesData);
      const outPositions = allocator.alloc(Float32Array, 300*1024/Float32Array.BYTES_PER_ELEMENT);
      const numOutPositions = allocator.alloc(Uint32Array, 1);
      const outNormals = allocator.alloc(Float32Array, 300*1024/Float32Array.BYTES_PER_ELEMENT);
      const numOutNormals = allocator.alloc(Uint32Array, 1);
      const outFaces = allocator.alloc(Uint32Array, faces.length);
      const uvs = allocator.alloc(Float32Array, 300*1024/Float32Array.BYTES_PER_ELEMENT);
      const numUvs = allocator.alloc(Uint32Array, 1);

      self.Module._doUvParameterize(
        positions.offset,
        positions.length,
        normals.offset,
        normals.length,
        faces.offset,
        faces.length,
        outPositions.offset,
        numOutPositions.offset,
        outNormals.offset,
        numOutNormals.offset,
        outFaces.offset,
        uvs.offset,
        numUvs.offset
      );

      let index = 0;
      const outPositions2 = new Float32Array(arrayBuffer, index, numOutPositions[0]);
      outPositions2.set(outPositions.slice(0, numOutPositions[0]));
      index += numOutPositions[0]*Float32Array.BYTES_PER_ELEMENT;
      const outNormals2 = new Float32Array(arrayBuffer, index, numOutNormals[0]);
      outNormals2.set(outNormals.slice(0, numOutNormals[0]));
      index += numOutNormals[0]*Float32Array.BYTES_PER_ELEMENT;
      const outFaces2 = new Uint32Array(arrayBuffer, index, faces.length);
      outFaces2.set(outFaces.slice(0, faces.length));
      index += faces.length*Uint32Array.BYTES_PER_ELEMENT;
      const outUvs = new Float32Array(arrayBuffer, index, numUvs[0]);
      outUvs.set(uvs.slice(0, numUvs[0]));
      index += numUvs[0]*Float32Array.BYTES_PER_ELEMENT;

      self.postMessage({
        result: {
          positions: outPositions2,
          normals: outNormals2,
          faces: outFaces2,
          uvs: outUvs,
        },
      }, [arrayBuffer]);

      allocator.freeAll();
      break;
    }
    case 'cut': {
      const allocator = new Allocator();

      const {positions: positionsData, faces: facesData, position: positionData, quaternion: quaternionData, scale: scaleData, arrayBuffer} = data;

      const positions = allocator.alloc(Float32Array, positionsData.length);
      positions.set(positionsData);
      const faces = allocator.alloc(Uint32Array, facesData.length);
      faces.set(facesData);
      const position = allocator.alloc(Float32Array, 3);
      position.set(positionData);
      const quaternion = allocator.alloc(Float32Array, 4);
      quaternion.set(quaternionData);
      const scale = allocator.alloc(Float32Array, 3);
      scale.set(scaleData);

      const outPositions = allocator.alloc(Float32Array, 300*1024/Float32Array.BYTES_PER_ELEMENT);
      const numOutPositions = allocator.alloc(Uint32Array, 2);
      const outFaces = allocator.alloc(Uint32Array, 300*1024/Uint32Array.BYTES_PER_ELEMENT);
      const numOutFaces = allocator.alloc(Uint32Array, 2);

      self.Module._doCut(
        positions.offset,
        positions.length,
        faces.offset,
        faces.length,
        position.offset,
        quaternion.offset,
        scale.offset,
        outPositions.offset,
        numOutPositions.offset,
        outFaces.offset,
        numOutFaces.offset
      );

      let index = 0;
      const outPositions2 = new Float32Array(arrayBuffer, index, numOutPositions[0]);
      outPositions2.set(outPositions.slice(0, numOutPositions[0]));
      index += numOutPositions[0]*Float32Array.BYTES_PER_ELEMENT;
      const outFaces2 = new Uint32Array(arrayBuffer, index, numOutFaces[0]);
      outFaces2.set(outFaces.slice(0, numOutFaces[0]));
      index += numOutFaces[0]*Uint32Array.BYTES_PER_ELEMENT;

      const outPositions3 = new Float32Array(arrayBuffer, index, numOutPositions[1]);
      outPositions3.set(outPositions.slice(numOutPositions[0], numOutPositions[0] + numOutPositions[1]));
      index += numOutPositions[1]*Float32Array.BYTES_PER_ELEMENT;
      const outFaces3 = new Uint32Array(arrayBuffer, index, numOutFaces[1]);
      outFaces3.set(outFaces.slice(numOutFaces[0], numOutFaces[0] + numOutFaces[1]));
      index += numOutFaces[1]*Uint32Array.BYTES_PER_ELEMENT;

      // console.log('worker positions', numOutPositions[0], numOutPositions[1], numOutFaces[0], numOutFaces[1], outPositions2, outFaces2, outPositions3, outFaces3);

      self.postMessage({
        result: {
          positions: outPositions2,
          faces: outFaces2,
          positions2: outPositions3,
          faces2: outFaces3,
        },
      }, [arrayBuffer]);

      allocator.freeAll();
      break;
    } */
    default: {
      console.warn('unknown method', data.method);
      break;
    }
  }
};
const _flushMessages = () => {
  for (let i = 0; i < queue.length; i++) {
    _handleMessage(queue[i]);
  }
};
self.onmessage = e => {
  const {data} = e;
  if (!loaded) {
    queue.push(data);
  } else {
    _handleMessage(data);
  }
};

wasmModulePromise.then(() => {
  loaded = true;
  _flushMessages();
}).catch(err => {
  console.warn(err.stack);
});
