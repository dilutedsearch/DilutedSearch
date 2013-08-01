/*
This file is part of DilutedSearch.

Copyright (C) 2013  ZhongYi Jin <pipilu8@icloud.com> and Aaron Jow

DilutedSearch is free software: you can redistribute it and/or modify it
under the terms of the GNU Affero Public License as published by the Free
Software Foundation, either version 3 of the License, or (at your option)
any later version.

DilutedSearch is distributed in the hope that it will be useful, but WITHOUT
ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
FOR A PARTICULAR PURPOSE.  See the GNU Affero Public License for more details.

You should have received a copy of the GNU Affero Public License along with
DilutedSearch.  If not, see <http://www.gnu.org/licenses>.
*/

var DEBUG_LEVEL = {
    NONE : 0,
    ERROR : 1,
    WARNING : 2,
    INFO : 3,
    DEBUG : 4
}

var current_dgs_debug_level = DEBUG_LEVEL.DEBUG;

function dgs_dblog(level, m)
{
    if (level <= current_dgs_debug_level)
    {
        if (level == DEBUG_LEVEL.NONE)
        {
            console.log("Shouldn't have ANY messages with debug level NONE");
        }
        if (level == DEBUG_LEVEL.ERROR)
        {
            console.log("E/DGS " + m);
        }
        if (level == DEBUG_LEVEL.WARNING)
        {
            console.log("W/DGS " + m);
        }
        if (level == DEBUG_LEVEL.INFO)
        {
            console.log("I/DGS " + m);
        }
        if (level == DEBUG_LEVEL.DEBUG)
        {
            console.log("D/DGS " + m);
        }
    }
}

var DGS_DummySearch = {
    id: -1,
    doSubmit: false,
    firstSbumit: true,
    searchQuery: "",

    dblog: function(level, m)
    {
        dgs_dblog(level, "\tHiddenWin:"+ DGS_DummySearch.id + " " + m);
    },

    dynamicDebug: function(newDebugLevel)
    {
        console.log("DGS\tHiddenWin:" + DGS_DummySearch.id + " dynamicDebug: new debug level is " + newDebugLevel);
        current_dgs_debug_level = newDebugLevel;
    },

    triggerMouseEvent: function(element, eventName) 
    {
        var options = { // defaults
            clientX: 0, clientY: 0, button: 0,
            ctrlKey: false, altKey: false, shiftKey: false,
            metaKey: false, bubbles: true, cancelable: true
            // create event object:
        }, event = element.ownerDocument.createEvent("MouseEvents");
        
        if (!/^(?:click|mouse(?:down|up|over|move|out))$/.test(eventName)) {
            dgs_dblog(DEBUG_LEVEL.WARNING, "triggerMouseEvent Only MouseEvents supported");
        }
        
        // initialize the event object
        event.initMouseEvent(eventName, options.bubbles, options.cancelable,
                             element.ownerDocument.defaultView,  options.button,
                             options.clientX, options.clientY, options.clientX,
                             options.clientY, options.ctrlKey, options.altKey,
                             options.shiftKey, options.metaKey, options.button,
                             element);
        // dispatch!
        element.dispatchEvent(event);
    },
    
    submitQuery: function()
    {
        var query = "";
        var searchField = document.querySelectorAll("input[type=text]");
        /*
          for(var i = 0; i < searchField.length; i++)
          {
          this.dblog(DEBUG_LEVEL.DEBUG, "submitQuery: Field" + i + " :" + searchField[i].nodeName +
          "\n\tvalue: " + searchField[i].value +
          "\n\tlabel: " + searchField[i].textContent +
          "\n\tKeyup: " + searchField[i].onkeyup +
          "\n\tKeydown: " + searchField[i].onkeydown);
          }
        */
        if(searchField.length > 0)
        {
            query = searchField[0].value;
            this.doSubmit = true;
        }

        this.dblog(DEBUG_LEVEL.DEBUG, "submitQuery: Query being submitted: '" + query + "'");
        
        var submitField = document.querySelectorAll("input[type=submit]");
        /*
          for(var i = 0; i < submitField.length; i++)
          {
          this.dblog(DEBUG_LEVEL.DEBUG, "submitQuery: Submit Field" + i + " :" + submitField[i].nodeName +
          "\n\tvalue: " + submitField[i].value +
          "\n\tlabel: " + submitField[i].textContent +
          "\n\tKeyup: " + submitField[i].onkeyup +
          "\n\tKeydown: " + submitField[i].onkeydown);
          }
        */
        if(submitField.length > 0)
        {
            if(this.firstSbumit)
            {
                this.firstSbumit = false;
            }
            else
            {
                this.doSubmit = false;
                this.dblog(DEBUG_LEVEL.DEBUG, "submitQuery: click submitField 0");
                this.triggerMouseEvent(submitField[0], 'click');
            }
        }
    },

    doSearch: function(msg)
    {
        try
        {
            var e = JSON.parse(msg);
            if(e.type == "debug")
            {
                this.probeGoogle();
            }
            else if(e.type == "search" && e.search !== null  && e.search.length > 0)
            {   
                this.dblog(DEBUG_LEVEL.WARNING, "doSearch: '" + e.search + "'");
                var searchField = document.querySelectorAll("input[type=text]");
                if(searchField.length > 0)
                {
                    this.dblog(DEBUG_LEVEL.DEBUG, "doSearch: Found input " + searchField.length);
                    this.dblog(DEBUG_LEVEL.DEBUG, "doSearch: " + searchField[0].nodeName);
                    // todo: fix this to the specific form element
                    this.searchQuery = e.search;
                    searchField[0].value = this.searchQuery;
                    this.submitQuery();
                }
            }
        }
        catch(e)
        {
            dgs_dblog(DEBUG_LEVEL.ERROR, "doSearch: error " + e.message);
        }
    },

    init: function()
    {
        try
        {
            this.dblog(DEBUG_LEVEL.WARNING, "init: DGS_DummySearch ID: " + DGS_DummySearch.id);

            var observer = new MutationObserver(function(mutations) {  
                try
                {
                    DGS_DummySearch.dblog(DEBUG_LEVEL.DEBUG, "init: Triggered mutations: " + mutations.length);
                    DGS_DummySearch.dblog(DEBUG_LEVEL.DEBUG, "init: Current URL: " + document.URL);

                    if(DGS_DummySearch.doSubmit)
                    {
                        DGS_DummySearch.doSubmit = false;

                        // For regular google search page
                        var searchBtn = document.querySelectorAll("button");
                        DGS_DummySearch.dblog(DEBUG_LEVEL.DEBUG, "init: found searchButtons: " + searchBtn.length);
                        /*
                          for(var i = 0; i < searchBtn.length; i++)
                          {
                          DGS_DummySearch.dblog(DEBUG_LEVEL.DEBUG, "init: button" + i + " :" + searchBtn[i].nodeName + "\n" +
                          "\tlabel: " + searchBtn[i].textContent + "\n" +
                          "\tonclick: " + searchBtn[i].onclick);                            
                          }
                        */

                        if(searchBtn.length > 0)
                        {
                            DGS_DummySearch.dblog(DEBUG_LEVEL.DEBUG, "init: click " + 0);
                            DGS_DummySearch.triggerMouseEvent(searchBtn[0], 'click');
                        }

                        // For google search without auto-complete and google instant
                        var submitField = document.querySelectorAll("input[type=submit]");
                        /*
                          for(var i = 0; i < submitField.length; i++)
                          {
                          DGS_DummySearch.dblog(DEBUG_LEVEL.DEBUG, "init: Submit Field" + i + " :" + submitField[i].nodeName +
                          "\n\tvalue: " + submitField[i].value +
                          "\n\tlabel: " + submitField[i].textContent +
                          "\n\tKeyup: " + submitField[i].onkeyup +
                          "\n\tKeydown: " + submitField[i].onkeydown);
                          }
                        */
                        if(submitField.length > 0)
                        {
                            DGS_DummySearch.dblog(DEBUG_LEVEL.DEBUG, "init: click submitField 0");
                            DGS_DummySearch.triggerMouseEvent(submitField[0], 'click');
                        }
                    }
                }
                catch (e)
                {
                    dgs_dblog(DEBUG_LEVEL.ERROR, "init: Mutation: Error: " + e.message);
                }
            });

            this.dblog(DEBUG_LEVEL.INFO, "init: Observer is " + observer);
            var list = document.body;
            observer.observe(list, {
                childList: true,
                subtree: true
            });
        }
        catch(e)
        {
            dgs_dblog(DEBUG_LEVEL.ERROR, "init: Error: " + e.message);
        }
    },

    pageHideHandler: function() 
    {
        DGS_DummySearch.dblog(DEBUG_LEVEL.DEBUG, "PageHideHandler: ******** Page Hide *****************");
        var msg = {};
        msg.cmd = "destroy"
        msg.id = DGS_DummySearch.id;
        self.port.emit("DGSToMain", JSON.stringify(msg));
    },

    main: function()
    {
        DGS_DummySearch.init.call(DGS_DummySearch);
    }
};

document.addEventListener("DOMContentLoaded", DGS_DummySearch.main, false);
window.addEventListener('pagehide',  DGS_DummySearch.pageHideHandler, false);

/* debugging */
DGS_DummySearch.probeGoogle = function(e)
{
    try
    {
        dgs_dblog(DEBUG_LEVEL.DEBUG, "probeGoogle: Lookup Searchfield input:");
        var searchField = document.querySelectorAll("input[type=text]");
        
        dgs_dblog(DEBUG_LEVEL.DEBUG, "probeGoogle: Found Searchfield " + searchField.length);
        
        for(var i = 0; i < searchField.length; i++)
        {
            dgs_dblog(DEBUG_LEVEL.DEBUG, "probeGoogle: field" + i + " :" + searchField[i].nodeName +
                      "\n\tvalue: " + searchField[i].value +
                      "\n\tlabel: " + searchField[i].textContent +
                      "\n\tKeyup: " + searchField[i].onkeyup +
                      "\n\tKeydown: " + searchField[i].onkeydown);
        }
        
        if(searchField.length == 0)
        {
            dgs_dblog(DEBUG_LEVEL.WARNING, "probeGoogle: Failed to locate search field");
        }
        
        ////////////////////
        dgs_dblog(DEBUG_LEVEL.DEBUG, "probeGoogle: Lookup searchButton button:");
        var searchBtn = document.querySelectorAll("button");
        dgs_dblog(DEBUG_LEVEL.DEBUG, "probeGoogle: found searchButtons: " + searchBtn.length);
        for(var i = 0; i < searchBtn.length; i++)
        {
            dgs_dblog(DEBUG_LEVEL.DEBUG, "probeGoogle: button" + i + " :" + searchBtn[i].nodeName + "\n" +
                      "\tlabel: " + searchBtn[i].textContent + "\n" + 
                      "\tonclick: " + searchBtn[i].onclick);
            if(i == 1)
            {
                //simulate(searchBtn[i], "click");
            }
        }
        
        ///////////////////////
        dgs_dblog(DEBUG_LEVEL.DEBUG, "probeGoogle: Lookup searchForm form");
        searchForm = document.querySelectorAll("form");
        dgs_dblog(DEBUG_LEVEL.DEBUG, "probeGoogle: Found searchForm " + searchForm.length);
        for(var i = 0; i < searchForm.length; i++)
        {
            dgs_dblog(DEBUG_LEVEL.DEBUG, "probeGoogle: Form" + i + ": " + searchForm[i].nodeName +
                      "\n\tlabel: " + searchForm[i].textContent +
                      "\n\tid: " + searchForm[i].id +
                      "\n\tmethod: " + searchForm[i].method +
                      "\n\taction: " + searchForm[i].action +
                      "\n\tonsubmit: " + searchForm[i].onsubmit
                     );
        }       
        
            /////////////////////////
        var elements = document.getElementsByTagName('a');
        dgs_dblog(DEBUG_LEVEL.DEBUG, "probeGoogle: " + document.URL + " has a total link of " + elements.length);
        for (var i = 0; i < elements.length; ++i)
        {
            //dgs_dblog(DEBUG_LEVEL.DEBUG, "link-" + i + ": " + elements[i].href);
            }
    }
    catch(e)
    {
        dgs_dblog(DEBUG_LEVEL.ERROR, "probeGoogle: Error: " + e.message);
    }
}
