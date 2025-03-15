import * as client from './client.js';
import * as server from './server.js';
import * as parsers from './parsers.js';
import * as utils from './utils.js';
import { authenticatorMetadata } from './authenticatorMetadata.js'

export { client, server, parsers, utils, authenticatorMetadata }

const webauthn = { client, server, parsers, utils, authenticatorMetadata }
export default webauthn
