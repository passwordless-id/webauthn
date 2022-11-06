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
Object.defineProperty(exports, "__esModule", { value: true });
exports.verify = void 0;
const utils = __importStar(require("./utils"));
function getAlgoParams(algorithm) {
    switch (algorithm) {
        case 'RS256':
            return {
                name: 'RSASSA-PKCS1-v1_5',
                hash: 'SHA-256'
            };
        case 'ES256':
            return {
                name: 'ECDSA',
                namedCurve: 'P-256',
                hash: 'SHA-256',
            };
        default:
            throw new Error(`Unknown or unsupported crypto algorithm: ${algorithm}. Only 'RS256' and 'ES256' are supported.`);
    }
}
async function parseCryptoKey(algoParams, publicKey) {
    const buffer = utils.parseBase64url(publicKey);
    return crypto.subtle.importKey('spki', buffer, algoParams, false, ['verify']);
}
async function verifySignature(algoParams, cryptoKey, signature, payload) {
    const signatureBuffer = utils.parseBase64url(signature);
    return crypto.subtle.verify(algoParams, cryptoKey, signatureBuffer, payload);
}
// https://w3c.github.io/webauthn/#sctn-verifying-assertion
async function verify({ algorithm, publicKey, authenticatorData, clientData, signature }) {
    const algoParams = getAlgoParams(algorithm);
    let cryptoKey = await parseCryptoKey(algoParams, publicKey);
    console.debug(cryptoKey);
    let clientHash = await utils.sha256(utils.parseBase64url(clientData));
    console.debug(clientHash);
    // during "login", the authenticatorData is exactly 37 bytes
    let comboBuffer = utils.concatenateBuffers(utils.parseBase64url(authenticatorData), clientHash);
    console.debug(comboBuffer);
    // https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/verify
    let validity = verifySignature(algoParams, cryptoKey, signature, comboBuffer);
    return validity;
}
exports.verify = verify;
/*
export async function verifyRegistration(login :RegistrationResult, expectedChallenge, expectedOrigin) {
}

export async function verifyLogin(login :LoginResult, expectedChallenge, expectedOrigin, credential) {
}
*/ 
