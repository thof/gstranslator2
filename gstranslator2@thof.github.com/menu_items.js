function MenuItems(settings)
{
    this.init(settings);
}

MenuItems.prototype =
{
    settings: null,

    init: function(settings) {
	    this.settings = settings;
    },

    getItems: function() {
	    let itemsString = this.settings.get_string('items');
	    return this.itemsToArray(itemsString);
    },

    setItems: function(items) {
	    let itemsString = this.itemsToString(items);
        this.settings.set_string('items', itemsString);
    },

    getEnableItems: function() {
	    let items = this.getItems();
	    let itemsEnable = new Array();
	    for (indexItem in items)
	    {
                let item = items[indexItem];
	        
                if (item["enable"])
		            itemsEnable.push(item);
	    }
	    return itemsEnable;
    },

    getItem: function(index) {
	    let items = this.getItems();

	    if (index >= 0 && index < items.length)
            return items[index];
	    else
            return null;
    },

    isEnable: function(index) {
	    let item = this.getItem(index);

	    if (item != null)
            return item["enable"];
	    else
            return null;
    },

    changeOrder: function(index, posRel) {
	    let items = this.getItems();

	    if ((posRel < 0 && index > 0) || (posRel > 0 && index < (items.length - 1)))
	    {

	        let temp = items[index];
	        items.splice(index, 1);
	        items.splice(parseInt(index) + posRel, 0, temp);

	        this.setItems(items);

	        return true;
	    }
	    else
	        return false;
        },

        changeEnable: function(index, value)
        {
	    let items = this.getItems();

	    if (index < 0 && index >= items.length)
                return false;

	    items[index]["enable"] = value;

	    this.setItems(items);

	    return true;
    },

    updateItems: function(items_current) {
        let i=0;
        let items = this.getItems();
        
        for (let indexItem in items) {
            items[indexItem]['src'] = items_current[i];
            i=i+1;
            items[indexItem]['dst'] = items_current[i];
            i=i+1;
        }
        this.setItems(items);
    },

    addItem: function(label, cmd) {
	    let items = this.getItems();

	    let item = {
                "src" : label,
                "dst" : cmd,
                "enable" : "1"
            };
        
	    items.push(item);

	    this.setItems(items);
    },

    delItem: function(index) {
	    let items = this.getItems();

	    if (index < 1 && index >= items.length)
                return false;

	    items.splice(index, 1);

	    this.setItems(items);

	    return true;
    },

    itemsToArray: function(itemsString) {
	    let items = itemsString.split("|");

	    let itemsArray = new Array();

	    for (let indexItem in items)
	    {
                let itemDatas = items[indexItem].split(";");

                let item = {
                    "src": itemDatas[0],
                    "dst" : itemDatas[1],
                    "enable" : (itemDatas[2] == "1")
                };

                itemsArray.push(item);
	    }

	    return itemsArray;
    },
    
    itemsToString: function(itemsArray) {	
	    let items = new Array()

	    for (indexItem in itemsArray)
	    {
                let itemDatasArray = itemsArray[indexItem];
            
                let itemDatasString = itemDatasArray["src"] + ";" + itemDatasArray["dst"] + ";" + (itemDatasArray["enable"]?"1":"0");

                items.push(itemDatasString);
	    }

	    return items.join("|");
    }
}