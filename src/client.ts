import * as utils from './utils.js'
import { AuthenticateOptions, AuthenticationEncoded, AuthType, NamedAlgo, NumAlgo, RegisterOptions, RegistrationEncoded } from './types.js'

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




async function getAuthAttachment(authType :AuthType) :Promise<AuthenticatorAttachment|undefined> {
    if(authType === "local")
        return "platform";
    if(authType === "roaming" || authType === "extern")
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
 * @param {'auto'|'local'|'roaming'|'both'}       [options.authenticatorType='auto'] Which device to use as authenticator.
 *          'auto': if the local device can be used as authenticator it will be preferred. Otherwise it will prompt for a roaming device.
 *          'local': use the local device (using TouchID, FaceID, Windows Hello or PIN)
 *          'roaming': use a roaming device (security key or connected phone)
 *          'both': prompt the user to choose between local or roaming device. The UI and user interaction in this case is platform specific.
 * @param {boolean} [options.attestation=false] If enabled, the device attestation and clientData will be provided as Base64url encoded binary data.
 *                                Note that this is not available on some platforms.
 * @param {'discouraged'|'preferred'|'required'} [options.discoverable] A "discoverable" credential can be selected using `authenticate(...)` without providing credential IDs.
 *              Instead, a native pop-up will appear for user selection.
 *              This may have an impact on the "passkeys" user experience and syncing behavior of the key.
 */
export async function register(username :string, challenge :string, options? :RegisterOptions) :Promise<RegistrationEncoded> {
    options = options ?? {}

    if(!utils.isBase64url(challenge))
        throw new Error('Provided challenge is not properly encoded in Base64url')

    const creationOptions :PublicKeyCredentialCreationOptions = {
        challenge: utils.parseBase64url(challenge),
        rp: {
            id: options.domain ?? window.location.hostname,
            name: options.domain ?? window.location.hostname
        },
        user: {
            id: options.userHandle ? utils.toBuffer(options.userHandle) : await utils.sha256(new TextEncoder().encode('passwordless.id-user:' + username)), // ID should not be directly "identifiable" for privacy concerns
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
            residentKey: options.discoverable ?? 'preferred', // official default is 'discouraged'
            requireResidentKey: (options.discoverable === 'required') // mainly for backwards compatibility, see https://www.w3.org/TR/webauthn/#dictionary-authenticatorSelection
        },
        attestation: "direct"
    }

    if(options.debug)
        console.debug(creationOptions)

    const credential = await navigator.credentials.create({publicKey: creationOptions}) as any //PublicKeyCredential
    
    if(options.debug)
        console.debug(credential)
   
    const response = credential.response as any // AuthenticatorAttestationResponse
    
    let registration :RegistrationEncoded = {
        username: username,
        credential: {
            id: credential.id,
            publicKey: utils.toBase64url(response.getPublicKey()),
            algorithm: getAlgoName(credential.response.getPublicKeyAlgorithm())
        },
        authenticatorData: utils.toBase64url(response.getAuthenticatorData()),
        clientData: utils.toBase64url(response.clientDataJSON),
    }

    if(options.attestation) {
        registration.attestationData = utils.toBase64url(response.attestationObject)
    }

    return registration
}


async function getTransports(authType :AuthType) :Promise<AuthenticatorTransport[]> {
    const local  :AuthenticatorTransport[] = ['internal']

    // 'hybrid' was added mid-2022 in the specs and currently not yet available in the official dom types
    // @ts-ignore
    const roaming :AuthenticatorTransport[] = ['hybrid', 'usb', 'ble', 'nfc']
    
    if(authType === "local")
        return local
    if(authType == "roaming" || authType === "extern")
        return roaming
    if(authType === "both")
        return [...local, ...roaming]

    // the default case: "auto", depending on device capabilities
    try {
        if(await isLocalAuthenticator())
            return local
        else
            return roaming
    } catch(e) {
        return [...local, ...roaming]
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
 * @param {'optional'|'conditional'|'required'|'silent'} [options.mediation='optional'] https://developer.mozilla.org/en-US/docs/Web/API/CredentialsContainer/get#mediation
 */
export async function authenticate(credentialIds :string[], challenge :string, options? :AuthenticateOptions) :Promise<AuthenticationEncoded> {
    options = options ?? {}

    if(!utils.isBase64url(challenge))
        throw new Error('Provided challenge is not properly encoded in Base64url')

    const transports = await getTransports(options.authenticatorType ?? "auto");

    let authOptions :PublicKeyCredentialRequestOptions = {
        challenge: utils.parseBase64url(challenge),
        rpId: options.domain ?? window.location.hostname,
        allowCredentials: credentialIds.map(id => { return {
            id: utils.parseBase64url(id),
            type: 'public-key',
            transports: transports,
        }}),
        userVerification: options.userVerification ?? "required",
        timeout: options.timeout ?? 60000,
    }

    if(options.debug)
        console.debug(authOptions)

    let auth = await navigator.credentials.get({publicKey: authOptions, mediation: options.mediation}) as PublicKeyCredential
    
    if(options.debug)
        console.debug(auth)

    const response = auth.response as AuthenticatorAssertionResponse
    
    const authentication :AuthenticationEncoded = {
        credentialId: auth.id,
        authenticatorData: utils.toBase64url(response.authenticatorData),
        clientData: utils.toBase64url(response.clientDataJSON),
        signature: utils.toBase64url(response.signature),
        userHandle: response.userHandle ? utils.toBase64url(response.userHandle) : undefined // may not be returned by every authenticator
    }

    return authentication
}

