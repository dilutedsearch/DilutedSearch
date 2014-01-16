/*
This file is part of DilutedSearch.

Copyright (C) 2013 2014 ZhongYi Jin <pipilu8@icloud.com> and Aaron Jow

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

var current_keywordsLoader_debug_level = DEBUG_LEVEL.DEBUG;

function keywordsLoader_dblog(level, m)
{
    if (level <= current_keywordsLoader_debug_level)
    {
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

var KeywordsLoader = {
    
    processContent: function()
    {
        var msg = [];
        var keywords  = [];
        var keywordLinks = [];

        /* Medicine */
        if (document.URL == 'https://en.wikipedia.org/wiki/Wikipedia:WikiProject_Medicine/Popular_pages')
        {
            keywordLinks = document.querySelectorAll("div#mw-content-text td > a[title]:first-child");
            for (var i = 0; i < keywordLinks.length; ++i)
            {
                keywords[i] = keywordLinks[i].textContent.toLowerCase();
            }
            
            if(keywords.length > 0)
            {
                msg.push({name: 'Medicine', source: document.URL, data: keywords})
            }
        }
        else if(document.URL == 'https://en.wikipedia.org/wiki/List_of_World_Health_Organization_Essential_Medicines')
        {
            keywordLinks = document.querySelectorAll("div#mw-content-text ul > li > a[title]:first-child");
            for (var i = 0; i < keywordLinks.length; ++i)
            {
                keywords[i] = keywordLinks[i].textContent.toLowerCase();
            }
            
            if(keywords.length > 0)
            {
                msg.push({name: 'Medicine', source: document.URL, data: keywords})
            }
        }
        else if(document.URL == 'https://en.wikipedia.org/wiki/List_of_bestselling_drugs')
        {
            keywordLinks = document.querySelectorAll("div#mw-content-text tr > td:nth-child(2), tr > td:nth-child(3) > a[title]:first-child, tr > td:nth-child(7)");
            for (var i = 0; i < keywordLinks.length; ++i)
            {
                keywords[i] = keywordLinks[i].textContent.toLowerCase();
            }
            
            if(keywords.length > 0)
            {
                msg.push({name: 'Medicine', source: document.URL, data: keywords})
            }
        }
        /* Popular */
        else if (document.URL == 'https://en.wikipedia.org/wiki/User:West.andrew.g/Popular_pages')
        {
            keywordLinks = document.querySelectorAll("div#mw-content-text td > a[title]:first-child");
            for (var i = 1; i < keywordLinks.length; ++i)
            {
                keywords.push(keywordLinks[i].textContent.toLowerCase());
            }
            
            if(keywords.length > 0)
            {
                msg.push({name: 'Popular', source: document.URL, data: keywords})
            }
        }
        else if (document.URL == 'https://en.wikipedia.org/wiki/Wikipedia:What_Google_liked')
        {
            keywordLinks = document.querySelectorAll("div#mw-content-text ul > li > a[title]:first-child");
            for (var i = 2; i < keywordLinks.length; ++i)
            {
                keywords.push(keywordLinks[i].textContent.toLowerCase());
            }
            
            if(keywords.length > 0)
            {
                msg.push({name: 'Popular', source: document.URL, data: keywords})
            }
        }
        else if(document.URL == 'https://en.wikipedia.org/wiki/Wikipedia:Top_10_Google_hits,_A-K' || 
                document.URL == 'https://en.wikipedia.org/wiki/Wikipedia:Top_10_Google_hits,_L-Z')
        {
            keywordLinks = document.querySelectorAll("div#mw-content-text ol > li > a[title]:first-child");
            for (var i = 0; i < keywordLinks.length; ++i)
            {
                keywords[i] = keywordLinks[i].textContent.toLowerCase();
            }
            
            if(keywords.length > 0)
            {
                msg.push({name: 'Popular', source: document.URL, data: keywords})
            }
        }

        if (msg.length > 0)
        {
            self.port.emit("KLToMain", JSON.stringify(msg));
        }
    }
};

/* Dynamic debugging message handler */
self.port.on("MainToKLDynamicDebug", function(e) {
    // Handle the event
    current_keywordsLoader_debug_level = e;
    console.log("GS port.on MainToKLDynamicDebug debug level changed to " + e);
});

/* main function */
KeywordsLoader.processContent();
