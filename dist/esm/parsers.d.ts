import { AuthenticatorInfo, ClientInfo } from './types';
export declare function parseClient(data: string | ArrayBuffer): ClientInfo;
export declare function parseAuthenticator(data: string | ArrayBuffer): AuthenticatorInfo;
export declare function parseAttestation(data: string | ArrayBuffer): unknown;
