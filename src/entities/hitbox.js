import { Game } from "../core/game.js"
import { Map } from "../world/map.js"
import { Attack } from "./attack.js"
import { Entity } from "./entity.js"
import { Resizeable } from "../utils.js"
import { Talkable } from "./talkable.js"

export class Hitbox {
	/**
	 * @param {Game} game - game object reference
	 * @param {Map?} map - the hitbox's map
	 * @param {number} x - left x
	 * @param {number} y - top y
	 * @param {number} width - hitbox width
	 * @param {number} height - hitbox height
	 * @param {boolean} collision - is the hitbox a collision hitbox
	 * @param {boolean} [player=false] - is the hitbox a player's hitbox
	 * @param {Attack | Entity | Talkable | null} [owner=null] - the hitbox's owner, let null to make it unmovable
	 * @param {(hitbox: Hitbox, colliding_hitbox: Hitbox, time: number) => void} [command=((h, c_h, t) => {})] - function executed when colliding with anonther hitbox
	 */
	constructor(game, map, x, y, width, height, collision=false, player=false, owner=null, command=((h, c_h, t) => {})){
		this.game = game
		this.map = map
		this.active = true

		this.id = this.game.next_hitbox_id
		this.game.next_hitbox_id++
		this.x1 = new Resizeable(game, x)
		this.x2 = new Resizeable(game, x + width)
		this.y1 = new Resizeable(game, y)
		this.y2 = new Resizeable(game, y + height)

		this.width = new Resizeable(game, width)
		this.height = new Resizeable(game, height)

		this.game.hitboxes.push(this)
		if (collision) game.collision_hitboxes.push(this)
		else game.combat_hitboxes.push(this)
		
		this.player = player
		this.owner = owner

		this.command = command
	}

	/**
	 * @param {number} i - index (0, 1, 2 or 3 for the coordinates of the top-left, top-right, bottom-left and bottom-right corners)
	 * @returns {{x: number, y: number}}
	 */
	get_corner(i) {
		switch(i) {
			case 0: return {x: this.x1.get(), y: this.y1.get()}
			case 1: return {x: this.x2.get(), y: this.y1.get()}
			case 2: return {x: this.x1.get(), y: this.y2.get()}
			case 3: return {x: this.x2.get(), y: this.y2.get()}
		}
		return {x: 0, y: 0}
	}

	/**
	 * @param {Attack | Entity | Talkable} owner 
	 */
	set_owner(owner){
		this.owner = owner
	}

	/**@returns {Attack} */
	get_owner_as_a(){
		if(!(this.owner instanceof Attack)) throw new Error('Property isn\'t of requested type')
		else return this.owner
	}
	/**@returns {Entity} */
	get_owner_as_e(){
		if(!(this.owner instanceof Entity)) throw new Error('Property isn\'t of requested type')
		else return this.owner
	}
	/**@returns {Talkable} */
	get_owner_as_t(){
		if(!(this.owner instanceof Talkable)) throw new Error('Property isn\'t of requested type')
		else return this.owner
	}

	render() {
		if(this.game.get_current_map() == this.map){
			if (this.active) {
				this.game.ctx.strokeStyle = this.player ? "blue" : "red"
			} else {
				this.game.ctx.strokeStyle = "gray"
			}

			this.game.ctx.strokeRect(
				this.x1.get() - this.game.camera.x.get(),
				this.y1.get() - this.game.camera.y.get(),
				this.width.get(),
				this.height.get()
			)
		}
	}


	/**
	 * @param {Hitbox} hitbox
	 * @return {boolean}
	 */
	is_colliding(hitbox) {
		if (this == hitbox) return false
		if (this.map != hitbox.map) return false
		return !(this.x1.get() > hitbox.x2.get() || hitbox.x1.get() > this.x2.get() || this.y1.get() > hitbox.y2.get() || hitbox.y1.get() > this.y2.get())
	}

	/**
	 * @param {boolean} [collision=true]
	 * @param {boolean} [combat=true]
	 * @returns {Array<Hitbox>}
	 */
	get_colliding_hitboxes(collision=true, combat=true) {
		/**@type {Array<Hitbox>} */
		var colliding_hitboxes = []
		if (combat) {
			this.game.combat_hitboxes.forEach(hitbox => {
				if (!hitbox.active) return
				if (this.is_colliding(hitbox))
					colliding_hitboxes.push(hitbox)
			})
		}

		if (collision) {
			this.game.collision_hitboxes.forEach(hitbox => {
				if (!hitbox.active) return
				if (this.is_colliding(hitbox))
					colliding_hitboxes.push(hitbox)
			})
		}

		if(!(combat || collision)){
			this.game.hitboxes.forEach(hitbox => {
				if(!colliding_hitboxes.includes(hitbox) && !this.game.collision_hitboxes.includes(hitbox) && !this.game.combat_hitboxes.includes(hitbox)){
					if (!hitbox.active) return
					if (this.is_colliding(hitbox))
						colliding_hitboxes.push(hitbox)
				}
			})
		}
		return colliding_hitboxes
	}

	/**
	 * 
	 * @param {number} x 
	 * @param {number} y 
	 */
	center_around(x, y) {
		this.x1.set_value(x - this.width.get() / 2)
		this.x2.set_value(x + this.width.get() / 2)
		this.y1.set_value(y - this.height.get() / 2)
		this.y2.set_value(y + this.height.get() / 2)
	}

	/**
	 * @param {number} x 
	 * @param {number} y 
	 * @param {number?} [width=null] 
	 * @param {number?} [height=null] 
	 */
	set(x, y, width=null, height=null) {
		this.x1.set_value(x)
		this.y1.set_value(y)
		if(width != null) this.width.set_value(width)
		if(height != null) this.height.set_value(height)
		this.x2.set_value(x + this.width.get())
		this.y2.set_value(y + this.height.get())
		if(this.x2.get() < this.x1.get()){
			this.x1.set_value(this.x2.get())
			this.x2.set_value(x)
			this.width.set_value(this.width.get() * -1)
		}
		if(this.y2.get() < this.y1.get()){
			this.y1.set_value(this.y2.get())
			this.y2.set_value(y)
			this.height.set_value(this.height.get() * -1)
		}
	}

	/**
	 * @param {number} dx 
	 * @param {number} dy 
	 */
	move_by(dx, dy) {
		this.x1.set_value(this.x1.get() + dx)
		this.x2.set_value(this.x2.get() + dx)
		this.y1.set_value(this.y1.get() + dy)
		this.y2.set_value(this.y2.get() + dy)
	}

	/**
	 * 
	 * @param {Map?} new_map 
	 */
	set_map(new_map){
		this.map = new_map
	}

	/**
	 * 
	 * @returns {boolean}
	 */
	isWithinMapBounds() {
		if(this.map==null) return false
		return !(this.map.world.width.get() <= this.x2.get() || this.x1.get() <= 0 || this.y2.get() >= this.map.world.height.get() || this.y1.get() <= 0)
	}

	destroy() {
		// to prevent unexpected behaviour
		// we rather use "active" and remove the inactive at each frame in the game than remove while iterating
		this.active = false
		/*
		this.game.collision_hitboxes.splice(this.game.collision_hitboxes.indexOf(this), 1)
		this.game.hitboxes.splice(this.game.hitboxes.indexOf(this), 1)
		this.game.combat_hitboxes.splice(this.game.combat_hitboxes.indexOf(this), 1)
		*/
	}
}
