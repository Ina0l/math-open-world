import { config, constants } from "../constants.js"
import { Game } from "../core/game.js"
import { Resizeable, YResizeable } from "../utils.js"
import { Tileset } from "../world/tileset.js"
import { UiBase } from "./ui.js"

export class Widget{
    /**
     * ## One shouldn't create a widget by using this constructor, use subclass widgets instead
     * @param {Game} game - The current game
     * @param {string} id - The widget's ID
     * @param {number} x - the x coordinates of the top-left corner of the widget, relative to the ui's center
     * @param {number | YResizeable} y - the y coordinates of the top-left corner of the widget, relative to the ui's center
     * @param {string} type - The widget's type
     * @param {boolean} rendered - boolean refearing to if this widget should be rendered
     * @param {number?} layer - The layer on which the widget will be rendered, higher numbers means that the widget will be rendered on top
     */
    constructor(game, id, x, y, type, rendered, layer){
        this.game = game
        this.x = new Resizeable(game, x)
        if(y instanceof YResizeable)
            this.y = y
        else
            this.y = new Resizeable(game, y)
        this.type = type
        this.id = id
        this.layer = layer
        /** @type {UiBase?} */
        this.ui = null
        this.rendered = rendered
        /**
         * Property marked as true when its widget is clicked
         * 
         * However only interactive widget would have it changed
         * @type {boolean}
         */
        this.is_clicked = false
        /**
         * Property marked as true since its widget is clicked and until something else is clicked
         * 
         * However only interactive widget would have it changed
         * @type {boolean}
         */
        this.has_focus = false
        /**
         * Property marked as true when the mouse is over its widget
         * 
         * However only interactive widget would have it changed
         * @type {boolean}
         */
        this.is_hovered = false
    }
    
    render(){}
    /**
     * #### Method used to change the widget's fields.
     * Left 'null' in order to not change the corresponding field
     * 
     * If the parameters are empty, try casting the widget to one of its subclasses (it'll still work even without it don't worry)
     */
    update_config(){}
    
    /**@param {number} current_time */
    update(current_time){}

    destructor(){
        this.get_ui().remove_widget(this)
    }

    get_ui(){
        if(this.ui==null){
            throw new Error('The widget hasn\'t been attributed any ui')
        } else {
            return this.ui
        }
    }
}

export class Label extends Widget{
    /**
     * Simple text line
     * @param {Game} game - The current game
     * @param {string} id - The widget's Id
     * @param {number} x - the x coordinates of the top-left corner of the widget
     * @param {number | YResizeable} y - the y coordinates of the top-left corner of the widget
     * @param {string} text - The text content of the label
     * @param {boolean} rendered - boolean refearing to if this widget should be rendered
     * @param {number} [layer=0] - The layer on which the widget will be rendered, higher numbers means that the widget will be rendered on top
     * @param {number} [fontsize=5] - Label's text's fontsize
     * @param {string} [textcolor="black"] - Label's text's color
     * @param {string} [font="arial"] - Label's text's font
     */
    constructor(game, id, x, y, text, rendered, layer=0, fontsize=15, textcolor="black", font="arial"){
        super(game, id, x, y, constants.LABEL_TYPE, rendered, layer)
        this.text = text
        this.fontsize = new Resizeable(game, fontsize)
        this.textcolor = textcolor
        this.font = font
    }

    render(){
        if(this.rendered){
            this.set_font()
            this.game.ctx.fillText(
                this.text,
                this.game.canvas.width / 2 + this.x.get() + this.get_ui().x_center.get(),
                this.game.canvas.height / 2 + this.y.get() + this.fontsize.get() / 3 + this.get_ui().y_center.get()
            )
            if(this.game.get_option_menu().debug){
                this.game.ctx.beginPath()
                this.game.ctx.arc(
                    this.game.canvas.width / 2 + this.x.get() + this.get_ui().x_center.get(),
                    this.game.canvas.height / 2 + this.y.get() + this.get_ui().y_center.get(),
                    3, 0, Math.PI * 2)
                this.game.ctx.fillStyle = "blue"
                this.game.ctx.fill()
                
                this.game.ctx.strokeStyle = "blue"
                this.game.ctx.strokeRect(
                    this.game.canvas.width / 2 + this.x.get() + this.get_ui().x_center.get(),
                    this.game.canvas.height / 2 + this.y.get() - this.fontsize.get() / 2 + this.get_ui().y_center.get(),
                    this.game.ctx.measureText(this.text).width,
                    this.fontsize.get()
                )
            }
        }
    }

    set_font(){
            this.game.ctx.font = `${Math.round(this.fontsize.get())}px ${this.font}`
            this.game.ctx.fillStyle = this.textcolor
    }

    /**
     * 
     * @param {number} x 
     * @param {number} y 
     * @returns {Label}
     */
    center_arround(x, y){
        this.x.set_value(x - this.game.ctx.measureText(this.text).width / 2)
        this.y.set_value(y)
        return this
    }

    /**
     * #### Method used to change the widget's fields.
     * Left 'null' in order to not change the corresponding field
     * @param {?number} [x=null] - the x coordinates of the top-left corner of the widget
     * @param {?number} [y=null] - the y coordinates of the top-left corner of the widget
     * @param {?string} [text = null] - The text content of the label
     * @param {?boolean} [rendered=null] - boolean refearing to if this widget should be rendered
     * @param {?number} [layer=null] - The layer on which the widget will be rendered, higher numbers means that the widget will be rendered on top
     * @param {?number} [fontsize = null] - Label's text's fontsize
     * @param {?string} [textcolor = null] - Label's text's color
     * @param {?string} [font = null] - Label's text's font
     */
    update_config(x=null, y=null, text=null, rendered=null, layer=null, fontsize=null, textcolor=null, font=null){
        if(x != null) this.x.set_value(x)
        if(y != null) this.y.set_value(y)
        if(text != null) this.text = text
        if(rendered != null) this.rendered = rendered
        if(layer != null) this.layer = layer
        if(fontsize != null) this.fontsize.set_value(fontsize)
        if(textcolor != null) this.textcolor = textcolor
        if(font != null) this.font = font
    }
}

export class Button extends Widget{
    /**
     * An area which detects when it's being cliked on
     * @param {Game} game - The current game
     * @param {string} id - The widget's Id
     * @param {number} x - the x coordinates of the top-left corner of the widget
     * @param {number | YResizeable} y - the y coordinates of the top-left corner of the widget
     * @param {number} width - The button's width
     * @param {number | YResizeable} height - The button's height
     * @param {boolean} rendered - boolean refearing to if this widget should be rendered
     * @param {(button: Button, time: number) => void} command - Command executed when the button is being cliked, the 'button' parameter refers to the actual object, which is being clicked
     */
    constructor(game, id, x, y, width, height, rendered, command){
        super(game, id, x, y, constants.BUTTON_TYPE, rendered, null)
        this.width = new Resizeable(game, width)
        if(height instanceof YResizeable)
            this.height = height
        else
            this.height = new Resizeable(game, height)
        this.command = command
        this.should_execute = false
    }

    /**
     * 
     * @param {number} x 
     * @param {number} y 
     * @returns {Button}
     */
    center_arround(x, y){
        this.x.set_value(x - this.width.get() / 2)
        this.y.set_value(y - this.height.get() / 2)
        return this
    }

    /**
     * 
     * @param {number} current_time 
     * @returns 
     */
    update(current_time){
        if(!this.rendered) return
        let x = this.game.inputHandler.mouse_pos.x
        let y = this.game.inputHandler.mouse_pos.y
        
        if(
            (this.x.get() + this.get_ui().x_center.get()) <= x
            && (this.x.get() + this.width.get() + this.get_ui().x_center.get()) >= x
            && (this.y.get() + this.get_ui().y_center.get()) <= y
            && (this.y.get() + this.height.get() + this.get_ui().y_center.get()) >= y
        ){
            this.is_hovered = true
            if(this.game.inputHandler.isMouseDown(0) || this.game.inputHandler.isMouseDown(2)){
                this.is_clicked = true
                if(this.game.inputHandler.isMousePressed(0) || this.game.inputHandler.isMousePressed(2))
                    this.command(this, current_time)
                    this.has_focus = true
                    this.get_ui().focused_widgets.push(this)
            } else {
                this.is_clicked = false
            }
        } else {
            this.is_hovered = false
            this.is_clicked = false
            if(this.game.inputHandler.isMouseDown(0) || this.game.inputHandler.isMouseDown(2))
                this.has_focus = false
                this.get_ui().focused_widgets.splice(this.get_ui().focused_widgets.indexOf(this), 1)
        }
    }

    render(){
        if(this.rendered && this.game.get_option_menu().debug){
            this.game.ctx.strokeStyle = "blue"
            this.game.ctx.strokeRect(
                this.game.canvas.width / 2 + this.x.get() + this.get_ui().x_center.get(),
                this.game.canvas.height / 2 + this.y.get() + this.get_ui().y_center.get(),
                this.width.get(), this.height.get()
            )
        }
    }

    /**
     * #### Method used to change the widget's fields.
     * Left 'null' in order to not change the corresponding field
     * @param {?number} [x = null] - the x coordinates of the top-left corner of the widget
     * @param {?number} [y = null] - the y coordinates of the top-left corner of the widget
     * @param {?number} [width = null] - The button's width
     * @param {?number} [height = null] - The button's height
     * @param {?boolean} [rendered = null] - boolean refearing to if this widget should be rendered
     * @param {?(button: Button, time: number) => void} [command = null] - Command executed when the button is being cliked, the 'button' parameter refers to the actual object, which is being clicked
     */
    update_config(x=null, y=null, width=null, height=null, rendered=null, command=null){
        if(x != null) this.x.set_value(x)
        if(y != null) this.y.set_value(y)
        if(width != null) this.width.set_value(width)
        if(height != null) this.height.set_value(height)
        if(rendered != null) this.rendered = rendered
        if(command != null) this.command = command
    }
}

export class TextArea extends Widget{
    
    /**
     * A text input in which you can type text
     * @param {Game} game - The current game
     * @param {string} id - The widget's Id
     * @param {number} x - the x coordinates of the top-left corner of the widget
     * @param {number | YResizeable} y - the y coordinates of the top-left corner of the widget
     * @param {number} width - The textarea's width
     * @param {number | YResizeable} height - The textarea's height
     * @param {number} max_char_number - The maximum of character you can type in
     * @param {boolean} rendered - boolean refearing to if this widget should be rendered
     * @param {number} [layer=0] - The layer on which the widget will be rendered, higher numbers means that the widget will be rendered on top
     * @param {number} [fontsize=5] - The textarea's text fontsize
     * @param {string} [textcolor="black"] - The textarea's text color
     * @param {string} [font="arial"] - The textarea's text font
     * @param {string} [blink_bar="I"] - The blinking bar when the textarea is selected
     */
    constructor(game, id, x, y, width, height, max_char_number, rendered, layer=0, fontsize=15, textcolor="black", font="arial", blink_bar="|"){
        super(game, id, x, y, constants.TEXTAREA_TYPE, rendered, layer)
        this.width = new Resizeable(game, width)
        if(height instanceof YResizeable)
            this.height = height
        else
            this.height = new Resizeable(game, height)
        this.content = ""
        this.max_char_number = max_char_number
        this.fontsize = new Resizeable(game, fontsize)
        this.textcolor = textcolor
        this.font = font
        this.last_blink = 0
        this.has_bar = false
        this.blink_bar = blink_bar
        this.usable = true
    }

    /**
     * 
     * @param {number} x 
     * @param {number} y 
     * @returns {TextArea}
     */
    center_arround(x, y){
        this.x.set_value(x - this.width.get() / 2)
        this.y.set_value(y - this.height.get() / 2)
        return this
    }

    render(){
        if(this.rendered){
            if(this.game.get_option_menu().debug){
                this.game.ctx.strokeStyle = "blue"
                this.game.ctx.strokeRect(
                    this.game.canvas.width / 2 + this.x.get() + this.get_ui().x_center.get(),
                    this.game.canvas.height / 2 + this.y.get() + this.get_ui().y_center.get(),
                    this.width.get(), this.height.get()
                )
            }
            this.game.ctx.fillStyle = this.textcolor
            this.game.ctx.font = `${Math.round(this.fontsize.get())}px ${this.font}`
            this.game.ctx.fillText(
                this.content + (this.has_bar ? this.blink_bar: ""),
                this.game.canvas.width / 2 + this.x.get() + this.get_ui().x_center.get(),
                this.y.get() + ((this.game.canvas.height + this.height.get()) / 2) + (this.fontsize.get() / 3) + this.get_ui().y_center.get()
            )
        }
    }

    /**
     * Overriden in the numberareas
     * @param {string} char 
     * @returns {boolean}
     */
    check_char(char){return true}

    /**
     * 
     * @param {number} current_time 
     * @returns 
     */
    update(current_time){
        if(!this.rendered) return
        let x = this.game.inputHandler.mouse_pos.x
        let y = this.game.inputHandler.mouse_pos.y
        if(
            (this.x.get() + this.get_ui().x_center.get()) <= x
            && (this.x.get() + this.width.get() + this.get_ui().x_center.get()) >= x
            && (this.y.get() + this.get_ui().y_center.get()) <= y
            && (this.y.get() + this.height.get() + this.get_ui().y_center.get()) >= y
        ){
            this.is_hovered = true
            if(this.game.inputHandler.isMouseDown(0) || this.game.inputHandler.isMouseDown(2)){
                this.is_clicked = true
                if(this.game.inputHandler.isMousePressed(0) || this.game.inputHandler.isMousePressed(2))
                    this.has_focus = true
                    this.get_ui().focused_widgets.push(this)
            } else {
                this.is_clicked = false
            }
        } else {
            this.is_hovered = false
            this.is_clicked = false
            if(this.game.inputHandler.isMouseDown(0) || this.game.inputHandler.isMouseDown(2))
                this.has_focus = false
                this.get_ui().focused_widgets.splice(this.get_ui().focused_widgets.indexOf(this), 1)
        }

        if(this.has_focus && this.usable){
            let key = this.game.inputHandler.get_down_keys()
            if(key != null){
                if(key.length == 1){
                    if(this.content.length < this.max_char_number){
                        if(this.check_char(key))
                            this.content += key
                    }
                }else {
                    if(key == "backspace")
                        this.content = this.content.length !=0? this.content.slice(0, -1): ""
                }
            }
        }

        if(this.has_focus){
            if(this.last_blink + 500 < current_time){
                if(this.has_bar) this.has_bar = false
                else this.has_bar = true
                this.last_blink = current_time
            }
        } else this.has_bar = false
    }

    /**
     * #### Method used to change the widget's fields.
     * Left 'null' in order to not change the corresponding field
     * @param {?number} [x = null] - the x coordinates of the top-left corner of the widget
     * @param {?number} [y = null] - the y coordinates of the top-left corner of the widget
     * @param {?number} [width = null] - The textarea's width
     * @param {?number} [height = null] - The textarea's height
     * @param {?string} [content = null] - The textarea's content, what has been typed in it
     * @param {?number} [max_char_number = null] - The maximum of character you can type in
     * @param {?boolean} [rendered=null] - boolean refearing to if this widget should be rendered
     * @param {?number} [layer=null] - The layer on which the widget will be rendered, higher numbers means that the widget will be rendered on top
     * @param {?number} [fontsize = null] - The textarea's text fontsize
     * @param {?string} [textcolor = null] - The textarea's text color
     * @param {?string} [font = null] - The textarea's text font
     * @param {?string} [blink_bar=null] - The blinking bar when the textarea is selected
     * @param {?boolean} [usable=null] - boolean making the textarea unwritteable if false
     */
    update_config(x=null, y=null, width=null, height=null, content=null, max_char_number=null, rendered=null, layer=null, fontsize=null, textcolor=null, font=null, blink_bar=null, usable=null){
        if(x != null) this.x.set_value(x)
        if(y != null) this.y.set_value(y)
        if(width != null) this.width.set_value(width)
        if(height != null) this.height.set_value(height)
        if(max_char_number != null) this.max_char_number = max_char_number
        if(rendered != null) this.rendered = rendered
        if(content != null) this.content = content.slice(0, this.max_char_number)
        if(layer != null) this.layer = layer
        if(fontsize != null) this.fontsize.set_value(fontsize)
        if(textcolor != null) this.textcolor = textcolor
        if(font != null) this.font = font
        if(blink_bar != null) this.blink_bar = blink_bar
        if(usable != null) this.usable = usable
    }
}

export class NumberArea extends TextArea{
    /**
     * #### Input in which you can type only digits
     * @param {Game} game - The current game
     * @param {string} id - The widget's Id
     * @param {number} x - the x coordinates of the top-left corner of the widget
     * @param {number | YResizeable} y - the y coordinates of the top-left corner of the widget
     * @param {number} width - The numberarea's width
     * @param {number | YResizeable} height - The numberarea's height
     * @param {number} max_char_number - The maximum of character you can type in
     * @param {boolean} rendered - boolean refearing to if this widget should be rendered
     * @param {number} [layer=0] - The layer on which the widget will be rendered, higher numbers means that the widget will be rendered on top
     * @param {number} [fontsize=5] - The numberarea's text fontsize
     * @param {string} [textcolor="black"] - The numberarea's text color
     * @param {string} [font="arial"] - The numberarea's text font
     * @param {string} [blink_bar="I"] - The blinking bar when the numberarea is selected
     */
    constructor(game, id, x, y, width, height, max_char_number, rendered, layer=0, fontsize=15, textcolor="black", font="arial", blink_bar="I"){
        super(game, id, x, y, width, height, max_char_number, rendered, layer, fontsize, textcolor, font, blink_bar)
        this.type = constants.NUMBERAREA_TYPE
    }

    /**
     * 
     * @param {string} char 
     * @returns {boolean}
     */
    check_char(char){
        return ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"].includes(char)
    }
}

export class Icon extends Widget{
    /**
     * Image widget which uses a tileset as reference
     * @param {Game} game - The current game
     * @param {string} id - The widget's Id
     * @param {number} x - the x coordinates of the top-left corner of the widget
     * @param {number | YResizeable} y - the y coordinates of the top-left corner of the widget
     * @param {Tileset} tileset - The tileset from which the icon's image will be rendered
     * @param {number} tile_nb - The image's index in the tileset
     * @param {boolean} rendered - boolean refearing to if this widget should be rendered
     * @param {number} [layer=0] - The layer on which the widget will be rendered, higher numbers means that the widget will be rendered on top
     */
    constructor(game, id, x, y, tileset, tile_nb, rendered, layer=0){
        super(game, id, x, y, constants.ICON_TYPE, rendered, layer)
        this.tileset = tileset
        this.tile_nb = tile_nb
    }

    /**
     * 
     * @param {number} x 
     * @param {number} y 
     * @returns {Icon}
     */
    center_arround(x, y){
        this.x.set_value(x - this.tileset.screen_tile_size.get() / 2)
        this.y.set_value(y - this.tileset.screen_tile_size.get() / 2)
        return this
    }

    render(){
        if(this.rendered){
            this.tileset.drawTile(
                this.tile_nb,
                this.game.canvas.width / 2 + this.x.get() + this.get_ui().x_center.get(),
                this.game.canvas.height / 2 + this.y.get() + this.get_ui().y_center.get())
            if(this.game.get_option_menu().debug){
                this.game.ctx.strokeStyle = "grey"
                this.game.ctx.strokeRect(
                    this.game.canvas.width / 2 + this.x.get() + this.get_ui().x_center.get(),
                    this.game.canvas.height / 2 + this.y.get() + this.get_ui().y_center.get(),
                    this.tileset.screen_tile_size.get(),
                    this.tileset.screen_tile_size.get()
                )
            }
        }
    }

    /**
     * #### Method used to change the widget's fields.
     * Left 'null' in order to not change the corresponding field
     * @param {number?} [x=null] - the x coordinates of the top-left corner of the widget
     * @param {number?} [y=null] - the y coordinates of the top-left corner of the widget
     * @param {Tileset?} [tileset=null] - The tileset from which the icon's image will be rendered
     * @param {number?} [tile_nb=null] - The image's index in the tileset
     * @param {boolean?} [rendered=null] - boolean refearing to if this widget should be rendered
     * @param {number?} [layer=null] - The layer on which the widget will be rendered, higher numbers means that the widget will be rendered on top
     */
    update_config(x=null, y=null, tileset=null, tile_nb=null, rendered=null, layer=null){
        if(x != null) this.x.set_value(x)
        if(y != null) this.y.set_value(y)
        if(tileset != null) this.tileset = tileset
        if(tile_nb != null) this.tile_nb = tile_nb
        if(rendered != null) this.rendered = rendered
        if(layer != null) this.layer = layer
    }
}

export class Texture extends Widget{
    /**
     * ## One shouldn't use the constructor to make a texture widget, use the static create method instead
     * @param {Game} game - The current game
     * @param {string} id - The widget's Id
     * @param {number} x - the x coordinates of the top-left corner of the widget
     * @param {number | YResizeable} y - the y coordinates of the top-left corner of the widget
     * @param {number} width - The texture's width on the screen
     * @param {number | YResizeable} height - The texture's height on the screen
     * @param {boolean} rendered - boolean refearing to if this widget should be rendered
     * @param {number} layer - The layer on which the widget will be rendered, higher numbers means that the widget will be rendered on top
     */
    constructor(game, id, x, y, width, height, rendered, layer){
        super(game, id, x, y, constants.TEXTURE_TYPE, rendered, layer)
        this.width = new Resizeable(game, width)
        if(height instanceof YResizeable)
            this.height = height
        else
            this.height = new Resizeable(game, height)
    }

    /**
     * #### Image widget. Unlike the Icon, it doesn't use a tileset but directly a file instead.
     * The create method is async and static
     * @param {Game} game - The current game
     * @param {string} id - The widget's Id
     * @param {string} src - The path to the image file used by the widget
     * @param {number} x - the x coordinates of the top-left corner of the widget
     * @param {number | YResizeable} y - the y coordinates of the top-left corner of the widget
     * @param {number} width - The texture's width on the screen
     * @param {number | YResizeable} height - The texture's height on the screen
     * @param {boolean} rendered - boolean refearing to if this widget should be rendered
     * @param {number} [layer=0] - The layer on which the widget will be rendered, higher numbers means that the widget will be rendered on top
     * @returns {Promise<Texture>}
     */
    static async create(game, id, src, x, y, width, height, rendered, layer=0){
        var texture = new Texture(game, id, x, y, width, height, rendered, layer)
        try {
		    await texture.load(src)
	    } catch (error) {
			console.error(`couldn't load file "${src}" : ${error.message}`)
	    }
        return texture
    }

    /**
     * 
     * @param {string} src 
     */
    async load(src){
        var img = null
        if(src!=null){
            img = new Image()
		    img.src = config.IMG_DIR + src
    		await new Promise((resolve, reject) => { 
	    		img.onload = resolve
		    	img.onerror = reject
		    })
        }
		this.img = img
    }

    /**
     * 
     * @param {number} x 
     * @param {number} y 
     * @returns {Texture}
     */
    center_arround(x, y){
        this.x.set_value(x - this.width.get() / 2)
        this.y.set_value(y - this.height.get() / 2)
        return this
    }

    render(){
        if(this.rendered && this.img != null){
            this.game.ctx.drawImage(
                this.img,
                this.game.canvas.width / 2 + this.x.get() + this.get_ui().x_center.get(),
                this.game.canvas.height / 2 + this.y.get() + this.get_ui().y_center.get(),
                this.width.get(), this.height.get()
            )
        }
    }

    /**
     * #### Method used to change the widget's fields.
     * Left 'null' in order to not change the corresponding field
     * @param {number?} [x = null] - the x coordinates of the top-left corner of the widget
     * @param {number?} [y = null] - the y coordinates of the top-left corner of the widget
     * @param {number?} [width = null] - The texture's width on the screen
     * @param {number?} [height = null] - The texture's height on the screen
     * @param {boolean?} [rendered = null] - boolean refearing to if this widget should be rendered
     * @param {number?} [layer=null] - The layer on which the widget will be rendered, higher numbers means that the widget will be rendered on top
     */
    update_config(x=null, y=null, width=null, height=null, rendered=null, layer=null){
        if(x != null) this.x.set_value(x)
        if(y != null) this.y.set_value(y)
        if(width != null) this.width.set_value(width)
        if(height != null) this.height.set_value(height)
        if(rendered != null) this.rendered = rendered
        if(layer != null) this.layer = layer
    }
}

export class Window extends Widget{
    /**
     * #### Widget Allowing to make Uis in an Ui, like a pop-up or a window (unexpectedly).
     * When using the window, make sure you don't mix the 'ui' and the 'window_ui' properties:
     *  - The first is the ui in which the window is contained (same as every other widget).
     *  - The later one is the UiBase contained inside the window
     * @param {Game} game - The current game
     * @param {string} id - The widget's Id
     * @param {UiBase} window_ui - The Ui contained in the window
     * @param {boolean} [fast_exit=false] - If true, then the window can be closed easily just by clicking outside of it
     */
    constructor(game, id, window_ui, fast_exit=false){
        super(game, id, window_ui.x.get(), window_ui.y.get(), constants.WINDOW_TYPE, true, null)
        this.window_ui = window_ui
        this.window_ui.set_source(this)
        this.fast_exit = fast_exit
    }

    render(){
        if(this.get_ui().active_window == this){
            this.window_ui.render()
            if(this.game.get_option_menu().debug){
                this.game.ctx.strokeStyle = "green"
                this.game.ctx.strokeRect(
                    this.x.get() + this.game.canvas.width / 2,
                    this.y.get() + this.game.canvas.height / 2,
                    this.window_ui.width.get(),
                    this.window_ui.height.get()
                )
            }
        }
    }

    /**
     * 
     * @param {number} current_time 
     */
    update(current_time){
        if(this.window_ui.is_finished){
            this.get_ui().active_window = null
            this.window_ui.is_finished = false
        }
        if(this.get_ui().active_window == this){
            if(this.fast_exit){
                if(this.game.inputHandler.isMousePressed(0) || this.game.inputHandler.isMousePressed(2)){
                    let x = this.game.inputHandler.mouse_pos.x
                    let y = this.game.inputHandler.mouse_pos.y
                    if(this.x.get() > x || (this.x.get() + this.window_ui.width.get()) < x || this.y.get() > y || (this.y.get() + this.window_ui.height.get()) < y){
                        this.window_ui.is_finished = true
                    }
                }
            }
            this.window_ui.update(current_time)
        }
    }

    /**
     * #### Method used to change the widget's fields,
     * Left 'null' in order to not change the corresponding field
     * @param {number?} [x = null] - the x coordinates of the top-left corner of the widget
     * @param {number?} [y = null] - the y coordinates of the top-left corner of the widget
     * @param {boolean?} [rendered = null] - boolean refearing to if this widget should be rendered
     * @param {number?} [layer=null] - The layer on which the widget will be rendered, higher numbers means that the widget will be rendered on top
     * @param {boolean?} [fast_exit=null] - If true, then the window can be closed easily just by clicking outside of it
     */
    update_config(x=null, y=null, rendered=null, layer=null, fast_exit=null){
        if(x != null) {
            this.x.set_value(x)
            this.window_ui.x.set_value(x)
            this.window_ui.x_center.set_value(this.window_ui.width.get() / 2 + this.x.get())
        }
        if(y != null){
            this.y.set_value(y)
            this.window_ui.y.set_value(y)
            this.window_ui.y_center.set_value(this.window_ui.height.get() / 2 + this.y.get())
        }
        if(rendered != null) this.rendered = rendered
        if(layer != null) this.layer = layer
        if(fast_exit != null) this.fast_exit = fast_exit
    }

    /**
     * #### Method used to start the rendering and the updating of the window.
     * after a window is activated, the containing ui doesn't update until **the window's ui** is marked as finished.
     */
    activate(){
        this.get_ui().active_window = this
    }
}
