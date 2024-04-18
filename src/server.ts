import { parseAuthentication, parseRegistration } from "./parsers.js";
import { AuthenticationEncoded, AuthenticationParsed, CredentialKey, NamedAlgo, RegistrationEncoded, RegistrationParsed } from "./types.js";
import * as utils from './utils.js'


async function isValid(validator :any, value :any) :Promise<boolean> {
   if(typeof validator === 'function') {
        const res = validator(value)
        if(res instanceof Promise)
            return await res
        else
            return res
    }
    // the validator can be a single value too
    return validator === value
}

async function isNotValid(validator :any, value :any) :Promise<boolean> {
    return !(await isValid(validator, value))
}

interface RegistrationChecks {
    challenge: string | Function,
    origin: string | Function
}


export async function verifyRegistration(registrationRaw: RegistrationEncoded, expected: RegistrationChecks): Promise<RegistrationParsed> {
    const registration = parseRegistration(registrationRaw)

    if (registration.client.type !== "webauthn.create")
        throw new Error(`Unexpected ClientData type: ${registration.client.type}`)

    if (await isNotValid(expected.origin, registration.client.origin))
        throw new Error(`Unexpected ClientData origin: ${registration.client.origin}`)

    if (await isNotValid(expected.challenge, registration.client.challenge))
        throw new Error(`Unexpected ClientData challenge: ${registration.client.challenge}`)

    return registration
}


interface AuthenticationChecks {
    challenge: string | Function,
    origin: string | Function,
    userVerified: boolean,
    counter?: number, // Made optional according to https://github.com/passwordless-id/webauthn/issues/38
    domain ?:string, // Same as `rp.id`
    verbose?: boolean
}


export async function verifyAuthentication(authenticationRaw: AuthenticationEncoded, credential: CredentialKey, expected: AuthenticationChecks): Promise<AuthenticationParsed> {
    if (authenticationRaw.credentialId !== credential.id)
        throw new Error(`Credential ID mismatch: ${authenticationRaw.credentialId} vs ${credential.id}`)

    const isValidSignature: boolean = await verifySignature({
        algorithm: credential.algorithm,
        publicKey: credential.publicKey,
        authenticatorData: authenticationRaw.authenticatorData,
        clientData: authenticationRaw.clientData,
        signature: authenticationRaw.signature,
        verbose: expected.verbose
    })

    if(!isValidSignature)
        throw new Error(`Invalid signature: ${authenticationRaw.signature}`)

    const authentication = parseAuthentication(authenticationRaw)
    if(expected.verbose)
        console.debug(authentication)

    if (authentication.client.type !== "webauthn.get")
        throw new Error(`Unexpected clientData type: ${authentication.client.type}`)

    if (await isNotValid(expected.origin, authentication.client.origin))
        throw new Error(`Unexpected ClientData origin: ${authentication.client.origin}`)

    if (await isNotValid(expected.challenge, authentication.client.challenge))
        throw new Error(`Unexpected ClientData challenge: ${authentication.client.challenge}`)

    // this only works because we consider `rp.origin` and `rp.id` to be the same during authentication/registration
    const rpId = expected.domain ?? new URL(authentication.client.origin).hostname
    const expectedRpIdHash = utils.toBase64url(await utils.sha256(utils.toBuffer(rpId)))
    if (authentication.authenticator.rpIdHash !== expectedRpIdHash)
        throw new Error(`Unexpected RpIdHash: ${authentication.authenticator.rpIdHash} vs ${expectedRpIdHash}`)

    if (!authentication.authenticator.flags.userPresent)
        throw new Error(`Unexpected authenticator flags: missing userPresent`)

    if (!authentication.authenticator.flags.userVerified && expected.userVerified)
        throw new Error(`Unexpected authenticator flags: missing userVerified`)

    if (expected.counter && authentication.authenticator.counter <= expected.counter)
        throw new Error(`Unexpected authenticator counter: ${authentication.authenticator.counter} (should be > ${expected.counter})`)

    return authentication
}


// https://w3c.github.io/webauthn/#sctn-public-key-easy
// https://www.iana.org/assignments/cose/cose.xhtml#algorithms
/*
User agents MUST be able to return a non-null value for getPublicKey() when the credential public key has a COSEAlgorithmIdentifier value of:

-7 (ES256), where kty is 2 (with uncompressed points) and crv is 1 (P-256).

-257 (RS256).

-8 (EdDSA), where crv is 6 (Ed25519).
*/
function getAlgoParams(algorithm: NamedAlgo): any {
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

type AlgoParams = AlgorithmIdentifier | RsaHashedImportParams | EcKeyImportParams | HmacImportParams | AesKeyAlgorithm

async function parseCryptoKey(algoParams: AlgoParams, publicKey: string): Promise<CryptoKey> {
    const buffer = utils.parseBase64url(publicKey)
    return crypto.subtle.importKey('spki', buffer, algoParams, false, ['verify'])
}



type VerifyParams = {
    algorithm: NamedAlgo,
    publicKey: string, // Base64url encoded
    authenticatorData: string, // Base64url encoded
    clientData: string, // Base64url encoded
    signature: string, // Base64url encoded
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
    const algoParams = getAlgoParams(algorithm)
    let cryptoKey = await parseCryptoKey(algoParams, publicKey)

    if(verbose) {
        console.debug(cryptoKey)
    }

    let clientHash = await utils.sha256(utils.parseBase64url(clientData));

    // during "login", the authenticatorData is exactly 37 bytes
    let comboBuffer = utils.concatenateBuffers(utils.parseBase64url(authenticatorData), clientHash)

    if(verbose) {
        console.debug('Crypto Algo: ' + JSON.stringify(algoParams))
        console.debug('Public key: ' + publicKey)
        console.debug('Data: ' + utils.toBase64url(comboBuffer))
        console.debug('Signature: ' + signature)
    }

    // https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/verify
    let signatureBuffer = utils.parseBase64url(signature)
    if(algorithm == 'ES256')
        signatureBuffer = convertASN1toRaw(signatureBuffer)

    const isValid = await crypto.subtle.verify(algoParams, cryptoKey, signatureBuffer, comboBuffer)

    return isValid
}

function convertASN1toRaw(signatureBuffer :ArrayBuffer) {
    // Convert signature from ASN.1 sequence to "raw" format
    const usignature = new Uint8Array(signatureBuffer);
    const rStart = usignature[4] === 0 ? 5 : 4;
    const rEnd = rStart + 32;
    const sStart = usignature[rEnd + 2] === 0 ? rEnd + 3 : rEnd + 2;
    const r = usignature.slice(rStart, rEnd);
    const s = usignature.slice(sStart);
    return new Uint8Array([...r, ...s]);
}