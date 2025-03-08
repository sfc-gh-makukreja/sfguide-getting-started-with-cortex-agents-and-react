import { NextResponse } from 'next/server';
import { createHash, createPrivateKey, createPublicKey, KeyObject } from 'crypto';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

function getRSAKey(): Buffer {
    return fs.readFileSync(path.join(process.cwd(), 'rsa_key.p8'));
}

function getDecryptedKey(key: string, passphrase: string): KeyObject {
    try {
        const privateKey = createPrivateKey({
            key: key,
            format: 'pem',
            passphrase: passphrase,
        });
        return privateKey;
    } catch (error) {
        throw new Error("Failed to decrypt private key: " + (error as Error).message);
    }
}

export async function GET() {
    const SNOWFLAKE_RSA_PASSPHRASE = process.env.SNOWFLAKE_RSA_PASSPHRASE ?? '';
    const SNOWFLAKE_RSA_KEY = process.env.SNOWFLAKE_RSA_KEY ?? '';
    try {
        let rsaKey: KeyObject;
        if (SNOWFLAKE_RSA_PASSPHRASE !== '' && SNOWFLAKE_RSA_KEY !== '') {
            rsaKey = getDecryptedKey(SNOWFLAKE_RSA_KEY, SNOWFLAKE_RSA_PASSPHRASE);
        } else {
            rsaKey = createPrivateKey(getRSAKey());
        }
        
        const publicKey = createPublicKey(rsaKey);
        const publicKeyRaw = publicKey.export({ type: 'spki', format: 'der' });

        const sha256Hash = createHash('sha256').update(publicKeyRaw).digest('base64');
        const publicKeyFp = 'SHA256:' + sha256Hash;

        const account = process.env.SNOWFLAKE_ACCOUNT ?? '';
        const user = process.env.SNOWFLAKE_USER ?? '';
        const qualifiedUsername = `${account}.${user}`;

        const nowInSeconds = Math.floor(Date.now() / 1000);

        const oneHourInSeconds = 60 * 60;

        const payload = {
            iss: `${qualifiedUsername}.${publicKeyFp}`,
            sub: qualifiedUsername,
            iat: nowInSeconds,
            exp: nowInSeconds + oneHourInSeconds,
        };

        const token = jwt.sign(payload, rsaKey.export({ format: 'pem', type: 'pkcs8' }).toString(), { algorithm: 'RS256' });

        return NextResponse.json({
            token: {
                token,
                expiresAt: nowInSeconds + oneHourInSeconds - 120 // 2 minutes before actual expiration.
            }
        });
    } catch (error: unknown) {
        if (error instanceof Error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
        return NextResponse.json({ error: 'Unknown error' }, { status: 500 });
    }
}
