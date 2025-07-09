//@ts-check
import { constants } from '../constants.js'
import { Game } from '../core/game.js'
import { Entity } from './entity.js'
import { Hitbox } from './hitbox.js'
import { Map } from '../world/map.js'
import { clamp, Resizeable } from '../utils.js'
import { ProjectileAttack, SwingingAttack } from './attack.js'
import { Inventory } from '../ui/inventory.js'
import { Talkable } from './talkable.js'
import { Tileset } from '../world/tileset.js'

export class Player extends Entity{
	/**
	 * @param {Game} game - The current game
	 * @param {Tileset} player_tileset - the tileset used for animating the player
	 * @param {Inventory} inventory - the player's inventory
	 */
	constructor(game, player_tileset, inventory) {
		const current_map = game.get_current_map()
		super(
			game, game.get_current_map(), player_tileset,
			new Hitbox(game, game.get_current_map(), 400, 400 + constants.TILE_SIZE / 2, 2 * constants.TILE_SIZE / 3, constants.TILE_SIZE / 2, true, true),
			new Hitbox(game, game.get_current_map(), 400, 400, 2 * constants.TILE_SIZE / 3, constants.TILE_SIZE, false, true),
			600, 600, 125, 100, {combat: {x: 0, y: 0}, collision: {x: 0, y: constants.TILE_SIZE / 4}}
		)

		this.framesPerState.push(6)

		this.player = true

		this.inputHandler = game.inputHandler

		/** @type {Entity?} */
		this.dragged_entity = null

		this.fullSpeed = new Resizeable(game, constants.TILE_SIZE / 24)
		this.acceleration = new Resizeable(game, constants.TILE_SIZE / 64)
		this.last_dash = -constants.PLAYER_DASH_COOLDOWN // used both for during the dash and for waiting state
		this.dash_reset = false
		this.dashing = false

		this.raycast_hitbox = new Hitbox(game, game.get_current_map(), 400, 400, 0, 100, false, true, this)
		this.inventory = inventory

		this.set_map(current_map)
	}

	reset_dash_cooldown() {
		if (this.dashing)
			this.dash_reset = true
		else
			this.last_dash = -constants.PLAYER_DASH_COOLDOWN
	}

    updateDirectionFromMouse() {
		const mouseWorldX = this.game.camera.x.get() + (this.inputHandler.mouse_pos.x + this.game.canvas.width / 2)
		const mouseWorldY = this.game.camera.y.get() + (this.inputHandler.mouse_pos.y + this.game.canvas.height / 2)
        const playerWorldX = this.worldX.get()
        const playerWorldY = this.worldY.get()
        const dx = mouseWorldX - playerWorldX
        const dy = mouseWorldY - playerWorldY

        if (Math.abs(dx) >= Math.abs(dy)) {
            this.direction = dx > 0 ? constants.RIGHT_DIRECTION : constants.LEFT_DIRECTION
        } else {
            this.direction = dy > 0 ? constants.DOWN_DIRECTION : constants.UP_DIRECTION
        }
    }

	/**
	 * 
	 * @param {number} current_time 
	 * @returns 
	 */
	updateDash(current_time) {
		if (!this.dashing && this.inputHandler.isKeyDown(constants.DASH_KEY) && current_time - this.last_dash >= constants.PLAYER_DASH_COOLDOWN) {
			this.dashing = true
			this.acceleration.set_value(constants.TILE_SIZE / 24)
			this.fullSpeed.set_value(constants.TILE_SIZE / 6)
			this.last_dash = current_time
		}

		if (this.dashing && current_time - this.last_dash >= constants.PLAYER_DASH_DURATION) {
			this.last_dash = this.dash_reset ? 0 : current_time
			this.dash_reset = false
			this.dashing = false

			this.fullSpeed.set_value(constants.TILE_SIZE / 24)
			this.acceleration.set_value(constants.TILE_SIZE / 64)
		}
	
		if (this.inputHandler.isKeyDown(constants.UP_KEY)) {
			this.direction = constants.UP_DIRECTION
			this.dy.set_value(this.dy.get() - this.acceleration.get())
		}
		if (this.inputHandler.isKeyDown(constants.DOWN_KEY)) {
			this.direction = constants.DOWN_DIRECTION
			this.dy.set_value(this.dy.get() + this.acceleration.get())
		}
		if (this.inputHandler.isKeyDown(constants.LEFT_KEY)) {
			this.direction = constants.LEFT_DIRECTION
			this.dx.set_value(this.dx.get() - this.acceleration.get())
		}
		if (this.inputHandler.isKeyDown(constants.RIGHT_KEY)) {
			this.direction = constants.RIGHT_DIRECTION
			this.dx.set_value(this.dx.get() + this.acceleration.get())
		}

		// ATTACKS
		if (this.state !== constants.ATTACK_STATE) {

			if (this.inputHandler.isMousePressed(constants.MOUSE_RIGHT_BUTTON)) {
				const playerWorldX = this.worldX.get()
				const playerWorldY = this.worldY.get()

				const mouseWorldX = this.game.camera.x.get() + (this.inputHandler.mouse_pos.x + this.game.canvas.width / 2)
				const mouseWorldY = this.game.camera.y.get() + (this.inputHandler.mouse_pos.y + this.game.canvas.height / 2)

				const dx = mouseWorldX - playerWorldX
				const dy = mouseWorldY - playerWorldY

				const distance = Math.hypot(dx, dy)
				if (distance <= 10) return
				
			   
				const speed = 20
				const velX = (dx / distance) * speed
				const velY = (dy / distance) * speed
				
				const hb = new Hitbox(this.game, this.game.get_current_map(), playerWorldX, playerWorldY,
					constants.TILE_SIZE / 2, constants.TILE_SIZE / 2, false, false)
				new ProjectileAttack(
					this.game, this, this.game.get_current_map(), current_time,
					2000, [hb], velX, velY, (e) => {
						e.damage(2)
						this.game.effects.BLINK.apply(current_time, e, 200)
					}, false, this.game.tilesets["Axe"], 50,
					{x: playerWorldX - hb.width.get() / 2, y: playerWorldY - hb.height.get() /2}
				)
			}

			let mouse_input = this.inputHandler.isMousePressed(constants.MOUSE_LEFT_BUTTON)
			if (mouse_input || this.inputHandler.isKeyPressed('a')) {
				// fancy stuff
				if (mouse_input) {
					this.updateDirectionFromMouse()
				}

				this.game.effects.ATTACK.apply(current_time,this, 300)
				this.game.effects.MOTIONLESS.apply(current_time, this, 300)

				new SwingingAttack(
					this.game, this, this.game.get_current_map(), current_time, 300,
					{x: this.worldX.get(), y: this.worldY.get()}, this.direction,
					constants.TILE_SIZE/5, constants.TILE_SIZE, constants.TILE_SIZE/2, (e) => {
						e.damage(2)
						this.game.effects.BLINK.apply(current_time, e, 200)})
				this.game.audioManager.playSound('game', 'slash', 0.5)
      }
		}
	}

	/**
	 * 
	 * @param {number} current_time 
	 */
	update(current_time) {
		switch(this.state) {
			case constants.IDLE_STATE:
				this.updateIdle(current_time)
			case constants.WALK_STATE:
				this.updateWalk(current_time)
				break
			case constants.ATTACK_STATE:
				break
			case constants.DRAG_STATE:
				this.updateDrag(current_time)
				break
		}


		this.inventory.update_passive_effects(current_time)

		if(this.dx.get() == 0 && this.dy.get() == 0){
            if(this.state == constants.WALK_STATE)
                this.state = constants.IDLE_STATE
        } else {
            if (this.state == constants.IDLE_STATE)
                this.state = constants.WALK_STATE
        }

		super.update(current_time)
		super.updateHitboxes()
	}

	updateMovements() {
		switch(this.direction) {
			case constants.UP_DIRECTION:
				this.raycast_hitbox.set(this.worldX.get(), this.worldY.get(), 0, - constants.TILE_SIZE / 1.5)
				break
			case constants.DOWN_DIRECTION:
				this.raycast_hitbox.set(this.worldX.get(), this.worldY.get(), 0, constants.TILE_SIZE / 1.5)
				break
			case constants.RIGHT_DIRECTION:
				this.raycast_hitbox.set(this.worldX.get(), this.worldY.get(), constants.TILE_SIZE / 1.5, 0)
				break
			case constants.LEFT_DIRECTION:
				this.raycast_hitbox.set(this.worldX.get(), this.worldY.get(), - constants.TILE_SIZE / 1.5, 0)
				break
		}
		// handle deceleration
		if (!this.inputHandler.isKeyDown(constants.UP_KEY) && !this.inputHandler.isKeyDown(constants.DOWN_KEY))
			this.dy.set_value(Math.sign(this.dy.get()) * Math.max(Math.abs(this.dy.get()) - this.acceleration.get(), 0))
		if (!this.inputHandler.isKeyDown(constants.LEFT_KEY) && !this.inputHandler.isKeyDown(constants.RIGHT_KEY))
			this.dx.set_value(Math.sign(this.dx.get()) * Math.max(Math.abs(this.dx.get()) - this.acceleration.get(), 0))

		// apply diagonal speed limitation
		if (this.dx.get() && this.dy.get()) {
			this.dy.set_value(Math.sign(this.dy.get()) * Math.min(this.fullSpeed.get() / Math.SQRT2, Math.abs(this.dy.get())))
			this.dx.set_value(Math.sign(this.dx.get()) * Math.min(this.fullSpeed.get() / Math.SQRT2, Math.abs(this.dx.get())))
		} else {
			this.dy.set_value(Math.sign(this.dy.get()) * Math.min(this.fullSpeed.get(), Math.abs(this.dy.get())))
			this.dx.set_value(Math.sign(this.dx.get()) * Math.min(this.fullSpeed.get(), Math.abs(this.dx.get())))
		}
	}

	/**
	 * 
	 * @param {Map} new_map 
	 */
	set_map(new_map){
		super.set_map(new_map)
		this.raycast_hitbox.set_map(new_map)
		if (this.dragged_entity) {
			this.dragged_entity = null
			this.state = constants.IDLE_STATE
			this.fullSpeed.set_value(constants.TILE_SIZE / 24)
			this.acceleration.set_value(constants.TILE_SIZE / 64)
		}

		this.worldX.set_value(new_map.player_pos.x.get())
		this.worldY.set_value(new_map.player_pos.y.get())
	}

	/**
	 * 
	 * @param {number} x 
	 * @param {number} y 
	 */
	set_pos(x, y) {
		super.set_pos(
			clamp(x, constants.PLAYER_COMBAT_BOX_WIDTH/ 2, this.get_map().world.width.get() - constants.PLAYER_COMBAT_BOX_WIDTH/2),
			clamp(y, constants.PLAYER_COMBAT_BOX_HEIGHT/2, this.get_map().world.height.get() - constants.PLAYER_COMBAT_BOX_HEIGHT/2)
		)
	}

	/**
	 * 
	 * @param {number} current_time 
	 * @returns 
	 */
	updateIdle(current_time) {
		this.handleMoveInput()
		this.handleAttackInput(current_time)

		if (this.handleDragInput()) {
			return
		}

		this.updateMovements()
		this.updateDash(current_time)
		super.update(current_time)
	}

	/**
	 * 
	 * @param {number} current_time 
	 */
	updateWalk(current_time) {
		this.updateIdle(current_time) // we'll keep it as is till it breaks
	}

	handleMoveInput() {
		if (this.inputHandler.isKeyDown(constants.UP_KEY)) {
			this.direction = constants.UP_DIRECTION
			this.dy.set_value(this.dy.get() - this.acceleration.get())
		}
		if (this.inputHandler.isKeyDown(constants.DOWN_KEY)) {
			this.direction = constants.DOWN_DIRECTION
			this.dy.set_value(this.dy.get() + this.acceleration.get())
		}
		if (this.inputHandler.isKeyDown(constants.LEFT_KEY)) {
			this.direction = constants.LEFT_DIRECTION
			this.dx.set_value(this.dx.get() - this.acceleration.get())
		}
		if (this.inputHandler.isKeyDown(constants.RIGHT_KEY)) {
			this.direction = constants.RIGHT_DIRECTION
			this.dx.set_value(this.dx.get() + this.acceleration.get())
		}
	}

	/**
	 * 
	 * @param {number} current_time 
	 * @returns 
	 */
	handleAttackInput(current_time) {
		if (this.inputHandler.isMousePressed(constants.MOUSE_RIGHT_BUTTON)) {
			if (this.remaining_attacks>0){
			const playerWorldX = this.worldX.get()
			const playerWorldY = this.worldY.get()

			const mouseWorldX = this.game.camera.x.get() + (this.inputHandler.mouse_pos.x + this.game.canvas.width / 2)
			const mouseWorldY = this.game.camera.y.get() + (this.inputHandler.mouse_pos.y + this.game.canvas.height / 2)

			const dx = mouseWorldX - playerWorldX
			const dy = mouseWorldY - playerWorldY

			const distance = Math.hypot(dx, dy)
			if (distance <= 10) return
			
		   
			const speed = 20
			const velX = (dx / distance) * speed
			const velY = (dy / distance) * speed
			
			const hb = new Hitbox(this.game, this.game.get_current_map(), playerWorldX, playerWorldY,
				constants.TILE_SIZE / 2, constants.TILE_SIZE / 2, false, false)
			new ProjectileAttack(
				this.game, this, this.game.get_current_map(), current_time,
				2000, [hb], velX, velY, (e) => {
					e.damage(2)
					this.game.effects.BLINK.apply(current_time, e, 200)
				}, false, this.game.tilesets["Axe"], 50,
				{x: playerWorldX - hb.width.get() / 2, y: playerWorldY - hb.height.get() /2}
			)
			this.attack_time=current_time
			this.remaining_attacks-=1

		}}

		let mouse_input = this.inputHandler.isMousePressed(constants.MOUSE_LEFT_BUTTON)
		if (mouse_input || this.inputHandler.isKeyPressed('a')) {
			// fancy stuff
			if (mouse_input) {
				this.updateDirectionFromMouse()
			}

			this.game.effects.ATTACK.apply(current_time,this, 300)
			this.game.effects.MOTIONLESS.apply(current_time, this, 300)

			new SwingingAttack(this.game, this, this.game.get_current_map(), current_time, 300,
				{x: this.worldX.get(), y: this.worldY.get()}, this.direction,
				constants.TILE_SIZE/5, constants.TILE_SIZE, constants.TILE_SIZE/2,
				(e) => { e.damage(2) ; this.game.effects.BLINK.apply(current_time, e, 200)})
			this.game.audioManager.playSound('game', 'slash', 0.5)
			this.state = constants.ATTACK_STATE
		}
	}

	/**
	 * 
	 * @param {number} current_time 
	 * @returns 
	 */
	updateDrag(current_time) {
		if(this.dragged_entity==null) throw new Error('state shouldn\'t be DRAG_STATE if the player isn\'t dragging anything')
		if (this.inputHandler.isKeyPressed(constants.DRAG_KEY)) {
			this.state = constants.IDLE_STATE
			this.dragged_entity = null
			this.fullSpeed.set_value(constants.TILE_SIZE / 24)
			return
		}

		const originalPlayerDirection = this.direction
		const originalPlayerX = this.worldX.get()
		const originalPlayerY = this.worldY.get()
		const originalEntityX = this.dragged_entity.worldX.get()
		const originalEntityY = this.dragged_entity.worldY.get()

		this.handleMoveInput()
		this.updateMovements()

		const gap = constants.TILE_SIZE * 0.3
		let targetX, targetY
		
		switch(this.direction) {
			case constants.LEFT_DIRECTION:
				targetX = this.collision_hitbox.x1.get() - this.collision_hitbox.width.get()/2 - gap
				targetY = this.worldY.get()
				break
			case constants.RIGHT_DIRECTION:
				targetX = this.collision_hitbox.x2.get() + this.collision_hitbox.width.get()/2 + gap
				targetY = this.worldY.get()
				break
			case constants.UP_DIRECTION:
				targetX = this.worldX.get()
				targetY = this.collision_hitbox.y1.get() - this.collision_hitbox.height.get() - gap
				break
			case constants.DOWN_DIRECTION:
				targetX = this.worldX.get()
				targetY = this.collision_hitbox.y2.get() + gap
				break
			default:
				targetX = this.worldX.get()
				targetY = this.worldY.get()
		}

		this.dragged_entity.worldX.set_value(targetX)
		this.dragged_entity.worldY.set_value(targetY)
		
		this.updateHitboxes()
		this.dragged_entity.updateHitboxes()

		if (this.colliding() || this.dragged_entity.colliding()) {
			this.worldX.set_value(originalPlayerX)
			this.worldY.set_value(originalPlayerY)
			this.dragged_entity.worldX.set_value(originalEntityX)
			this.dragged_entity.worldY.set_value(originalEntityY)
			
			this.dx.set_value(0)
			this.dy.set_value(0)
			this.direction = originalPlayerDirection
		}

		super.update(current_time)
	}

	handleDragInput() {
		if (!this.inputHandler.isKeyPressed(constants.DRAG_KEY))
			return false

		for (const hb of this.raycast_hitbox.get_colliding_hitboxes(true, true)) {
			if (hb.owner instanceof Entity && hb.owner.draggable) {
				this.dragged_entity = hb.owner
				this.state = constants.DRAG_STATE

				this.fullSpeed.set_value(constants.TILE_SIZE / 48)
				return true
			}
		}
	}

	render(){
		super.render()
		let in_range = this.raycast_hitbox.get_colliding_hitboxes()
		if(
			in_range.filter(
				hitbox => hitbox.owner instanceof Talkable && hitbox.owner.is_talkable
			).length > 0
		){
			this.game.tilesets["keys_tileset"].drawTile(
				4,
				this.worldX.get() - this.game.camera.x.get()
					- this.game.tilesets["keys_tileset"].screen_tile_size.get() / 2,
				this.worldY.get() - constants.TILE_SIZE * 0.75 - this.game.camera.y.get()
					- this.game.tilesets["keys_tileset"].screen_tile_size.get() / 2
			)
		}
		if(
			in_range.filter(
				hitbox => {
					if(hitbox.owner instanceof Entity){
						hitbox.owner.draggable && !hitbox.owner.dragged
					} else return false
				}
			).length > 0
		){
			this.game.tilesets["keys_tileset"].drawTile(
				8,
				this.worldX.get() - this.game.camera.x.get()
					- this.game.tilesets["keys_tileset"].screen_tile_size.get() / 2,
				this.worldY.get() - constants.TILE_SIZE * 0.75 - this.game.camera.y.get()
					- this.game.tilesets["keys_tileset"].screen_tile_size.get() / 2
			)
		}
		this.render_cooldown(true, true)
	}

	/**
	 * 
	 * @param {boolean} dash 
	 * @param {boolean} attack 
	 */
	render_cooldown(dash, attack){
        if (attack==true){
            var temp = this.game.ctx.fillStyle
            this.game.ctx.fillStyle="blue"
            const W = this.combat_hitbox.width.get()/(this.max_attacks)
            for (let i=1; i<=this.remaining_attacks; i++){
                this.roundedRect(this.worldX.get()-this.game.camera.x.get()- this.combat_hitbox.width.get()/2 + (i-1) * W,this.worldY.get()-this.game.camera.y.get()-this.combat_hitbox.height.get()/2, W-5, new Resizeable(this.game,10).get(), 3)
            }
            if (this.remaining_attacks!=this.max_attacks){
                this.roundedRect(this.worldX.get()-this.game.camera.x.get()- this.combat_hitbox.width.get()/2 +this.remaining_attacks * W,this.worldY.get()-this.game.camera.y.get()-this.combat_hitbox.height.get()/2, (W-5)*(this.current_time-this.attack_time)/2000, new Resizeable(this.game,10).get(), 3)

            }
            
            this.game.ctx.fillStyle=temp
        }
        if (dash==true){
            
            // console.log('rendering dash')
            var temp = this.game.ctx.fillStyle
            const HEX_START = 0XFFF2
            const HEX_END = 0XFF00
            
            let dash_prog=0
            if (this.current_time-this.last_dash > constants.PLAYER_DASH_COOLDOWN){
                dash_prog = constants.PLAYER_DASH_COOLDOWN
            }else{
                dash_prog = this.current_time-this.last_dash
            }
            this.game.ctx.fillStyle="#"+Math.round(HEX_START - (HEX_START-HEX_END)/(constants.PLAYER_DASH_COOLDOWN/(dash_prog))).toString(16)+"00"
            // console.log(dash_prog)
            // this.game.ctx.fillRect(new Resizeable(this.game, 20).get(),new Resizeable(this.game, 20).get() , new Resizeable(this.game, dash_prog/10).get(), new Resizeable(this.game,10).get())
            this.roundedRect(new Resizeable(this.game, 20).get(),new Resizeable(this.game, 20).get() , new Resizeable(this.game, dash_prog/10).get(), new Resizeable(this.game,10).get(), 3)
            
            this.game.ctx.fillStyle=temp

        }
    }

	get_map(){
		if(this.map==null) throw new Error('Player should always have a map, yet it doesn\'t seem to be the case here')
		return this.map
	}
}
