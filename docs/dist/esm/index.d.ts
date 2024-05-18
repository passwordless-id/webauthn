import * as client from './client.js';
import * as server from './server.js';
import * as parsers from './parsers.js';
import * as utils from './utils.js';
import { authenticatorMetadata } from './authenticatorMetadata.js';
export { client, server, parsers, utils, authenticatorMetadata };
declare const _default: {
    client: typeof client;
    server: typeof server;
    parsers: typeof parsers;
    utils: typeof utils;
    authenticatorMetadata: Record<string, string>;
};
export default _default;
