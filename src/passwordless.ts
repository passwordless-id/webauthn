import * as authenticatorMetadata from './authenticatorMetadata.json'
import * as utils from './utils'

console.debug(authenticatorMetadata)
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



function parseAuthenticatorDataBase64(authData :string) {
    return parseAuthenticatorData(utils.parseBase64(authData))
}

function parseAuthenticatorData(authData :ArrayBuffer) {
    console.debug(authData)
    let flags = new DataView(authData.slice(32,33)).getUint8(0)
    console.debug(flags)

    // https://w3c.github.io/webauthn/#sctn-authenticator-data
    let parsed :any = {
        rpIdHash: utils.toBase64(authData.slice(0,32)),
            flags: {
                 userPresent: !!(flags & 1),
                 //reserved1: !!(flags & 2),
                 userVerified: !!(flags &  4),
                 backupEligibility: !!(flags & 8),
                 backupState: !!(flags & 16),
                 //reserved2: !!(flags & 32),
                 attestedData: !!(flags & 64),
                 extensionsIncluded: !!(flags & 128)
            },
            counter: new DataView(authData.slice(33,37)).getUint32(0, false),  // Big-Endian!
    }

    if(authData.byteLength > 37) {
        // https://w3c.github.io/webauthn/#attested-credential-data
        let credentialLength = new DataView(authData.slice(53,55)).getUint16(0, false) // Big-Endian!
        parsed = {
            ...parsed,
            aaguid: extractAaguid(authData),
            credentialId: utils.toBase64(authData.slice(55, 55+credentialLength)),
            publicKey: utils.toBase64(authData.slice(55+credentialLength, authData.byteLength)) // probably breaks if extensions are invoked
        }
    }

    return parsed
}

function extractAaguid(authData :ArrayBuffer) :string {
    return formatAaguid(authData.slice(37, 53))
}

function formatAaguid(buffer :ArrayBuffer) :string {
    let aaguid = utils.bufferToHex(buffer)
    aaguid = aaguid.substring(0,8) + '-' + aaguid.substring(8,12) + '-' + aaguid.substring(12,16) + '-' + aaguid.substring(16,20) + '-' + aaguid.substring(20,24)
    return aaguid // example: "d41f5a69-b817-4144-a13c-9ebd6d9254d6"
}

function resolveAuthenticatorName(authData :ArrayBuffer) :string {
    const aaguid = extractAaguid(authData)
    const aaguidMetadata = updatedAuthenticatorMetadata ?? authenticatorMetadata //await getAaguidMetadata()
    return aaguidMetadata[aaguid]?.name
}

let updatedAuthenticatorMetadata :any = null

// List of AAGUIDs are encoded as JWT here: https://mds.fidoalliance.org/
export async function updateDevicesMetadata() {
    // this function is rather resource intensive and time consuming
    // therefore, the result is cached in local storage
    const jwt = await (await fetch("https://mds.fidoalliance.org")).text()

    // the response is a JWT including all AAGUIDs and their metadata
    console.debug(jwt)

    // let us ignore the JWT verification, since this is solely for descriptive purposes, not signed data
    const payload = jwt.split('.')[1].replaceAll('-', '+').replaceAll('_', '/')
    const json = JSON.parse(atob(payload))
    console.debug(json)

    let aaguidMetadata :any = {}
    for(const e of json.entries) {
        if(!e.aaguid || !e.metadataStatement)
            continue

        aaguidMetadata[e.aaguid] = {name: e.metadataStatement.description}
    }

    console.debug(aaguidMetadata)
    updatedAuthenticatorMetadata = aaguidMetadata
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


function getAlgoName(num :number) :string {
    switch(num) {
        case -7: return "ES256"
        // case -8 ignored to to its rarity
        case -257: return "RS256"
        default: return "unknown"
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
 * @param {boolean} [attestation=false] If enabled, the device attestation and clientData will be provided as base64 encoded binary data.
 *                                Note that this is not available on some platforms.
 */
//
export async function register(username :string, challenge :string, options :any) {
    if(!options)
        options = {}

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
            publicKey: utils.toBase64(response.getPublicKey()),
            algorithm: getAlgoName(credential.response.getPublicKeyAlgorithm())
        },
        authenticator: {
            isLocal: (credential.authenticatorAttachment === "platform"),
            //transport: response.getTransports()[0], // In the RFC but not implemented by browsers
            aaguid: extractAaguid(response.getAuthenticatorData()),
            name: await resolveAuthenticatorName(response.getAuthenticatorData()),
            attestation: options.attestation ? utils.toBase64(response.attestationObject) : null,
            clientData: options.attestation ? utils.toBase64(response.clientDataJSON) : null,
        }
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

    let authOptions :PublicKeyCredentialRequestOptions = {
        challenge: utils.parseBase64url(challenge),
        rpId: window.location.hostname,
        allowCredentials: credentialIds.map(id => { return {
            id: utils.parseBase64url(id),
            type: 'public-key',
            //transports: ['internal', 'usb', 'ble', 'nfc'],
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
        //userHash: utils.toBase64(response.userHandle), // unreliable, optional for authenticators
        clientJson: JSON.parse(utils.parseBuffer(response.clientDataJSON)),
        clientData: utils.toBase64(response.clientDataJSON),
        signature: utils.toBase64(response.signature),
        authenticatorJson: parseAuthenticatorData(response.authenticatorData),
        authenticatorData: utils.toBase64(response.authenticatorData)
    }
}



function concatenateBuffers(buffer1 :ArrayBuffer, buffer2  :ArrayBuffer) {
  var tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
  tmp.set(new Uint8Array(buffer1), 0);
  tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
  return tmp;
};


type VerifyParams = {
    algorithm :string,
    publicKey :string,
    authenticatorData :string,
    clientData :string,
    signature :string
}
// https://w3c.github.io/webauthn/#sctn-verifying-assertion
export async function verify({algorithm, publicKey, authenticatorData, clientData, signature} :VerifyParams) {
    let cryptoKey = await window.crypto.subtle.importKey(
        'spki', utils.parseBase64(publicKey), {name:'RSASSA-PKCS1-v1_5', hash:'SHA-256'}, false, ['verify'])
    console.debug(cryptoKey)

    let clientHash = await utils.sha256( utils.parseBase64(clientData) );
    console.debug(clientHash)


    //let comboBuffer = concatenateBuffers(parseBase64(authenticatorData), parseBase64(clientData)) // clientHash)
    let comboBuffer = concatenateBuffers(utils.parseBase64(authenticatorData), clientHash)
    console.debug(comboBuffer)

    console.debug(utils.parseBase64(signature))

    // https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/verify
    let validity = await window.crypto.subtle.verify({name:'RSASSA-PKCS1-v1_5', hash:'SHA-256'}, cryptoKey, utils.parseBase64(signature), comboBuffer)

    return validity
}