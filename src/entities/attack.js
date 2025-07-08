import { Hitbox } from './hitbox.js'
import { Entity } from './entity.js'
import { Game } from '../core/game.js'
import { Map } from '../world/map.js'
import { Resizeable } from '../utils.js'
import { constants } from '../constants.js'
import { Tileset } from '../world/tileset.js'


// TO READ:
//
// How to use attacks:
// - Create an instance of `Attack` or a subclass (`SwingingAttack`, `ProjectileAttack`) when you want an entity to perform an attack.
// - Each attack takes a list of `Hitbox`es that define the area where collisions are checked.
// - When a `Hitbox` overlaps an `Entity`, `attack(entity)` is called to apply damage or effects.
// - Subclasses:
//   - `SwingingAttack`: For attacks that swing/move (mimicking rotated attacks).
//   - `ProjectileAttack`: For moving attacks like bullets or magic projectiles.
//
// Important options:
// - `still`: Whether the attack's hitboxes stay static (`true`) or move/update (`false`).
// - `persistent`: If `true`, the attack can apply effects multiple times to the same entity, based on `cooldown` (time between hits).
// - `tileset`, `frame_duration`, `animation_cords`: Optional visual settings if you want the attack to be animated.
//
// The attack must be manually created (e.g., in response to player input or AI logic).
// It will automatically update itself every frame through `game.attacks`.
// See example in the player.js at Player.update()

export class Attack {
	/**
	 * @param {Game} game
	 * @param {Entity} attacker 
	 * @param {Map} map
	 * @param {number} timeOrigin
	 * @param {number} duration
	 * @param {Array<Hitbox>} hitboxes
	 * @param {(e: Entity) => void} attack
	 * @param {Tileset?} [tileset=null]
	 * @param {number?} [frame_duration=null] - in ms
	 * @param {{x:number, y:number}?} [animation_cords=null]
	 * @param {boolean} [still=true] - wether the attack is still
	 * @param {boolean} [persistent=false]
	 * @param {number?} [cooldown=null] - time between each apply in ms
	 */
	constructor(game, attacker, map, timeOrigin, duration, hitboxes, attack, tileset=null, frame_duration=null, animation_cords=null, still=true, persistent=false, cooldown=null) {
		/** @type {Game} */
		this.game = game
		/** @type {Entity} */
		this.attacker = attacker
		/** @type {Map} */
		this.map = map
		/** @type {number} */
		this.timeOrigin = timeOrigin
		/** @type {number} */
		this.duration = duration
		this.id = game.next_attack_id
		game.next_attack_id++

		for (const hitbox of hitboxes) {
			hitbox.owner = this
		}
		/** @type {Array<Hitbox>} */
		this.hitboxes = hitboxes

		/** @type {Entity} */
		this.attacker = attacker

		/** @type {(e: Entity) => void} */
		this.attack = attack
		/** @type {Array<Entity>} */
		this.entities = []

		/** @type {Tileset?} */
		this.tileset = tileset
		/** @type {number?} */
		this.frame_duration = frame_duration
		if (tileset && animation_cords) {
			/** @type {{x: Resizeable, y: Resizeable}} */
			this.animation_cords = {
				x: new Resizeable(game, animation_cords.x),
				y: new Resizeable(game, animation_cords.y)
			}
		}
		/** @type {number} */
		this.current_frame = 0
		/** @type {number} */
		this.lastFrameUpdate = timeOrigin - (frame_duration ?? 0)

		/** @type {boolean} */
		this.still = still

		/** @type {boolean} */
        this.persistent = persistent
        /** @type {number|null} */
        this.cooldown = cooldown
        /** @type {Array<number>} */
        this.last_applies = [] // Always initialize, even for non-persistent attacks

		this.game.attacks.push(this)
	}

	/**
	 * 
	 * @param {number} current 
	 * @returns 
	 */
	update(current) {
		if (current - this.timeOrigin >= this.duration) {
			this.destroy()
		}

		if (!this.still) {
			this.updateHitboxes(current)
		}
		
		if (!(this.tileset && this.frame_duration)) return
		if (current - this.lastFrameUpdate >= this.frame_duration) {
			this.lastFrameUpdate = current
			this.updateFrame()
		}
	}

	render() {
		if (!this.tileset || !this.tileset.drawTile) return
		const screenX = this.animation_cords.x.get() - this.game.camera.x.get()
		const screenY = this.animation_cords.y.get() - this.game.camera.y.get()
		this.tileset.drawTile(this.current_frame, screenX, screenY)
	}

	updateFrame() {
		if (!(this.tileset && this.frame_duration)) return
		this.current_frame = (this.current_frame + 1) % this.tileset.get_tiles_length() + 1// don't need to worry about it thanks to the modulo in  tileset.drawTile
	}

	/**
	 * 
	 * @param {number} current 
	 */
	updateHitboxes(current) {
	}

	/**
	 * @param {Entity} entity 
	 * @param {number} current
	 * @returns {void}
	 */
	apply(entity, current) {
		if (entity === this.attacker) return
		const i = this.entities.indexOf(entity)
		if (i !== -1) {
			if (!(this.persistent && this.cooldown)) return
			if (current - this.last_applies[i] >= this.cooldown) {
				this.attack(entity)
				this.last_applies[i] = current
				entity.on_attacked(this)
			}
		} else {
			this.attack(entity)
			this.entities.push(entity)
			if (this.still)
				this.last_applies.push(current)
			entity.on_attacked(this)
		}
	}

	destroy() {
		for (const hitbox of this.hitboxes) {
			hitbox.destroy()
		}

		const index = this.game.attacks.indexOf(this)
		if (index === -1) {
			//console.log(this.game)
			//console.log(this)
			//throw new Error("Attack not found in game.attacks")
			return
		}
		this.game.attacks.splice(index, 1)
	}
}


/**
 * #### Clockwise attack
 * 
 * As it's impossible to have a rotated rectangle hitbox,
 * 
 * We mimic this behaviour by having a rectangle sliding fastly
 * 
 *  -                    range
 *  -                <----------->
 *  -              ^ +-----------+ ^
 *  -              | |           | | rec_width
 *  -              | +-----------+ v
 *  -  slide_width |
 *  -              |       |
 *  -              |       v
 *  -              v
 */
export class SwingingAttack extends Attack {
    /**
     * @param {Game} game
     * @param {Entity} attacker
     * @param {Map} map
     * @param {number} timeOrigin
     * @param {number} duration
     * @param {{x:number, y:number}} startPoint
     * @param {number} direction 
     * @param {number} weapon_width 
     * @param {number} attack_width 
     * @param {number} range
     * @param {(e: Entity) => void} attack
	 * @param {Tileset?} [tileset=null]
	 * @param {number?} [frame_duration=null]
     * @param {boolean} [persistent=false]
     * @param {number?} [cooldown=null] - time between each apply in ms
     */
    constructor(game, attacker, map, timeOrigin, duration, startPoint, direction, weapon_width, attack_width, range, attack, tileset=null, frame_duration=null, persistent=false, cooldown=null) {
        let hitbox
        const halfWeapon = weapon_width / 2
        
        switch(direction) {
            case constants.UP_DIRECTION:
                hitbox = new Hitbox(game, map, startPoint.x - halfWeapon, startPoint.y - range, weapon_width, range)
                break
            case constants.DOWN_DIRECTION:
                hitbox = new Hitbox(game, map, startPoint.x - halfWeapon, startPoint.y, weapon_width, range)
                break
            case constants.LEFT_DIRECTION:
                hitbox = new Hitbox(game, map, startPoint.x - range, startPoint.y - halfWeapon, range, weapon_width)
                break
            case constants.RIGHT_DIRECTION:
                hitbox = new Hitbox(game, map, startPoint.x, startPoint.y - halfWeapon, range, weapon_width)
                break
			default:
				throw new Error('wrong constant provided for "direction"')
        }
        
        super(game, attacker, map, timeOrigin, duration, [hitbox], attack, tileset, frame_duration, {x: 0, y:0}, persistent, persistent, cooldown)
		if (tileset) {
			this.animation_cords.x.set_value(this.hitboxes[0].x1.get())
			this.animation_cords.y.set_value(this.hitboxes[0].y1.get())
		}
		

        this.direction = direction
        this.attack_width = new Resizeable(game, attack_width)
        this.weapon_width = new Resizeable(game, weapon_width)
        this.range = new Resizeable(game, range)
        this.startPoint = {
            x: new Resizeable(game, startPoint.x),
            y: new Resizeable(game, startPoint.y)
        }
    }

	/**
	 * 
	 * @param {number} current 
	 */
    updateHitboxes(current) {
        const progression = (current - this.timeOrigin) / this.duration
        const maxOffset = this.attack_width.get() - this.weapon_width.get()
        const offset = maxOffset * progression
        
        const x = this.startPoint.x.get()
        const y = this.startPoint.y.get()

        const weaponWidth = this.weapon_width.get()
		const halfAttack = this.attack_width.get()/2
		const range = this.range.get()
        
        switch(this.direction) {
            case constants.UP_DIRECTION:
                this.hitboxes[0].set(x - halfAttack + offset, y - range, weaponWidth, range)
                break
            case constants.DOWN_DIRECTION:
                this.hitboxes[0].set(x + halfAttack - offset - weaponWidth, y, weaponWidth, range)
                break
            case constants.LEFT_DIRECTION:
                this.hitboxes[0].set(x - range, y + halfAttack - offset - weaponWidth, range, weaponWidth)
                break
            case constants.RIGHT_DIRECTION:
                this.hitboxes[0].set(x, y - halfAttack + offset, range, weaponWidth)
                break
        }
    }
}


export class ProjectileAttack extends Attack {
	/**
	 * @param {Game} game
	 * @param {Entity} attacker 
	 * @param {Map} map
	 * @param {number} timeOrigin
	 * @param {number} duration
	 * @param {Array<Hitbox>} hitboxes
	 * @param {number} dx
	 * @param {number} dy
	 * @param {(e: Entity) => void} attack
	 * @param {boolean} [piercing=false]
	 * @param {Tileset?} [tileset=null]
	 * @param {number?} [frame_duration=null]
	 * @param {{x:number, y:number}?} [animation_cords=null]
	 * @param {boolean} [persistent=false]
	 * @param {number?} [cooldown=null] - time between each apply in ms
	 */
	constructor(game, attacker, map, timeOrigin, duration, hitboxes, dx, dy, attack = (((e) => {})), piercing=false, tileset=null, frame_duration=null, animation_cords=null, persistent=false, cooldown=null) {
		super(game, attacker, map, timeOrigin, duration, hitboxes, attack, tileset, frame_duration, animation_cords, false, persistent, cooldown)
		this.piercing = piercing
		this.dx = new Resizeable(game, dx)
		this.dy = new Resizeable(game, dy)
	}

	updateFrame() {
		super.updateFrame()
	}

	/**
	 * 
	 * @param {number} current 
	 */
	updateHitboxes(current) {
		for (let hb of this.hitboxes) {
			for(let colliding of hb.get_colliding_hitboxes(true, false)) {
				if (colliding.owner !== this.attacker) {
					this.destroy()
					return
				}
			}

			for(let colliding of hb.get_colliding_hitboxes(false, true)) {
				if (colliding.owner instanceof ProjectileAttack && colliding.owner !== this) {
					if (!colliding.owner.piercing)
						colliding.destroy()
					if (!this.piercing) {
						this.destroy()
						return
					}
				}
			}

			if (!hb.isWithinMapBounds()) {
				this.destroy()
				return
			}

			hb.move_by(this.dx.get(), this.dy.get())
		}

		this.animation_cords.x.set_value(this.animation_cords.x.get() + this.dx.get())
		this.animation_cords.y.set_value(this.animation_cords.y.get() + this.dy.get())
	}
}
