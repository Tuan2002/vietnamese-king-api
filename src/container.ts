import {
    GameService,
    JwtService,
    PrismaService
} from "@/services";
import { asClass, createContainer, InjectionMode } from "awilix";
import "dotenv/config";
import { Environments } from "./constants/Environments";
const container = createContainer({
    injectionMode: InjectionMode.CLASSIC
});
// Register the services
container.register({
    // Register the Services
    PrismaService: process.env.NODE_ENV === Environments.PRODUCTION
        ? asClass(PrismaService).scoped() : asClass(PrismaService).singleton(),
    // RedisService: asClass(RedisService).singleton(),
    JwtService: asClass(JwtService).singleton(),
    GameService: asClass(GameService).scoped()
});
// container.resolve("RedisService");
export default container

