import { IGameService } from "@/interfaces/IGameService";
import { validationMiddleware } from "@/middlewares";
import authenticateMiddleware from "@/middlewares/AuthenticateMiddleware";
import { GameSubmitDto } from "@/models/games/GameSubmitDto";
import { before, GET, POST, route } from "awilix-express";
import { Request, Response } from "express";
// DOT NOT REMOVE COMMENTS WHICH START WITH /** @swagger AND END WITH */
// IT'S USED TO GENERATE SWAGGER DOCUMENTS
/**
 * @swagger
 * "tags": {
 *   "name": "Game",
 *   "description": "API for Game"
 * }
 */
@route("/games")
export class GameController {
    private _gameService: IGameService
    constructor(GameService: IGameService) {
        this._gameService = GameService;
    }
    /**
     * @swagger
     * "/games/generate-game":
     *   get:
     *     tags:
     *       - "Game"
     *     summary: "Generate a new word"
     *     description: "Generate a new word"
     *     produces:
     *       - "application/json"
     *     responses:
     *       200:
     *         description: "Game generated successfully"
     *         content:
     *           application/json:
     *            schema:
     *             $ref: "#/components/schemas/GameDto"
     *       500:
     *         description: "Internal Server Error"
     */
    @GET()
    @route("/generate-game")
    public async generateNewGame(req: Request, res: Response) {
        const response = await this._gameService.generateNewGameAsync();
        return res.status(response.statusCode).json(response);
    }
    /**
     * @swagger
     * "/games/{gameId}":
     *   get:
     *     tags:
     *       - "Game"
     *     summary: "Get game by id"
     *     description: "Get game by id"
     *     produces:
     *       - "application/json"
     *     parameters:
     *       - name: "gameId"
     *         in: "path"
     *         description: "Game id"
     *         required: true
     *         type: "string"
     *     responses:
     *       200:
     *         description: "Game found"
     *         content:
     *           application/json:
     *            schema:
     *             $ref: "#/components/schemas/GameDto"
     *       404:
     *         description: "Game not found"
     *       500:
     *         description: "Internal Server Error"
     */
    @GET()
    @route("/:gameId")
    public async getGameById(req: Request, res: Response) {
        const gameId = req.params.gameId;
        const response = await this._gameService.getGameByIdAsync(gameId);
        return res.status(response.statusCode).json(response);
    }
    /**
     * @swagger
     * "/games/submit-game":
     *   post:
     *     tags:
     *       - "Game"
     *     summary: "Submit game turn"
     *     description: "Submit game turn"
     *     produces:
     *       - "application/json"
     *     requestBody:
     *       content:
     *         application/json:
     *           schema:
     *             $ref: "#/components/schemas/GameSubmitDto"
     *     responses:
     *       200:
     *         description: "Game submitted successfully"
     *         content:
     *           application/json:
     *            schema:
     *             $ref: "#/components/schemas/GameDto"
     *       404:
     *         description: "Game not found"
     *       500:
     *         description: "Internal Server Error"
     */
    @POST()
    @before(validationMiddleware(GameSubmitDto))
    @route("/submit-game")
    public async submitGameTurn(req: Request, res: Response) {
        const response = await this._gameService.submitGameTurnAsync(req.body);
        return res.status(response.statusCode).json(response);
    }

    /**
     * @swagger
     * "/games/current-challenge":
     *   post:
     *     tags:
     *       - "Game"
     *     summary: "Get current challenge"
     *     description: "Get current challenge"
     *     produces:
     *       - "application/json"
     *     responses:
     *       200:
     *         description: "Current challenge found"
     *         content:
     *           application/json:
     *            schema:
     *             $ref: "#/components/schemas/GameDto"
     *       404:
     *         description: "Current challenge not found"
     *       500:
     *         description: "Internal Server Error"
     */

    @POST()
    @before([authenticateMiddleware()])
    @route("/current-challenge")
    public async getCurrentChallenge(req: Request, res: Response) {
        const response = await this._gameService.getCurrentChallengeAsync();
        return res.status(response.statusCode).json(response);
    }

    /**
     * @swagger
     * "/games/submit-challenge":
     *   post:
     *     tags:
     *       - "Game"
     *     summary: "Submit challenge"
     *     description: "Submit challenge"
     *     produces:
     *       - "application/json"
     *     requestBody:
     *       content:
     *         application/json:
     *           schema:
     *             $ref: "#/components/schemas/GameSubmitDto"
     *     responses:
     *       200:
     *         description: "Challenge submitted successfully"
     *         content:
     *           application/json:
     *            schema:
     *             $ref: "#/components/schemas/GameDto"
     *       404:
     *         description: "Challenge not found"
     *       500:
     *         description: "Internal Server Error"
     */
    @POST()
    @before([authenticateMiddleware()])
    @before(validationMiddleware(GameSubmitDto))
    @route("/submit-challenge")
    public async submitChallenge(req: Request, res: Response) {
        const response = await this._gameService.submitChallengeAsync(req.body);
        return res.status(response.statusCode).json(response);
    }
}