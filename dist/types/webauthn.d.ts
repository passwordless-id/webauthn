import { LoginOptions, LoginResult, RegisterOptions, RegisterResult } from './types';
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
export declare function register(username: string, challenge: string, options?: RegisterOptions): Promise<RegisterResult>;
/**
 * Signs a challenge using one of the provided credentials IDs in order to authenticate the user.
 *
 * @param {string[]} credentialIds The list of credential IDs that can be used for signing.
 * @param {string} challenge A server-side randomly generated string, the base64 encoded version will be signed.
 * @param {Object} [options] Optional parameters.
 * @param {number} [options.timeout=60000] Number of milliseconds the user has to respond to the biometric/PIN check.
 * @param {'required'|'preferred'|'discouraged'} [options.userVerification='required'] Whether to prompt for biometric/PIN check or not.
 */
export declare function login(credentialIds: string[], challenge: string, options?: LoginOptions): Promise<LoginResult>;
