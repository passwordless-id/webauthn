import * as client from './client';
import * as server from './server';
import * as parsers from './parsers';
import * as utils from './utils';
import { authenticatorMetadata } from './authenticatorMetadata'

export { client, server, parsers, utils, authenticatorMetadata }

const webauthn = { client, server, parsers, utils, authenticatorMetadata }
export default webauthn
