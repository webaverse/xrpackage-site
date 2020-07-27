

export const env = window.location.hostname === 'localhost' ||  window.location.hostname === '127.0.0.1' ? 'dev' : 'prod';
export const apiOrigin = env === 'dev' ? 'http://127.0.0.1:80/ipfs' : 'https://ipfs.exokit.org/ipfs';