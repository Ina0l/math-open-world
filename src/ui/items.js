//@ts-check
import { config } from "../constants.js"
import { Game } from "../core/game.js"
import { slice } from "../utils.js"

export class Item{
    /**
     * 
     * @param {Game} game 
     * @param {string} name 
     */
    constructor(game, name){
        this.game = game
        this.name = name
        this.game.items[name] = this
        /** @type {Array<string>?} */
        this.tooltip = null
        this.max_count = 99
        this.quest_item = false
    }

    /**
     * 
     * @param {Game} game 
     * @param {string} src 
     * @param {string} name 
     * @returns {Promise<Item>}
     */
    static async create(game, src, name){
        let item = new Item(game, name)
        try{
            item.load(config.IMG_DIR + src)
        } catch (error){
            console.error(`Couldn't load file "${src}": ${error.message}`);
        }
        return item
    }

    /**
     * 
     * @param {string} src 
     */
    async load(src){
        const img = new Image();
        img.src = src;
        this.img = img;

        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
        });
    }

    /**
     * 
     * @param {string} tooltip 
     * @returns {Item}
     */
    set_tooltip(tooltip){
        this.tooltip = slice(tooltip, 35)
        return this
    }

    /**
     * 
     * @param {number} count 
     * @returns {Item}
     */
    set_max_count(count){
        this.max_count = count
        return this
    }

    /**
     * #### Mark the item as a quest item
     * Quest items cannot be discarded by normal means
     * @returns {Item}
     */
    set_quest_item(){
        this.quest_item = true
        return this
    }
}

// @ts-ignore
export class Consumable extends Item{
    /**
     * 
     * @param {Game} game 
     * @param {string} name 
     * @param {(consumable: Consumable, time: number) => void} on_use 
     */
    constructor(game, name, on_use){
        super(game, name)
        this.on_use = on_use
    }

    /**
     * 
     * @param {Game} game 
     * @param {string} src 
     * @param {string} name 
     * @param {(consumable: Consumable, time: number) => void} on_use 
     * @returns {Promise<Consumable>}
     */
    static async create(game, src, name, on_use){
        let consumable = new Consumable(game, name, on_use)
        try{
            consumable.load(config.IMG_DIR + src)
        } catch (error){
            console.error(`Couldn't load file "${src}": ${error.message}`);
        }
        return consumable
    }

    /**
     * 
     * @param {string} tooltip 
     * @returns {Consumable}
     */
    set_tooltip(tooltip){
        let consumable = super.set_tooltip(tooltip)
        if(consumable instanceof Consumable){
            return consumable
        } else throw new Error('Somehow, the item wasn\'t a consumable')
    }
    /**
     * 
     * @param {number} count 
     * @returns {Consumable}
     */
    set_max_count(count){
        let consumable = super.set_max_count(count)
        if(consumable instanceof Consumable){
            return consumable
        } else throw new Error('Somehow, the item wasn\'t a consumable')
    }
    /**
     * 
     * @returns {Consumable}
     */
    set_quest_item(){
        let consumable = super.set_quest_item()
        if(consumable instanceof Consumable){
            return consumable
        } else throw new Error('Somehow, the item wasn\'t a consumable')
    }
}

// @ts-ignore
export class Passive extends Item{
    /**
     * 
     * @param {Game} game 
     * @param {string} name 
     * @param {(passive: Passive, time: number) => void} effect 
     */
    constructor(game, name, effect){
        super(game, name)
        this.effect = effect
    }

    /**
     * 
     * @param {Game} game 
     * @param {string} src 
     * @param {string} name 
     * @param {(passive: Passive, time: number) => void} effect 
     * @returns {Promise<Passive>}
     */
    static async create(game, src, name, effect){
        let passive = new Passive(game, name, effect)
        try{
            passive.load(config.IMG_DIR + src)
        } catch (error){
            console.error(`Couldn't load file "${src}": ${error.message}`);
        }
        return passive
    }

    /**
     * 
     * @param {string} tooltip 
     * @returns {Passive}
     */
    set_tooltip(tooltip){
        let passive = super.set_tooltip(tooltip)
        if(passive instanceof Passive){
            return passive
        } else throw new Error('Somehow, the item wasn\'t a passive')
    }
    /**
     * 
     * @param {number} count
     * @returns {Passive} 
     */
    set_max_count(count){
        let passive = super.set_max_count(count)
        if(passive instanceof Passive){
            return passive
        } else throw new Error('Somehow, the item wasn\'t a passive')
    }
    /**
     * 
     * @returns {Passive}
     */
    set_quest_item(){
        let passive = super.set_quest_item()
        if(passive instanceof Passive){
            return passive
        } else throw new Error('Somehow, the item wasn\'t a passive')
    }
}

export class ItemStack{

    /**
     * 
     * @param {Item} item 
     * @param {number} count
     */
    constructor(item, count){
        if(item.max_count < count) console.error("Max item count reached")
        this.game = item.game
        this.item = item
        this.count = count
        this.consumable = (item instanceof Consumable)
        this.passive = (item instanceof Passive)
    }

    /**
     * 
     * @param {number} n 
     */
    add_count(n){
        if(this.count < -n) console.error("Negative item count")
        if(this.count + n > this.item.max_count) console.error("Max item count reached") 
        this.count += n
    }
}
