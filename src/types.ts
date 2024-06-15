export type NamedAlgo = 'RS256' | 'EdDSA' | 'ES256'
export type Base64URLString = string;


/**
 * The available "hints" for WebAuthn, not yet available in the official DOM types
 */
export type PublicKeyCredentialHints = "client-device" | "hybrid" | "security-key"

/**
 * Extends the native DOM type since the "hints" are not yet included in the official version.
 */
export interface WebAuthnCreateOptions extends PublicKeyCredentialCreationOptions {
  hints?: PublicKeyCredentialHints[]
}

/**
 * Extends the native DOM type since the "hints" are not yet included in the official version.
 */
export interface WebAuthnGetOptions extends PublicKeyCredentialRequestOptions {
  hints?: PublicKeyCredentialHints[]
}


/*********************** OPTIONS *************************/

export interface CommonOptions {
  challenge: string
  domain?: string // used for parent/subdomain auth and other exotic use cases
  userVerification?: UserVerificationRequirement
  hints?: PublicKeyCredentialHints[]
  timeout?: number
  debug?: boolean
}

export interface RegisterOptions extends CommonOptions {
  user: string | User
  attestation?: boolean
  discoverable?: ResidentKeyRequirement
}


export interface User {
  id?: string
  name: string
  displayName?: string
}

/**
 * @see PublicKeyCredentialDescriptor
 */
export interface CredentialDescriptor {
  id: Base64URLString,
  transports?: AuthenticatorTransport[]
}

export interface AuthenticateOptions extends CommonOptions {
  allowCredentials?: CredentialDescriptor[]
  conditional?: boolean
}



/********************************** JSON PAYLOADS **********************/

export interface RegistrationJSON extends RegistrationResponseJSON {
  user: User // Added by this library, not by the WebAuthn protocol
}

export type AuthenticationJSON = AuthenticationResponseJSON;

/**
 * https://w3c.github.io/webauthn/#dictdef-registrationresponsejson
 */
export interface RegistrationResponseJSON {
  /** The credential ID */
  id: Base64URLString;
  /** The credential ID */
  rawId: Base64URLString;
  response: AuthenticatorAttestationResponseJSON;
  authenticatorAttachment?: AuthenticatorAttachment;
  clientExtensionResults: AuthenticationExtensionsClientOutputs;
  type: PublicKeyCredentialType;
}


/**
 * A slightly-modified AuthenticatorAttestationResponse to simplify working with ArrayBuffers that
 * are Base64URL-encoded in the browser so that they can be sent as JSON to the server.
 *
 * https://w3c.github.io/webauthn/#dictdef-authenticatorattestationresponsejson
 */
export interface AuthenticatorAttestationResponseJSON {
  attestationObject: Base64URLString;
  authenticatorData: Base64URLString;
  clientDataJSON: Base64URLString;
  transports: AuthenticatorTransport[];
  publicKey: Base64URLString;
  publicKeyAlgorithm: COSEAlgorithmIdentifier;
}

/**
 * A slightly-modified AuthenticationCredential to simplify working with ArrayBuffers that
 * are Base64URL-encoded in the browser so that they can be sent as JSON to the server.
 *
 * https://w3c.github.io/webauthn/#dictdef-authenticationresponsejson
 */
export interface AuthenticationResponseJSON {
  id: Base64URLString;
  rawId: Base64URLString;
  response: AuthenticatorAssertionResponseJSON;
  authenticatorAttachment?: AuthenticatorAttachment;
  clientExtensionResults: AuthenticationExtensionsClientOutputs;
  type: PublicKeyCredentialType;
}


/**
 * A slightly-modified AuthenticatorAssertionResponse to simplify working with ArrayBuffers that
 * are Base64URL-encoded in the browser so that they can be sent as JSON to the server.
 *
 * https://w3c.github.io/webauthn/#dictdef-authenticatorassertionresponsejson
 */
export interface AuthenticatorAssertionResponseJSON {
  clientDataJSON: Base64URLString;
  authenticatorData: Base64URLString;
  signature: Base64URLString;
  userHandle?: Base64URLString;
}

/**
 * WebAuthn added transports that are not yet defined in the DOM definitions.
 * However, it's partly obsoleted by the `hints` in the registration/authentication request.
 */
export type AuthenticatorTransport =
  | 'ble'
  | 'cable'
  | 'hybrid'
  | 'internal'
  | 'nfc'
  | 'smart-card'
  | 'usb';


/************************** PARSED **************************/

/**
 * https://w3c.github.io/webauthn/#dictionary-client-data
 */
export interface CollectedClientData {
  type: string
  challenge: Base64URLString
  origin: string
  topOrigin?: string
  crossOrigin?: boolean;
}

/**
 * https://w3c.github.io/webauthn/#sctn-authenticator-data
 */

/************************** RESULTS *************************/

export interface RegistrationInfo {
  user: UserInfo
  credential: CredentialInfo
  authenticator: AuthenticatorInfo
  attestation?: Base64URLString
}


export interface AuthenticationInfo {
  credentialId: Base64URLString
  authenticator: AuthenticatorInfo
  userId?: Base64URLString
}


export interface UserInfo {
  id: string
  name: string
  displayName: string
}


export interface CredentialInfo {
  id: string
  publicKey: string
  algorithm: NamedAlgo
}

export interface AuthenticatorInfo {
  counter: number
  aaguid: string
  name: string
  synced: boolean
  userVerified: boolean
  icon_light: string
  icon_dark: string
}
