import { RedisClientOptions, SetOptions } from "redis";

export default interface IRedisService {
    isRedisConnected(): boolean;
    setDataAsync(key: string, value: any, options: SetOptions): Promise<void>;
    getDataAsync(key: string): Promise<any>;
}