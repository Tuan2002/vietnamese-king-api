import { Expose } from "class-transformer";
import { IsArray, IsNotEmpty } from "class-validator";

/**
 * @swagger
 * "components": {
 *  "schemas": {
 *     "GameSubmitDto": {
 *     "type": "object",
 *     "properties": {
 *     "gameId": {
 *          "type": "string"
 *      },
 *      "letters": {
 *         "type": "array",
 *       "items": {
 *        "type": "string"
 *      }
 *    }
 * }
 * }
 * }
 * }
 */

export class GameSubmitDto {
    @Expose()
    @IsNotEmpty()
    public gameId: string;
    @Expose()
    @IsNotEmpty()
    @IsArray()
    public letters: string[];
}