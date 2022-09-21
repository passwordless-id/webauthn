/********************************
     Encoding/Decoding Utils
********************************/

export function toBuffer(txt :string) :ArrayBuffer {
    return Uint8Array.from(txt, c => c.charCodeAt(0)).buffer
}

export function parseBuffer(buffer :ArrayBuffer) :string {
    return String.fromCharCode(...new Uint8Array(buffer))
}

export function toBase64(buffer :ArrayBuffer) :string {
    return btoa(parseBuffer(buffer))
}

export function parseBase64(txt :string) :ArrayBuffer {
    return toBuffer(atob(txt))
}

export function parseBase64url(txt :string) :ArrayBuffer {
    return parseBase64(txt.replace(/-/g, '+').replace(/_/g, '/'))
}

export async function sha256(buffer :ArrayBuffer) :Promise<ArrayBuffer> {
    return await window.crypto.subtle.digest('SHA-256', buffer)
}

export function bufferToHex (buffer :ArrayBuffer) :string {
    return [...new Uint8Array (buffer)]
        .map (b => b.toString (16).padStart (2, "0"))
        .join ("");
}
