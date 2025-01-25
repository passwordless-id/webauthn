/********************************
     Encoding/Decoding Utils
********************************/

import { Base64URLString, NamedAlgo } from "./types"


export function toBuffer(txt :string) :ArrayBuffer {
    return Uint8Array.from(txt, c => c.charCodeAt(0)).buffer
}

export function parseBuffer(buffer :ArrayBuffer) :string {
    return String.fromCharCode(...new Uint8Array(buffer))
}


export function isBase64url(txt :string) :boolean {
    return txt.match(/^[a-zA-Z0-9\-_]+=*$/) !== null
}

export function toBase64url(buffer :ArrayBuffer) :Base64URLString {
    const txt = btoa(parseBuffer(buffer)) // base64
    return txt.replaceAll('+', '-').replaceAll('/', '_')
}

export function parseBase64url(txt :Base64URLString) :ArrayBuffer {
    txt = txt.replaceAll('-', '+').replaceAll('_', '/') // base64url -> base64
    return toBuffer(atob(txt))
}


export async function sha256(buffer :ArrayBuffer) :Promise<ArrayBuffer> {
    return await crypto.subtle.digest('SHA-256', buffer)
}

export function bufferToHex (buffer :ArrayBuffer) :string {
    return [...new Uint8Array (buffer)]
        .map (b => b.toString (16).padStart (2, "0"))
        .join ("");
}


export function concatenateBuffers(buffer1 :ArrayBuffer, buffer2  :ArrayBuffer) {
    var tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
    tmp.set(new Uint8Array(buffer1), 0);
    tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
    return tmp;
};



// https://w3c.github.io/webauthn/#sctn-public-key-easy
// https://www.iana.org/assignments/cose/cose.xhtml#algorithms
/*
User agents MUST be able to return a non-null value for getPublicKey() when the credential public key has a COSEAlgorithmIdentifier value of:

-7 (ES256), where kty is 2 (with uncompressed points) and crv is 1 (P-256).

-257 (RS256).

-8 (EdDSA), where crv is 6 (Ed25519).
*/
function getAlgoParams(algorithm: NamedAlgo): AlgoParams {
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
        // case 'EdDSA': Not supported by browsers
        default:
            throw new Error(`Unknown or unsupported crypto algorithm: ${algorithm}. Only 'RS256' and 'ES256' are supported.`)
    }
}

type AlgoParams = RsaPssParams | EcKeyImportParams | EcdsaParams

export async function parseCryptoKey(algorithm: NamedAlgo, publicKey: string): Promise<CryptoKey> {
    const algoParams = getAlgoParams(algorithm)
    const buffer = parseBase64url(publicKey)
    return crypto.subtle.importKey('spki', buffer, algoParams, false, ['verify'])
}



type VerifyParams = {
    algorithm: NamedAlgo,
    publicKey: Base64URLString,
    authenticatorData: Base64URLString,
    clientData: Base64URLString,
    signature: Base64URLString,
    verbose?: boolean, // Enables debug logs containing sensitive data like crypto keys
}


// https://w3c.github.io/webauthn/#sctn-verifying-assertion
// https://w3c.github.io/webauthn/#sctn-signature-attestation-types
/* Emphasis mine:

6.5.6. Signature Formats for Packed Attestation, FIDO U2F Attestation, and **Assertion Signatures**

[...] For COSEAlgorithmIdentifier -7 (ES256) [...] the sig value MUST be encoded as an ASN.1 [...]
[...] For COSEAlgorithmIdentifier -257 (RS256) [...] The signature is not ASN.1 wrapped.
[...] For COSEAlgorithmIdentifier -37 (PS256) [...] The signature is not ASN.1 wrapped.
*/
// see also https://gist.github.com/philholden/50120652bfe0498958fd5926694ba354
export async function verifySignature({ algorithm, publicKey, authenticatorData, clientData, signature, verbose }: VerifyParams): Promise<boolean> {
    let cryptoKey = await parseCryptoKey(algorithm, publicKey)

    if(verbose) {
        console.debug(cryptoKey)
    }

    let clientHash = await sha256(parseBase64url(clientData));

    // during "login", the authenticatorData is exactly 37 bytes
    let comboBuffer = concatenateBuffers(parseBase64url(authenticatorData), clientHash)

    if(verbose) {
        console.debug('Algorithm: ' + algorithm)
        console.debug('Public key: ' + publicKey)
        console.debug('Data: ' + toBase64url(comboBuffer))
        console.debug('Signature: ' + signature)
    }

    // https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/verify
    let signatureBuffer = parseBase64url(signature)
    if(algorithm == 'ES256')
        signatureBuffer = convertASN1toRaw(signatureBuffer)

    const algoParams = getAlgoParams(algorithm)
    const isValid = await crypto.subtle.verify(algoParams, cryptoKey, signatureBuffer, comboBuffer)

    return isValid
}

function convertASN1toRaw(signatureBuffer :ArrayBuffer) {
    // Convert signature from ASN.1 sequence to "raw" format
    const signature = new Uint8Array(signatureBuffer);
    const rStart = signature[4] === 0 ? 5 : 4;
    const rEnd = rStart + 32;
    const sStart = signature[rEnd + 2] === 0 ? rEnd + 3 : rEnd + 2;
    const r = signature.slice(rStart, rEnd);
    const s = signature.slice(sStart);
    return new Uint8Array([...r, ...s]);
}