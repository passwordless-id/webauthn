import * as utils from './utils'
import * as authenticators from './authenticators'

/**
 * Returns whether passwordless authentication is available on this browser/platform or not.
 */
export function isAvailable() :boolean {
    return !!window.PublicKeyCredential
}

/**
 * Returns whether the device itself can be used as authenticator.
 */
export async function isLocalAuthenticator() :Promise<boolean> {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
}


// Used mainly for the playground
export function parseAuthenticatorData(authData :string) {
    return authenticators.parseAuthData(utils.parseBase64url(authData))
}

type AuthType = 'auto' | 'local' | 'extern' | 'both'

async function getAuthAttachment(authType :AuthType) :Promise<AuthenticatorAttachment|undefined> {
    if(authType === "local")
        return "platform";
    if(authType === "extern")
        return "cross-platform";
    if(authType === "both")
        return undefined // The webauthn protocol considers `null` as invalid but `undefined` as "both"!

    // the default case: "auto", depending on device capabilities
    try {
        if(await isLocalAuthenticator())
            return "platform"
        else
            return "cross-platform"
    } catch(e) {
        // might happen due to some security policies
        // see https://w3c.github.io/webauthn/#sctn-isUserVerifyingPlatformAuthenticatorAvailable
        return undefined // The webauthn protocol considers `null` as invalid but `undefined` as "both"!
    }
}


type NumAlgo = -7 | -257
type NamedAlgo = 'RS256' | 'ES256'

function getAlgoName(num :NumAlgo) :NamedAlgo {
    switch(num) {
        case -7: return "ES256"
        // case -8 ignored to to its rarity
        case -257: return "RS256"
        default: throw new Error(`Unknown algorithm code: ${num}`)
    }
}


/**
 * Creates a cryptographic key pair, in order to register the public key for later passwordless authentication.
 *
 * @param {string} username
 * @param {string} challenge A server-side randomly generated string.
 * @param {Object} [options] Optional parameters.
 * @param {number} [options.timeout=60000] Number of milliseconds the user has to respond to the biometric/PIN check.
 * @param {'required'|'preferred'|'discouraged'} [options.userVerification='required'] Whether to prompt for biometric/PIN check or not.
 * @param {'auto'|'local'|'extern'|'both'}       [options.authenticatorType='auto'] Which device to use as authenticator.
 *          'auto': if the local device can be used as authenticator it will be preferred. Otherwise it will prompt for an external device.
 *          'local': use the local device (using TouchID, FaceID, Windows Hello or PIN)
 *          'extern': use an external device (security key or connected phone)
 *          'both': prompt the user to choose between local or external device. The UI and user interaction in this case is platform specific.
 * @param {boolean} [attestation=false] If enabled, the device attestation and clientData will be provided as Base64url encoded binary data.
 *                                Note that this is not available on some platforms.
 */
//
export async function register(username :string, challenge :string, options :any) {
    if(!options)
        options = {}

    if(!utils.isBase64url(challenge))
        throw new Error('Provided challenge is not properly encoded in Base64url')

    const creationOptions :PublicKeyCredentialCreationOptions = {
        challenge: utils.parseBase64url(challenge),
        rp: {
            id: window.location.hostname,
            name: window.location.hostname
        },
        user: {
            id: await utils.sha256(new TextEncoder().encode(username)), // ID should not be directly "identifiable" for privacy concerns
            name: username,
            displayName: username,
        },
        pubKeyCredParams: [
            {alg: -7, type: "public-key"},   // ES256 (Webauthn's default algorithm)
            {alg: -257, type: "public-key"}, // RS256 (for Windows Hello and others)
        ],
        timeout: options.timeout ?? 60000,
        authenticatorSelection: {
            userVerification: options.userVerification ?? "required", // Webauthn default is "preferred"
            authenticatorAttachment: await getAuthAttachment(options.authenticatorType ?? "auto"),
        },
        attestation: "direct" // options.attestation ? "direct" : "none"
    }

    console.debug(creationOptions)
    const credential = await navigator.credentials.create({publicKey: creationOptions}) as any //PublicKeyCredential
    console.debug(credential)
   
    const response = credential.response as any //AuthenticatorAttestationResponse
    
    return {
        username: username,
        challenge: challenge,
        credential: {
            id: credential.id,
            publicKey: utils.toBase64url(response.getPublicKey()),
            algorithm: getAlgoName(credential.response.getPublicKeyAlgorithm())
        },
        authenticator: {
            isLocal: (credential.authenticatorAttachment === "platform"),
            //transport: response.getTransports()[0], // In the RFC but not implemented by browsers
            aaguid: authenticators.extractAaguid(response.getAuthenticatorData()),
            name: authenticators.resolveAuthenticatorName(response.getAuthenticatorData()),
            attestation: options.attestation ? utils.toBase64url(response.attestationObject) : null,
            clientData: options.attestation ? utils.toBase64url(response.clientDataJSON) : null,
        }
    }
}


async function getTransports(authType :AuthType) :Promise<AuthenticatorTransport[]> {
    if(authType === "local")
        return ['internal']
    if(authType === "extern")
        return ['usb', 'ble', 'nfc']
    if(authType === "both")
        return ['internal', 'usb', 'ble', 'nfc']

    // the default case: "auto", depending on device capabilities
    try {
        if(await isLocalAuthenticator())
            return ['internal']
        else
            return ['usb', 'ble', 'nfc']
    } catch(e) {
        return ['internal', 'usb', 'ble', 'nfc']
    }
}


/**
 * Signs a challenge using one of the provided credentials IDs in order to authenticate the user.
 *
 * @param {string[]} credentialIds The list of credential IDs that can be used for signing.
 * @param {string} challenge A server-side randomly generated string, the base64 encoded version will be signed.
 * @param {Object} [options] Optional parameters.
 * @param {number} [options.timeout=60000] Number of milliseconds the user has to respond to the biometric/PIN check.
 * @param {'required'|'preferred'|'discouraged'} [options.userVerification='required'] Whether to prompt for biometric/PIN check or not.
 */
export async function login(credentialIds :string[], challenge :string, options :any) {
    if(!options)
        options = {}

    if(!utils.isBase64url(challenge))
        throw new Error('Provided challenge is not properly encoded in Base64url')

    const transports = await getTransports(options.authenticatorType ?? "auto");

    let authOptions :PublicKeyCredentialRequestOptions = {
        challenge: utils.parseBase64url(challenge),
        rpId: window.location.hostname,
        allowCredentials: credentialIds.map(id => { return {
            id: utils.parseBase64url(id),
            type: 'public-key',
            transports: transports,
        }}),
        userVerification: options.userVerification ?? "required",
        timeout: options.timeout ?? 60000,
    }

    console.debug(authOptions)
    let auth = await navigator.credentials.get({publicKey: authOptions}) as PublicKeyCredential
    console.debug(auth)

    const response = auth.response as AuthenticatorAssertionResponse
    
    return {
        credentialId: auth.id,
        //userHash: utils.toBase64url(response.userHandle), // unreliable, optional for authenticators
        clientJson: JSON.parse(utils.parseBuffer(response.clientDataJSON)),
        clientData: utils.toBase64url(response.clientDataJSON),
        signature: utils.toBase64url(response.signature),
        authenticatorJson: authenticators.parseAuthData(response.authenticatorData),
        authenticatorData: utils.toBase64url(response.authenticatorData)
    }
}






type VerifyParams = {
    algorithm :'RS256' | 'ES256',
    publicKey :string, // Base64url encoded
    authenticatorData :string, // Base64url encoded
    clientData :string, // Base64url encoded
    signature :string, // Base64url encoded
}

// https://w3c.github.io/webauthn/#sctn-verifying-assertion
export async function verify({algorithm :NamedAlgo, publicKey, authenticatorData, clientData, signature} :VerifyParams) :Promise<boolean> {
    let cryptoKey = await window.crypto.subtle.importKey(
        'spki', utils.parseBase64url(publicKey), {name:'RSASSA-PKCS1-v1_5', hash:'SHA-256'}, false, ['verify'])
    console.debug(cryptoKey)

    let clientHash = await utils.sha256( utils.parseBase64url(clientData) );
    console.debug(clientHash)


    let comboBuffer = utils.concatenateBuffers(utils.parseBase64url(authenticatorData), clientHash)
    console.debug(comboBuffer)

    console.debug(utils.parseBase64url(signature))

    // https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/verify
    let validity = await window.crypto.subtle.verify({name:'RSASSA-PKCS1-v1_5', hash:'SHA-256'}, cryptoKey, utils.parseBase64url(signature), comboBuffer)

    return validity
}