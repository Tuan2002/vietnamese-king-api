import { ErrorMessages } from "@/constants/ErrorMessages";
import HttpException from "@/errors/HttpException";
import { JwtService } from "@/services";
import "dotenv/config";
import { RequestHandler } from "express";
import { StatusCodes } from "http-status-codes";
function authenticateMiddleware(): RequestHandler {
    return (req, res, next) => {
        const jwtService = new JwtService();
        const authorization = req.headers['authorization'];
        if (!authorization) {
            const error = new HttpException(StatusCodes.UNAUTHORIZED, ErrorMessages.UNAUTHORIZED);
            return res.status(StatusCodes.UNAUTHORIZED).json(error.getError());
        }
        const accessToken = authorization.split(' ')[1];
        if (!accessToken) {
            const error = new HttpException(StatusCodes.UNAUTHORIZED, ErrorMessages.UNAUTHORIZED);
            return res.status(StatusCodes.UNAUTHORIZED).json(error.getError());
        }
        // Decode the token to get the payload
        const payload = jwtService.getTokenPayload(accessToken);
        const isValid = jwtService.verifyOAuthToken(accessToken);
        // If the token is not valid, return an 401 error code
        if (!isValid) {
            const error = new HttpException(StatusCodes.UNAUTHORIZED, ErrorMessages.UNAUTHORIZED);
            return res.status(StatusCodes.UNAUTHORIZED).json(error.getError());
        }
        // Attach the user to the request object
        req.user = {
            id: payload?.userId || payload?.sub,
            userName: payload?.userName,
        }
        next();
    }
}
export default authenticateMiddleware;