import { AuthenticateOptions, AuthenticationEncoded, RegisterOptions, RegistrationEncoded } from './types.js';
/**
 * Returns whether passwordless authentication is available on this browser/platform or not.
 */
export declare function isAvailable(): boolean;
/**
 * Returns whether the device itself can be used as authenticator.
 */
export declare function isLocalAuthenticator(): Promise<boolean>;
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
export declare function register(options: RegisterOptions): Promise<RegistrationEncoded>;
/**
 * Signs a challenge using one of the provided credentials IDs in order to authenticate the user.
 *
 * @param {string[]} credentialIds The list of credential IDs that can be used for signing.
 * @param {string} challenge A server-side randomly generated string, the base64 encoded version will be signed.
 * @param {number} [timeout=60000] Number of milliseconds the user has to respond to the biometric/PIN check.
 * @param {'required'|'preferred'|'discouraged'} [userVerification='required'] Whether to prompt for biometric/PIN check or not.
 * @param {boolean} [onAutofill] Does not return directly, but only when the user has selected a credential in the input field with `autocomplete="username webauthn"`
 */
export declare function authenticate(options: AuthenticateOptions): Promise<AuthenticationEncoded>;
