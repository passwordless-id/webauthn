
export type AuthType = 'auto' | 'local' | 'extern' | 'both'


// TODO: although algo "-8" is currently only used optionally by a few security keys, 
// it would not harm to support it for the sake of completeness
export type NumAlgo = -7 | -257
export type NamedAlgo = 'RS256' | 'ES256'


export interface LoginOptions {
    userVerification ?:UserVerificationRequirement
    authenticatorType ?:AuthType
    timeout ?:number
    debug ?:boolean
}


export interface LoginResult {
    credentialId: string
    //userHash: string, // unreliable, optional for authenticators
    authenticatorData: string
    clientData: string
    signature: string
    debug?: object
}


export interface RegisterOptions extends LoginOptions {
    attestation?: boolean
}


export interface RegisterResult {
    username: string
    credential: {
        id: string
        publicKey: string
        algorithm: 'RS256' | 'ES256'
    }
    authenticatorData: string
    clientData: string
    attestationData?: string
    debug?: object
}

export interface ClientInfo {
  type: "webauthn.create" | "webauthn.get"
  challenge: string
  origin: string
  crossOrigin: boolean
  tokenBindingId?: {
    id: string
    status: string
  }
  // extensions?
}

export interface AuthenticatorInfo {
    rpIdHash: string,
    flags: {
      userPresent: boolean
      userVerified: boolean
      backupEligibility: boolean
      backupState: boolean
      attestedData: boolean
      extensionsIncluded: boolean
    }
    counter: number
    aaguid: string
    name: string
  }