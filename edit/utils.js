import {enterWorld} from './worlds.js';
import {XRPackage} from '../run.js';
import {packagesEndpoint, apiHost, contract} from './constants.js';

function parseQuery(queryString) {
  var query = {};
  var pairs = (queryString[0] === '?' ? queryString.substr(1) : queryString).split('&');
  for (var i = 0; i < pairs.length; i++) {
    var pair = pairs[i].split('=');
    query[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '');
  }
  return query;
}

const addPackage = async (p, matrix, pe) => {
  if (matrix) {
    p.setMatrix(matrix);
  }
  await pe.add(p);
};

const handleUrl = async (u, pe) => {
  const {search} = new URL(u);
  const q = parseQuery(search);

  if (q.p) { // package
    const metadata = await fetch(packagesEndpoint + '/' + q.p)
      .then(res => res.json());
    const {dataHash} = metadata;

    const arrayBuffer = await fetch(`${apiHost}/${dataHash}.wbn`)
      .then(res => res.arrayBuffer());

    const p = new XRPackage(new Uint8Array(arrayBuffer));
    await addPackage(p, pe);
  } else if (q.i) { // index
    const metadataHash = await contract.methods.getMetadata(parseInt(q.i, 10), 'hash').call();
    const metadata = await fetch(`${apiHost}/${metadataHash}`)
      .then(res => res.json());
    const {dataHash} = metadata;

    const arrayBuffer = await fetch(`${apiHost}/${dataHash}.wbn`)
      .then(res => res.arrayBuffer());

    const p = new XRPackage(new Uint8Array(arrayBuffer));
    await addPackage(p, pe);
  } else if (q.u) { // url
    const arrayBuffer = await fetch(q.u)
      .then(res => res.arrayBuffer());

    const p = new XRPackage(new Uint8Array(arrayBuffer));
    await pe.add(p);
  } else if (q.h) { // hash
    const p = await XRPackage.download(q.h);
    await addPackage(p, pe);
  } else {
    const w = q.w || null;
    enterWorld(w, pe);
  }
};

export {handleUrl, addPackage};
