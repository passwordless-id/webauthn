import * as utils from './utils'
import * as parsers from './parsers'
import { NamedAlgo } from './types'





type VerifyParams = {
    algorithm :NamedAlgo,
    publicKey :string, // Base64url encoded
    authenticatorData :string, // Base64url encoded
    clientData :string, // Base64url encoded
    signature :string, // Base64url encoded
}


function getAlgoParams(algorithm :NamedAlgo) :any {
    switch (algorithm) {
        case 'RS256':
            return {
                name:'RSASSA-PKCS1-v1_5', 
                hash:'SHA-256'
            };
        case 'ES256':
            return {
                name: 'ECDSA',
                namedCurve: 'P-256',
                hash: 'SHA-256',
            };
        default:
            throw new Error(`Unknown or unsupported crypto algorithm: ${algorithm}. Only 'RS256' and 'ES256' are supported.`)
    }
}

type AlgoParams = AlgorithmIdentifier | RsaHashedImportParams | EcKeyImportParams | HmacImportParams | AesKeyAlgorithm

async function parseCryptoKey(algoParams :AlgoParams, publicKey :string) :Promise<CryptoKey> {
    const buffer = utils.parseBase64url(publicKey)
    return crypto.subtle.importKey('spki', buffer, algoParams, false, ['verify'])
}

async function verifySignature(algoParams :AlgoParams, cryptoKey :CryptoKey, signature :string, payload :ArrayBuffer) :Promise<boolean> {
    const signatureBuffer = utils.parseBase64url(signature)
    return crypto.subtle.verify(algoParams, cryptoKey, signatureBuffer, payload)
}

// https://w3c.github.io/webauthn/#sctn-verifying-assertion
export async function verify({algorithm, publicKey, authenticatorData, clientData, signature} :VerifyParams) :Promise<boolean> {
    const algoParams = getAlgoParams(algorithm)
    let cryptoKey = await parseCryptoKey(algoParams, publicKey)
    console.debug(cryptoKey)

    let clientHash = await utils.sha256( utils.parseBase64url(clientData) );
    console.debug(clientHash)

    // during "login", the authenticatorData is exactly 37 bytes
    let comboBuffer = utils.concatenateBuffers(utils.parseBase64url(authenticatorData), clientHash)
    console.debug(comboBuffer)

    // https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/verify
    let validity = verifySignature(algoParams, cryptoKey, signature, comboBuffer)

    return validity
}
