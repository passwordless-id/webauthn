import * as utils from './utils.js'
import { AuthenticateOptions, AuthenticationEncoded, CommonOptions, NamedAlgo, NumAlgo, PublicKeyCredentialHints, RegisterOptions, RegistrationEncoded, User } from './types.js'

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



/**
 * Before "hints" were a thing, the "authenticatorAttachment" was the way to go.
 */
function getAuthAttachment(hints ?:PublicKeyCredentialHints[]) :AuthenticatorAttachment|undefined {
    if(!hints)
        return undefined // The webauthn protocol considers `null` as invalid but `undefined` as "both"!

    if(hints.includes('client-device')) {
        if(hints.includes('security-key') || hints.includes('hybrid'))
            return undefined // both
        else
            return "platform";
    }
    return "cross-platform";
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
 * @param {string|Object} [user] Username or user object (id, name, displayName)
 * @param {string} [challenge] A server-side randomly generated string.
 * @param {number} [timeout=60000] Number of milliseconds the user has to respond to the biometric/PIN check.
 * @param {'required'|'preferred'|'discouraged'} [userVerification='required'] Whether to prompt for biometric/PIN check or not.
 * @param {PublicKeyCredentialHints[]} [hints]: Can contain a list of "client-device", "hybrid" or "security-key"
 * @param {boolean} [attestation=false] If enabled, the device attestation and clientData will be provided as Base64url encoded binary data. Note that this is not available on some platforms.
 * @param {'discouraged'|'preferred'|'required'} [discoverable] A "discoverable" credential can be selected using `authenticate(...)` without providing credential IDs.
 *              Instead, a native pop-up will appear for user selection.
 *              This may have an impact on the "passkeys" user experience and syncing behavior of the key.
 */
export async function register(options :RegisterOptions) :Promise<RegistrationEncoded> {
    
    if(!options.challenge)
        throw new Error('"challenge" required')
    
    if(!options.user)
        throw new Error('"user" required')

    if(!utils.isBase64url(options.challenge))
        throw new Error('Provided challenge is not properly encoded in Base64url')

    const user :User = typeof(options.user) === 'string' ? {name: options.user} : options.user
    if(!user.id)
        user.id = crypto.randomUUID()

    const creationOptions :PublicKeyCredentialCreationOptions = {
        challenge: utils.parseBase64url(options.challenge),
        rp: {
            id: options.domain ?? window.location.hostname,
            name: options.domain ?? window.location.hostname
        },
        user: {
            id: utils.toBuffer(user.id),
            name: user.name,
            displayName: user.displayName ?? user.name,
        },
        pubKeyCredParams: [
            {alg: -7, type: "public-key"},   // ES256 (Webauthn's default algorithm)
            {alg: -257, type: "public-key"}, // RS256 (for older Windows Hello and others)
        ],
        timeout: options.timeout ?? 60000,
        authenticatorSelection: {
            userVerification: options.userVerification ?? "required", // Webauthn default is "preferred"
            authenticatorAttachment: getAuthAttachment(options.hints),
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
        user,
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


function getTransports(hints ?:PublicKeyCredentialHints[]) :AuthenticatorTransport[] {
    const transportMap :Record<PublicKeyCredentialHints, AuthenticatorTransport[]> = {
        'client-device': ['internal'],
        'hybrid': ['hybrid', 'ble', 'nfc'],
        'security-key': ['usb', 'ble', 'nfc']
    }
    const uniqueTransports = new Set<AuthenticatorTransport>();

    if (hints) {
        hints.forEach(hint => {
            if (transportMap.hasOwnProperty(hint)) {
                transportMap[hint].forEach(transport => {
                    uniqueTransports.add(transport);
                });
            }
        });
    } else {
        // If no hints provided, return all supported transports
        Object.values(transportMap).forEach(transports => {
            transports.forEach(transport => {
                uniqueTransports.add(transport);
            });
        });
    }

    return Array.from(uniqueTransports);
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
export async function authenticate(options :AuthenticateOptions) :Promise<AuthenticationEncoded> {
    if(!utils.isBase64url(options.challenge))
        throw new Error('Provided challenge is not properly encoded in Base64url')

    const transports = await getTransports(options.authenticatorType ?? "auto");

    let authOptions :PublicKeyCredentialRequestOptions = {
        challenge: utils.parseBase64url(options.challenge),
        rpId: options.domain ?? window.location.hostname,
        allowCredentials: (options.allowCredentials ?? []).map(id => { return {
            id: utils.parseBase64url(id),
            type: 'public-key',
            transports: transports,
        }}),
        userVerification: options.userVerification ?? "required",
        timeout: options.timeout ?? 60000,
    }

    if(options.debug)
        console.debug(authOptions)

    let auth = await navigator.credentials.get({
        publicKey: authOptions, 
        mediation: options.mediation,
        signal: options.signal
    }) as PublicKeyCredential
    
    if(options.debug)
        console.debug(auth)

    const response = auth.response as AuthenticatorAssertionResponse
    
    const authentication :AuthenticationEncoded = {
        credentialId: auth.id,
        authenticatorData: utils.toBase64url(response.authenticatorData),
        clientData: utils.toBase64url(response.clientDataJSON),
        signature: utils.toBase64url(response.signature),
        userId: response.userHandle ? utils.toBase64url(response.userHandle) : undefined // may not be returned by every authenticator
    }

    return authentication
}

