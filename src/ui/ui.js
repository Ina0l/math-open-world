import { config, constants } from "../constants.js"
import { Game } from "../core/game.js"
import { Hitbox } from "../entities/hitbox.js"
import { Talkable } from "../entities/talkable.js"
import { Resizeable, YResizeable } from "../utils.js"
import { Widget, Window } from "./widgets.js"

export class UiBase {
    /**
     * ## One shouldn't use the constructor to make an ui, use the static create method instead
     * @param {Game} game - The current game
     * @param {number} x 
     * @param {number} y 
     * @param {number | Resizeable | YResizeable} width - The Ui's width on the screen
     * @param {number | Resizeable | YResizeable} height - The Ui's height on the screen
     * @param {Array<Widget>} widgets - The list of widgets that shows up on the ui
     * @param {(ui: UiBase, time: number) => void} widgets_states_handler - method made to handle widgets states (like widgets being 'cliked' on 'focused-on'), executed at each update
     */
    constructor(game, x, y, width, height, widgets, widgets_states_handler){
        this.game = game
        /**@type {HTMLImageElement?} */
        this.img = null
        this.x = new Resizeable(game, x)
        this.y = new Resizeable(game, y)
        console.assert(!isNaN(x), x)
        console.assert(!isNaN(y), y)
        if(width instanceof YResizeable || width instanceof Resizeable)
            this.width = width
        else
            this.width = new Resizeable(game, width)
        if(height instanceof YResizeable || height instanceof Resizeable)
            this.height = height
        else
            this.height = new Resizeable(game, height)
        /** @type {Talkable | Hitbox | Window | null} */
        this.source = null
        /** @type {Array<Widget>} */
        this.widgets = widgets
        this.sort_widgets()
        /** @type {Array<string>} */
        this.ids = []
        this.widgets.forEach((widget) => {
            if(this.ids.includes(widget.id))
                console.error(`widget with id ${widget.id} already registered, this may cause widget traceabilty issues`)
            widget.ui = this
            this.ids.push(widget.id)
        })
        /** @type {Array<Widget>} */
        this.focused_widgets = []
        /**
         * When this property is marked as true, the ui will close
         * @type {boolean}
         */
        this.is_finished = false
        this.widgets_states_handler = widgets_states_handler

        this.x_center = new Resizeable(game, this.width.get() / 2 + this.x.get())
        this.y_center = new Resizeable(game, this.height.get() / 2 + this.y.get())
        /** @type {Window?} */
        this.active_window = null

        /**
         * Please use this property when storing values in a Ui
         * @type {{[key: string]: any}}
         */
        this.misc_values = {}
    }

    /**
     * Method used to build an ui. This method is async and static
     * @param {Game} game - The current game
     * @param {string} src - The path to the image used used as a background for the ui
     * @param {number} x 
     * @param {number} y 
     * @param {number} width - The Ui's width on the screen
     * @param {number} height - The Ui's height on the screen
     * @param {Array<Widget>} widgets - The list of widgets that shows up on the ui
     * @param {(ui: UiBase, time: number) => void} widgets_state_handler - method made to handle widgets states (like widgets being 'cliked' on 'focused-on'), executed at each update
     * @returns {Promise<UiBase>}
     */
    static async create(game, src, x, y, width, height, widgets, widgets_state_handler){
        const ui = new UiBase(game, x, y, width, height, widgets, widgets_state_handler)
        try {
			await ui.load(config.IMG_DIR + src)
		} catch (error) {
			console.error(`couldn't load file "${src}" : ${error.message}`)
		}
		return ui
    }

    /**
     * @param {string} src
     */
    async load(src){
        const img = new Image()
		img.src = src
		this.img = img
		await new Promise((resolve, reject) => { 
			img.onload = resolve
			img.onerror = reject
		})
    }

    /**
     * 
     * @param {Talkable | Hitbox | Window} source 
     */
    set_source(source){
        this.source = source
    }

    /**@returns {Talkable} */
    get_source_as_t(){
        if(!(this.source instanceof Talkable)) throw new TypeError('The source isn\'t of requested type')
        else return this.source
    }
    /**@returns {Hitbox}  */
    get_source_as_h(){
        if(!(this.source instanceof Hitbox)) throw new TypeError('The source isn\'t of requested type')
        else return this.source
    }
    /**@returns {Window} */
    get_source_as_w(){
        if(!(this.source instanceof Window)) throw new TypeError('The source isn\'t of requested type')
        else return this.source
    }

    render(){
        if(this.img==null) return
        this.game.ctx.drawImage(
            this.img,
            this.x.get() + this.game.canvas.width / 2,
            this.y.get() + this.game.canvas.height / 2,
            this.width.get(), this.height.get()
        )
        for(let i = 0; i < this.widgets.length; i++){
            this.widgets[i].render()
        }
    }

    /**
     * 
     * @param {number} current_time 
     */
    update(current_time){
        if(this.active_window){
            this.active_window.update(current_time)
            return
        }
        this.widgets_states_handler(this, current_time)
        this.widgets.forEach(widget => {
            widget.update(current_time)
        })
    }

    /**
     * 
     * @param {Widget} widget 
     */
    add_widget(widget){
        if(this.ids.includes(widget.id)){
            console.error(`widget with id ${widget.id} already registered, this may cause widget traceabilty issues`)
        }else{
            this.ids.push(widget.id)
            this.widgets.push(widget)
            widget.ui = this
            this.sort_widgets()
        }
    }

    /**
     * 
     * @param {Widget} widget 
     */
    remove_widget(widget){
        if(this.ids.includes(widget.id)){
            this.widgets.splice(this.widgets.indexOf(widget), 1)
            this.ids.splice(this.ids.indexOf(widget.id), 1)
        } else {
            console.error("not such widget in ui's widgets:")
            console.log(this)
            console.log(widget)
        }
    }

    /**
     * 
     * @param {string} id
     * @returns {Widget}
     */
    get_widget(id){
        /**@type {Widget?} */
        let matching_widget = null
        for(let widget of this.widgets){
            if (widget.id == id)
                matching_widget = widget
        }
        if(matching_widget==null){throw new Error(`no such widget ${id} in this ${this}`)}
        return matching_widget
    }

    sort_widgets(){
        this.widgets.sort((a, b) => {
            if(a==b) return constants.WIDGET_PRIORITIES[a.type] - constants.WIDGET_PRIORITIES[b.type]
            if(a.layer == null)
                return 1
            else if(b.layer == null)
                return -1
            else 
                return a.layer - b.layer
        })
    }

    /**
     * 
     * @param {((widget: Widget) => boolean)?} condition 
     */
    unfocus(condition=null){
        if(condition == null)
            condition = (w) => true

        let removed_widgets = []
        this.focused_widgets.forEach(widget => {
            if(condition(widget))
                removed_widgets.push(widget)
        })
        removed_widgets.forEach(widget => {
            this.focused_widgets.splice(this.focused_widgets.indexOf(widget), 1)
            widget.has_focus = false
        })
    }
}

// @ts-ignore
export class Ui extends UiBase{
    /**
     * ## One shouldn't use the constructor to make an ui, use the static create method instead
     * @param {Game} game - The current game
     * @param {number | Resizeable | YResizeable} width - The Ui's width on the screen
     * @param {number | Resizeable | YResizeable} height - The Ui's height on the screen
     * @param {Array<Widget>} widgets - The list of widgets that shows up on the ui
     * @param {(ui: Ui, time: number) => void} widgets_states_handler - method made to handle widgets states (like widgets being 'cliked' on 'focused-on'), executed at each update
     */
    constructor(game, width, height, widgets, widgets_states_handler){
        let x, y
        if(width instanceof Resizeable || width instanceof YResizeable){
            x = -width.get() / 2
        } else {
            x = -width / 2
        }
        if(height instanceof Resizeable || height instanceof YResizeable){
            y = -height.get() / 2
        } else {
            y = -height / 2
        }
        super(game, x, y, width, height, widgets, widgets_states_handler)
    }

    /**
     * Method used to build an ui. This method is async and static
     * @param {Game} game - The current game
     * @param {string} src - The path to the image used used as a background for the ui
     * @param {number} width - The Ui's width on the screen
     * @param {number} height - The Ui's height on the screen
     * @param {Array<Widget>} widgets - The list of widgets that shows up on the ui
     * @param {(ui: Ui, time: number) => void} widgets_state_handler - method made to handle widgets states (like widgets being 'cliked' on 'focused-on'), executed at each update
     * @returns {Promise<Ui>}
     */
    static async create(game, src, width, height, widgets, widgets_state_handler){
        const ui = new Ui(game, width, height, widgets, widgets_state_handler)
        try {
			await ui.load(config.IMG_DIR + src)
		} catch (error) {
			console.error(`couldn't load file "${src}" : ${error.message}`)
		}
		return ui
    }
}
