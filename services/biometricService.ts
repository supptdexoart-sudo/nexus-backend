
/**
 * Biometric Service for Nexus Game Companion
 * Handles WebAuthn (Fingerprint/FaceID) integration for PWAs
 */

export const isBiometricAvailable = async (): Promise<boolean> => {
    return (
        window.PublicKeyCredential &&
        typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function' &&
        await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
    );
};

export const registerBiometrics = async (email: string): Promise<boolean> => {
    try {
        if (!await isBiometricAvailable()) return false;

        // Pro zjednodušení v rámci této demo/game aplikace používáme lokální "autorizaci" 
        // V reálné bankovní aplikaci by zde probíhal challenge-response s backendem.
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        const userID = new Uint8Array(16);
        window.crypto.getRandomValues(userID);

        const publicKeyCredentialCreationOptions: any = {
            challenge,
            rp: { name: "Nexus OS", id: window.location.hostname },
            user: {
                id: userID,
                name: email,
                displayName: email,
            },
            pubKeyCredParams: [{ alg: -7, type: "public-key" }], // ES256
            authenticatorSelection: {
                authenticatorAttachment: "platform",
                userVerification: "required",
            },
            timeout: 60000,
            attestation: "none",
        };

        const credential = await navigator.credentials.create({
            publicKey: publicKeyCredentialCreationOptions,
        });

        if (credential) {
            localStorage.setItem('nexus_biometric_linked', 'true');
            localStorage.setItem('nexus_biometric_user', email);
            return true;
        }
        return false;
    } catch (err) {
        console.error("Biometric Registration failed", err);
        return false;
    }
};

export const authenticateBiometric = async (): Promise<string | null> => {
    try {
        if (!await isBiometricAvailable()) return null;
        
        const linkedUser = localStorage.getItem('nexus_biometric_user');
        if (!linkedUser) return null;

        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        const publicKeyCredentialRequestOptions: any = {
            challenge,
            timeout: 60000,
            userVerification: "required",
            rpId: window.location.hostname,
        };

        const assertion = await navigator.credentials.get({
            publicKey: publicKeyCredentialRequestOptions,
        });

        if (assertion) {
            return linkedUser;
        }
        return null;
    } catch (err) {
        console.error("Biometric Authentication failed", err);
        return null;
    }
};

export const unlinkBiometrics = () => {
    localStorage.removeItem('nexus_biometric_linked');
    localStorage.removeItem('nexus_biometric_user');
};
