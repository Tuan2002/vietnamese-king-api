import { LevalStand, LevelCharacterStand } from '@/constants/LevelStand';
import { LocalStorage } from '@/constants/LocalStorage';
import { RequestStorage } from '@/middlewares/AsyncLocalStorage';
import { GameDto } from '@/models/games/GameDto';
import { GameResultDto } from '@/models/games/GameResultDto';
import { GameSubmitDto } from '@/models/games/GameSubmitDto';
import { PrismaService } from '@/services';
import { checkGameLetters, shuffleLetter } from '@/utils/handleWord';
import { IGameService } from '@interfaces/IGameService';
import { Words } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { StatusCodes } from 'http-status-codes';
import { isValidObjectId } from 'mongoose';

class GameService implements IGameService {

    private _context: PrismaService;

    constructor(PrismaService: PrismaService) {
        this._context = PrismaService;
    }

    private async getWordByLevel(currentLevel: number) : Promise<Words> {
        let totalWords = 0;
        let randomOffset = 0;
        let minLetterCount = 0;
        let maxLetterCount = 0;
        switch (true) {
            case (currentLevel <= LevalStand.VERY_EASY):
                totalWords = await this._context.words.count({
                    where: {
                        letterCount: {
                            gte: 1,
                            lte: LevelCharacterStand.VERY_EASY
                        },
                    },
                });
                minLetterCount = 1;
                maxLetterCount = LevelCharacterStand.VERY_EASY;
                randomOffset = Math.floor(Math.random() * totalWords);
                break;
            case (LevalStand.VERY_EASY <= currentLevel && currentLevel <= LevalStand.EASY):
                totalWords = await this._context.words.count({
                    where: {
                        letterCount: {
                            gte: LevelCharacterStand.VERY_EASY,
                            lte: LevelCharacterStand.EASY
                        },
                    },
                });
                minLetterCount = LevelCharacterStand.VERY_EASY;
                maxLetterCount = LevelCharacterStand.EASY;
                randomOffset = Math.floor(Math.random() * totalWords);
                break;
            case (LevalStand.EASY <= currentLevel && currentLevel <= LevalStand.MEDIUM):
                totalWords = await this._context.words.count({
                    where: {
                        letterCount: {
                            gte: LevelCharacterStand.EASY,
                            lte: LevelCharacterStand.MEDIUM
                        },
                    },
                });
                minLetterCount = LevelCharacterStand.EASY;
                maxLetterCount = LevelCharacterStand.MEDIUM
                randomOffset = Math.floor(Math.random() * totalWords);
                break;
            case (LevalStand.MEDIUM <= currentLevel && currentLevel <= LevalStand.HARD):
                totalWords = await this._context.words.count({
                    where: {
                        letterCount: {
                            gte: LevelCharacterStand.MEDIUM,
                            lte: LevelCharacterStand.HARD
                        },
                    },
                });
                minLetterCount = LevelCharacterStand.MEDIUM;
                maxLetterCount = LevelCharacterStand.HARD;
                randomOffset = Math.floor(Math.random() * totalWords);
                break;
            case (LevalStand.HARD <= currentLevel && currentLevel <= LevalStand.VERY_HARD):
                totalWords = await this._context.words.count({
                    where: {
                        letterCount: {
                            gte: LevelCharacterStand.HARD,
                            lte: LevelCharacterStand.VERY_HARD
                        },
                    },
                });
                minLetterCount = LevelCharacterStand.HARD;
                maxLetterCount = LevelCharacterStand.VERY_HARD;
                randomOffset = Math.floor(Math.random() * totalWords);
                break;
            default:
                totalWords = await this._context.words.count({
                    where: {
                        letterCount: {
                            gte: LevelCharacterStand.VERY_HARD,
                        },
                    },
                });
                minLetterCount = LevelCharacterStand.VERY_HARD;
                maxLetterCount = 100
                randomOffset = Math.floor(Math.random() * totalWords);
                break;
        }
        const randomWord = await this._context.words.findFirst({
            where: {
                letterCount: {
                    gte: minLetterCount,
                    lte: maxLetterCount
                }
            },
            skip: randomOffset
        });
        return randomWord;
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

    public async getCurrentChallengeAsync(): Promise<ServiceResponse> {
        try {
            const request = RequestStorage.getStore()?.get(LocalStorage.REQUEST_STORE);
            const userId = request?.user.id;
            if (!userId) {
                return {
                    statusCode: StatusCodes.UNAUTHORIZED,
                    isSuccess: false,
                    errorMessage: 'User is not found'
                };
            }
            const lastChallenge = await this._context.challenges.findFirst({
                where: {
                    userId: userId,
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });
            if (lastChallenge && !lastChallenge.isCorrect) {
                const gameData = plainToInstance(GameDto, lastChallenge, { excludeExtraneousValues: true });
                return {
                    statusCode: StatusCodes.OK,
                    isSuccess: true,
                    data: gameData
                }
            }
            const currentLevel = lastChallenge?.level ?? 0;
            const randomWord = await this.getWordByLevel(currentLevel);
            const wordLetters = shuffleLetter(randomWord.text);
            const newChallenge = await this._context.challenges.create({
                data: {
                    userId: userId,
                    wordId: randomWord.id,
                    wordLetters: wordLetters,
                    level: currentLevel + 1,
                    createdAt: new Date().toISOString()
                }
            });

            const gameData = plainToInstance(GameDto, newChallenge, { excludeExtraneousValues: true });
            return {
                statusCode: StatusCodes.OK,
                isSuccess: true,
                data: gameData
            }

        } catch (error) {
            console.log(error);
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
    public async submitChallengeAsync(gameSubmit: GameSubmitDto) {
        try {
            const request = RequestStorage.getStore()?.get(LocalStorage.REQUEST_STORE);
            const userId = request?.user.id;
            let challenge = await this._context.challenges.findFirst({
                where: {
                    userId: userId,
                    id: gameSubmit.gameId
                }
            });

            if (!challenge) {
                return {
                    statusCode: StatusCodes.NOT_FOUND,
                    isSuccess: false,
                    errorMessage: 'Challenge is not found'
                };
            }

            if (challenge.isCorrect) {
                return {
                    statusCode: StatusCodes.BAD_REQUEST,
                    isSuccess: false,
                    errorMessage: 'Challenge is already completed'
                };
            }

            const originWord = await this._context.words.findUnique({
                where: {
                    id: challenge.wordId
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
            const isCorrect = resultLetters.every(letter => letter.isMatched);
            const challengeResult = plainToInstance(GameResultDto, {
                id: challenge.id,
                isCorrect: isCorrect,
                letters: resultLetters
            }, { excludeExtraneousValues: true });

            if (!isCorrect) {
                return {
                    statusCode: StatusCodes.OK,
                    isSuccess: true,
                    data: challengeResult
                }
            }
            challenge = await this._context.challenges.update({
                where: {
                    id: challenge.id
                },
                data: {
                    isCorrect: true,
                    completedAt: new Date().toISOString()
                }
            });
            const randomWord = await this.getWordByLevel(challenge.level);
            const wordLetters = shuffleLetter(randomWord.text);
            const newChallenge = await this._context.challenges.create({
                data: {
                    userId: userId,
                    wordId: randomWord.id,
                    wordLetters: wordLetters,
                    level: challenge.level + 1,
                    createdAt: new Date().toISOString()
                }
            });
            const gameData = plainToInstance(GameDto, newChallenge, { excludeExtraneousValues: true });
            challengeResult.newGame = gameData;
            return {
                statusCode: StatusCodes.OK,
                isSuccess: true,
                data: challengeResult
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