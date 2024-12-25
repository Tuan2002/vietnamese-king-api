import { Expose } from 'class-transformer';
// DOT NOT REMOVE COMMENTS WHICH START WITH /** @swagger AND END WITH */
// IT'S USED TO GENERATE SWAGGER DOCUMENTS

/**
 * @swagger
 * "components": {
 *  "schemas": {
 *     "GameDto": {
 *     "type": "object",
 *     "properties": {
 *       "id": {
 *         "type": "string"
 *       },
 *       "wordId": {
 *         "type": "string"
 *       },
 *      "level": {
 *         "type": "number"
 *      },
 *      "wordLetters": {
 *         "type": "array",
 *        "items": {
 *         "type": "string"
 *       }
 *     },
 *      "createdAt": {
 *          "type": "string",
 *          "format": "date-time"
 *      }
 * }
 * }
 * }
 * }
 */

export class GameDto {
    @Expose()
    public id: string;
    @Expose()
    public wordId: string;
    @Expose()
    public level?: number;
    @Expose()
    public wordLetters: string[];
    @Expose()
    public createdAt?: Date;
}