import Application from "@/app";
import { GameEvents } from "@/constants/GameEvents";
import { Game } from "@/entities/Game";
import ISocketGameService from "@/interfaces/ISocketGameService";
import PrismaService from "@/services/database/PrismaService";
import { checkGameLetters, shuffleLetter } from "@/utils/handleWord";
import schedule from 'node-schedule';
import { Server, Socket } from "socket.io";

class SocketGameService implements ISocketGameService {
    private socketServer: Server;
    private _context: PrismaService;
    private onlinePlayers: Array<Player> = [];
    private Games: Array<Game> = [];

    constructor(Application: Application, PrismaService: PrismaService) {
        this.socketServer = Application.socketServer;
        this._context = PrismaService;
        this.initGameService();
    }

    private initGameService = () => {
        this.socketServer.on("connection", this.onSocketConnect);
        this.initScheduler();
    }

    private onSocketConnect = (socket: Socket) => {
        this.socketServer.emit(GameEvents.USER_CONNECTED, { id: socket.id });
        socket.on("disconnect", () => this.onDisconnect(socket));
        socket.on(GameEvents.PLAYER_JOIN, (player: Player) => this.onPlayerJoin(player, socket));
        socket.on(GameEvents.FIND_OPPONENT, () => this.onFindOpponent(socket));
        socket.on(GameEvents.STOP_FIND_OPPONENT, () => this.onStopFindOpponent(socket));
        socket.on(GameEvents.GAME_START, (gameId: string) => this.onGameStart(gameId));
        socket.on(GameEvents.WORD_SUBMIT, (data: { gameId: string, wordId: string, letters: Array<string> }) =>
            this.onWordSubmit(data, socket));
        socket.on(GameEvents.CONFIRM_GAME_RESULT, (gameId: string) => this.onConfirmGameResult(gameId));
        socket.on(GameEvents.EXIT_GAME, (gameId: string) => this.onExitGame(gameId, socket));
    }

    onDisconnect = (socket: Socket) => {
        const player = this.onlinePlayers.find((player) => player.socketId === socket.id);
        if (!player) return;
        this.onlinePlayers = this.onlinePlayers.filter((player) => player.socketId !== socket.id);
        console.log("Online Players at disconnect: ", this.onlinePlayers);
        const game = this.Games.find((game) => game.players.some((player) => player.id === player.id));
        if (!game) return;
        game.players = game.players.filter((player) => player.id !== player.id);
        if (game.players.length === 0) {
            this.Games = this.Games.filter((game) => game.gameId !== game.gameId);
        }
        if (game.players.length === 1) {
            const winner = game.players[0];
            const winnerSocket = this.socketServer.sockets.sockets.get(winner.socketId);
            winnerSocket.emit(GameEvents.GAME_FINISH, {
                gameId: game.gameId,
                winner: winner,
                message: `Đối thủ bỏ cuộc, ${winner.playerName} đã chiến thắng`
            });
            const winnerPlayer = this.onlinePlayers.find((player) => player.id === winner.id)
            if (winnerPlayer) {
                winnerPlayer.isPlaying = false;
            }
            this.onConfirmGameResult(game.gameId);
        }
    }

    private onPlayerJoin = (player: Player, socket: Socket) => {
        const existedPlayer = this.onlinePlayers.find((p) => p.id === player.id && p.socketId === socket.id);
        if (existedPlayer) return;
        this.onlinePlayers.push({ ...player, socketId: socket.id, isPending: false, isPlaying: false });
        console.log("Online Players at join game: ", this.onlinePlayers);
        socket.emit(GameEvents.PLAYER_JOIN, { ...player, socketId: socket.id });
    }

    private onFindOpponent = (socket: Socket) => {
        console.log("Online Players at find opponent: ", this.onlinePlayers);
        const player = this.onlinePlayers.find((player) => player.socketId === socket.id);
        if (!player) return;
        if (player.isPlaying || player.isPending) {
            socket.emit(GameEvents.GAME_ERROR, {
                message: "Bạn đang chơi ở màn chơi khác hoặc đang tìm đối thủ"
            });
            return;
        }
        player.isPending = true;
    }

    private onStopFindOpponent = (socket: Socket) => {
        const player = this.onlinePlayers.find((player) => player.socketId === socket.id);
        if (!player) return;
        player.isPending = false;
    }

    private onGameStart = async (gameId: string) => {
        try {
            console.log("Game start at: ", new Date().toISOString());
            console.log("Online Players at start: ", this.onlinePlayers);
            const game = this.Games.find((game) => game.gameId === gameId);
            if (!game) return;
            const players = game.players.map((player) => this.onlinePlayers.find((p) => p.id === player.id));
            players.forEach((player) => {
                player.isPlaying = true;
            });
            game.isPlaying = true;
            await game.initWords(this._context);
            console.log("Game words: ", game.words);
            const firstWordLetters = shuffleLetter(game.words[0].text);
            // Send the game start event to the players with the first word
            this.socketServer.to(game.gameId).emit(GameEvents.GAME_STARTED, { gameId: game.gameId, wordId: game.words[0].id, wordLetters: firstWordLetters });
            setTimeout(() => {
                // If all players has the same correctWordIds length, no one wins
                if (game.gameResults.every((result) => result?.correctWordIds.length === game.gameResults[0]?.correctWordIds.length)) {
                    this.socketServer.to(game.gameId).emit(GameEvents.GAME_TIME_END, {
                        gameId: game.gameId,
                        winner: null,
                        message: "Trận đầu kết thức với kết quả hòa"
                    });
                    game.isPlaying = false;
                    this.onConfirmGameResult(game.gameId);
                    return;
                }
                // Find the player who has the most correctWord
                const betterResult = game.gameResults.reduce((prev, current) =>
                    prev?.correctWordIds.length > current.correctWordIds?.length ? prev : current);
                const winner = game.players.find((player) => player.id === betterResult.playerId);
                this.socketServer.to(game.gameId).emit(GameEvents.GAME_TIME_END, { gameId: game.gameId, winner: winner });
                game.isPlaying = false;
                this.onConfirmGameResult(game.gameId);
            }, game.gameTime * 1000);
        }
        catch (error) {
            console.log(error);
            this.socketServer.to(gameId).emit(GameEvents.GAME_ERROR, {
                message: "Có lỗi xảy ra trong quá trình xử lý"
            });
        }
    }

    private onWordSubmit = (data: { gameId: string, wordId: string, letters: Array<string> }, socket: Socket) => {
        try {
            console.log("Word submit at: ", new Date().toISOString(), data);
            const game = this.Games.find((game) => game.gameId === data.gameId);
            if (!game || game.isFinished) {
                socket.emit(GameEvents.GAME_ERROR, {
                    message: "Trò chơi không tồn tại hoặc đã kết thúc"
                });
                return;
            }
            const player = game.players.find((player) => player.socketId === socket.id);
            if (!player) {
                socket.emit(GameEvents.GAME_ERROR, {
                    message: "Người chơi không tồn tại trong trò chơi"
                });
                return;
            }
            const originWord = game.words.find((word) => word.id === data.wordId);
            if (!originWord) {
                socket.emit(GameEvents.GAME_ERROR, {
                    message: "Từ không tồn tại"
                });
                return;
            }
            const resultLetters = checkGameLetters(originWord.text, data.letters);
            const isCorrect = resultLetters.every((letter) => letter.isMatched);

            // Check if the word is correct
            if (!isCorrect) {
                socket.emit(GameEvents.WORD_SUBMIT_RESULT, {
                    wordId: originWord.id,
                    isCorrect: isCorrect,
                    letters: resultLetters
                });
                return;
            }

            let gameResult = game.gameResults.find((result) =>
                result.playerId === player.id && result.gameId === game.gameId);
            if (gameResult) {
                gameResult?.correctWordIds.push(originWord.id);
            }
            else {
                game.gameResults.push({
                    gameId: game.gameId,
                    playerId: player.id,
                    correctWordIds: [originWord.id]
                });
                gameResult = game.gameResults.find((result) =>
                    result.playerId === player.id && result.gameId === game.gameId);
            }

            // Check if player has completed all the words
            if (gameResult?.correctWordIds.length === game.gameWordCount) {
                game.isFinished = true;
                this.socketServer.to(game.gameId).emit(GameEvents.GAME_FINISH, {
                    gameId: game.gameId,
                    winner: player,
                    message: `${player.playerName} đã chiến thắng`
                });
                this.onConfirmGameResult(game.gameId);
                return;
            }
            const nextWord = game.words[gameResult?.correctWordIds?.length + 1];
            const nextWordLetters = shuffleLetter(nextWord?.text);
            socket.emit(GameEvents.WORD_SUBMIT_RESULT, { wordId: originWord.id, isCorrect: isCorrect, letters: resultLetters });
            this.socketServer.to(game.gameId).emit(GameEvents.CORRECT_WORD, { ...game?.gameResults });
            socket.emit(GameEvents.SET_NEXT_WORD, { wordId: nextWord.id, wordLetters: nextWordLetters });

        }
        catch (error) {
            console.log(error);
            socket.emit(GameEvents.GAME_ERROR, {
                message: "Có lỗi xảy ra trong quá trình xử lý"
            });
        }
    }

    onExitGame = (gameId: string, socket: Socket) => {
        try {
            console.log("Exit game at: ", new Date().toISOString(), socket.id);
            const game = this.Games.find((game) => game.gameId === gameId);
            const player = this.onlinePlayers.find((player) => player.socketId === socket.id);
            player.isPlaying = false;
            if (!game) {
                socket.emit(GameEvents.GAME_ERROR, {
                    message: "Trò chơi không tồn tại"
                });
                return;
            }
            const gamePlayer = game.players.find((player) => player.socketId === socket.id);
            if (!gamePlayer) {
                socket.emit(GameEvents.GAME_ERROR, {
                    message: "Người chơi không tồn tại"
                });
                return;
            }
            game.players = game.players.filter((player) => player.id !== gamePlayer.id);
            if (game.players.length === 0) {
                this.Games = this.Games.filter((game) => game.gameId !== gameId);
            }
            if (game.players.length === 1) {
                const winner = game.players[0];
                const winnerSocket = this.socketServer.sockets.sockets.get(winner.socketId);
                winnerSocket.emit(GameEvents.GAME_FINISH, {
                    gameId: game.gameId,
                    winner: winner,
                    message: `Đối thủ bỏ cuộc, ${winner.playerName} đã chiến thắng`
                });
                const winnerPlayer = this.onlinePlayers.find((player) => player.id === winner.id)
                if (winnerPlayer) {
                    winnerPlayer.isPlaying = false;
                }
                this.onConfirmGameResult(game.gameId);
            }
            socket.leave(game.gameId);
            console.log("Online players after exit: ", this.onlinePlayers);
        }
        catch (error) {
            socket.leave(gameId);
            console.log(error);
            socket.emit(GameEvents.GAME_ERROR, {
                message: "Có lỗi xảy ra trong quá trình xử lý"
            });
        }
    }
    onConfirmGameResult = (gameId: string) => {
        const game = this.Games.find((game) => game.gameId === gameId);
        if (!game) return;
        const gamePlayers = game.players;
        const players = gamePlayers.map((player) => this.onlinePlayers.find((p) => p.id === player.id));
        players.forEach((player) => {
            player.isPlaying = false;
            player.isPending = false;
        });
        const sockets = players.map((player) => this.socketServer.sockets.sockets.get(player.socketId));
        sockets.forEach((socket) => {
            socket.leave(game.gameId);
        });
        this.Games = this.Games.filter((game) => game.gameId !== gameId);
    }

    private gameInit = (firstPlayer: Player, secondaryPlayer: Player): Game => {
        firstPlayer.isPending = false;
        secondaryPlayer.isPending = false;
        const game = new Game();
        game.players.push(firstPlayer, secondaryPlayer);
        this.Games.push(game);
        return game;
    }

    private matchingPlayers = () => {
        // Find the players who are pending and not playing
        console.log("Matching players at: ", new Date().toISOString());
        console.log("Online Players at matching: ", this.onlinePlayers);
        let pendingPlayers = this.onlinePlayers.filter((player) => player.isPending);
        if (pendingPlayers.length < 2) return;

        // Match the players randomly
        const firstPlayer = pendingPlayers[Math.floor(Math.random() * pendingPlayers.length)];
        pendingPlayers.filter((player) => player.id !== firstPlayer.id);
        const secondaryPlayer = pendingPlayers[Math.floor(Math.random() * pendingPlayers.length)];

        if (!firstPlayer || !secondaryPlayer) return;
        // Start the game
        const newGame = this.gameInit(firstPlayer, secondaryPlayer);
        // Create a new socket room for the game with the gameId
        const sockets = [this.socketServer.sockets.sockets.get(firstPlayer.socketId), this.socketServer.sockets.sockets.get(secondaryPlayer.socketId)];
        sockets.forEach((socket) => {
            socket.join(newGame.gameId);
        });

        // Send the game start event to the players
        this.socketServer.to(newGame.gameId).emit(GameEvents.OPPONENT_FOUND, { gameId: newGame.gameId, players: newGame.players });
    }

    private initScheduler = () => {
        console.log("Scheduler has been started at: ", new Date().toISOString());
        const INTERVAL_TIME = "*/10 * * * * *";
        // Run the matchingPlayers function every 10 seconds
        schedule.scheduleJob(INTERVAL_TIME, this.matchingPlayers);
    }

}

export default SocketGameService;