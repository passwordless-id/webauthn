import { AuthenticatorInfo, ClientInfo, RegistrationEncoded, RegistrationParsed, AuthenticationEncoded, AuthenticationParsed } from './types';
export declare function parseClient(data: string | ArrayBuffer): ClientInfo;
export declare function parseAuthenticator(data: string | ArrayBuffer): AuthenticatorInfo;
export declare function parseAttestation(data: string | ArrayBuffer): unknown;
export declare function parseRegistration(registration: RegistrationEncoded): RegistrationParsed;
export declare function parseAuthentication(authentication: AuthenticationEncoded): AuthenticationParsed;
