import { Expose } from "class-transformer";


export type GameLetterDto = {
    letter: string;
    isMatched: boolean;
};

export class GameResultDto {
    @Expose()
    public id: string;
    @Expose()
    public isCorrect: boolean;
    @Expose()
    public letters?: GameLetterDto[];
}