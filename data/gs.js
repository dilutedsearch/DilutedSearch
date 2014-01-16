/*
This file is part of DilutedSearch.

Copyright (C) 2013  2014 ZhongYi Jin <pipilu8@icloud.com> and Aaron Jow

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

var current_gs_debug_level = DEBUG_LEVEL.DEBUG;

function gs_dblog(level, m)
{
    if (level <= current_gs_debug_level)
    {
        m = new Date().getTime() + " " + m;
        if (level == DEBUG_LEVEL.NONE)
        {
            console.log("Shouldn't have ANY messages with debug level NONE");
        }
        if (level == DEBUG_LEVEL.ERROR)
        {
            console.log("E/GS " + m);
        }
        if (level == DEBUG_LEVEL.WARNING)
        {
            console.log("W/GS " + m);
        }
        if (level == DEBUG_LEVEL.INFO)
        {
            console.log("I/GS " + m);
        }
        if (level == DEBUG_LEVEL.DEBUG)
        {
            console.log("D/GS " + m);
        }
    }
}

var DilutedSearch = {

    mutationTimer: null,

    /* main function */
    main: function(e)
    {
        try
        {
            gs_dblog(DEBUG_LEVEL.INFO, "main: DOMContentLoaded...");
            DilutedSearch.checkSite(e);
        }
        catch(e)
        {
            gs_dblog(DEBUG_LEVEL.ERROR, "main: Error: " + e.message);
        }
    },
    
    /* Check site and invoke the right functions.
     * site check could be redundant
     */
    checkSite: function(e)
    {
        if(this != DilutedSearch)
        {
            gs_dblog(DEBUG_LEVEL.ERROR, "checkSite: Error: context not the same?");
        }

        var href = e.originalTarget.location.href;

        if (!(/\.(js|css|xml|rss|pdf)$/.test(href)) && !(/complete\/search/.test(href)) && ( /^http[s]?:\/\/.*?\.(google|googleproxy)\.[a-z\.]+\//.test(href) || /^http:\/\/(64\.233\.161\.99|64\.233\.161\.104|64\.233\.161\.105|64\.233\.161\.147|64\.233\.167\.99|64\.233\.167\.104|64\.233\.167\.147|64\.233\.171\.99|64\.233\.171\.104|64\.233\.171\.105|64\.233\.171\.147|64\.233\.179\.99|64\.233\.179\.99|64\.233\.183\.99|64\.233\.183\.104|64\.233\.185\.99|64\.233\.185\.104|64\.233\.187\.99|64\.233\.187\.104|64\.233\.189\.104|66\.102\.7\.104|66\.102\.7\.105|66\.102\.7\.147|66\.102\.9\.104|66\.102\.11\.104|216\.239\.37\.104|216\.239\.37\.105|216\.239\.37\.147|216\.239\.39\.104|216\.239\.53\.104|216\.239\.57\.98|216\.239\.57\.104|216\.239\.57\.105|216\.239\.57\.147|216\.239\.59\.104|216\.239\.59\.105|216\.239\.63\.104|66\.249\.81\.99)\//.test(href)))
        {
            // Google web search
            gs_dblog(DEBUG_LEVEL.INFO, "checkSite Google search Identified");
            this.initEventHandlers();
            this.removeGoogleRedirect();
        }
    },

    inputEventHandler: function(e)
    {
        gs_dblog(DEBUG_LEVEL.INFO, "inputEventHandler: Internal handle event: " + e + " " + e.type);
        var msg = {};
        msg.type = e.type;
        var search = "";
        if(e.keyCode)
        {
            msg.keyCode = e.keyCode;
            search =  String.fromCharCode(e.keyCode);
        }

        if(e.target && e.target.value)
        {
            search = e.target.value + search;
        }
        msg.search = search;
        self.port.emit("GSToMain", JSON.stringify(msg));
    },

    /* capture necessary events */
    initEventHandlers: function()
    {
        //gs_dblog(DEBUG_LEVEL.DEBUG, "inputEventHandlers: Init Event Handler: " + this.inputEventHandler);
        var searchField = document.querySelectorAll("input[type=text]");
        gs_dblog(DEBUG_LEVEL.DEBUG, "inputEventHandlers: Found Searchfield " + searchField.length);

        for(var i = 0; i < searchField.length; i++)
        {
            gs_dblog(DEBUG_LEVEL.DEBUG, "inputEventHandlers: field" + i + " :" + searchField[i].nodeName +
                       "\n\tlabel: " + searchField[i].textContent +
                       "\n\tKeyup: " + searchField[i].onkeyup +
                       "\n\tKeydown: " + searchField[0].onkeydown);

            searchField[i].removeEventListener('keydown',this.inputEventHandler,false);
            searchField[i].removeEventListener('change',this.inputEventHandler,false);
            searchField[i].removeEventListener('focus',this.inputEventHandler,false);
            searchField[i].addEventListener('keydown',this.inputEventHandler,false);
            searchField[i].addEventListener('change',this.inputEventHandler,false);
            searchField[i].addEventListener('focus',this.inputEventHandler,false);
            gs_dblog(DEBUG_LEVEL.INFO, "inputEventHandlers: Registered input listener");
        }
/*
        searchForm = document.querySelectorAll("form");
        gs_dblog(DEBUG_LEVEL.INFO, "inputEventHandlers: Found searchForm " + searchForm.length);
        for(var i = 0; i < searchForm.length; i++)
        {
            gs_dblog(DEBUG_LEVEL.DEBUG, "inputEventHandlers: Form" + i + ": " + searchForm[i].nodeName +
                       "\n\tlabel: " + searchField[0].textContent +
                       "\n\tonsubmit: " + searchField[0].onsubmit
                      );

            searchForm[i].removeEventListener('submit',this.inputEventHandler,false);
            searchForm[i].removeEventListener('focus',this.inputEventHandler,false);
            searchForm[i].addEventListener('submit',this.inputEventHandler,false);
            searchForm[i].addEventListener('focus',this.inputEventHandler,false);
        }
*/
    },


    handleMutation: function()
    {
        if(this.mutationTimer !== null)
        {
            clearTimeout(this.mutationTimer);
        }
        
        this.mutationTimer = setTimeout(function() {
            gs_dblog(DEBUG_LEVEL.DEBUG, "Handle mutations");
            var elements = document.getElementsByTagName('a');
            for (var i = 0; i < elements.length; ++i)
            {
                elements[i].removeAttribute('onmousedown');
            }
            DilutedSearch.initEventHandlers();
            DilutedSearch.mutationTimer = null;
        }, 50);
    },

    /* Remove google redirect from returned search results */
    removeGoogleRedirect: function()
    {
        var observer = new  MutationObserver(function(mutations) {                   
            gs_dblog(DEBUG_LEVEL.DEBUG, "#Mutations: " + mutations.length);
            var needHandling = false;
/*
            for(var k = 0; k < mutations.length; k++)
            {
                var mutation = mutations[k];
                var text = "";
                var att = mutation.target.attributes
                for(var i = 0; i < att.length; i++)
                {
                    text += att[i].name + "->" + att[i].value + "|";
                }
                gs_dblog(DEBUG_LEVEL.DEBUG, "Mutation Type:" + mutation.type + " " + mutation.addedNodes + " " + mutation.removedNodes + " " + mutation.target.nodeName + " attributes: " + text);
                var children = mutation.target.childNodes;
                gs_dblog(DEBUG_LEVEL.DEBUG, "#ChildNodes: " + children.length);
                for(var i = 0; i < children.length; i++)
                {
                    gs_dblog(DEBUG_LEVEL.DEBUG, "\tChild: " + children[i].nodeName);
                }
            }
*/
            for(var k = 0; k < mutations.length && !needHandling; k++)
            {
                if(mutations[k].target.childNodes.length > 0)
                {
                    needHandling = true;
                }
            }
          
            gs_dblog(DEBUG_LEVEL.DEBUG, "Triggered mutations: " + needHandling);
            
            if(needHandling)
            {
                DilutedSearch.handleMutation();
            }
        });

        gs_dblog(DEBUG_LEVEL.INFO, "removeGoogleRedirect: Observer is " + observer);
        var list = document.body;
        observer.observe(list, {
            childList: true, 
            subtree: true
        });
    },

    /* for testing */
    doSearch: function(e)
    {
        gs_dblog(DEBUG_LEVEL.INFO, "doSearch: '" + e + "'");
        //var searchField = document.getElementsByTagName('input');
        var searchField = document.querySelectorAll("input[type=text]");
        gs_dblog(DEBUG_LEVEL.DEBUG, "doSearch: Found input " + searchField.length);
        if(searchField.length > 0)
        {
            gs_dblog(DEBUG_LEVEL.DEBUG, "doSearch " + searchField[0].nodeName);
            searchField[0].value = e;
            //searchField[0].focus();
            //fireKey(searchField[0], 40);
        }
    }
};

/* port msg handler */
self.port.on("MainToGS", function(e) {
    // Handle the event
    gs_dblog(DEBUG_LEVEL.DEBUG, "port.on MainToGS " + e);
});

/* Dynamic debugging message handler */
self.port.on("MainToGSDynamicDebug", function(e) {
    // Handle the event
    current_gs_debug_level = e;
    console.log("GS port.on MainToGSDynamicDebug debug level changed to " + e);
});

/* for testing */
function probeGoogle(e)
{
    // right mouse button
    /*if(e.which != 3)
      {
      return;
      }
    */
    try
    {
        //DilutedSearch.doSearch("fruit");

        gs_dblog(DEBUG_LEVEL.DEBUG, "probeGoogle: Lookup Searchfield input:");
        var searchField = document.querySelectorAll("input[type=text]");

        gs_dblog(DEBUG_LEVEL.DEBUG, "probeGoogle: Found Searchfield " + searchField.length);

        for(var i = 0; i < searchField.length; i++)
        {
            gs_dblog(DEBUG_LEVEL.DEBUG, "probeGoogle: field" + i + " :" + searchField[i].nodeName +
                        "\n\tlabel: " + searchField[i].textContent + 
                        "\n\tKeyup: " + searchField[i].onkeyup + 
                        "\n\tKeydown: " + searchField[0].onkeydown);

            if(i == 0)
            {
                searchField[0].value = "ipad";
            }
        }

        if(searchField.length == 0)
        {
            gs_dblog(DEBUG_LEVEL.WARNING, "probeGoogle: Failed to locate search field");
        }

        ////////////////////
        gs_dblog(DEBUG_LEVEL.DEBUG, "\nprobeGoogle: Lookup searchButton button:");
        var searchBtn = document.querySelectorAll("button");
        gs_dblog(DEBUG_LEVEL.DEBUG, "probeGoogle: found searchButtons: " + searchBtn.length);
        for(var i = 0; i < searchBtn.length; i++)
        {
            gs_dblog(DEBUG_LEVEL.DEBUG, "probeGoogle: button" + i + " :" + searchBtn[i].nodeName + "\n" +
                        "\tlabel: " + searchBtn[i].textContent + "\n" +
                        "\tonclick: " + searchBtn[i].onclick);
        }

        ///////////////////////
        gs_dblog(DEBUG_LEVEL.DEBUG, "\nprobeGoogle: Lookup searchForm form");
        searchForm = document.querySelectorAll("form");
        gs_dblog(DEBUG_LEVEL.DEBUG, "probeGoogle: Found searchForm " + searchForm.length);
        for(var i = 0; i < searchForm.length; i++)
        {
            gs_dblog(DEBUG_LEVEL.DEBUG, "probeGoogle: Form" + i + ": " + searchForm[i].nodeName +
                        "\n\tlabel: " + searchForm[i].textContent +
                        "\n\tid: " + searchForm[i].id +
                        "\n\tmethod: " + searchForm[i].method +
                        "\n\taction: " + searchForm[i].action +
                        "\n\tonsubmit: " + searchForm[i].onsubmit
                       );
            if(i == 0)
            {
                //searchForm[i].submit();
            }
        }

        /////////////////////////
        var elements = document.getElementsByTagName('a');
        gs_dblog(DEBUG_LEVEL.DEBUG, "probeGoogle: " + document.URL + " has a total link of " + elements.length); 
        for (var i = 0; i < elements.length; ++i)
        {
            //gs_dblog(DEBUG_LEVEL.DEBUG, "probeGoogle: link-" + i + ": " + elements[i].href);
        }
        //gs_dblog(DEBUG_LEVEL.DEBUG, "probeGoogle: gbar logger: " + window.gbar.logger);
        //gs_dblog(DEBUG_LEVEL.DEBUG, "probeGoogle: gbar logger il: " + window.gbar.logger.il);

        //////////////////////////
        if(e.which == 3)
        {
            var msg = {};
            msg.type = "debug";
            self.port.emit("GSToMain", JSON.stringify(msg));
        }
    }
    catch(e)
    {
        gs_dblog(DEBUG_LEVEL.ERROR, "ProbeGoogle Error: " + e.message);
    }
}

document.addEventListener("DOMContentLoaded", DilutedSearch.main, false);
//document.addEventListener("mousedown", probeGoogle, false);
