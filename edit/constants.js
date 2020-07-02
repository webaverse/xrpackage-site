// import address from 'https://contracts.webaverse.com/address.js';
// import abi from 'https://contracts.webaverse.com/abi.js';

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
};
