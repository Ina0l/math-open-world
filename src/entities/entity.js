//@ts-check
import { Game } from "../core/game.js"
import { Hitbox } from "./hitbox.js"
import { Map } from "../world/map.js"
import { Tileset } from "../world/tileset.js"
import { constants } from "../constants.js"
import { Attack, SwingingAttack } from "./attack.js"
import { clamp, Resizeable } from "../utils.js"

export class Entity {
    /**
     * 
     * @param {Game} game 
     * @param {Map?} map 
     * @param {Tileset} tileset 
     * @param {Hitbox} collision_hitbox 
     * @param {Hitbox} combat_hitbox 
     * @param {number} worldX 
     * @param {number} worldY 
     * @param {number} animation_duration 
     * @param {number?} life 
     * @param {{combat: {x: number, y: number}, collision: {x: number, y: number}}} hitboxes_offset 
     * @param {number?} bottom_y 
     * @param {boolean} [draggable=false] 
     * @param {string} type 
     */
    constructor(game, map, tileset, collision_hitbox, combat_hitbox, worldX, worldY, animation_duration, life=null, hitboxes_offset={combat:{x:0,y:0},collision:{x:0,y:0}}, bottom_y=null, draggable=false, type="") {

        this.game = game
        this.map = map
        this.type = type
		this.id = game.next_entity_id
		game.next_entity_id++

        this.player = false
		this.rendered = false

		this.state = constants.IDLE_STATE // each state takes 4 lines in the tileset (down, up, right, left)
		this.framesPerState = [null, 5] // first idle, then walk, then attack, ...
        // when idle is null, the entity uses the first walking frame

        // World position at the center
        this.worldX = new Resizeable(game, worldX)
        this.worldY = new Resizeable(game, worldY)

		this.bottom_y = new Resizeable(game, bottom_y || 0)
        
        this.dx = new Resizeable(game, 0)
        this.dy = new Resizeable(game, 0)

		this.draggable = draggable 
		if (draggable)
			this.dragged = false

        this.tileset = tileset
        this.collision_hitbox = collision_hitbox
        this.combat_hitbox = combat_hitbox
		this.collision_hitbox.set_owner(this)
		this.combat_hitbox.set_owner(this)

        this.animation_step = 0
        this.animation_duration = animation_duration
        this.direction = 0
        this.last_time = 0

        this.life = life

        this.active = true


        this.hitboxes_offset = {
            combat: {
                x: new Resizeable(game, hitboxes_offset.combat.x),
                y: new Resizeable(game, hitboxes_offset.combat.y)
            },
            collision: {
                x: new Resizeable(game, hitboxes_offset.collision.x),
                y: new Resizeable(game, hitboxes_offset.collision.y)
            }
        }

        this.game.entities.push(this)
        this.max_attacks=4
        this.remaining_attacks=4
        this.attack_time=0
        this.current_time=0
    }

    /**
     * @param {number} current_time 
     * @returns 
     */
    update(current_time) {
        this.current_time=current_time
        if (current_time-this.attack_time>=2000){
			if (this.remaining_attacks!=this.max_attacks){
				this.remaining_attacks += 1
			}
            this.attack_time=current_time
        }
        if(this.game.get_current_map() != this.map)
            return

        // Split movement into X and Y components to handle collisions separately
        this.updatePositionX()
		this.updateHitboxes()
        if (this.colliding()) {
            this.backPositionX()
            this.dx.set_value(0)
        }
        
        this.updatePositionY()
		this.updateHitboxes()
        if (this.colliding()) {
            this.backPositionY()
            this.dy.set_value(0)
        }

        this.collision_hitbox.get_colliding_hitboxes(true, false).forEach(hitbox => {
			hitbox.command(hitbox, this.collision_hitbox, current_time)
		})

		this.combat_hitbox.get_colliding_hitboxes(false, true).forEach(hitbox => {
			if (hitbox.owner instanceof Attack){
				if (hitbox.owner instanceof SwingingAttack) {
					//...
				}
				hitbox.owner.apply(this, current_time)
			}
			hitbox.command(hitbox, this.combat_hitbox, current_time)
		})
        if(!this.active) return

		// only apply to combat hitboxes as they're included in collision ones, so don't need to apply to collisions
		this.combat_hitbox.get_colliding_hitboxes(false, false).forEach(hitbox => {
			hitbox.command(hitbox, this.combat_hitbox, current_time)
		})

        this.handleAnimation(current_time)
    }

    updatePositionX() {
        const halfHitboxWidth = this.combat_hitbox.width.get() / 2 + this.hitboxes_offset.combat.x.get()
        this.worldX.set_value(clamp(
            this.worldX.get() + this.dx.get(),
            halfHitboxWidth,
            this.game.get_current_map().world.width.get() - halfHitboxWidth
        ))
        if(this.worldX.get() === this.game.get_current_map().world.width.get() - halfHitboxWidth || this.worldX.get() === halfHitboxWidth)
            this.dx.set_value(0)
    }

    updatePositionY() {
        const halfHitboxHeight = this.combat_hitbox.height.get() / 2 + this.hitboxes_offset.combat.y.get()
        this.worldY.set_value(clamp(
            this.worldY.get() + this.dy.get(),
            halfHitboxHeight,
            this.game.get_current_map().world.height.get() - halfHitboxHeight
        ))
        if(this.worldY.get() === this.game.get_current_map().world.height.get() - halfHitboxHeight || this.worldY.get() === halfHitboxHeight)
            this.dy.set_value(0)
    }

    updateHitboxes() {
        this.collision_hitbox.center_around(this.worldX.get() + this.hitboxes_offset.collision.x.get(), this.worldY.get() + this.hitboxes_offset.collision.y.get())
        this.combat_hitbox.center_around(this.worldX.get() + this.hitboxes_offset.combat.x.get(), this.worldY.get() + this.hitboxes_offset.combat.y.get())
    }

    colliding() {
        for (let collision_hitbox of this.game.collision_hitboxes) {
            if (collision_hitbox === this.collision_hitbox) continue
            if (this.collision_hitbox.is_colliding(collision_hitbox)) return true
        }
        return false
    }

    backPositionX() {
        this.worldX.set_value(this.worldX.get() - this.dx.get())
        this.dx.set_value(0)
    }

    backPositionY() {
        this.worldY.set_value(this.worldY.get() - this.dy.get())
        this.dy.set_value(0)
    }

    /**
     * 
     * @param {number} current_time 
     * @returns 
     */
    handleAnimation(current_time) {
        this.updateDirection()
        
        if (current_time - this.last_time < this.animation_duration) return

        let state_frame_number = this.framesPerState[this.state]
        if(state_frame_number==null){
            this.animation_step = 0
        } else {
            this.animation_step = (this.animation_step + 1) % state_frame_number
        }

        this.last_time = current_time
    }

    updateDirection() {
        if (this.dy.get() === 0 && this.dx.get() === 0) return

        if (Math.abs(this.dy.get()) > Math.abs(this.dx.get())) {
            this.direction = this.dy.get() > 0 ? constants.DOWN_DIRECTION : constants.UP_DIRECTION
        } else {
            this.direction = this.dx.get() > 0 ? constants.RIGHT_DIRECTION : constants.LEFT_DIRECTION
        }
    }

    render() {
        if (this.game.get_current_map() !== this.map) return
		if (this.rendered === true) return
		this.rendered = true

        if (this.isWithinCameraView()) {
            const screenX = this.worldX.get() - this.game.camera.x.get() - this.tileset.screen_tile_size.get() / 2
            const screenY = this.worldY.get() - this.game.camera.y.get() - this.tileset.screen_tile_size.get() / 2
			this.tileset.drawEntity(this, screenX, screenY)
            this.render_health_bar()
            
        }


        if(this.game.get_option_menu().debug){
            this.game.ctx.beginPath()
            this.game.ctx.arc(this.worldX.get() - this.game.camera.x.get(), this.worldY.get() - this.game.camera.y.get(), 3, 0, Math.PI * 2)
            this.game.ctx.fillStyle = this.player ? "blue": "red"
            this.game.ctx.fill()
        }
    }

    isWithinCameraView() {
        return (
            this.worldX.get() + this.tileset.screen_tile_size.get() / 2 >= this.game.camera.x.get() &&
            this.worldX.get() - this.tileset.screen_tile_size.get() / 2 <= this.game.camera.x.get() + this.game.canvas.width &&
            this.worldY.get() + this.tileset.screen_tile_size.get() / 2 >= this.game.camera.y.get() &&
            this.worldY.get() - this.tileset.screen_tile_size.get() / 2 <= this.game.camera.y.get() + this.game.canvas.height
        )
    }

    /**
     * 
     * @param {Map?} new_map 
     */
    set_map(new_map) {
        this.map = new_map
        this.collision_hitbox.set_map(new_map)
        this.combat_hitbox.set_map(new_map)
    }

    /**
     * 
     * @param {number} x 
     * @param {number} y 
     */
    set_pos(x, y){
        this.worldX.set_value(x)
        this.worldY.set_value(y)
    }

    /**
     * 
     * @param {number} amount 
     */
    damage(amount){
        if(this.life!=null)
            this.life -= amount
    }

	destroy() {
        if(this.player) throw new Error("Player shouldn't be deleted")
		this.combat_hitbox.active = false
		this.collision_hitbox.active = false
        this.active = false
	}

    // Here are overrideable methods for entities subclasses
    /**
     * @param {Attack} killing_attack 
     */
    on_death(killing_attack){
        if(!this.player) this.destroy()
    }
    /**
     * @param {Attack} attack 
     */
    on_attacked(attack){
        if(this.life != null && this.life <= 0) this.on_death(attack)
    }

    render_health_bar(){
        if(this.life==null) return // If life=null we don't really need to render the health bar, do we ?
        let temp = this.game.ctx.fillStyle
        this.game.ctx.fillStyle = constants.HEALTH_COLORS[Math.round((this.life/100)*2)]
        let W = this.combat_hitbox.width.get()*this.life/100
        
        this.roundedRect(this.worldX.get()-this.game.camera.x.get()- W/2,this.worldY.get()-this.game.camera.y.get()-this.combat_hitbox.height.get()/2-new Resizeable(this.game,15).get(), W, new Resizeable(this.game,10).get(), 3)
        this.game.ctx.fillStyle=temp
    }

    /**
     * 
     * @param {number} x 
     * @param {number} y 
     * @param {number} width 
     * @param {number} height 
     * @param {number} radius 
     */
    roundedRect(x, y, width, height, radius) {
        this.game.ctx.beginPath();
        this.game.ctx.moveTo(x, y + radius);
        this.game.ctx.lineTo(x, y + height - radius);
        this.game.ctx.quadraticCurveTo(x, y + height, x + radius, y + height);
        this.game.ctx.lineTo(x + width - radius, y + height);
        this.game.ctx.quadraticCurveTo(
            x + width,
            y + height,
            x + width,
            y + height - radius,
        );
        this.game.ctx.lineTo(x + width, y + radius);
        this.game.ctx.quadraticCurveTo(x + width, y, x + width - radius, y);
        this.game.ctx.lineTo(x + radius, y);
        this.game.ctx.quadraticCurveTo(x, y, x, y + radius);
        this.game.ctx.stroke();
        this.game.ctx.fill()
    }
}
