//@ts-check
import { Game } from "../core/game.js"
import { config, constants, tilesets } from "../constants.js"
import { not_displayed_ctx, Resizeable, YResizeable } from "../utils.js"
import { Entity } from "../entities/entity.js"

export class Tileset {
    /**
     * ## One shouldn't use the constructor to make a tileset, use the static create method instead
     * @param {Game} game - The current game
     * @param {number} img_tile_size - The size of one tile in the source image (in pixels)
     * @param {number} screen_tile_size - The size of one tile on the canvas
     * @param {number} tileset_spacing - The spacing between tiles in the source image (in pixels)
     */
    constructor(game, img_tile_size, screen_tile_size, tileset_spacing) {
        this.img_tile_size = img_tile_size
        /**@type {Resizeable|YResizeable} */
        this.screen_tile_size = new Resizeable(game, screen_tile_size)
        this.game = game
        this.tileset_spacing = tileset_spacing
        /**@type {HTMLImageElement?} */
        this.img = null // Initialize the image to null
        /**@type {number?} */
        this.tiles_length = null
        /**@type {number?} */
        this.tilesPerRow = null
        /**@type {string} */
        this.source = "source not defined"
    }

    /**
     * Creates a Tileset asynchronously.
     * @param {Game} game - The current game
     * @param {string} src - The path to the source image of the tileset
     * @param {number} img_tile_size - The size of one tile in the source image (in pixels)
     * @param {number} screen_tile_size - The size of one tile on the canvas
     * @param {number} tileset_spacing - The spacing between tiles in the source image (in pixels)
     * @returns {Promise<Tileset>} - The created Tileset
     * @throws {Error} - If the image fails to load
     */
    static async create(game, src, img_tile_size, screen_tile_size, tileset_spacing) {
        const tileset = new Tileset(game, img_tile_size, screen_tile_size, tileset_spacing)
        try {
            await tileset.load(config.IMG_DIR + src)
            tileset.source = src.split(".").slice(0, -1).join(".")
        } catch (error) {
            console.error(`Couldn't load file "${src}": ${error.message}`)
            throw new Error(`Failed to load tileset image: ${error.message}`)
        }

		tileset.tiles_length = Math.round(tileset.get_img().width * tileset.get_img().height / Math.pow(tileset.img_tile_size + tileset.tileset_spacing, 2))
		tileset.tilesPerRow = Math.floor(
			(tileset.get_img().width + tileset_spacing) / (tileset.img_tile_size + tileset_spacing)
		)
        game.tilesets[tileset.source] = tileset

        return tileset
    }

    /**
     * 
     * @param {Game} game 
     */
	static async loadTilesets(game) {
		for (let tileset of tilesets) {
			await Tileset.create(game, tileset.src, tileset.img_tile_size, tileset.screen_tile_size(constants.TILE_SIZE), tileset.spacing ?? 0)
		}
	}

    /**
     * Loads the tileset image.
     * @param {string} src - The path to the source image
     * @returns {Promise<void>}
     * @throws {Error} - If the image fails to load
     */
    async load(src) {
        const img = new Image()
        img.src = src
        this.img = img

        await new Promise((resolve, reject) => {
            img.onload = resolve
            img.onerror = () => reject(new Error(`Failed to load image: ${src}`))
        })
    }

    /**
     * Draws a tile from the tileset onto the canvas.
     * @param {number} tile_num - The tile number to draw (1-based index)
     * @param {number} screenX - The x-coordinate on the canvas to draw the tile
     * @param {number} screenY - The y-coordinate on the canvas to draw the tile
     * @throws {Error} - If the tile number is out of bounds or the image is not loaded
     */
	drawTile(tile_num, screenX, screenY) {
		if (!this.img) {
			throw new Error("Tileset image not loaded.")
		}

		// subtract 1 (1-based index to 0-based index)
		tile_num = (tile_num - 1) % this.get_tiles_length() // just in case

		const tile_num_x = tile_num % this.get_tilesPerRow()
		const tile_num_y = Math.floor(tile_num / this.get_tilesPerRow())

		const tileX = tile_num_x * (this.img_tile_size + this.tileset_spacing)
		const tileY = tile_num_y * (this.img_tile_size + this.tileset_spacing)

		this.game.ctx.drawImage(
			this.img,
			tileX, tileY,
			this.img_tile_size, this.img_tile_size,
			Math.round(screenX), Math.round(screenY),
			Math.round(this.screen_tile_size.get()), Math.round(this.screen_tile_size.get())
		)
	}

    /**
     * 
     * @param {Entity} entity 
     * @param {number} screenX 
     * @param {number} screenY 
     */
	drawEntity(entity, screenX, screenY) {
		let offset = 1 + this.get_tilesPerRow() * 4 * (entity.state -
            ((entity.framesPerState[constants.IDLE_STATE] == null && entity.state != constants.IDLE_STATE)?
            1: 0))
		
		const frame = entity.animation_step !== -1 ? entity.animation_step : 0
		const tileNum = offset + this.get_tilesPerRow() * entity.direction + frame

		this.drawTile(tileNum, screenX, screenY)
	}

    /**
     * 
     * @returns {HTMLImageElement}
     */
    get_img(){
        if(this.img==null) throw new Error('null property requested as not null')
        else return this.img
    }

    /**
     * 
     * @returns {number}
     */
    get_tiles_length(){
        if(this.tiles_length==null) throw new Error('null property requested as not null')
        else return this.tiles_length
    }

    /**
     * 
     * @returns {number}
     */
    get_tilesPerRow(){
        if(this.tilesPerRow==null) throw new Error('null property requested as not null')
        else return this.tilesPerRow
    }

    /**
     * 
     * @param {number} tile_index 
     * @returns {{r: number, g: number, b: number}}
     */
    get_tile_average(tile_index){
        if (!this.img) {
			throw new Error("Tileset image not loaded.")
		}

        // subtract 1 (1-based index to 0-based index)
		tile_index = (tile_index - 1) % this.get_tiles_length() // just in case

		let tile_num_x = tile_index % this.get_tilesPerRow()
		let tile_num_y = Math.floor(tile_index / this.get_tilesPerRow())

		let tileX = tile_num_x * (this.img_tile_size + this.tileset_spacing)
		let tileY = tile_num_y * (this.img_tile_size + this.tileset_spacing)

        not_displayed_ctx.drawImage(
            this.img,
            tileX, tileY,
            this.img_tile_size, this.img_tile_size,
            0, 0,
            this.img_tile_size, this.img_tile_size
        )

        let color_sum = {r: 0, g: 0, b: 0}
        let transparent_tiles = 0

        for(let x = 0; x<this.img_tile_size; x++){
            for(let y = 0; y<this.img_tile_size; y++){
                let color_data = not_displayed_ctx.getImageData(x, y, 1, 1).data
                if(color_data[3]<16){
                    transparent_tiles++
                    continue
                }
                for(let i = 0; i<3; i++){
                    color_sum[["r", "g", "b"][i]] += color_data[i]
                }
            }
        }
        return (transparent_tiles==this.img_tile_size**2)? {r: 0, g: 0, b: 0}: {
            r: color_sum.r/(this.img_tile_size**2 - transparent_tiles),
            g: color_sum.g/(this.img_tile_size**2 - transparent_tiles),
            b: color_sum.b/(this.img_tile_size**2 - transparent_tiles),
        }
    }
}
