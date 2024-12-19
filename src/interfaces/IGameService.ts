import { GameSubmitDto } from "@/models/games/GameSubmitDto"

export interface IGameService {
    generateNewGameAsync(): Promise<ServiceResponse>
    getGameByIdAsync(gameId: string): Promise<ServiceResponse>
    submitGameTurnAsync(gameSubmit: GameSubmitDto): Promise<ServiceResponse>
    
}
