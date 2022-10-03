
export type AuthType = 'auto' | 'local' | 'extern' | 'both'


// TODO: although algo "-8" is currently only used optionally by a few security keys, 
// it would not harm to support it for the sake of completeness
export type NumAlgo = -7 | -257
export type NamedAlgo = 'RS256' | 'ES256'


export interface LoginOptions {
    userVerification ?:UserVerificationRequirement,
    authenticatorType ?:AuthType,
    timeout ?:number,
    debug ?:boolean
} 


export interface RegisterOptions extends LoginOptions {
    attestation?: boolean
}
