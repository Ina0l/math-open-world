//@ts-check
import { constants } from "./constants.js"
import { Game } from "./core/game.js"
import { Hitbox } from "./entities/hitbox.js"
import { Transition } from "./ui/transition.js"

const canvas = document.createElement("canvas")
canvas.setAttribute("willReadFrequently", "true")
console.log(canvas)
let ctx = canvas.getContext("2d")
if(ctx==null) throw new Error("context was null for some reason")
export const not_displayed_ctx = ctx

/**
 * @param {number} x 
 * @param {number} min 
 * @param {number} max 
 * @returns {number}
*/
export function clamp(x, min, max){
	if (x < min) return min
	if (x > max) return max
	return x
}

/**
 * 
 * @param {string} str 
 * @param {number} lenght 
 * @returns {Array<string>}
 */
export function slice(str, lenght){
	var array = []
	var sentence = ""
	str.split(" ").forEach(word => {
		if(sentence.length + word.length + 1 <= lenght){
			sentence += " "+word
		} else {
			array.push(sentence)
			sentence = word
		}
	})
	array.push(sentence)
	array[0] = array[0].slice(1)
	return array
}

export class Resizeable{
	/**
	 * @param {Game} game 
	 * @param {number} value 
	 * @param {?(resizeable: Resizeable) => void} [resize=null] 
	 */
	constructor(game, value, resize=null){
		this.game = game
		this.value = value / this.game.canvas.width
		if(resize) {
			this.resize = resize
			this.game.resizeables.push(this)
		}
	}

	/**
	 * 
	 * @param {number} new_value 
	 */
	set_value(new_value){
		if(!isNaN(new_value / this.game.canvas.width))
			this.value = new_value / this.game.canvas.width
		else {
			throw new Error(`value ${new_value} nan`)
		}
	}

	/**
	 * 
	 * @returns {number}
	 */
	get() {
		return this.value * this.game.canvas.width
	}
}

export class YResizeable{
	/**
	 * 
	 * @param {Game} game 
	 * @param {number} value 
	 * @param {?(resizeable: YResizeable) => void} [resize=null] 
	 */
	constructor(game, value, resize=null){
		this.game = game
		this.value = value / this.game.canvas.height
		if(resize){
			this.resize = resize
			this.game.resizeables.push(this)
		}
	}

	/**
	 * 
	 * @param {number} new_value 
	 */
	set_value(new_value){
		if(!isNaN(new_value / this.game.canvas.width))
			this.value = new_value / this.game.canvas.height
		else {
			throw new Error(`value ${new_value} nan`)
		}
	}

	/**
	 * 
	 * @returns {number}
	 */
	get(){
		return this.value * this.game.canvas.height
	}
}

/**
 * Allows to test recursively any type of builtin value
 * @param {any} a 
 * @param {any} b 
 * @returns {boolean}
 */
export function equality_test(a, b){
	/**
	 * 
	 * @param {any} a 
	 * @param {any} b 
	 * @returns {boolean}
	 */
	const funct = (a, b) => {
		if(a instanceof Array){
			if(a.length == b.lenght) return false
			for(let i = 0; i < a.length; i++){
				if(!funct(a[i], b[i])) return false
			}
			return true
		} else {
			return a === b
		}
	}
	return funct(a, b)
}

/**
 * 
 * @param {Game} game
 * @param {string} mapName1
 * @param {string} mapName2
 * @param {Object} boxMap1
 * @param {Object} tpMap1
 * @param {Object} boxMap2
 * @param {Object} tpMap2
 * @param {number} dirMap1
 * @param {number} dirMap2
 * @param {Transition?} transition
 * @param {(game: Game) => void} [addingCode1=((game: Game) => {})] 
 * @param {(game: Game) => void} [addingCode2=((game: Game) => {})] 
 */
export function createSwitchHitboxes(game, mapName1, mapName2, boxMap1, tpMap1, boxMap2, tpMap2, dirMap1, dirMap2, transition=null, addingCode1 = ((game) => {}), addingCode2 = ((game) => {})){
	new Hitbox(game, game.maps[mapName1], boxMap1.x * constants.TILE_SIZE, boxMap1.y * constants.TILE_SIZE, boxMap1.width * constants.TILE_SIZE, boxMap1.height * constants.TILE_SIZE, false, false, null, (h, c_h, t) => {
		if(!c_h.player) return
		game.maps[mapName1].set_player_pos({x: tpMap1.x * constants.TILE_SIZE, y: tpMap1.y * constants.TILE_SIZE})
		game.set_map(mapName2)
		game.get_player().set_map(game.maps[mapName2])
		game.get_player().direction = dirMap2 

		// reset dash
		if (game.get_player().dashing)
			game.get_player().dash_reset = true
		else
			game.get_player().last_dash = -constants.PLAYER_DASH_COOLDOWN

		addingCode1(game)

		// transition
		if (transition)
			transition.start(t)
	}) // h1
	new Hitbox(game, game.maps[mapName2], boxMap2.x * constants.TILE_SIZE, boxMap2.y * constants.TILE_SIZE, boxMap2.width * constants.TILE_SIZE, boxMap2.height * constants.TILE_SIZE, false, false, null, (h, c_h, t) => {
		if(!c_h.player) return
		game.maps[mapName2].set_player_pos({x: tpMap2.x * constants.TILE_SIZE, y: tpMap2.y * constants.TILE_SIZE})
		game.set_map(mapName1)
		game.get_player().set_map(game.maps[mapName1])
		game.get_player().direction = dirMap1

		// reset dash
		if (game.get_player().dashing)
			game.get_player().dash_reset = true
		else
			game.get_player().last_dash = -constants.PLAYER_DASH_COOLDOWN

		addingCode2(game)

		// transition
		if (transition)
			transition.start(t)
	}) // h2
}

/**
 * 
 * @param {Game} game 
 * @param {string} mapName 
 * @param {{x: number, y: number, width: number, height: number}} box1 
 * @param {{x: number, y: number}} tp1 
 * @param {{x: number, y: number, width: number, height: number}} box2 
 * @param {{x: number, y: number}} tp2 
 * @param {number} dir1 
 * @param {number} dir2 
 * @param {Transition?} transition 
 */
export function createTpHitboxes(game, mapName, box1, tp1, box2, tp2, dir1, dir2, transition = null){
	new Hitbox(game,
		game.maps[mapName],
		box1.x * constants.TILE_SIZE, box1.y * constants.TILE_SIZE,
		box1.width * constants.TILE_SIZE, box1.height * constants.TILE_SIZE,
		false, false, null,
		(h, c_h, t) => {
			if (!c_h.player) return
			c_h.get_owner_as_e().set_pos(tp2.x * constants.TILE_SIZE, tp2.y * constants.TILE_SIZE)
			c_h.get_owner_as_e().direction = dir2
			if (transition)
				transition.start(t)
		}
	)
	new Hitbox(game,
		game.maps[mapName],
		box2.x * constants.TILE_SIZE, box2.y * constants.TILE_SIZE,
		box2.width * constants.TILE_SIZE, box2.height * constants.TILE_SIZE,
		false, false, null,
		(h, c_h, t) => {
			if (!c_h.player) return
			c_h.get_owner_as_e().set_pos(tp1.x * constants.TILE_SIZE, tp1.y * constants.TILE_SIZE)
			c_h.get_owner_as_e().direction = dir1
			if (transition)
				transition.start(t)
		}
	)
}
