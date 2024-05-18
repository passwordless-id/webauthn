/********************************
     Encoding/Decoding Utils
********************************/
export function randomChallenge() {
    return crypto.randomUUID();
}
export function toBuffer(txt) {
    return Uint8Array.from(txt, c => c.charCodeAt(0)).buffer;
}
export function parseBuffer(buffer) {
    return String.fromCharCode(...new Uint8Array(buffer));
}
export function isBase64url(txt) {
    return txt.match(/^[a-zA-Z0-9\-_]+=*$/) !== null;
}
export function toBase64url(buffer) {
    const txt = btoa(parseBuffer(buffer)); // base64
    return txt.replaceAll('+', '-').replaceAll('/', '_');
}
export function parseBase64url(txt) {
    txt = txt.replaceAll('-', '+').replaceAll('_', '/'); // base64url -> base64
    return toBuffer(atob(txt));
}
export async function sha256(buffer) {
    return await crypto.subtle.digest('SHA-256', buffer);
}
export function bufferToHex(buffer) {
    return [...new Uint8Array(buffer)]
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
}
export function concatenateBuffers(buffer1, buffer2) {
    var tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
    tmp.set(new Uint8Array(buffer1), 0);
    tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
    return tmp;
}
;
