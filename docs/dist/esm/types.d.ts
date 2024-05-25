export type NumAlgo = -7 | -8 | -257;
export type NamedAlgo = 'RS256' | 'Ed25519' | 'ES256';
export type PublicKeyCredentialHints = "client-device" | "hybrid" | "security-key";
export interface WebAuthnCreateOptions extends PublicKeyCredentialCreationOptions {
    hints?: PublicKeyCredentialHints[];
}
export interface WebAuthnGetOptions extends PublicKeyCredentialRequestOptions {
    hints?: PublicKeyCredentialHints[];
}
export interface CommonOptions {
    challenge: string;
    domain?: string;
    userVerification?: UserVerificationRequirement;
    hints?: PublicKeyCredentialHints[];
    timeout?: number;
    debug?: boolean;
}
export interface AuthenticateOptions extends CommonOptions {
    allowCredentials?: string[];
    onAutofill?: boolean;
}
export interface AuthenticationEncoded {
    credentialId: string;
    authenticatorData: string;
    clientData: string;
    signature: string;
    userId?: string;
}
export interface AuthenticationParsed {
    credentialId: string;
    authenticator: AuthenticatorInfo;
    client: ClientInfo;
    signature: string;
}
export interface RegisterOptions extends CommonOptions {
    user: string | User;
    attestation?: boolean;
    discoverable?: ResidentKeyRequirement;
}
export interface User {
    id?: string;
    name: string;
    displayName?: string;
}
export interface CredentialKey {
    id: string;
    publicKey: string;
    algorithm: NamedAlgo;
    synced?: boolean;
}
export interface RegistrationEncoded {
    user: User;
    credential: CredentialKey;
    authenticatorData: string;
    clientData: string;
    attestationData?: string;
}
export interface RegistrationParsed {
    user: User;
    credential: CredentialKey;
    authenticator: AuthenticatorInfo;
    client: ClientInfo;
    attestation?: any;
}
export interface ClientInfo {
    type: "webauthn.create" | "webauthn.get";
    challenge: string;
    origin: string;
    crossOrigin: boolean;
    tokenBindingId?: {
        id: string;
        status: string;
    };
    extensions?: any;
}
export interface AuthenticatorInfo {
    rpIdHash: string;
    flags: {
        userPresent: boolean;
        userVerified: boolean;
        backupEligibility: boolean;
        backupState: boolean;
        attestedData: boolean;
        extensionsIncluded: boolean;
    };
    counter: number;
    aaguid: string;
    name: string;
    icon_light: string;
    icon_dark: string;
}
