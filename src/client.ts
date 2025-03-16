import { AuthenticateOptions, AuthenticationJSON, Base64URLString, CredentialDescriptor, ExtendedAuthenticatorTransport, PublicKeyCredentialHints, RegisterOptions, RegistrationJSON, User, WebAuthnCreateOptions, WebAuthnGetOptions } from './types.js'
import * as utils from './utils.js'

/**
 * Returns whether passwordless authentication is available on this browser/platform or not.
 */
export function isAvailable(): boolean {
    return !!window.PublicKeyCredential
}

/**
 * Returns whether the device itself can be used as authenticator.
 */
export async function isLocalAuthenticator(): Promise<boolean> {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
}



/**
 * Before "hints" were a thing, the "authenticatorAttachment" was the way to go.
 */
function getAuthAttachment(hints?: PublicKeyCredentialHints[]): AuthenticatorAttachment | undefined {
    if (!hints || hints.length === 0)
        return undefined // The webauthn protocol considers `null` as invalid but `undefined` as "both"!

    if (hints.includes('client-device')) {
        if (hints.includes('security-key') || hints.includes('hybrid'))
            return undefined // both
        else
            return "platform";
    }
    return "cross-platform";
}


/**
 * For autocomplete / conditional mediation, the ongoing "authentication" must be aborted when triggering a registration.
 * It should also be aborted when triggering authentication another time.
 */
let ongoingAuth: AbortController | null = null;


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
 * @param {Record<string, any>} [options.customProperties] - **Advanced usage**: An object of additional
 *     properties that will be merged into the WebAuthn create options. This can be used to 
 *     explicitly set fields such as `excludeCredentials`.
 * 
 * @example
 * const registration = await register({
 *   user: { id: 'user-id', name: 'john', displayName: 'John' },
 *   challenge: 'base64url-encoded-challenge',
 *   customProperties: {
 *     excludeCredentials: [
 *       { id: 'base64url-credential-id', type: 'public-key' },
 *     ],
 *   },
 * });
 */
export async function register(options: RegisterOptions): Promise<RegistrationJSON> {

    if (!options.challenge)
        throw new Error('"challenge" required')

    if (!options.user)
        throw new Error('"user" required')

    if (!utils.isBase64url(options.challenge))
        throw new Error('Provided challenge is not properly encoded in Base64url')

    const user: User = typeof (options.user) === 'string' ? { name: options.user } : options.user
    if (!user.id)
        user.id = crypto.randomUUID()

    const creationOptions: WebAuthnCreateOptions = {
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
            { alg: -7, type: "public-key" },   // ES256 (Webauthn's default algorithm)
            { alg: -257, type: "public-key" }, // RS256 (for older Windows Hello and others)
        ],
        timeout: options.timeout,
        authenticatorSelection: {
            userVerification: options.userVerification,
            authenticatorAttachment: getAuthAttachment(options.hints),
            residentKey: options.discoverable ?? 'preferred', // see https://developer.mozilla.org/en-US/docs/Web/API/PublicKeyCredentialCreationOptions#residentkey
            requireResidentKey: (options.discoverable === 'required') // mainly for backwards compatibility, see https://www.w3.org/TR/webauthn/#dictionary-authenticatorSelection
        },
        attestation: "direct",
        ...options.customProperties,
    }

    console.debug(creationOptions)

    if (ongoingAuth != null)
        ongoingAuth.abort('Cancel ongoing authentication')
    ongoingAuth = new AbortController();

    const raw = await navigator.credentials.create({
        publicKey: creationOptions,
        signal: ongoingAuth?.signal
    }) as PublicKeyCredential
    const response = raw.response as AuthenticatorAttestationResponse

    ongoingAuth = null;

    console.debug(raw)

    if (raw.type != "public-key")
        throw "Unexpected credential type!";

    const publicKey = response.getPublicKey();
    if (!publicKey)
        throw "Non-compliant browser or authenticator!"

    // This should provide the same as `response.toJson()` which is sadly only available on FireFox
    const json: RegistrationJSON = {
        type: raw.type,
        id: raw.id,
        rawId: utils.toBase64url(raw.rawId), // Same as ID, but useful in tests
        authenticatorAttachment: raw.authenticatorAttachment as AuthenticatorAttachment,
        clientExtensionResults: raw.getClientExtensionResults(),
        response: {
            attestationObject: utils.toBase64url(response.attestationObject),
            authenticatorData: utils.toBase64url(response.getAuthenticatorData()),
            clientDataJSON: utils.toBase64url(response.clientDataJSON),
            publicKey: utils.toBase64url(publicKey),
            publicKeyAlgorithm: response.getPublicKeyAlgorithm(),
            transports: response.getTransports() as AuthenticatorTransport[],
        },
        user, // That's our own addition 
    }
    return json
}

export async function isAutocompleteAvailable() {
    return PublicKeyCredential.isConditionalMediationAvailable && PublicKeyCredential.isConditionalMediationAvailable();
}

/**
 * Signs a challenge using one of the provided credentials IDs in order to authenticate the user.
 *
 * @param {string[]} credentialIds The list of credential IDs that can be used for signing.
 * @param {string} challenge A server-side randomly generated string, the base64 encoded version will be signed.
 * @param {number} [timeout=60000] Number of milliseconds the user has to respond to the biometric/PIN check.
 * @param {'required'|'preferred'|'discouraged'} [userVerification='required'] Whether to prompt for biometric/PIN check or not.
 * @param {boolean} [conditional] Does not return directly, but only when the user has selected a credential in the input field with `autocomplete="username webauthn"`
 * @param {Record<string, any>} [options.customProperties] - **Advanced usage**: An object of additional
 *     properties that will be merged into the WebAuthn authenticate options. This can be used to 
 *     explicitly set fields such as `extensions`.
 * 
 * @example
 * const authentication = await authenticate({
 *   challenge: 'base64url-encoded-challenge',
 *   allowCredentials: [],
 *   customProperties: {
 *     extensions: {
 *      uvm: true, // User verification methods extension
 *      appid: "https://legacy-app-id.example.com", // App ID extension for backward compatibility
 *     },
 *   },
 * });
 */
export async function authenticate(options: AuthenticateOptions): Promise<AuthenticationJSON> {
    if (!utils.isBase64url(options.challenge))
        throw new Error('Provided challenge is not properly encoded in Base64url')

    if (options.autocomplete && !(await isAutocompleteAvailable()))
        throw new Error('Passkeys autocomplete with conditional mediation is not available in this browser.')

    let authOptions: WebAuthnGetOptions = {
        challenge: utils.parseBase64url(options.challenge),
        rpId: options.domain ?? window.location.hostname,
        allowCredentials: options.allowCredentials?.map(toPublicKeyCredentialDescriptor),
        hints: options.hints,
        userVerification: options.userVerification,
        timeout: options.timeout,
        ...options.customProperties,
    }

    console.debug(authOptions)

    if(ongoingAuth != null)
        ongoingAuth.abort('Cancel ongoing authentication')
    
    ongoingAuth = new AbortController();
    
    const raw = await navigator.credentials.get({
        publicKey: authOptions,
        mediation: options.autocomplete ? 'conditional' : undefined,
        signal: ongoingAuth?.signal
    }) as PublicKeyCredential

    if (raw.type != "public-key")
        throw "Unexpected credential type!";

    ongoingAuth = null;

    console.debug(raw)

    const response = raw.response as AuthenticatorAssertionResponse

    // This should provide the same as `response.toJson()` which is sadly only available on FireFox
    const json: AuthenticationJSON = {
        clientExtensionResults: raw.getClientExtensionResults(),
        id: raw.id,
        rawId: utils.toBase64url(raw.rawId),
        type: raw.type,
        authenticatorAttachment: raw.authenticatorAttachment as AuthenticatorAttachment,
        response: {
            authenticatorData: utils.toBase64url(response.authenticatorData),
            clientDataJSON: utils.toBase64url(response.clientDataJSON),
            signature: utils.toBase64url(response.signature),
            userHandle: response.userHandle ? utils.toBase64url(response.userHandle) : undefined
        }
    }

    return json
}

function toPublicKeyCredentialDescriptor(cred: Base64URLString | CredentialDescriptor): PublicKeyCredentialDescriptor {
    if(typeof cred === 'string') {
        return {
            id: utils.parseBase64url(cred),
            type: 'public-key'
        }
    }
    else {
        return {
            id: utils.parseBase64url(cred.id),
            type: 'public-key',
            transports: cred.transports as AuthenticatorTransport[]
        }
    }
}
