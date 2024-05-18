export declare function parseAuthBuffer(authData: ArrayBuffer): any;
export declare function extractAaguid(authData: ArrayBuffer): string;
/**
 * Kept for compatibility purposes.
 * @deprecated
 */
export declare function resolveAuthenticatorName(aaguid: string): string;
/**
 * Updates the built-in metadata according to raw data available at https://mds.fidoalliance.org/
 * This service delivers a list of AAGUIDs encoded as a JWT.
 * Kept for compatibility purposes.
 * @deprecated
 */
export declare function updateDevicesMetadata(): Promise<void>;
