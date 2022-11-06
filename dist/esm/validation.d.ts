import { NamedAlgo } from './types';
declare type VerifyParams = {
    algorithm: NamedAlgo;
    publicKey: string;
    authenticatorData: string;
    clientData: string;
    signature: string;
};
export declare function verify({ algorithm, publicKey, authenticatorData, clientData, signature }: VerifyParams): Promise<boolean>;
export {};
