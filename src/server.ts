import { authenticatorMetadata, parsers } from "./index";
import { parseAuthenticator, parseClient, toAuthenticationInfo } from "./parsers";
import { AuthenticationJSON, NamedAlgo, RegistrationJSON, RegistrationInfo, AuthenticationInfo, Base64URLString, CollectedClientData, UserInfo, CredentialInfo, AuthenticatorInfo, AuthenticatorParsed } from "./types";
import * as utils from './utils'


export function randomChallenge() {
    const buffer = crypto.getRandomValues(new Uint8Array(18)); // > 128 bits, a multiple of 3 bytes to have base64 encoding without padding
    return utils.toBase64url(buffer);
}



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



export async function verifyRegistration(registrationJson: RegistrationJSON, expected: RegistrationChecks): Promise<RegistrationInfo> {
    const client = parseClient(registrationJson.response.clientDataJSON)
    const authenticator = parseAuthenticator(registrationJson.response.authenticatorData);
    const aaguid = authenticator.aaguid;

    if(!aaguid) // should never happen, worst case should be a fallback to "zeroed" aaguid
        throw new Error("Unexpected errror, no AAGUID.")

    if (client.type !== "webauthn.create")
        throw new Error(`Unexpected ClientData type: ${client.type}`)

    if (await isNotValid(expected.origin, client.origin))
        throw new Error(`Unexpected ClientData origin: ${client.origin}`)

    if (await isNotValid(expected.challenge, client.challenge))
        throw new Error(`Unexpected ClientData challenge: ${client.challenge}`)

    return parsers.toRegistrationInfo(registrationJson, authenticator)
}



interface AuthenticationChecks {
    challenge: string | Function,
    origin: string | Function,
    userVerified: boolean,
    counter?: number, // Made optional according to https://github.com/passwordless-id/webauthn/issues/38
    domain ?:string, // Same as `rp.id`
    verbose?: boolean
}



export async function verifyAuthentication(authenticationJson: AuthenticationJSON, credential: CredentialInfo, expected: AuthenticationChecks): Promise<AuthenticationInfo> {
    if (authenticationJson.id !== credential.id)
        throw new Error(`Credential ID mismatch: ${authenticationJson.id} vs ${credential.id}`)

    const isValidSignature: boolean = await verifySignature({
        algorithm: credential.algorithm,
        publicKey: credential.publicKey,
        authenticatorData: authenticationJson.response.authenticatorData,
        clientData: authenticationJson.response.clientDataJSON,
        signature: authenticationJson.response.signature,
        verbose: expected.verbose
    })

    if(!isValidSignature)
        throw new Error(`Invalid signature: ${authenticationJson.response.signature}`)

    const client :CollectedClientData = parseClient(authenticationJson.response.clientDataJSON);
    const authenticator :AuthenticatorParsed = parseAuthenticator(authenticationJson.response.authenticatorData);

    if(expected.verbose) {
        console.debug(client)
        console.debug(authenticator)
    }
    
    if (client.type !== "webauthn.get")
        throw new Error(`Unexpected clientData type: ${client.type}`)

    if (await isNotValid(expected.origin, client.origin))
        throw new Error(`Unexpected ClientData origin: ${client.origin}`)

    if (await isNotValid(expected.challenge, client.challenge))
        throw new Error(`Unexpected ClientData challenge: ${client.challenge}`)

    // this only works because we consider `rp.origin` and `rp.id` to be the same during authentication/registration
    const rpId = expected.domain ?? new URL(client.origin).hostname
    const expectedRpIdHash = utils.toBase64url(await utils.sha256(utils.toBuffer(rpId)))
    if (authenticator.rpIdHash !== expectedRpIdHash)
        throw new Error(`Unexpected RpIdHash: ${authenticator.rpIdHash} vs ${expectedRpIdHash}`)

    if (!authenticator.flags.userPresent)
        throw new Error(`Unexpected authenticator flags: missing userPresent`)

    if (!authenticator.flags.userVerified && expected.userVerified)
        throw new Error(`Unexpected authenticator flags: missing userVerified`)

    if (expected.counter && authenticator.signCount <= expected.counter)
        throw new Error(`Unexpected authenticator counter: ${authenticator.signCount} (should be > ${expected.counter})`)

    return toAuthenticationInfo(authenticationJson, authenticator)
}


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
    const buffer = utils.parseBase64url(publicKey)
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

    let clientHash = await utils.sha256(utils.parseBase64url(clientData));

    // during "login", the authenticatorData is exactly 37 bytes
    let comboBuffer = utils.concatenateBuffers(utils.parseBase64url(authenticatorData), clientHash)

    if(verbose) {
        console.debug('Algorithm: ' + algorithm)
        console.debug('Public key: ' + publicKey)
        console.debug('Data: ' + utils.toBase64url(comboBuffer))
        console.debug('Signature: ' + signature)
    }

    // https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/verify
    let signatureBuffer = utils.parseBase64url(signature)
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