import { parseAuthentication, parseRegistration } from "./parsers";
import { AuthenticationEncoded, AuthenticationParsed, CredentialKey, NamedAlgo, RegistrationEncoded, RegistrationParsed } from "./types";
import * as utils from './utils'


interface RegistrationChecks {
    challenge :string,
    origin :string
}

export async function verifyRegistration(registrationRaw :RegistrationEncoded, expected :RegistrationChecks) :Promise<RegistrationParsed> {
    const registration = parseRegistration(registrationRaw)
    registration.client.challenge

    if(registration.client.type !== "webauthn.create")
        throw new Error(`Unexpected ClientData type: ${registration.client.type}`)

    if(registration.client.origin !== expected.origin)
        throw new Error(`Unexpected ClientData origin: ${registration.client.origin}`)

    if(registration.client.challenge !== expected.challenge)
        throw new Error(`Unexpected ClientData challenge: ${registration.client.challenge}`)

    return registration
}


interface AuthenticationChecks {
    challenge :string,
    origin :string,
    userVerified :boolean,
    counter :number
}


export async function verifyAuthentication(authenticationRaw :AuthenticationEncoded, credential :CredentialKey, expected :AuthenticationChecks) :Promise<AuthenticationParsed> {
    if(authenticationRaw.credentialId !== credential.id)
        throw new Error(`Credential ID mismatch: ${authenticationRaw.credentialId} vs ${credential.id}`)

    const isValidSignature :boolean = await verifySignature({
        algorithm: credential.algorithm,
        publicKey: credential.publicKey,
        authenticatorData: authenticationRaw.authenticatorData,
        clientData: authenticationRaw.clientData,
        signature: authenticationRaw.signature
    })

    //if(!isValidSignature)
    //    throw new Error(`Invalid signature: ${authenticationRaw.signature}`)

    const authentication = parseAuthentication(authenticationRaw)
    
    if(authentication.client.type !== "webauthn.get")
        throw new Error(`Unexpected clientData type: ${authentication.client.type}`)

    if(authentication.client.origin !== expected.origin)
        throw new Error(`Unexpected clientData origin: ${authentication.client.origin}`)

    if(authentication.client.challenge !== expected.challenge)
        throw new Error(`Unexpected clientData challenge: ${authentication.client.challenge}`)

    // this only works because we consider `rp.origin` and `rp.id` to be the same during authentication/registration
    const rpId = new URL(expected.origin).hostname
    const expectedRpIdHash = utils.toBase64url(await utils.sha256(utils.toBuffer(rpId)))
    if(authentication.authenticator.rpIdHash !== expectedRpIdHash)
        throw new Error(`Unexpected RpIdHash: ${authentication.authenticator.rpIdHash} vs ${expectedRpIdHash}`)

    if(!authentication.authenticator.flags.userPresent)
        throw new Error(`Unexpected authenticator flags: missing userPresent`)

    if(!authentication.authenticator.flags.userVerified && expected.userVerified)
        throw new Error(`Unexpected authenticator flags: missing userVerified`)

    if(authentication.authenticator.counter <= expected.counter)
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
        // case 'EdDSA': Not supported by browsers
        default:
            throw new Error(`Unknown or unsupported crypto algorithm: ${algorithm}. Only 'RS256' and 'ES256' are supported.`)
    }
}

type AlgoParams = AlgorithmIdentifier | RsaHashedImportParams | EcKeyImportParams | HmacImportParams | AesKeyAlgorithm

async function parseCryptoKey(algoParams :AlgoParams, publicKey :string) :Promise<CryptoKey> {
    const buffer = utils.parseBase64url(publicKey)
    return crypto.subtle.importKey('spki', buffer, algoParams, false, ['verify'])
}



type VerifyParams = {
    algorithm :NamedAlgo,
    publicKey :string, // Base64url encoded
    authenticatorData :string, // Base64url encoded
    clientData :string, // Base64url encoded
    signature :string, // Base64url encoded
}


// https://w3c.github.io/webauthn/#sctn-verifying-assertion
export async function verifySignature({algorithm, publicKey, authenticatorData, clientData, signature} :VerifyParams) :Promise<boolean> {
    const algoParams = getAlgoParams(algorithm)
    let cryptoKey = await parseCryptoKey(algoParams, publicKey)
    console.debug(cryptoKey)

    let clientHash = await utils.sha256( utils.parseBase64url(clientData) );
    
    // during "login", the authenticatorData is exactly 37 bytes
    let comboBuffer = utils.concatenateBuffers(utils.parseBase64url(authenticatorData), clientHash)

    console.debug('Crypto Algo: ' + JSON.stringify(algoParams))
    console.debug('Public key: ' + publicKey)
    console.debug('Data: ' + utils.toBase64url(comboBuffer))
    console.debug('Signature: ' + signature)

    // https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/verify
    const signatureBuffer = utils.parseBase64url(signature)
    const isValid = await crypto.subtle.verify(algoParams, cryptoKey, signatureBuffer, comboBuffer)

    return isValid
}
