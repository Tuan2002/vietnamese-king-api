import logger from "@/helpers/logger";
import { IRedisService } from "@/interfaces";
import type { RedisClientType, SetOptions } from "redis";
import { createClient } from "redis";

export default class RedisService implements IRedisService {
    private redisClient: RedisClientType;
    private redisConnected: boolean = false;
    private retryCount: number = 0;
    private maxRetries: number = 3;
    private reconnectInterval: number = 2000;
    private timeoutId: NodeJS.Timeout | null = null;
    constructor() {
        this.redisClient = createClient({
            url: process.env.REDIS_URL
        });

        this.redisClient.on("connect", () => {
            this.retryCount = 0; // Reset retry count on successful connection
            clearTimeout(this.timeoutId);
            console.log("Initializing connection to Redis at: " + new Date().toISOString());
        });
        this.redisClient.on("ready", () => {
            this.redisConnected = true;
            console.log("Redis connected successfully at: " + new Date().toISOString());
        });

        this.redisClient.on("error", (error) => {
            this.redisConnected = false;
            console.error("Can't connect to Redis: ", error);
            // Trigger reconnection attempt only if not disconnected
            if (this.retryCount === 0) {
                this.tryReconnect();
            }
        });
        this.createConnection();
    }

    public async createConnection(): Promise<void> {
        try {
            await this.redisClient.connect();
        } catch (error) {
            // console.error("Error while connecting to Redis: ", error);
            this.tryReconnect();
        }
    }

    private tryReconnect(): void {
        if (this.retryCount < this.maxRetries) {
            this.retryCount++;
            console.log(`Retrying connection (${this.retryCount}/${this.maxRetries})...`);
            clearTimeout(this.timeoutId);
            this.timeoutId = setTimeout(() => this.createConnection(), this.reconnectInterval);
        } else {
            console.log("Max retries reached. Could not connect to Redis.");
        }
    }

    public isRedisConnected(): boolean {
        return this.redisConnected;
    }
    public async setDataAsync(key: string, value: any, options: SetOptions): Promise<void> {
        if (this.redisConnected) {
            try {
                await this.redisClient.set(key, value, options);
            }
            catch (error) {
                logger.error("Error while setting data in Redis: ", error);
            }
        }
    }
    public async getDataAsync(key: string): Promise<any> {
        let data: any = null;
        if (this.redisConnected) {
            try {
                data = await this.redisClient.get(key);
            }
            catch (error) {
                logger.error("Error while getting data from Redis: ", error);
            }
        }
        return data;
    }
}
