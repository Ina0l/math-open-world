//@ts-check
import { Entity } from "./entity.js"


/**
 * @typedef {Object} EffectInstance
 * 
 * @property {Entity} entity
 * @property {number} origin
 * @property {number} duration
 * @property {number} last_update
 * @property {{[key: string]: any}} misc_values
 */

export class Effect {
	/**
	 * @param {(instance: EffectInstance) => void} effect
	 * @param {(instance: EffectInstance) => void} start
	 * @param {(instance: EffectInstance) => void} end
	 * @param {number} update_cooldown - time between each update
	 */
	constructor(effect, start, end, update_cooldown) {
		this.effect = effect
		this.start = start
		this.end = end
		/** @type {Array<EffectInstance>} */
		this.effect_instances = []
		/** @type {Array<Entity>} */
		this.entities = []
		this.update_cooldown = update_cooldown
	}

	/**
	 * #### Applies an effect to an entity for a certain duration
	 * When applied, the start() function is executed
	 * 
	 * On each update, the effect() function is executed
	 * 
	 * When the effect's duration has expired, the end() function is executed
	 * 
	 * appling the same effect twice on an entity only extends the cooldown (if the new origin + duration is longer than the previous one)
	 * @param {number} current
	 * @param {Entity} entity
	 * @param {number} duration
	 */
	apply(current, entity, duration) {
		const i = this.entities.indexOf(entity)
		if (i !== -1) {
			if(this.effect_instances[i].origin + this.effect_instances[i].duration < current + duration)
				this.effect_instances[i].duration = current + duration - this.effect_instances[i].origin
			return
			// So that applying an effect twice only prolongate the effect's duration
		}

		this.effect_instances.push({
			entity: entity,
			origin: current,
			duration: duration,
			last_update: current - this.update_cooldown,
			misc_values: {}
		})
		this.entities.push(entity)
		this.start(this.effect_instances[this.effect_instances.length-1])
	}

	/**
	 * 
	 * @param {number} current 
	 */
	update(current) {
		for (let i = 0; i < this.effect_instances.length; i++) {
			let effect_instance = this.effect_instances[i]
			if (current - effect_instance.last_update > this.update_cooldown) {
				this.effect(effect_instance)
			}
			if (current - effect_instance.origin >= effect_instance.duration) {
				this.end(effect_instance)
				this.effect_instances.splice(i, 1)
				this.entities.splice(i, 1)
			}
		}
	}
}
