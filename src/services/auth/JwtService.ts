import logger from '@/helpers/logger';
import IJwtService from "@/interfaces/IJwtService";
import 'dotenv/config';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import ms from 'ms';

class JwtService implements IJwtService {
    private accessTokenSecret: string;
    private refreshTokenSecret: string;
    private accessTokenLife: string;
    private refreshTokenLife: string;
    constructor() {
        this.accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;
        this.refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;
        this.accessTokenLife = process.env.ACCESS_TOKEN_LIFE;
        this.refreshTokenLife = process.env.REFRESH_TOKEN_LIFE;
    }
    /**
     * This method generates an tokenContainer object that contains the token, expiresAt, and expiresAtUtc.
     * @param payload
     * @returns TokenResponse
     */
    generateAccessToken(payload: any): TokenResponse {
        const accessToken = jwt.sign(payload, this.accessTokenSecret, { expiresIn: this.accessTokenLife, algorithm: 'HS256' });
        const expiresAt = new Date(Date.now() + ms(this.accessTokenLife));
        const expiresAtUtc = new Date(Date.now() + ms(this.accessTokenLife)).toUTCString();
        return {
            id: payload.jti,
            token: accessToken,
            expiresAt,
            expiresAtUtc
        };
    }
    verifyAccessToken(token: string): boolean {
        try {
            jwt.verify(token, this.accessTokenSecret);
            return true;
        } catch (error) {
            return false;
        }
    }
    getTokenPayload(token: string): any {
        return jwt.decode(token);
    }

    getTokenHeader(token: string): any {
        const tokenHeader = jwt.decode(token, { complete: true })?.header;
        return tokenHeader;
    }
    generateRefreshToken(payload: any): TokenResponse {
        const refreshToken = jwt.sign(payload, this.refreshTokenSecret, { expiresIn: this.refreshTokenLife, algorithm: 'HS256' });
        const expiresAt = new Date(Date.now() + ms(this.refreshTokenLife));
        const expiresAtUtc = new Date(Date.now() + ms(this.refreshTokenLife)).toUTCString();
        return {
            id: payload.jti,
            token: refreshToken,
            expiresAt,
            expiresAtUtc
        };
    }
    verifyRefreshToken(token: string): boolean {
        try {
            jwt.verify(token, this.refreshTokenSecret);
            return true;
        } catch (error) {
            return false;
        }
    }

    async verifyOAuthToken(token: string): Promise<boolean> {
        try {
            const client = jwksClient({
                jwksUri: `${process.env.CLERK_API_URL}/V1/jwks`,
                requestHeaders: {
                    Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`
                },
            });
            const tokenHeader = this.getTokenHeader(token);
            if (!tokenHeader || !tokenHeader.kid) {
                return false;
            }
            const key = await client.getSigningKey(tokenHeader.kid);
            const signingKey = key.getPublicKey();
            jwt.verify(token, signingKey, {algorithms: ["RS256"]});
            return true;
        }
        catch (error) {
            logger.error(error);
            return false;
        }
    }



}
export default JwtService;