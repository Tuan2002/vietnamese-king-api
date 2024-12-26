
type Player = {
    id: string;
    socketId: string;
    playerName: string;
    isPending: boolean = false;
    isPlaying: boolean = false;
};