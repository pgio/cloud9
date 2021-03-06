/**
 * Extension Manager for the Cloud9 IDE
 *
 * @copyright 2010, Ajax.org B.V.
 * @license GPLv3 <http://www.gnu.org/licenses/gpl.txt>
 */
require.def("ext/panels/panels",
    ["core/ide", "core/ext", "ext/settings/settings", "text!ext/panels/panels.xml"],
    function(ide, ext, settings, markup) {
        
return ext.register("ext/panels/panels", {
    name   : "Panel Manager",
    dev    : "Ajax.org",
    alone  : true,
    type   : ext.GENERAL, 
    markup : markup,
    
    nodes : [],
    panels : {},
    
    showingAll : true,
    
    initPanel : function(panelExt){
        if (panelExt.panel)
            return;
        
        ext.initExtension(panelExt);
        this.$setEvents(panelExt);
        
        var set = this.$settings && this.$settings[panelExt.path];
        if (set)
            this.setPanelSettings(panelExt, set);
        
        panelExt.panel.setAttribute("draggable", "false");
    },
    
    register : function(panelExt){
        var _self = this;
        panelExt.mnuItem = mnuPanels.appendChild(new apf.item({
            caption : panelExt.name,
            type    : "check",
            checked : panelExt.visible || false,
            onclick : function(){
                _self.initPanel(panelExt);
                this.checked ? panelExt.enable() : panelExt.disable();
            }
        }));
        
        if (this.$settings && this.$settings[panelExt.path]) {
            this.setPanelSettings(panelExt, _self.$settings[panelExt.path]);
        }
        else if (panelExt.visible) {
            if (panelExt.skin) {
                setTimeout(function(){
                    this.initPanel(panelExt);
                });
            }
            else {
                this.initPanel(panelExt);
            }
        }
        
        this.panels[panelExt.path] = panelExt;
    },
    
    $setEvents : function(panelExt){
        panelExt.panel.addEventListener("show", function(){
            var panels = require("ext/panels/panels");

            if (!panels.togglingAll && !panels.showingAll) 
                panels.showAll();
            else {
                if (!this.parentNode.visible)
                    this.parentNode.show();
                panelExt.mnuItem.check();
            }
        });
        panelExt.panel.addEventListener("hide", function(){
            var panels = require("ext/panels/panels");

            panelExt.mnuItem.uncheck();
            if (!this.parentNode.selectSingleNode("node()[not(@visible='false')]"))
                this.parentNode.hide();
            
            //Quick Fix
            if (apf.isGecko)
                apf.layout.forceResize(ide.vbMain.$ext);
        });
        //panelExt.panel.show();
        
        this.setPanelSettings(panelExt, this.$settings[panelExt.path]);
    },
    
    unregister : function(panelExt){
        panelExt.mnuItem.destroy(true, true);
        delete this.panels[panelExt.path];
    },

    setPanelSettings : function(panelExt, set){
        if (!panelExt.panel) {
            if (set.visible)
                this.initPanel(panelExt);
            return;
        }
        
        var pset, panel = panelExt.panel, parent = panel.parentNode;
        for (var prop in set) {
            if (prop == "parent") {
                if (panelExt.excludeParent)
                    continue;
                
                pset = set.parent;
                for (prop in pset) {
                    if (parent[prop] != pset[prop])
                        parent.setAttribute(prop, pset[prop]);
                }
            }
            else {
                if (panel[prop] != set[prop]) {
                    if (prop == "visible")
                        panel[set[prop] ? "enable" : "disable"]();
                    if (prop == "height" || !panelExt.excludeParent)
                        panel.setAttribute(prop, set[prop]);
                }
            }
        }
    },
    
    init : function(amlNode){
        this.nodes.push(
            barMenu.appendChild(new apf.button({
                submenu : "mnuPanels",
                caption : "Windows"
            })),
            mnuPanels
        );
        
        /**** Support for state preservation ****/
        
        var _self = this;
        this.$settings = {};
        ide.addEventListener("loadsettings", function(e){
            var strSettings = e.model.queryValue("auto/panel");
            if (strSettings) {
                _self.$settings = apf.unserialize(strSettings);
                
                var panelExt;
                for (var path in _self.$settings) {
                    if ((panelExt = _self.panels[path]) && panelExt.panel)
                        _self.setPanelSettings(panelExt, _self.$settings[path]);
                }
            }
        });

        var props = ["visible", "flex", "width", "height", "state"];
        ide.addEventListener("savesettings", function(e){
            var changed = false, 
                xmlSettings = apf.createNodeFromXpath(e.model.data, "auto/panel/text()");

            var set, pset, path, parent, panel, p, i, l = props.length;
            for (path in _self.panels) {
                panel = _self.panels[path].panel;
                if (!panel) continue;

                if (!_self.$settings[path]) {
                    _self.$settings[path] = {parent: {}};
                    changed = true;
                }
                
                parent = panel.parentNode;
                set    = _self.$settings[path];
                pset   = _self.$settings[path].parent;

                for (i = 0; i < l; i++) {
                    if (set[p = props[i]] !== panel[p]) {
                        set[p] = panel[p];
                        changed = true;
                    }
                    if (pset[p] !== parent[p]) {
                        pset[p] = parent[p];
                        changed = true;
                    }
                }
            }
            
            if (changed) {
                xmlSettings.nodeValue = apf.serialize(_self.$settings);
                return true;
            }
        });
    },
    
    enable : function(){
        this.nodes.each(function(item){
            item.enable();
        });
    },
    
    disable : function(){
        this.nodes.each(function(item){
            item.disable();
        });
    },
    
    destroy : function(){
        this.nodes.each(function(item){
            item.destroy(true, true);
        });
        this.nodes = [];
    },

    toggleAll : function() {
        this.togglingAll = true;
        for (var key in this.panels) {
            if (key != "ext/editors/editors") {
                var panel = this.panels[key];
            
                if (panel.panel) {
                    if (panel.hidden) {
                        panel.enable();
                        panel.hidden = false;
                    } else if (panel.panel.visible) {
                        panel.disable();
                        panel.hidden = true;
                    }
                }
            }
        }
        this.togglingAll = false;
    },
    
    showAll : function() {
        this.showingAll = true;
        for (var key in this.panels) {
            if (key != "ext/editors/editors") {
                var panel = this.panels[key];
            
                if (panel.panel && panel.hidden) {
                    // console.log("Showing " + key);
                    panel.enable();
                    panel.hidden = false;
                }
            }
        }       
        this.showingAll = false;
    }
});

    }
);
