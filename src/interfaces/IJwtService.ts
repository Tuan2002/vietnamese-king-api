export default interface IJwtService {
    /**
     * @description generateToken
     * @param payload
     */
    generateAccessToken(payload: any): TokenResponse;
    /**
     * @description verifyToken.
     * @param token
     */
    verifyAccessToken(token: string): boolean;
    /**
     * @description getTokenPayload.
     * @param token
     */
    getTokenPayload(token: string): any;
    /**
     * @description generateRefreshToken.
     * @param payload
     */
    generateRefreshToken(payload: any): TokenResponse;
    /**
     * @description verifyRefreshToken.
     * @param token
     */
    verifyRefreshToken(token: string): boolean;
    /**
     * @description getRefreshTokenPayload.
     * @param token
     */


}