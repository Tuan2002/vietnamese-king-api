import type { GameLetterDto } from '@/models/games/GameResultDto';

const shuffleLetter = (word: string): Array<string> => {
    let shuffledWord = word.split('');
    const spaceIndexes = shuffledWord.map((letter, index) => letter === ' ' ? index : -1).filter((index) => index !== -1);
    // To uppercase first letter
    shuffledWord[0] = shuffledWord[0].toUpperCase();
    for (let i = shuffledWord.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        if (spaceIndexes.includes(i) || spaceIndexes.includes(j)) {
            continue;
        }
        [shuffledWord[i], shuffledWord[j]] = [shuffledWord[j], shuffledWord[i]];
    }
    return shuffledWord;
}


const checkGameLetters = (word: string, letters: Array<string>): Array<GameLetterDto> => {
    const wordLetters = word.toLowerCase().split('').filter((letter) => letter !== ' ');
    return letters.map((letter, index) => {
        return {
            letter: letter,
            isMatched: wordLetters[index] === letter.toLowerCase()
        }
    });
};

export { checkGameLetters, shuffleLetter };

