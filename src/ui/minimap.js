//@ts-check
import { constants } from "../constants.js";
import { Game } from "../core/game.js";

export class Minimap{
    /**
     * 
     * @param {Game} game 
     */
    constructor(game){
        this.game = game
    }

    render(){
        /**@type {Array<Array<{r: number, g: number, b: number}>>} */
        let tiles_array = []

        let map = this.game.get_current_map()
        
        // let startTileX = Math.max(0, Math.floor(this.game.get_player().worldX.get() / constants.TILE_SIZE) - 12)
        // let startTileY = Math.max(0, Math.floor(this.game.get_player().worldY.get() / constants.TILE_SIZE) - 12)

        // let endTileX = Math.min(map.width, startTileX + 24)
        // let endTileY = Math.min(map.height, startTileY + 24)

        let startTileX = Math.floor(this.game.get_player().worldX.get() / constants.TILE_SIZE) - 12
        let startTileY = Math.floor(this.game.get_player().worldY.get() / constants.TILE_SIZE) - 12

        let endTileX = startTileX + 24
        let endTileY = startTileY + 24

        for (let x = startTileX; x < endTileX; x++) {
            /** @type {Array<{r: number, g: number, b: number}>} */
            let line = []
            for (let y = startTileY; y < endTileY; y++) {
                let color = map.topmost_average[y * map.width + x]
                line.push((
                    color && x>=0 && x<map.width && y>=0 && y<map.height
                )? color: {r: 0, g: 0, b: 0})
            }
            tiles_array.push(line)
        }

        for(let i=0; i<tiles_array.length; i++){
            let line = tiles_array[i]
            for(let j=0; j<line.length; j++){
                this.game.ctx.fillStyle = `rgb(${line[j].r}, ${line[j].g}, ${line[j].b})`
                this.game.ctx.fillRect(
                    this.game.canvas.width + (i - line.length) * 8,
                    j * 8, 8, 8
                )
            }
        }

        this.game.ctx.fillStyle = "red"
        this.game.ctx.fillRect(this.game.canvas.width - 94, 98, 4, 4)
    }
}