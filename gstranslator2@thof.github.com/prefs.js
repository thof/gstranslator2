const GObject = imports.gi.GObject;
const Gdk = imports.gi.Gdk;
const Gtk = imports.gi.Gtk;
const Lang = imports.lang;
const St = imports.gi.St;

const Extension = imports.misc.extensionUtils.getCurrentExtension();;
const Lib = Extension.imports.lib;
const MenuItems = Extension.imports.menu_items;

const schema = "org.gnome.shell.extensions.gstranslator2";

const pretty_names = {
	'get-translation': 'Get translation',
	'get-expanded-translation': 'Get expanded translation',
	'next-langs': 'Next languages',
	'prev-langs': 'Previous languages',
	'toggle-menu': 'Toggle translation menu'
}

function init() {
}

function buildPrefsWidget()
{
    let prefs = new Prefs(schema);
    return prefs.buildPrefsWidget();
}

function Prefs(schema)
{
    this.init(schema);
}

function append_hotkey(model, settings, name, pretty_name) {
	let [key, mods] = Gtk.accelerator_parse(settings.get_strv(name)[0]);

	let row = model.insert(10);

	model.set(row, [0, 1, 2, 3], [name, pretty_name, 
		mods, key ]);
}


Prefs.prototype =
{
    settings: null,
    menuItems: null,

    vboxList: null,
    hboxsList: new Array(),

    init: function(schema) {
	    let settings = new Lib.Settings(schema);
	
	    this.settings = settings.getSettings();

	    this.menuItems = new MenuItems.MenuItems(this.settings);
    },
    
    saveDisplayAreaSettings: function(object, combo, xoffset, yoffset, width, wide_width, height) {
	    this.settings.set_string("position", combo.get_active().toString());
	    this.settings.set_string("xoffset", xoffset.get_text());
	    this.settings.set_string("yoffset", yoffset.get_text());
	    this.settings.set_string("width", width.get_text());
	    this.settings.set_string("width-wide", wide_width.get_text());
	    this.settings.set_string("height", height.get_text());
    },
    
    testDisplayArea: function(object, combo, xoffset, yoffset) {
        Extension._testDisplayArea(combo, xoffset, yoffset);
    },

    changeMenu: function(object, text) {
	    this.settings.set_string("label-menu", text.get_text());
    },

    changeReplace: function(object, pspec) {
	    this.settings.set_boolean("replace-ss-menu", object.get_active());
    },

    changeEnable: function(object, pspec, index) {
	    this.menuItems.changeEnable(index, object.active);
    },

    addCmd: function(object, label, cmd) {
	    this.menuItems.addItem(label.get_text(), cmd.get_text());

	    label.set_text("");
	    cmd.set_text("");

	    this.buildList();
    },

    changeOrder: function(object, index, order) {
	    this.menuItems.changeOrder(index, order);

	    this.buildList();
    },
    
    delCmd: function(object, index) {
	    this.menuItems.delItem(index);

	    this.buildList();
    },

    buildList: function()
    {
	    for (let indexHboxsList in this.hboxsList)
	        this.vboxList.remove(this.hboxsList[indexHboxsList]);
	    this.hboxsList = new Array();

	    let items = this.menuItems.getItems();

	    for (let indexItem in items)
	    {
                let item = items[indexItem];

                let hboxList = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL});
                
                let labelList = new Gtk.Label({label: 'From: ', margin_left: 10});
                let valueMenu = new Gtk.Entry({ hexpand: true });
                // { hexpand: true }
	            valueMenu.set_text(item["src"]);
	            valueMenu.set_width_chars(4);

                let labelList2 = new Gtk.Label({label: 'To: ', margin_left: 10});
                let valueMenu2 = new Gtk.Entry({ hexpand: true });
	            valueMenu2.set_text(item["dst"]);
	            valueMenu2.set_width_chars(4);


	            let buttonUp = new Gtk.Button({ label: "Up" });
	            if (indexItem > 0)
		            buttonUp.connect("clicked", Lang.bind(this, this.changeOrder, indexItem, -1));
            
	            let buttonDown = new Gtk.Button({ label: "Down" });
	            if (indexItem < items.length - 1)	
		            buttonDown.connect("clicked", Lang.bind(this, this.changeOrder, indexItem, 1));

                let valueList = new Gtk.Switch({active: (item["enable"] == "1")});
                valueList.connect("notify::active", Lang.bind(this, this.changeEnable, indexItem));

                let buttonDel = null;
                if (items.length > 1)
                {
	                buttonDel = new Gtk.Button({ label: "Delete", margin_left: 10});
	                buttonDel.connect("clicked", Lang.bind(this, this.delCmd, indexItem));
                }

                hboxList.pack_start(labelList, false, false, 0);
                hboxList.add(valueMenu);
                hboxList.add(labelList2);
                hboxList.add(valueMenu2);
                hboxList.add(valueList);
                hboxList.add(buttonUp);
                hboxList.add(buttonDown);

                if (buttonDel != null)
	                hboxList.add(buttonDel);
                this.vboxList.add(hboxList);

                this.hboxsList.push(hboxList);
	    }

	    this.vboxList.show_all();
    },

    saveList: function() {
        let current_items = new Array();
        for (let indexHboxsList in this.hboxsList) {
            current_items.push(this.hboxsList[indexHboxsList].get_children()[1].get_text());
            current_items.push(this.hboxsList[indexHboxsList].get_children()[3].get_text());
        }
        this.menuItems.updateItems(current_items);
    },

    buildPrefsWidget: function()
    {
	    let frame = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, border_width: 10 });

        
        let model = new Gtk.ListStore();

	    model.set_column_types([
		    GObject.TYPE_STRING,
		    GObject.TYPE_STRING,
		    GObject.TYPE_INT,
		    GObject.TYPE_INT
	    ]);

	    let settings2 = this.settings;

	    for(key in pretty_names) {
		    append_hotkey(model, this.settings, key, pretty_names[key]);
	    }

	    let treeview = new Gtk.TreeView({
		    'expand': true,
		    'model': model
	    });

	    let col;
	    let cellrend;

	    cellrend = new Gtk.CellRendererText();

	    col = new Gtk.TreeViewColumn({
		    'title': 'Keybinding',
		    'expand': true
	    });

	    col.pack_start(cellrend, false);
	    col.add_attribute(cellrend, 'text', 1);


	    treeview.append_column(col);

	    cellrend = new Gtk.CellRendererAccel({
		    'editable': true,
		    'accel-mode': Gtk.CellRendererAccelMode.GTK
	    });

	    cellrend.connect('accel-edited', function(rend, iter, key, mods) {
		    let value = Gtk.accelerator_name(key, mods);
		
		    let [succ, iter ] = model.get_iter_from_string(iter);
		
		    if(!succ) {
			    throw new Error("Something be broken, yo.");
		    }

		    let name = model.get_value(iter, 0);

		    model.set(iter, [ 2, 3 ], [ mods, key ]);

		    settings2.set_strv(name, [value]);
	    });

	    col = new Gtk.TreeViewColumn({
		    'title': 'Accel'
	    });

	    col.pack_end(cellrend, false);
	    col.add_attribute(cellrend, 'accel-mods', 2);
	    col.add_attribute(cellrend, 'accel-key', 3);

	    treeview.append_column(col);
	    
	    label = new Gtk.Label({ label: "<b>Keybindings:</b>", use_markup: true, xalign: 0 });
	    
	    frame.add(label);
	    frame.add(treeview);


	    label = new Gtk.Label({ label: "<b>Languages:</b>", use_markup: true, xalign: 0 });
	    this.vboxList = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, margin_left: 20 });

	    this.buildList();

	    frame.add(label);

        let hboxButtonAdd = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL, margin_top: 10});
	    let buttonAdd = new Gtk.Button({label: "Apply"});
	    buttonAdd.connect("clicked", Lang.bind(this, this.saveList));

	    hboxButtonAdd.add(buttonAdd, true, true, 0);
        let halign = new Gtk.Alignment();
        halign.set(1,0,0,0);
        halign.add(hboxButtonAdd);
	    //this.vboxList.add(halign);
        
        frame.add(this.vboxList);
        frame.add(halign);


	    label = new Gtk.Label({ label: "<b>Add languages:</b>", use_markup: true, xalign: 0 });
	    vbox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, margin_left: 20 });

	    let hboxLabelAdd = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL});
	    let labelLabelAdd = new Gtk.Label({label: "From: "});
	    let valueLabelAdd = new Gtk.Entry({ hexpand: true });
	    valueLabelAdd.set_width_chars(4);

	    hboxLabelAdd.pack_start(labelLabelAdd, false, false, 0);
	    hboxLabelAdd.add(valueLabelAdd);

	    //let hboxCmdAdd = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL});
	    let labelCmdAdd = new Gtk.Label({label: "To: ", xalign: 0, margin_left: 10});
	    let valueCmdAdd = new Gtk.Entry({ hexpand: true });
	    valueCmdAdd.set_width_chars(4);

	    hboxLabelAdd.add(labelCmdAdd);
	    hboxLabelAdd.add(valueCmdAdd);
	    vbox.add(hboxLabelAdd);
	    //vbox.add(hboxCmdAdd);

	    let hboxButtonAdd = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL, margin_top: 10});
	    let buttonAdd = new Gtk.Button({ label: "Add" });
	    buttonAdd.connect("clicked", Lang.bind(this, this.addCmd, valueLabelAdd, valueCmdAdd));

	    hboxButtonAdd.add(buttonAdd, false, false, 0);
        let halign = new Gtk.Alignment();
        halign.set(1,0,0,0);
        halign.add(hboxButtonAdd);
	    vbox.add(halign);

	    frame.add(label);
	    frame.add(vbox);

        label = new Gtk.Label({ label: "<b>Display area settings:</b>", use_markup: true});
	    vbox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, margin_left: 20 });

        let hboxLabelPos = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL});
	    let labelLabelPos = new Gtk.Label({label: "Position: ", xalign: 0});
	    let comboBoxPos = new Gtk.ComboBoxText();
	    comboBoxPos.append_text("Top-left");
	    comboBoxPos.append_text("Top-right");
	    comboBoxPos.append_text("Bottom-left");
	    comboBoxPos.append_text("Bottom-right");
	    comboBoxPos.set_active(parseInt(this.settings.get_string("position")));
	    
	    let labelXoffset = new Gtk.Label({label: "Horizontal offset: ", xalign: 0, margin_left: 10});
	    let entryXoffset = new Gtk.Entry({ hexpand: true });
	    entryXoffset.set_width_chars(4);
	    entryXoffset.set_text(this.settings.get_string("xoffset"));
	    let labelYoffset = new Gtk.Label({label: "Vertical offset: ", xalign: 0, margin_left: 10});
	    let entryYoffset = new Gtk.Entry({ hexpand: true });
	    entryYoffset.set_width_chars(4);
	    entryYoffset.set_text(this.settings.get_string("yoffset"));
	    
	    hboxLabelPos.pack_start(labelLabelPos, false, false, 0);
	    hboxLabelPos.add(comboBoxPos);
	    hboxLabelPos.add(labelXoffset);
	    hboxLabelPos.add(entryXoffset);
	    hboxLabelPos.add(labelYoffset);
	    hboxLabelPos.add(entryYoffset);
	    vbox.add(hboxLabelPos);
	    
	    let hboxTransWidth = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL});
	    
	    let labelTransWidth = new Gtk.Label({label: "Max. width (number of characters): "});
	    let entryTransWidth = new Gtk.Entry({ hexpand: true });
	    entryTransWidth.set_width_chars(4);
	    entryTransWidth.set_text(this.settings.get_string("width"));
	    
	    let labelTransWideWidth = new Gtk.Label({label: "Max. expanded width: ", margin_left: 10});
	    let entryTransWideWidth = new Gtk.Entry({ hexpand: true });
	    entryTransWideWidth.set_width_chars(4);
	    entryTransWideWidth.set_text(this.settings.get_string("width-wide"));
	    
	    let labelTransHeight = new Gtk.Label({label: "Max. height (pixels): ", margin_left: 10});
	    let entryTransHeight = new Gtk.Entry({ hexpand: true });
	    entryTransHeight.set_width_chars(4);
	    entryTransHeight.set_text(this.settings.get_string("height"));
	    
	    hboxTransWidth.pack_start(labelTransWidth, false, false, 0);
	    hboxTransWidth.add(entryTransWidth);
	    hboxTransWidth.add(labelTransWideWidth);
	    hboxTransWidth.add(entryTransWideWidth);
	    hboxTransWidth.add(labelTransHeight);
	    hboxTransWidth.add(entryTransHeight);
	    vbox.add(hboxTransWidth);
	    
	    let hboxButtonAdd = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL, margin_top: 10});
	    let buttonAdd = new Gtk.Button({ label: "Apply", margin_left: 10 });
	    buttonAdd.connect("clicked", Lang.bind(this, this.saveDisplayAreaSettings, comboBoxPos, entryXoffset, entryYoffset, entryTransWidth, entryTransWideWidth, entryTransHeight));
	    
	    hboxButtonAdd.add(buttonAdd, false, false, 0);
        let halign = new Gtk.Alignment();
        halign.set(1,0,0,0);
        halign.add(hboxButtonAdd);
	    vbox.add(halign);
	    
	    frame.add(label);
	    frame.add(vbox);
	    
	    let win = new Gtk.ScrolledWindow({
		'vexpand': true
	    });
	    
	    frame.show_all();
        
	    return frame;
    }
}
