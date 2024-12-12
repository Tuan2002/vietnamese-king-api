import { NextFunction, Request, RequestHandler, Response } from "express";
import { SetOptions } from "redis";
import hash from "object-hash"

import { IRedisService } from "@/interfaces";
import { StatusCodes } from "http-status-codes";
import { Securities } from "@/constants/Securities";
const hashRequestKey = (req: Request): string => {
    const requestData = {
        query: req.query,
        body: req.body,
    };
    return `${req.path}@${hash.sha1(requestData)}`;
}

export default function redisCacheMiddleware(RedisService?: IRedisService, options: SetOptions = { EX: Securities.REDIS_EXPIRATION }): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
        if (!RedisService.isRedisConnected() || req.params.noCache || req.headers["cache-control"] === "no-cache") {
            return next();
        }
        const key = hashRequestKey(req);
        // if there is some cached data, retrieve it and return it
        const cachedValue = await RedisService.getDataAsync(key);
        if (!cachedValue) {
            // Override how res.send behaves
            // To introduce the caching logic
            const defaultHandler = res.send;
            res.send = (data) => {
                // Set the function back to avoid the 'double-send' effect
                res.send = defaultHandler;
                // Cache the response only if it is successful
                if (res.statusCode === StatusCodes.OK) {
                    RedisService.setDataAsync(key, data, options).then();
                }
                return res.send(data);
            };
            // Continue to the controller function
            return next();
        }
        try {
            // If it is JSON data, then return it
            return res.json(JSON.parse(cachedValue));
        } catch {
            // If it is not JSON data, then return it
            return res.send(cachedValue);
        }
    };
};