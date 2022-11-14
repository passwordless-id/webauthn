export declare function parseAuthBuffer(authData: ArrayBuffer): any;
export declare function extractAaguid(authData: ArrayBuffer): string;
export declare function resolveAuthenticatorName(aaguid: string): string;
export declare function updateDevicesMetadata(): Promise<void>;
