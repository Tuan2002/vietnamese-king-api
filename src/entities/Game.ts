import { GameConstants } from "@/constants/GameConstants";
import { PrismaService } from "@/services";
import { Words } from "@prisma/client";
import { v4 as uuid } from "uuid";

class GameResult {
    public gameId: string;
    public playerId: string;
    public correctWordIds: Array<string>;
}

class Game {
    public gameId = uuid();
    public players: Array<Player> = [];
    public words: Array<Words> = [];
    public gameResults: Array<GameResult> = [];
    public isPlaying = false;
    public isFinished = false;
    public gameTime = GameConstants.GAME_TIME;
    public gameWordCount = GameConstants.GAME_WORDS;
    public initWords = async (context: PrismaService) => {
        // Random 10 words
        for (let i = 0; i < this.gameWordCount; i++) {
            const word = await context.words.findFirst({
                skip: Math.floor(Math.random() * 1000)
            });
            if (word) {
                this.words.push(word);
            }
        }
    }
}

export { Game, GameResult };
