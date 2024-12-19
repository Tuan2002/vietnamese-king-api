import { GameDto } from '@/models/games/GameDto';
import { GameResultDto } from '@/models/games/GameResultDto';
import { GameSubmitDto } from '@/models/games/GameSubmitDto';
import { PrismaService } from '@/services';
import { checkGameLetters, shuffleLetter } from '@/utils/handleWord';
import { IGameService } from '@interfaces/IGameService';
import { plainToInstance } from 'class-transformer';
import { StatusCodes } from 'http-status-codes';
import { isValidObjectId } from 'mongoose';

class GameService implements IGameService {

    private _context: PrismaService;

    constructor(PrismaService: PrismaService) {
        this._context = PrismaService;
    }

    public async generateNewGameAsync(): Promise<ServiceResponse> {
        try {
            const totalWords = await this._context.words.count();
            const randomIndex = Math.floor(Math.random() * totalWords);
            const randomWord = await this._context.words.findFirst({
                skip: randomIndex
            });

            const wordLetters = shuffleLetter(randomWord.text);
            const newGameTurn = await this._context.gameTurns.create({
                data: {
                    wordId: randomWord.id,
                    wordLetters: wordLetters,
                    createdAt: new Date().toISOString()
                }
            });
            const gameData = plainToInstance(GameDto, newGameTurn, { excludeExtraneousValues: true });
            return {
                statusCode: StatusCodes.OK,
                isSuccess: true,
                data: gameData
            }
        } catch (error) {
            return {
                statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
                isSuccess: false,
                errorMessage: error.message
            };
        }
    }
    public async getGameByIdAsync(gameId: string): Promise<ServiceResponse> {
        try {
            if (!isValidObjectId(gameId)) {
                return {
                    statusCode: StatusCodes.NOT_FOUND,
                    isSuccess: false,
                    errorMessage: 'Invalid gameId'
                };
            }
            const game = await this._context.gameTurns.findUnique({
                where: {
                    id: gameId
                }
            });
            if (!game) {
                return {
                    statusCode: StatusCodes.NOT_FOUND,
                    isSuccess: false,
                    errorMessage: 'GameId is not found'
                };
            }
            const gameData = plainToInstance(GameDto, game, { excludeExtraneousValues: true });
            return {
                statusCode: StatusCodes.OK,
                isSuccess: true,
                data: gameData
            }
        } catch (error) {
            return {
                statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
                isSuccess: false,
                errorMessage: error.message
            };
        }
    }
    public async submitGameTurnAsync(gameSubmit: GameSubmitDto): Promise<ServiceResponse> {
        try {
            const game = await this._context.gameTurns.findUnique({
                where: {
                    id: gameSubmit.gameId
                }
            });

            if (!game) {
                return {
                    statusCode: StatusCodes.NOT_FOUND,
                    isSuccess: false,
                    errorMessage: 'GameId is not found'
                };
            }

            const originWord = await this._context.words.findUnique({
                where: {
                    id: game.wordId
                }
            });

            if (!originWord) {
                return {
                    statusCode: StatusCodes.NOT_FOUND,
                    isSuccess: false,
                    errorMessage: 'WordId is not found'
                };
            }

            if (gameSubmit.letters.length > originWord.text.length) {
                return {
                    statusCode: StatusCodes.BAD_REQUEST,
                    isSuccess: false,
                    errorMessage: 'Letters length is more than the word length'
                };
            }

            const resultLetters = checkGameLetters(originWord.text, gameSubmit.letters);
            const gameResult = plainToInstance(GameResultDto, {
                id: game.id,
                isCorrect: resultLetters.every(letter => letter.isMatched),
                letters: resultLetters
            }, { excludeExtraneousValues: true });
            return {
                statusCode: StatusCodes.OK,
                isSuccess: true,
                data: gameResult
            }
        } catch (error) {
            return {
                statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
                isSuccess: false,
                errorMessage: error.message
            };
        }
    }
}

export default GameService;