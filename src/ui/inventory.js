import { config, constants } from "../constants.js";
import { Game } from "../core/game.js";
import { Resizeable } from "../utils.js";
import { Item, ItemStack } from "./items.js";
import { Ui, UiBase } from "./ui.js";
import { Button, Icon, Label, NumberArea, Texture, Widget, Window } from "./widgets.js";

export class Inventory extends Ui{
    /**
     * 
     * @param {Game} game 
     * @param {Array<Widget>} widgets_array 
     * @param {Number} slot_width 
     */
    constructor(game, widgets_array, slot_width){
        /**@type {Array<Widget>} */
        var widgets = []
        for(let i=0; i<9; i++){
            widgets.push(new Button(game, `inventory-button-${i}`,
                Inventory.get_slot_coordinates(i).x, Inventory.get_slot_coordinates(i).y,
                slot_width, slot_width, true,
                (b, time) => {
                    b.ui.clicked_slot = i
                    /** @type {ItemStack} */
                    let itemstack = b.ui.get_slot(i)
                    if (itemstack){
                        if(itemstack.consumable) {
                            if(itemstack.item.quest_item){
                                this.get_widget("tooltip-title-label").rendered = false
                                this.erase_tooltip_box()
                                this.erase_tooltip_description()
                                /** @type {Window} */
                                let window = b.ui.get_widget("quest-choice-window")
                                window.update_config(
                                    b.game.inputHandler.mouse_pos.x + constants.TILE_SIZE / 13,
                                    b.game.inputHandler.mouse_pos.y + constants.TILE_SIZE / 13
                                )
                                window.activate()
                            } else {
                                this.get_widget("tooltip-title-label").rendered = false
                                this.erase_tooltip_box()
                                this.erase_tooltip_description()
                                /** @type {Window} */
                                let window = b.ui.get_widget("consumable-choice-window")
                                window.update_config(
                                    b.game.inputHandler.mouse_pos.x + constants.TILE_SIZE / 13,
                                    b.game.inputHandler.mouse_pos.y + constants.TILE_SIZE / 13
                                )
                                window.window_ui
                                    .get_widget("discard-window").window_ui
                                    .get_widget("discard-numberarea").max_char_number =
                                        itemstack.count.toString().length==0? 1: itemstack.count.toString().length
                                window.activate()
                            }
                        } else {
                            if(itemstack.item.quest_item) return
                            this.get_widget("tooltip-title-label").rendered = false
                            this.erase_tooltip_box()
                            this.erase_tooltip_description()
                            /** @type {Window} */
                            let window = b.ui.get_widget("regular-choice-window")
                            window.update_config(
                                b.game.inputHandler.mouse_pos.x + constants.TILE_SIZE / 13,
                                b.game.inputHandler.mouse_pos.y + constants.TILE_SIZE / 13                
                            )
                            window.window_ui
                                .get_widget("discard-window").window_ui
                                .get_widget("discard-numberarea").max_char_number =
                                    itemstack.count.toString().length==0? 1: itemstack.count.toString().length
                            window.activate()
                        }
                    }
                }
            ))
            widgets.push(new Label(game,`item-count-${i}`,Inventory.get_slot_coordinates(i).x + constants.TILE_SIZE*0.72,
                                    Inventory.get_slot_coordinates(i).y + constants.TILE_SIZE * 0.80, '0',
                                    false, 1, constants.TILE_SIZE / 2, 'white', 'Impact', true))
        }
        widgets_array.forEach(texture => {widgets.push(texture)})
          
        /**@type {(inv: Inventory, t: Number) => void} */
        var widgets_states_handler = (inv, t)=>{
            var hovered_texture = inv.get_widget("hovered-texture")
            var has_hovered = false
            
            for(let i = 0; i < 9; i++){
                if(inv.get_widget(`inventory-button-${i}`).is_hovered){
                    hovered_texture.update_config(
                        Inventory.get_slot_coordinates(i).x,
                        Inventory.get_slot_coordinates(i).y,
                        null, null, true
                    )
                    has_hovered = true

                    if(inv.get_slot(i)){
                        let item = inv.get_slot(i).item
                        inv.get_widget("tooltip-title-label").update_config(
                            inv.game.inputHandler.mouse_pos.x + constants.TILE_SIZE * 0.25,
                            inv.game.inputHandler.mouse_pos.y,
                            item.name, true
                        )
                        if(item.tooltip){
                            if(!inv.ids.includes("tooltip-description-0-label")){
                                for(let i=0; i< item.tooltip.length; i++){
                                    let line = item.tooltip[i]
                                    inv.add_widget(new Label(inv.game, `tooltip-description-${i}-label`,
                                        inv.game.inputHandler.mouse_pos.x + constants.TILE_SIZE * 0.25,
                                        inv.game.inputHandler.mouse_pos.y + constants.TILE_SIZE * (0.5 + i * 0.3),
                                        line, true, 4, constants.TILE_SIZE * 0.2, "white"
                                    ))
                                }
                            } else {
                                let hovered_changed = false
                                /** @type {Array<Label>} */
                                let tooltip_descriptions_label = inv.widgets.filter(
                                    widget => widget.id.endsWith("-label") && widget.id.includes("tooltip-description-")
                                )
                                for(let i=0; i< tooltip_descriptions_label.length; i++){
                                    if(tooltip_descriptions_label[i].text != item.tooltip[i])
                                        hovered_changed = true
                                }
                                if(hovered_changed){
                                    inv.erase_tooltip_description()
                                    return
                                }
                                for(let i=0; i < item.tooltip.length; i++){
                                    inv.get_widget(`tooltip-description-${i}-label`).update_config(
                                        inv.game.inputHandler.mouse_pos.x + constants.TILE_SIZE * 0.25,
                                        inv.game.inputHandler.mouse_pos.y + constants.TILE_SIZE * (0.5 + i * 0.3)
                                    )
                                }
                            }
                        } else inv.erase_tooltip_description()

                        if(!inv.ids.includes("tooltip-box-0-0-icon")){
                            let widths = [item.name.length * inv.get_widget("tooltip-title-label").fontsize.get() / 2]
                            inv.widgets.filter(
                                widget => widget.id.endsWith("-label") && widget.id.includes("tooltip-description-")
                            ).forEach(widget => {
                                widths.push(widget.text.length * widget.fontsize.get() / 2)
                            })

                            let width_nb = Math.ceil(
                                (
                                    Math.max(...widths) + constants.TILE_SIZE * 0.25
                                ) / inv.game.tilesets["inventory_tooltip_tileset"].screen_tile_size.get()
                            )
                            if(width_nb * inv.game.tilesets["inventory_tooltip_tileset"].screen_tile_size.get() == Math.max(...widths) + constants.TILE_SIZE * 0.25){
                                width_nb++
                            }

                            let tooltip_height = (
                                                    item.tooltip? item.tooltip.length * (
                                                        inv.get_widget("tooltip-description-0-label").fontsize.get() + constants.TILE_SIZE * 0.3
                                                    ) - constants.TILE_SIZE * 0.3: 0
                                                ) + inv.get_widget("tooltip-title-label").fontsize.get() * 1.5
                            let height_nb = Math.ceil(
                                tooltip_height / inv.game.tilesets["inventory_tooltip_tileset"].screen_tile_size.get()
                            )
                            if(height_nb * inv.game.tilesets["inventory_tooltip_tileset"].screen_tile_size.get() == tooltip_height)
                                height_nb++

                            for(let x=0; x<width_nb; x++){
                                for(let y=0; y<height_nb; y++){
                                    inv.add_widget(new Icon(
                                        inv.game, `tooltip-box-${x}-${y}-icon`,
                                        inv.game.inputHandler.mouse_pos.x + inv.game.tilesets["inventory_tooltip_tileset"].screen_tile_size.get() * x,
                                        inv.game.inputHandler.mouse_pos.y + inv.game.tilesets["inventory_tooltip_tileset"].screen_tile_size.get() * y,
                                        inv.game.tilesets["inventory_tooltip_tileset"],
                                        (x==0? 1: x==width_nb-1? 3: 2) + 3 * (y==0? 0: y==height_nb-1? 2: 1), true, 3
                                    ))
                                }
                            }
                        } else {
                            let widths = [item.name.length * inv.get_widget("tooltip-title-label").fontsize.get() / 2]
                            inv.widgets.filter(
                                widget => widget.id.endsWith("-label") && widget.id.includes("tooltip-description-")
                            ).forEach(widget => {
                                widths.push(widget.text.length * widget.fontsize.get() / 2)
                            })
                            
                            let width_nb = Math.ceil(
                                (
                                    Math.max(...widths) + constants.TILE_SIZE * 0.25
                                ) / inv.game.tilesets["inventory_tooltip_tileset"].screen_tile_size.get()
                            )
                            if(width_nb * inv.game.tilesets["inventory_tooltip_tileset"].screen_tile_size.get() == Math.max(...widths) + constants.TILE_SIZE * 0.25){
                                width_nb++
                            }

                            let tooltip_height = (
                                                    item.tooltip? item.tooltip.length * (
                                                        inv.get_widget("tooltip-description-0-label").fontsize.get() + constants.TILE_SIZE * 0.3
                                                    ) - constants.TILE_SIZE * 0.3: 0
                                                ) + inv.get_widget("tooltip-title-label").fontsize.get() * 1.5
                            let height_nb = Math.ceil(
                                tooltip_height / inv.game.tilesets["inventory_tooltip_tileset"].screen_tile_size.get()
                            )
                            if(height_nb * inv.game.tilesets["inventory_tooltip_tileset"].screen_tile_size.get() == tooltip_height)
                                height_nb++
                            
                            if(inv.ids.filter(id => id.endsWith("-icon") && id.includes("tooltip-box-")).length != width_nb * height_nb){
                                inv.erase_tooltip_box()
                                return
                            }
                            for(let x=0; x<width_nb; x++){
                                for(let y=0; y<height_nb; y++){
                                    inv.get_widget(`tooltip-box-${x}-${y}-icon`).update_config(
                                        inv.game.inputHandler.mouse_pos.x + inv.game.tilesets["inventory_tooltip_tileset"].screen_tile_size.get() * x,
                                        inv.game.inputHandler.mouse_pos.y + inv.game.tilesets["inventory_tooltip_tileset"].screen_tile_size.get() * y - inv.get_widget("tooltip-title-label").fontsize.get() / 1.5,
                                    )
                                }
                            }
                        }
                    }
                }
            }
            
            if(!has_hovered){
                hovered_texture.rendered = false
                inv.get_widget("tooltip-title-label").rendered = false
                inv.erase_tooltip_description()
                inv.erase_tooltip_box()
            }
        }
        var inventory_side = new Resizeable(game, game.canvas.width / 2.6)
        super(game, inventory_side, inventory_side, widgets, widgets_states_handler)
        this.clicked_slot = null
        this.slot_width = slot_width
        /** @type {Array<Array<ItemStack>>} */
        this.itemstacks = [
            [null, null, null],
            [null, null, null],
            [null, null, null]
        ]
    }

    /**
     * 
     * @param {Game} game 
     * @param {String} src 
     * @returns {Promise<Inventory>}
     */
    static async create(game, src){
        let slot_width = constants.TILE_SIZE * 1.05
        let widgets_array = [
            new Label(game, "tooltip-title-label", 0, 0, "", false, 4, constants.TILE_SIZE * 0.5, "white"),
            await Texture.create(game, "hovered-texture",
                "hovered.png", 0, 0, slot_width, slot_width, false, 2),
            new Window(game, "regular-choice-window",
                await UiBase.create(game, "inventory_regular_discard_window.png", 0, 0, constants.TILE_SIZE, constants.TILE_SIZE, [
                    new Button(game, "discard-button", -constants.TILE_SIZE / 2, -constants.TILE_SIZE / 2, constants.TILE_SIZE, constants.TILE_SIZE / 2, true,
                        (button, time) => {
                            button.ui.get_widget("discard-window").update_config(
                                button.ui.x_center.get() + constants.TILE_SIZE / 2,
                                button.ui.y_center.get() - constants.TILE_SIZE / 4
                            )
                            button.ui.get_widget("discard-window").activate()
                        }),
                    new Label(game, "discard-label", -constants.TILE_SIZE / 4, -constants.TILE_SIZE / 4, "Discard", true, 0, constants.TILE_SIZE / 6, "white"),
                    new Button(game, "cancel-button", -constants.TILE_SIZE / 2, 0, constants.TILE_SIZE, constants.TILE_SIZE / 2, true,
                        (button, time) => {
                            button.ui.is_finished = true
                        }
                    ),
                    new Label(game, "cancel-label", -constants.TILE_SIZE / 4, constants.TILE_SIZE / 4, "Cancel", true, 0, constants.TILE_SIZE / 6, "white"),
                    await Texture.create(game, "hovered-texture", "hovered.png", 0, 0, constants.TILE_SIZE, constants.TILE_SIZE / 2, false, 1),
                    new Window(game, "discard-window",
                        await UiBase.create(game, "inventory_discard_count_window.png", 0, 0, constants.TILE_SIZE * 1.5, constants.TILE_SIZE, [
                            new Label(game, "discard-label", -constants.TILE_SIZE * 0.625, -constants.TILE_SIZE / 4, "Discard count:", true, 0, constants.TILE_SIZE / 6, "white"),
                            new NumberArea(game, "discard-numberarea", -constants.TILE_SIZE * 0.625, 0, constants.TILE_SIZE * 0.75, constants.TILE_SIZE / 4, 2, true, 1, constants.TILE_SIZE * 0.2),
                            new Button(game, "confirm-button", constants.TILE_SIZE * 0.15, 0, constants.TILE_SIZE * 0.5, constants.TILE_SIZE / 4, true,
                                (button, time) => {
                                    if(button.ui.source.ui.source.ui.get_slot(button.ui.source.ui.source.ui.clicked_slot).count < parseInt(button.ui.get_widget("discard-numberarea").content)) return
                                    button.ui.source.ui.source.ui.get_slot(button.ui.source.ui.source.ui.clicked_slot)
                                        .add_count(-parseInt(button.ui.get_widget("discard-numberarea").content))
                                    button.ui.is_finished = true
                                    button.ui.source.ui.is_finished = true
                                }
                            ),
                            new Button(game, "cancel-button", constants.TILE_SIZE * 0.15, constants.TILE_SIZE / 4, constants.TILE_SIZE * 0.5, constants.TILE_SIZE / 4, true,
                                (button, time) => {
                                    button.ui.is_finished = true
                                }
                            ),
                            new Label(game, "confirm-label", constants.TILE_SIZE * 0.15, constants.TILE_SIZE / 8, "confirm", true, 0, constants.TILE_SIZE * 0.15, "white"),
                            new Label(game, "cancel-label", constants.TILE_SIZE * 0.15, constants.TILE_SIZE * 0.375, "cancel", true, 0, constants.TILE_SIZE * 0.15, "white"),
                            await Texture.create(game, "hovered-texture", "hovered.png", 0, 0, constants.TILE_SIZE / 2, constants.TILE_SIZE / 4, false, 1),
                            await Texture.create(game, "numberarea-texture", "inventory_discard_count_window_numberarea_texture.png", -constants.TILE_SIZE * 0.625, 0, constants.TILE_SIZE * 0.75, constants.TILE_SIZE / 4, true, 0)
                        ], (ui, time) => {
                            if(ui.get_widget("confirm-button").is_hovered){
                                ui.get_widget("hovered-texture").update_config(
                                    constants.TILE_SIZE * 0.15, 0, null, null, true
                                )
                            } else if(ui.get_widget("cancel-button").is_hovered){
                                ui.get_widget("hovered-texture").update_config(
                                    constants.TILE_SIZE * 0.15, constants.TILE_SIZE / 4, null, null, true
                                )
                            } else {
                                ui.get_widget("hovered-texture").rendered = false
                            }
                        }))
                ], (ui, time) => {
                    if(ui.get_widget("discard-button").is_hovered){
                        ui.get_widget("hovered-texture").update_config(
                            -constants.TILE_SIZE / 2, -constants.TILE_SIZE / 2, null, null, true
                        )
                    } else if(ui.get_widget("cancel-button").is_hovered){
                        ui.get_widget("hovered-texture").update_config(
                            -constants.TILE_SIZE / 2, 0, null, null, true
                        )
                    } else {
                        ui.get_widget("hovered-texture").rendered = false
                    }
                }), false
            ),
            new Window(game, "consumable-choice-window",
                await UiBase.create(game, "inventory_consumable_discard_window.png", 0, 0, constants.TILE_SIZE, constants.TILE_SIZE * 1.5, [
                    new Button(game, "use-button", -constants.TILE_SIZE / 2, -constants.TILE_SIZE * 0.75, constants.TILE_SIZE, constants.TILE_SIZE / 2, true,
                        (button, time) => {
                            /** @type {Inventory} */
                            let inventory = button.ui.source.ui
                            inventory.get_slot(inventory.clicked_slot).add_count(-1)
                            inventory.get_slot(inventory.clicked_slot).item.on_use(inventory.get_slot(inventory.clicked_slot).item, time)
                            inventory.get_widget(`item-count-${inventory.clicked_slot}`).text = inventory.get_slot(inventory.clicked_slot).count
                            button.ui.is_finished = true
                        }),
                    new Label(game, "use-label", -constants.TILE_SIZE / 4, -constants.TILE_SIZE * 0.5, "Use", true, 0, constants.TILE_SIZE / 6, "white"),
                    new Button(game, "discard-button", -constants.TILE_SIZE / 2, -constants.TILE_SIZE * 0.25, constants.TILE_SIZE, constants.TILE_SIZE / 2, true,
                        (button, time) => {
                            button.ui.get_widget("discard-window").update_config(
                                button.ui.x_center.get() + constants.TILE_SIZE / 2,
                                button.ui.y_center.get()
                            )
                            button.ui.get_widget("discard-window").activate()
                        }),
                    new Label(game, "discard-label", -constants.TILE_SIZE / 4, 0, "Discard", true, 0, constants.TILE_SIZE / 6, "white"),
                    new Button(game, "cancel-button", -constants.TILE_SIZE / 2, constants.TILE_SIZE * 0.25, constants.TILE_SIZE, constants.TILE_SIZE / 2, true,
                        (button, time) => {
                            button.ui.is_finished = true
                        }
                    ),
                    new Label(game, "cancel-label", -constants.TILE_SIZE / 4, constants.TILE_SIZE * 0.5, "Cancel", true, 0, constants.TILE_SIZE / 6, "white"),
                    await Texture.create(game, "hovered-texture", "hovered.png", 0, 0, constants.TILE_SIZE, constants.TILE_SIZE / 2, false, 1),
                    new Window(game, "discard-window",
                        await UiBase.create(game, "inventory_discard_count_window.png", 0, 0, constants.TILE_SIZE * 1.5, constants.TILE_SIZE, [
                            new Label(game, "discard-label", -constants.TILE_SIZE * 0.625, -constants.TILE_SIZE / 4, "Discard count:", true, 0, constants.TILE_SIZE / 6, "white"),
                            new NumberArea(game, "discard-numberarea", -constants.TILE_SIZE * 0.625, 0, constants.TILE_SIZE * 0.75, constants.TILE_SIZE / 4, 2, true, 1, constants.TILE_SIZE * 0.2),
                            new Button(game, "confirm-button", constants.TILE_SIZE * 0.15, 0, constants.TILE_SIZE * 0.5, constants.TILE_SIZE / 4, true,
                                (button, time) => {
                                    if(button.ui.source.ui.source.ui.get_slot(button.ui.source.ui.source.ui.clicked_slot).count < parseInt(button.ui.get_widget("discard-numberarea").content)) return
                                    button.ui.source.ui.source.ui.get_slot(button.ui.source.ui.source.ui.clicked_slot)
                                        .add_count(-parseInt(button.ui.get_widget("discard-numberarea").content))
                                    button.ui.is_finished = true
                                    button.ui.source.ui.is_finished = true
                                }
                            ),
                            new Button(game, "cancel-button", constants.TILE_SIZE * 0.15, constants.TILE_SIZE / 4, constants.TILE_SIZE * 0.5, constants.TILE_SIZE / 4, true,
                                (button, time) => {
                                    button.ui.is_finished = true
                                }
                            ),
                            new Label(game, "confirm-label", constants.TILE_SIZE * 0.15, constants.TILE_SIZE / 8, "confirm", true, 0, constants.TILE_SIZE * 0.15, "white"),
                            new Label(game, "cancel-label", constants.TILE_SIZE * 0.15, constants.TILE_SIZE * 0.375, "cancel", true, 0, constants.TILE_SIZE * 0.15, "white"),
                            await Texture.create(game, "hovered-texture", "hovered.png", 0, 0, constants.TILE_SIZE / 2, constants.TILE_SIZE / 4, false, 1),
                            await Texture.create(game, "numberarea-texture", "inventory_discard_count_window_numberarea_texture.png", -constants.TILE_SIZE * 0.625, 0, constants.TILE_SIZE * 0.75, constants.TILE_SIZE / 4, true, 0)
                        ], (ui, time) => {
                            if(ui.get_widget("confirm-button").is_hovered){
                                ui.get_widget("hovered-texture").update_config(
                                    constants.TILE_SIZE * 0.15, 0, null, null, true
                                )
                            } else if(ui.get_widget("cancel-button").is_hovered){
                                ui.get_widget("hovered-texture").update_config(
                                    constants.TILE_SIZE * 0.15, constants.TILE_SIZE / 4, null, null, true
                                )
                            } else {
                                ui.get_widget("hovered-texture").rendered = false
                            }
                        }))
                ], (ui, time) => {
                    if(ui.get_widget("use-button").is_hovered){
                        ui.get_widget("hovered-texture").update_config(
                            -constants.TILE_SIZE / 2, -constants.TILE_SIZE * 0.75, null, null, true
                        )
                    } else if(ui.get_widget("discard-button").is_hovered){
                        ui.get_widget("hovered-texture").update_config(
                            -constants.TILE_SIZE / 2, -constants.TILE_SIZE * 0.25, null, null, true
                        )
                    } else if(ui.get_widget("cancel-button").is_hovered){
                        ui.get_widget("hovered-texture").update_config(
                            -constants.TILE_SIZE / 2, constants.TILE_SIZE / 4, null, null, true
                        )
                    } else {
                        ui.get_widget("hovered-texture").rendered = false
                    }
                }), false
            ),
            new Window(game, "quest-choice-window",
                await UiBase.create(game, "inventory_regular_discard_window.png", 0, 0, constants.TILE_SIZE, constants.TILE_SIZE, [
                    new Button(game, "use-button", -constants.TILE_SIZE / 2, -constants.TILE_SIZE * 0.75, constants.TILE_SIZE, constants.TILE_SIZE / 2, true,
                        (button, time) => {
                            /** @type {Inventory} */
                            let inventory = button.ui.source.ui
                            inventory.get_slot(inventory.clicked_slot).add_count(-1)
                            inventory.get_slot(inventory.clicked_slot).item.on_use(inventory.get_slot(inventory.clicked_slot).item, time)
                            inventory.get_widget(`item-count-${inventory.clicked_slot}`).text = inventory.get_slot(inventory.clicked_slot).count
                            button.ui.is_finished = true
                        }),
                    new Label(game, "use-label", -constants.TILE_SIZE / 4, -constants.TILE_SIZE * 0.5, "Use", true, 0, constants.TILE_SIZE / 6, "white"),
                    new Button(game, "cancel-button", -constants.TILE_SIZE / 2, 0, constants.TILE_SIZE, constants.TILE_SIZE / 2, true,
                        (button, time) => {
                            button.ui.is_finished = true
                        }),
                    new Label(game, "cancel-label", -constants.TILE_SIZE / 4, constants.TILE_SIZE / 4, "Cancel", true, 0, constants.TILE_SIZE / 6, "white"),
                    await Texture.create(game, "hovered-texture", "hovered.png", 0, 0, constants.TILE_SIZE, constants.TILE_SIZE / 2, false, 1)
                ], (ui, time) => {
                    if(ui.get_widget("use-button").is_hovered){
                        ui.get_widget("hovered-texture").update_config(
                            -constants.TILE_SIZE / 2, -constants.TILE_SIZE / 2, null, null, true
                        )
                    } else if(ui.get_widget("cancel-button").is_hovered){
                        ui.get_widget("hovered-texture").update_config(
                            -constants.TILE_SIZE / 2, 0, null, null, true
                        )
                    } else {
                        ui.get_widget("hovered-texture").rendered = false
                    }
                }), false
            )
        ]
        for(let i=0; i<9; i++){
            widgets_array.push(await Texture.create(game, `item-texture-${i}`,
                "hovered.png", // The texture file here is only a placeholder
                Inventory.get_slot_coordinates(i).x, Inventory.get_slot_coordinates(i).y,
                slot_width, slot_width, false, 0))
        }
        var inventory = new Inventory(game, widgets_array, slot_width)
        try{
            await inventory.load(config.IMG_DIR + src)
        }catch (error){
			console.error(`couldn't load file "${src}" : ${error.message}`)
			return
        }
        return inventory
    }

    update(current_time) {    //update_config(x=null, y=null, width=null, height=null, rendered=null, command=null)
        super.update(current_time)
        if (this.game.inputHandler.isKeyPressed(constants.INTERACTION_KEY) && this.game.inventory_unlocked) {
			this.game.current_ui = null
        }
        for(let i = 0; i < 9; i++){
            let slot = this.get_slot(i)
            if(slot){
                if(slot.count == 0){
                    this.get_widget(`item-texture-${i}`).rendered = false
                    this.get_widget(`item-count-${i}`).rendered = false
                    this.set_slot(i, null)
                    this.shift_items(i);
                }else{
                    this.get_widget(`item-count-${i}`).update_config(null, null, slot.count)
                }
            }
        }
    }

    update_passive_effects(current_time){
        for(let i = 0; i < 9; i++){
            let slot = this.get_slot(i)
            if(slot?.passive){
                slot.item.effect(slot.item, current_time)
            }
        }
    }

    /**
     * 
     * @param {Item} item 
     * @returns {Number}
     */
    get_next_empty_slot(item){
        for(let i = 0; i < 9; i++){
            if(this.get_slot(i)?.item == item){
                if(this.get_slot(i).count < this.get_slot(i).item.max_count){
                    return i
                }
            }
        }
        for(let i = 0; i < 9; i++){
            if(this.get_slot(i) == null) return i
        }
        return -1
    }

    /**
     * 
     * @param {Number} n 
     * @returns {ItemStack}
     */
    get_slot(n){
        return this.itemstacks[Math.floor(n / 3)][n % 3]
    }

    /**
     * 
     * @param {Number} n 
     * @param {ItemStack} itemstack 
     */
    set_slot(n, itemstack){
        this.itemstacks[Math.floor(n / 3)][n % 3] = itemstack
    }

    /**
     * 
     * @param {Number} n 
     * @returns {{x: Number; y: Number}}
     */
    static get_slot_coordinates(n){
        let gap = constants.TILE_SIZE / 16
        let width = constants.TILE_SIZE * 1.05
        return {
			x: (n % 3) * (width + gap) - 1.5 * width - gap,
            y: (Math.floor(n / 3)) * (width + gap) - 1.5 * width - gap
		}
    }

    /**
     * #### Add an itemstack to the inventory.
     * If something is returned, it means that the inventory is full
     * @param {ItemStack} itemstack 
     * @returns {undefined | ItemStack}
     */
    add_items(itemstack){
        var slot = this.get_next_empty_slot(itemstack.item)
        if(slot==-1){
            return itemstack
        }
        this.get_widget(`item-texture-${slot}`).img = this.game.items[itemstack.item.name].img
        this.get_widget(`item-texture-${slot}`).rendered = true
        if(this.get_slot(slot) != null && this.get_slot(slot).item == itemstack.item){
            if(this.get_slot(slot).count + itemstack.count <= itemstack.item){
                this.get_slot(slot).add_count(itemstack.count)
            } else {
                itemstack.count = itemstack.count + this.get_slot(slot).count - itemstack.item.max_count
                this.get_slot(slot).count = itemstack.item.max_count
                let error = this.add_items(itemstack)
                if(error) return error
            }
        }else{
            this.set_slot(slot, itemstack)
        }
        let countLabel = this.get_widget(`item-count-${slot}`);
        countLabel.text = itemstack.count.toString();
        if (itemstack.consumable && itemstack.count >= 1) {
            countLabel.rendered = true;
        }
        else {
            countLabel.rendered = false;
        }
    }

    shift_items(startIndex) {
    for (let i = startIndex; i < 8; i++) { 
        let nextSlot = this.get_slot(i + 1);
        if (nextSlot) {
            this.set_slot(i, nextSlot);
            this.get_widget(`item-texture-${i}`).img = this.get_widget(`item-texture-${i + 1}`).img;
            this.get_widget(`item-texture-${i}`).rendered = true;
            this.get_widget(`item-count-${i}`).text = this.get_widget(`item-count-${i+1}`).text;
            this.set_slot(i + 1, null);
            this.get_widget(`item-texture-${i + 1}`).rendered = false;
            this.get_widget(`item-count-${i+1}`).rendered=false
            if (!this.get_slot(i).consumable) {
                this.get_widget(`item-count-${i}`).rendered = false;
            }
            else {
                this.get_widget(`item-count-${i}`).rendered = true
            }
        } else {
            break;
        }
    }}

    erase_tooltip_description(){
        this.widgets = this.widgets.filter(widget => !(widget.id.endsWith("-label") && widget.id.includes("tooltip-description-")))
        this.ids = this.ids.filter(id => !(id.endsWith("-label") && id.includes("tooltip-description-")))
    }

    erase_tooltip_box(){
        this.widgets = this.widgets.filter(widget => !(widget.id.endsWith("-icon") && widget.id.includes("tooltip-box-")))
        this.ids = this.ids.filter(id => !(id.endsWith("-icon") && id.includes("tooltip-box-")))
    }
}
