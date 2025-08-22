//@ts-check
import { constants } from "../constants.js"
import { Game } from "../core/game.js"
import { Resizeable } from "../utils.js"

export class Ai{
    /**
     * 
     * @param {Game} game - The current Game
     */
    constructor(game){
        this.game = game

        /**@type {number} */
        this.state = constants.WANDERING_AI_STATE
        /**@type {Resizeable?} */
        this.wandering_speed = null
        /**@type {Resizeable?} */
        this.wandering_radius = null
        /**@type {number?} */
        this.wandering_direction_change_time = null

        this.is_follower = false

        this.is_hostile = false
        /**@type {Resizeable?} */
        this.chasing_speed = null
        /**@type {Resizeable?} */
        this.vision_range = null

        /**@type {number?} */
        this.attack_cooldown = null
        /**@type {Resizeable?} */
        this.attack_range = null
        this.last_attack = 0
        /**@type {Resizeable?} */
        this.projectile_speed = null

        this.is_long_range = false
        /**@type {Resizeable?} */
        this.distance_attack_range = null
        /**@type {number?} */
        this.change_direction_distance_attack_cooldown = null

        this.is_rusher = false
        /**@type {number?} */
        this.rush_cooldown = null
        /**@type {number?} */
        this.nb_attack_during_rush = null

        /**@type {Resizeable?} */
        this.rush_activation_range = null

        /**@type {{[key: string]: any}} */
        this.misc = {}
    }

    /**
     * #### Sets the mob's behaviour when it's wandering
     * @param {number} wandering_speed - The mob's speed when it's wandering 
     * @param {number} wandering_radius - The radius within which the mob can wander, centered arround it's initial spawn point
     * @param {number} wandering_direction_change_time - The duration between each direction changes, at most
     * @returns {Ai}
     */
    set_wandering(wandering_speed, wandering_radius, wandering_direction_change_time){
        this.wandering_speed = new Resizeable(this.game, wandering_speed)
        this.wandering_radius = new Resizeable(this.game, wandering_radius)
        this.wandering_direction_change_time = wandering_direction_change_time
        return this
    }

    /**
     * #### Makes the mob follows the player everywhere
     * @param {number} chasing_speed - The speed at which the mob follows the player
     * @returns {Ai}
     */
    set_follower(chasing_speed){
        this.is_follower = true
        this.chasing_speed = new Resizeable(this.game, chasing_speed)
        return this
    }

    /**
     * #### Sets the mob's behaviour when it's attacking the player to middle ranged.
     * It tries to get close to the player, and randomly dash towards him
     * @param {number} vision_range - The detection radius of the mob
     * @param {number} chasing_speed - The mob's speed when it's attacking
     * @param {number} rush_cooldown - The cooldown between each dash, at most
     * @param {number} nb_attack_during_rush - The number of attacks the mob fire at the end of his dash
     * @returns {Ai}
     */
    set_rusher(vision_range, chasing_speed, rush_cooldown, nb_attack_during_rush){
        this.is_hostile = true
        this.is_rusher = false

        this.vision_range = new Resizeable(this.game, vision_range)
        this.chasing_speed = new Resizeable(this.game, chasing_speed)
        
        this.rush_cooldown = rush_cooldown
        this.nb_attack_during_rush = nb_attack_during_rush

        return this
    }

    /**
     * #### Sets the mob's behaviour when it's attacking the player to long ranged.
     * It runs around the player, attacking him from afar
     * @param {number} vision_range - The detection radius of the mob
     * @param {number} chasing_speed - The mob's speed when it's attacking
     * @param {number} distance_attack_range - The distance the mob tries to keep between it and the player
     * @param {number} change_direction_distance_attack_cooldown - The cooldown between each direction changes, at most
     * @returns {Ai}
     */
    set_long_ranged(vision_range, chasing_speed, distance_attack_range, change_direction_distance_attack_cooldown){
        this.is_hostile = true
        this.is_long_range = true
        
        this.vision_range = new Resizeable(this.game, vision_range)
        this.chasing_speed = new Resizeable(this.game, chasing_speed)

        this.distance_attack_range = new Resizeable(this.game, distance_attack_range)
        this.change_direction_distance_attack_cooldown = change_direction_distance_attack_cooldown
        
        return this
    }

    /**
     * #### Sets the mob's behaviour when it's attacking the player to middle ranged.
     * It runs around the player, but randomly dash towards him
     * @param {number} vision_range - The detection radius of the mob
     * @param {number} chasing_speed - The mob's speed when it's attacking
     * @param {number} rush_cooldown - The cooldown between each dash, at most
     * @param {number} nb_attack_during_rush - The number of attacks the mob fire at the end of his dash
     * @param {number} rush_activation_range - The distance under which the dash's cooldown is halved on average
     * @param {number} distance_attack_range - The distance the mob tries to keep between it and the player
     * @param {number} change_direction_distance_attack_cooldown - The cooldown between each direction changes, at most
     * @returns {Ai}
     */
    set_middle_ranged(vision_range, chasing_speed, rush_cooldown, nb_attack_during_rush, rush_activation_range, distance_attack_range, change_direction_distance_attack_cooldown){
        this.is_hostile = true
        this.is_long_range = true
        this.is_rusher = true

        this.vision_range = new Resizeable(this.game, vision_range)
        this.chasing_speed = new Resizeable(this.game, chasing_speed)

        this.rush_cooldown = rush_cooldown
        this.nb_attack_during_rush = nb_attack_during_rush

        this.distance_attack_range = new Resizeable(this.game, distance_attack_range)
        this.change_direction_distance_attack_cooldown = change_direction_distance_attack_cooldown

        this.rush_activation_range = new Resizeable(this.game, rush_activation_range)

        return this
    }

    /**
     * #### Sets the mob's attack's characteristics
     * @param {number} attack_cooldown - The cooldown between each attacks, at most
     * @param {number} attack_range - The distance under which the mob will start fire its attacks
     * @param {number} projectile_speed - The shooted attack's speed
     * @returns {Ai}
     */
    set_attack(attack_cooldown, attack_range, projectile_speed){
        this.attack_cooldown = attack_cooldown
        this.attack_range = new Resizeable(this.game, attack_range)
        this.projectile_speed = new Resizeable(this.game, projectile_speed)
        this.last_attack = 0
        
        return this
    }

    /**
     * Sets misc properties for the ai
     * @param {{[key: string]: any}} others - An object of the additional properties
     * @returns {Ai}
     */
    set_others(others){
        for(let [key, value] of Object.entries(others)){
            this.misc[key] = value
        }
        return this
    }

    // Here are all the methods used to get the not null version of the ai's properties
    /**@returns {Resizeable} */
    get_wandering_speed(){
        if(this.wandering_speed==null) throw new Error('Property requested as not null is in fact null')
        else return this.wandering_speed
    }
    /**@returns {Resizeable} */
    get_wandering_radius(){
        if(this.wandering_radius==null) throw new Error('Property requested as not null is in fact null')
        else return this.wandering_radius
    }
    /**@returns {number} */
    get_wandering_direction_change_time(){
        if(this.wandering_direction_change_time==null) throw new Error('Property requested as not null is in fact null')
        else return this.wandering_direction_change_time
    }
    /**@returns {Resizeable} */
    get_chasing_speed(){
        if(this.chasing_speed==null) throw new Error('Property requested as not null is in fact null')
        else return this.chasing_speed
    }
    /**@returns {Resizeable} */
    get_vision_range(){
        if(this.vision_range==null) throw new Error('Property requested as not null is in fact null')
        else return this.vision_range
    }
    /**@returns {number} */
    get_attack_cooldown(){
        if(this.attack_cooldown==null) throw new Error('Property requested as not null is in fact null')
        else return this.attack_cooldown
    }
    /**@returns {Resizeable} */
    get_attack_range(){
        if(this.attack_range==null) throw new Error('Property requested as not null is in fact null')
        else return this.attack_range
    }
    /**@returns {Resizeable} */
    get_projectile_speed(){
        if(this.projectile_speed==null) throw new Error('Property requested as not null is in fact null')
        else return this.projectile_speed
    }
    /**@returns {Resizeable} */
    get_distance_attack_range(){
        if(this.distance_attack_range==null) throw new Error('Property requested as not null is in fact null')
        else return this.distance_attack_range
    }
    /**@returns {number} */
    get_change_direction_distance_attack_cooldown(){
        if(this.change_direction_distance_attack_cooldown==null) throw new Error('Property requested as not null is in fact null')
        else return this.change_direction_distance_attack_cooldown
    }
    /**@returns {number} */
    get_rush_cooldown(){
        if(this.rush_cooldown==null) throw new Error('Property requested as not null is in fact null')
        else return this.rush_cooldown
    }
    /**@returns {number} */
    get_nb_attack_during_rush(){
        if(this.nb_attack_during_rush==null) throw new Error('Property requested as not null is in fact null')
        else return this.nb_attack_during_rush
    }
    /**@returns {Resizeable} */
    get_rush_activation_range(){
        if(this.rush_activation_range==null) throw new Error('Property requested as not null is in fact null')
        else return this.rush_activation_range
    }
}
