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

let text=null, lang_text=null, settings = null, transBox=null, scrollBox=null, content=null;
let clipboard = "";
let open = false, extended = false, normal=false;
let x=0, y=0, xoffset=0, yoffset=0, position = 0;
let monitor = Main.layoutManager.primaryMonitor;
let gstrans, searchEntry, langsLabel, autoCloseVal, height, mainBox, searchEntryText, button, dbusNotify;

const GstranslatorInterface = {
    name: 'com.github.thof.gstranslator2',
    methods: [
	    {
            name: 'dbusGetTranslation',
            inSignature: 's',
            outSignature: 's'
        },
        {
            name: 'dbusGetExpandedTranslation',
            inSignature: 's',
            outSignature: 's'
        },
        {
            name: 'nextLangs',
            inSignature: 's',
            outSignature: 's'
        },
        {
            name: 'prevLangs',
            inSignature: 's',
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
		_getTrans();
	},
	'get-expanded-translation': function() {
		_getExpandedTrans();
	},
	'next-langs': function() {
		_nextLangs();
	},
	'prev-langs': function() {
		_prevLangs();
	},
	'toggle-menu': function() {
		_toggleMenu();
	},
};

function _nextLangs() {
    dbusNotify.nextLangsRemote('', _showLangInfo);
}

function _prevLangs() {
    dbusNotify.prevLangsRemote('', _showLangInfo);
}

function _showLangInfo(title) {
    if (!lang_text) {
        lang_text = new St.Label({ style_class: 'lang-label', text: title });
        Main.uiGroup.add_actor(lang_text);
    }
    else {
        Main.uiGroup.remove_actor(lang_text);
        lang_text = new St.Label({ style_class: 'lang-label', text: title });
        Main.uiGroup.add_actor(lang_text);
    }
    
    _updateLangsLabel(title);
    _getPosition(lang_text);
    lang_text.set_position(x, y);
    
    Tweener.addTween(lang_text, { time: 3, 
                            onComplete: _hideInfo });
}

function _hideInfo() {
    if(lang_text!=null) {
        Main.uiGroup.remove_actor(lang_text);
        lang_text = null;
    }
}

function _openTrans() {
    open = true;
}

function _hideTrans() {
    if (transBox!=null && text!=null){
        Main.uiGroup.remove_actor(transBox);
        text = null;
        transBox = null;
        scrollBox = null;
        content = null;
        open = false;
    }
}

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

function _showTrans(title) {
    clipboard = title;
    
    if (transBox==null) {
        transBox = new St.BoxLayout({style_class: "main-dialog",
		    vertical: true
	    });
	    Main.uiGroup.add_actor(transBox);
	
	    scrollBox = new St.ScrollView();
	    transBox.add(scrollBox);
	    
	    content = new St.BoxLayout({vertical: true});
	    scrollBox.add_actor(content);
	    
	    text = new St.Label({ style_class: 'main-label', text: title });
        content.add(text);

        _getPosition(text);
        transBox.set_x(x);
        transBox.set_y(y);
        if(text.height>height) {
            transBox.set_height(height);
            transBox.set_reactive(true);
            transBox.connect('button-press-event', _exitTransBoxButton);
            transBox.connect('key-release-event', _exitTransBox);
            Main.pushModal(transBox);
        }
	    _openTrans();
	}
}

function _getTransFromEntry(text) {
    if (open) {
        _hideTrans();
        dbusNotify.dbusGetTranslationRemote(text, _asyncSetTrans2);
    }
    else {
        dbusNotify.dbusGetTranslationRemote(text, _asyncSetTrans);
    }
}

function _getExpandedTransFromEntry(text) {
    if (open) {
        _hideTrans();
        dbusNotify.dbusGetExpandedTranslationRemote(text, _asyncSetTrans2);
    }
    else {
        dbusNotify.dbusGetExpandedTranslationRemote(text, _asyncSetTrans);
    }
}

function _getTrans() {
    if (open) {
        _hideTrans();
        dbusNotify.dbusGetTranslationRemote('', _asyncSetTrans2);
    }
    else {
        dbusNotify.dbusGetTranslationRemote('', _asyncSetTrans);
    }
}

function _getExpandedTrans() {
    if (open) {
        _hideTrans();
        dbusNotify.dbusGetExpandedTranslationRemote('', _asyncSetTrans2);
    }
    else {
        dbusNotify.dbusGetExpandedTranslationRemote('', _asyncSetTrans);
    }
}

function _asyncSetTrans(title) {
    if (title==null) { 
        _showTrans(clipboard);
    }
    else {
        _showTrans(title);
    }
}

function _asyncSetTrans2(title) {
    if (title!=clipboard && title!=null) {
        _showTrans(title);
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
        
        langsLabel = new St.Label({ style_class: 'lang-label', text: '' });
        dbusNotify.getCurrentLangsRemote('', _updateLangsLabel);
        
        this.autoClose = new PopupMenu.PopupSwitchMenuItem("Autoclose", autoCloseVal);
        this.autoClose.connect('toggled', changeAutoClose);
        
        this.mainBox.add(searchEntry);
        this.mainBox.add(langsLabel);

        this.section.actor.add_actor(this.mainBox);
        this.menu.addMenuItem(this.autoClose);
        
        Main.panel._menus.addMenu(this.menu);
        this.menu.connect('open-state-changed', this._onOpenStateToggled);
    },
    
    _onKeyRelease: function(actor, event) {
        let emptyEntry = searchEntry.get_text() == "";
        if(emptyEntry) {
                if (open) {
                    _hideTrans();
                }
        }
    },
    
    _onKeyPress: function(actor, event) {
        let symbol = event.get_key_symbol();
        let state = event.get_state();
        global.log("State "+state);
        if(symbol == Clutter.KEY_Return) {
            this.textTrans = searchEntry.get_text().replace(/^\s+|\s+$/g, '');
            if(autoCloseVal) {
                gstrans.menu.close();
            }
            if(this.textTrans != "") {
                if(state & state.SHIFT_MASK == state.SHIFT_MASK) {
                    _getExpandedTransFromEntry(this.textTrans);
                    return true;
                }
                else {
                    _getTransFromEntry(this.textTrans);
                }
            }
        }
        else if(symbol == Clutter.KEY_Right && state == Clutter.ModifierType.CONTROL_MASK) {
            _nextLangs();
            return true;
        }
        else if(symbol == Clutter.KEY_Left && state == Clutter.ModifierType.CONTROL_MASK) {
            _prevLangs();
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

function _updateLangsLabel(text) {
    if(text!=null){
        langsLabel.set_text(text);
    }
    else {
        langsLabel.set_text("unknown");
    }
}

function _resetSearch() {
    searchEntry.set_text("");
    global.stage.set_key_focus(searchEntry);
}

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
}


function enable() {
    for(key in key_bindings) {
		global.display.add_keybinding(key,
			settings,
			Meta.KeyBindingFlags.NONE,
			key_bindings[key]
		);
	}
    gstrans = new Gstranslator();
    Main.panel._rightBox.insert_child_at_index(gstrans.actor, 0);
}

function disable() {
    for(key in key_bindings) {
		global.display.remove_keybinding(key);
	}
    gstrans.destroy();
    gstrans = null;
}

function _toggleMenu() {
    gstrans.menu.toggle();
}


function _getPosition(text_pos) {
    let text_height = text_pos.height;
    if (text_pos.height>height){
        text_height = height;
    }
    switch(position){
        case 0:
            x = 0+xoffset;
            y = 0+yoffset;
            break;
        case 1:
            x = Math.floor(monitor.width-text_pos.width)-xoffset;
            y = 0+yoffset;
            break;
        case 2:
            x = 0+xoffset;
            y = Math.floor(monitor.height-text_height)-yoffset;
            break;
        case 3:
            x = Math.floor(monitor.width-text_pos.width)-xoffset;
            y = Math.floor(monitor.height-text_height)-yoffset;
            break;   
    }
}
