"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateDevicesMetadata = exports.resolveAuthenticatorName = exports.extractAaguid = exports.parseAuthBuffer = void 0;
const authenticatorMetadata_json_1 = __importDefault(require("./authenticatorMetadata.json"));
const utils = __importStar(require("./utils"));
function parseAuthBuffer(authData) {
    console.debug(authData);
    let flags = new DataView(authData.slice(32, 33)).getUint8(0);
    console.debug(flags);
    // https://w3c.github.io/webauthn/#sctn-authenticator-data
    let parsed = {
        rpIdHash: utils.toBase64url(authData.slice(0, 32)),
        flags: {
            userPresent: !!(flags & 1),
            //reserved1: !!(flags & 2),
            userVerified: !!(flags & 4),
            backupEligibility: !!(flags & 8),
            backupState: !!(flags & 16),
            //reserved2: !!(flags & 32),
            attestedData: !!(flags & 64),
            extensionsIncluded: !!(flags & 128)
        },
        counter: new DataView(authData.slice(33, 37)).getUint32(0, false), // Big-Endian!
    };
    if (authData.byteLength > 37) {
        // registration contains additional data
        const aaguid = extractAaguid(authData);
        // https://w3c.github.io/webauthn/#attested-credential-data
        //let credentialLength = new DataView(authData.slice(53,55)).getUint16(0, false) // Big-Endian!
        parsed = {
            ...parsed,
            aaguid,
            name: resolveAuthenticatorName(aaguid)
            // credentialBytes, // bytes 53->55: credential length
            // credentialId: utils.toBase64url(authData.slice(55, 55+credentialLength)),
            //publicKey: until where? ...and it's encoded using a strange format, let's better avoid it
            //extensions: starting where?
        };
    }
    return parsed;
}
exports.parseAuthBuffer = parseAuthBuffer;
function extractAaguid(authData) {
    return formatAaguid(authData.slice(37, 53)); // 16 bytes
}
exports.extractAaguid = extractAaguid;
function formatAaguid(buffer) {
    let aaguid = utils.bufferToHex(buffer);
    aaguid = aaguid.substring(0, 8) + '-' + aaguid.substring(8, 12) + '-' + aaguid.substring(12, 16) + '-' + aaguid.substring(16, 20) + '-' + aaguid.substring(20, 32);
    return aaguid; // example: "d41f5a69-b817-4144-a13c-9ebd6d9254d6"
}
function resolveAuthenticatorName(aaguid) {
    const aaguidMetadata = updatedAuthenticatorMetadata ?? authenticatorMetadata_json_1.default; //await getAaguidMetadata()
    return aaguidMetadata[aaguid]?.name;
}
exports.resolveAuthenticatorName = resolveAuthenticatorName;
let updatedAuthenticatorMetadata = null;
// List of AAGUIDs are encoded as JWT here: https://mds.fidoalliance.org/
async function updateDevicesMetadata() {
    // this function is rather resource intensive and time consuming
    // therefore, the result is cached in local storage
    const jwt = await (await fetch("https://mds.fidoalliance.org")).text();
    // the response is a JWT including all AAGUIDs and their metadata
    console.debug(jwt);
    // let us ignore the JWT verification, since this is solely for descriptive purposes, not signed data
    const payload = jwt.split('.')[1].replaceAll('-', '+').replaceAll('_', '/');
    const json = JSON.parse(atob(payload));
    console.debug(json);
    let aaguidMetadata = {};
    for (const e of json.entries) {
        if (!e.aaguid || !e.metadataStatement)
            continue;
        aaguidMetadata[e.aaguid] = { name: e.metadataStatement.description };
    }
    console.debug(aaguidMetadata);
    updatedAuthenticatorMetadata = aaguidMetadata;
}
exports.updateDevicesMetadata = updateDevicesMetadata;
