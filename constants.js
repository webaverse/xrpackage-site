export const env = window.location.hostname === 'localhost' ||  window.location.hostname === '127.0.0.1' ? 'dev' : 'prod';
export const apiHost = env === 'dev' ? 'http://127.0.0.1' : 'https://ipfs.exokit.org';
