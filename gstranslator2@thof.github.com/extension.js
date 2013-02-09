/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */
/*
 * extension.js
 * Copyright (C) 2012 thof <radlewand@gmail.com>
 * 
 * gnome-shell-extension-gstranslator2 is free software: you can redistribute it and/or modify it
 * under the terms of the GNU General Public License as published by the
 * Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * gnome-shell-extension-gstranslator2 is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License along
 * with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

const Meta = imports.gi.Meta;
const St = imports.gi.St;
const Main = imports.ui.main;
const Tweener = imports.ui.tweener;
const DBus = imports.dbus;
const Gtk = imports.gi.Gtk;
const Panel = imports.ui.panel;
const PopupMenu = imports.ui.popupMenu;
const PanelMenu = imports.ui.panelMenu;
const Clutter = imports.gi.Clutter;

const Extension = imports.misc.extensionUtils.getCurrentExtension();
const Lib = Extension.imports.lib;

// Other javascript files in the gstranslator2@thof.github.com directory are accesible via Extension.<file name>

const schema = "org.gnome.shell.extensions.gstranslator2";

let translationLabel=null, langsLabel, langsLabelMenu, settings = null, transBox=null, scrollBox=null, content=null;
let prevTrans = "";
let x=0, y=0, xoffset=0, yoffset=0, position = 0;
let monitor = Main.layoutManager.primaryMonitor;
let gstrans, searchEntry, autoCloseVal, height, mainBox, searchEntryText, button, dbusNotify;

const GstranslatorInterface = {
    name: 'com.github.thof.gstranslator2',
    methods: [
	    {
            name: 'dbusGetTranslation',
            inSignature: 'si',
            outSignature: 's'
        },
        {
            name: 'changeLangs',
            inSignature: 'i',
            outSignature: 's'
        },
        {
            name: 'getCurrentLangs',
            inSignature: 's',
            outSignature: 's'
        }
    ]
};

const key_bindings = {
	'get-translation': function() {
		_getTrans(0);
	},
	'get-expanded-translation': function() {
		_getTrans(1);
	},
	'next-langs': function() {
		_changeLangs(1);
	},
	'prev-langs': function() {
		_changeLangs(0);
	},
	'toggle-menu': function() {
		_toggleMenu();
	},
};

function _exitTransBox(actor, event) {
    let symbol = event.get_key_symbol();
    if(symbol==Clutter.KEY_Escape || symbol==Clutter.KEY_Return || symbol==Clutter.KEY_space) {
        Main.popModal(transBox);
        _hideTrans();
    }
}

function _exitTransBoxButton(actor, event) {
    Main.popModal(transBox);
    _hideTrans();
}

function _showTrans(translation) {
        if (translation != null){
	        translationLabel.set_text(translation);
            content.add(translationLabel);

            _getPosition(translationLabel);
            transBox.set_x(x);
            transBox.set_y(y);
            if(translationLabel.height>height) {
                transBox.set_height(height);
                transBox.set_reactive(true);
                transBox.connect('button-press-event', _exitTransBoxButton);
                transBox.connect('key-release-event', _exitTransBox);
                Main.pushModal(transBox);
            }
        }
}

function _hideTrans() {
    if (content.contains(translationLabel)) {
        content.remove_all_children();
    }
}

function _getTrans(state, toTrans) {
    toTrans = toTrans || '';
    dbusNotify.dbusGetTranslationRemote(toTrans, state, _asyncSetTrans);
}

function _asyncSetTrans(translation) {
    //global.log('***** closing translation');
    _hideTrans();
    
    if (translation != '-111') {
        //global.log('***** opening translation');
        if (translation == '-222') {
            // show previous translation
            _showTrans(prevTrans);
        }
        else {
            _showTrans(translation);
            prevTrans = translation;
        }
    }
}

function Gstranslator() {
    this._init();
}

Gstranslator.prototype = {
    __proto__: PanelMenu.Button.prototype,
   
    _init: function() {
        PanelMenu.Button.prototype._init.call(this, 1);
        
        this.statusLabel = new St.Label({ style_class: 'panel-label', text: 'T' });
        this.actor.add_actor(this.statusLabel);
        
        this.mainBox = new St.BoxLayout({ style_class: 'main-box', vertical:false });
        
        this.section = new PopupMenu.PopupMenuSection();
        this.menu.addMenuItem(this.section);
        
        
        searchEntry = new St.Entry({ name: 'searchEntry', hint_text: "Type to search...", track_hover: true, can_focus: true });
        searchEntryText = searchEntry.clutter_text;
        searchEntryText.connect('key-press-event', this._onKeyPress);
        searchEntryText.connect('key-release-event', this._onKeyRelease);
        
        langsLabelMenu = new St.Label({ style_class: 'lang-label'});
        dbusNotify.getCurrentLangsRemote('', _updateLangsLabel);
        
        this.autoClose = new PopupMenu.PopupSwitchMenuItem("Autoclose", autoCloseVal);
        this.autoClose.connect('toggled', changeAutoClose);
        
        this.mainBox.add(searchEntry);
        this.mainBox.add(langsLabelMenu);

        this.section.actor.add_actor(this.mainBox);
        this.menu.addMenuItem(this.autoClose);
        
        Main.panel.menuManager.addMenu(this.menu);
        this.menu.connect('open-state-changed', this._onOpenStateToggled);
        Main.panel.addToStatusArea("gstranslator", this, 10, "right");
    },
    
    _onKeyRelease: function(actor, event) {
        let emptyEntry = searchEntry.get_text() == "";
        if(emptyEntry) {
                    _hideTrans();
        }
    },
    
    _onKeyPress: function(actor, event) {
        let symbol = event.get_key_symbol();
        let state = event.get_state();
        //global.log("State "+state);
        if(symbol == Clutter.KEY_Return) {
            this.textTrans = searchEntry.get_text().replace(/^\s+|\s+$/g, '');
            if(autoCloseVal) {
                gstrans.menu.close();
            }
            if(this.textTrans != "") {
                if(state & state.SHIFT_MASK == state.SHIFT_MASK) {
                    _getTrans(3, this.textTrans);
                    return true;
                }
                else {
                    _getTrans(2, this.textTrans);
                }
            }
        }
        else if(symbol == Clutter.KEY_Right && state == Clutter.ModifierType.CONTROL_MASK) {
            _changeLangs(1);
            return true;
        }
        else if(symbol == Clutter.KEY_Left && state == Clutter.ModifierType.CONTROL_MASK) {
            _changeLangs(0);
            return true;
        }
        return false;
    },
    
    _onOpenStateToggled: function(menu, open) {
        if (open) {
            _resetSearch();
        }
    }
};

function init() {
	let GstranslatorProxy = DBus.makeProxyClass(GstranslatorInterface);
	dbusNotify = new GstranslatorProxy(DBus.session, 'com.github.thof.gstranslator2', '/com/github/thof/gstranslator2');
     
    let settings2 = new Lib.Settings(schema);
    settings = settings2.getSettings();
    
    position = parseInt(settings.get_string("position"));
    xoffset = parseInt(settings.get_string("xoffset"));
    yoffset = parseInt(settings.get_string("yoffset"));
    autoCloseVal = parseInt(settings.get_string("auto-close"));
    height = parseInt(settings.get_string("height"));
    
    gstrans = new Gstranslator();
    
    // init traslation box
    transBox = new St.BoxLayout({style_class: "main-dialog",
	    vertical: true
    });
    Main.uiGroup.add_actor(transBox);

    scrollBox = new St.ScrollView();
    transBox.add(scrollBox);
    
    content = new St.BoxLayout({vertical: true});
    scrollBox.add_actor(content);
    
    translationLabel = new St.Label({ style_class: 'main-label'});
    
    // init languages info
    langsLabel = new St.Label({ style_class: 'lang-label'});
}

function enable() {
    for(key in key_bindings) {
		global.display.add_keybinding(key,
			settings,
			Meta.KeyBindingFlags.NONE,
			key_bindings[key]
		);
	}
}

function disable() {
    for(key in key_bindings) {
		global.display.remove_keybinding(key);
	}
    gstrans.destroy();
    gstrans = null;
}

function _getPosition(labelPosition) {
    let text_height = labelPosition.height;
    if (labelPosition.height>height){
        text_height = height;
    }
    switch(position){
        case 0:
            x = 0+xoffset;
            y = 0+yoffset;
            break;
        case 1:
            x = Math.floor(monitor.width-labelPosition.width)-xoffset;
            y = 0+yoffset;
            break;
        case 2:
            x = 0+xoffset;
            y = Math.floor(monitor.height-text_height)-yoffset;
            break;
        case 3:
            x = Math.floor(monitor.width-labelPosition.width)-xoffset;
            y = Math.floor(monitor.height-text_height)-yoffset;
            break;   
    }
}

// helper functions for menu
function changeAutoClose(clicked_actor) {
    if(autoCloseVal) {
        settings.set_string("auto-close", "0");
        autoCloseVal = 0;
    }
	else {
	    settings.set_string("auto-close", "1");
        autoCloseVal = 1;
	}
}

function _toggleMenu() {
    gstrans.menu.toggle();
}

function _resetSearch() {
    searchEntry.set_text("");
    global.stage.set_key_focus(searchEntry);
}

// functions responsible for handling languages
function _updateLangsLabel(langs_string) {
    if(langs_string!=null){
        langsLabelMenu.set_text(langs_string);
    }
    else {
        langsLabelMenu.set_text("unknown");
    }
}

function _changeLangs(direction) {
    dbusNotify.changeLangsRemote(direction, _showLangInfo);
}

function _showLangInfo(langs_string) {
    if (langs_string != null){
        langsLabel.set_text(langs_string);
        langsLabelMenu.set_text(langs_string);
        if (!Main.uiGroup.contains(langsLabel)){
            Main.uiGroup.add_actor(langsLabel);
        }

        langsLabel.set_position(Math.floor(monitor.width/2), Math.floor(monitor.height/2));
        Tweener.removeTweens(langsLabel)
        Tweener.addTween(langsLabel, { time: 3, onComplete: _hideLangInfo });
    }
}

function _hideLangInfo() {
    if(Main.uiGroup.contains(langsLabel)) {
        Main.uiGroup.remove_actor(langsLabel);
    }
}
