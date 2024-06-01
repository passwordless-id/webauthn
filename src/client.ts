import * as utils from './utils.js'
import { AuthenticateOptions, AuthenticationEncoded, CommonOptions, NamedAlgo, NumAlgo, PublicKeyCredentialHints, RegisterOptions, RegistrationEncoded, User, WebAuthnCreateOptions, WebAuthnGetOptions } from './types.js'

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
    if(!hints || hints.length === 0)
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

    const creationOptions :WebAuthnCreateOptions = {
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
        hints: options.hints,
        pubKeyCredParams: [
            {alg: -7, type: "public-key"},   // ES256 (Webauthn's default algorithm)
            {alg: -257, type: "public-key"}, // RS256 (for older Windows Hello and others)
        ],
        timeout: options.timeout,
        authenticatorSelection: {
            userVerification: options.userVerification,
            authenticatorAttachment: getAuthAttachment(options.hints),
            residentKey: options.discoverable,
            requireResidentKey: (options.discoverable === 'required') // mainly for backwards compatibility, see https://www.w3.org/TR/webauthn/#dictionary-authenticatorSelection
        },
        attestation: "direct"
    }

    if(options.debug)
        console.debug(creationOptions)

    if(ongoingAuth != null)
        ongoingAuth.abort('Stopping ongoing conditional UI authentication')
    ongoingAuth = new AbortController();

    const credential = await navigator.credentials.create({
        publicKey: creationOptions,
        signal: ongoingAuth?.signal
    }) as any //PublicKeyCredential
    
    ongoingAuth = null;

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
    if(!hints || hints.length === 0)
        return ['internal', 'hybrid', 'usb', 'ble', 'nfc']

    const transportMap :Record<PublicKeyCredentialHints, AuthenticatorTransport[]> = {
        'client-device': ['internal'],
        'hybrid': ['hybrid', 'ble', 'nfc'],
        'security-key': ['usb', 'ble', 'nfc']
    }
    const uniqueTransports = new Set<AuthenticatorTransport>();

    hints.forEach(hint => {
        if (transportMap.hasOwnProperty(hint)) {
            transportMap[hint].forEach(transport => {
                uniqueTransports.add(transport);
            });
        }
    });

    return Array.from(uniqueTransports);
}

let ongoingAuth :AbortController|null = null;

/**
 * Signs a challenge using one of the provided credentials IDs in order to authenticate the user.
 *
 * @param {string[]} credentialIds The list of credential IDs that can be used for signing.
 * @param {string} challenge A server-side randomly generated string, the base64 encoded version will be signed.
 * @param {number} [timeout=60000] Number of milliseconds the user has to respond to the biometric/PIN check.
 * @param {'required'|'preferred'|'discouraged'} [userVerification='required'] Whether to prompt for biometric/PIN check or not.
 * @param {boolean} [conditional] Does not return directly, but only when the user has selected a credential in the input field with `autocomplete="username webauthn"`
 */
export async function authenticate(options :AuthenticateOptions) :Promise<AuthenticationEncoded> {
    if(!utils.isBase64url(options.challenge))
        throw new Error('Provided challenge is not properly encoded in Base64url')

    const transports :AuthenticatorTransport[] = getTransports(options.hints);

    let authOptions :WebAuthnGetOptions = {
        challenge: utils.parseBase64url(options.challenge),
        rpId: options.domain ?? window.location.hostname,
        allowCredentials: options.allowCredentials?.map(id => { return {
            id: utils.parseBase64url(id),
            type: 'public-key',
            transports: transports,
        }}),
        hints: options.hints,
        userVerification: options.userVerification,
        timeout: options.timeout,
    }

    if(options.debug)
        console.debug(authOptions)

    if(ongoingAuth != null)
        ongoingAuth.abort('Stopping ongoing conditional UI authentication')
    ongoingAuth = new AbortController();
    
    let auth = await navigator.credentials.get({
        publicKey: authOptions,
        mediation: options.conditional ? 'conditional' : undefined,
        signal: ongoingAuth?.signal
    }) as PublicKeyCredential
    
    ongoingAuth = null;

    if(options.debug)
        console.debug(auth)

    const response = auth.response as AuthenticatorAssertionResponse
    
    const authentication :AuthenticationEncoded = {
        credentialId: auth.id,
        authenticatorData: utils.toBase64url(response.authenticatorData),
        clientData: utils.toBase64url(response.clientDataJSON),
        signature: utils.toBase64url(response.signature),
        userId: response.userHandle ? utils.parseBuffer(response.userHandle) : undefined // may not be returned by every authenticator
    }

    return authentication
}
