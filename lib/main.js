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

//"use strict";
var {Cu} = require("chrome");
Cu.import("resource://gre/modules/Services.jsm");

var DEBUG_LEVEL = {
    NONE : 0,
    ERROR : 1,
    WARNING : 2,
    INFO : 3,
    DEBUG : 4
}

function main_dblog(level, m)
{
    if (level <= SearchPrefs.current_main_debug_level)
    {
        if (level == DEBUG_LEVEL.NONE)
        {
            console.log("Shouldn't have ANY messages with debug level NONE");
        }
        if (level == DEBUG_LEVEL.ERROR)
        {
            console.log("E/MAIN " + m);
        }
        if (level == DEBUG_LEVEL.WARNING)
        {
            console.log("W/MAIN " + m);
        }
        if (level == DEBUG_LEVEL.INFO)
        {
            console.log("I/MAIN " + m);
        }
        if (level == DEBUG_LEVEL.DEBUG)
        {
            console.log("D/MAIN " + m);
        }
    }
}

function checkURL(tab)
{
    main_dblog(DEBUG_LEVEL.INFO, "checkURL " + tab.url);
    var href = tab.url;
    var handler = null;

    // Google
    if (!(/\.(js|css|xml|rss|pdf)$/.test(href)) && !(/complete\/search/.test(href)) && ( /^http[s]?:\/\/.*?\.(google|googleproxy)\.[a-z\.]+\//.test(href) || /^http:\/\/(64\.233\.161\.99|64\.233\.161\.104|64\.233\.161\.105|64\.233\.161\.147|64\.233\.167\.99|64\.233\.167\.104|64\.233\.167\.147|64\.233\.171\.99|64\.233\.171\.104|64\.233\.171\.105|64\.233\.171\.147|64\.233\.179\.99|64\.233\.179\.99|64\.233\.183\.99|64\.233\.183\.104|64\.233\.185\.99|64\.233\.185\.104|64\.233\.187\.99|64\.233\.187\.104|64\.233\.189\.104|66\.102\.7\.104|66\.102\.7\.105|66\.102\.7\.147|66\.102\.9\.104|66\.102\.11\.104|216\.239\.37\.104|216\.239\.37\.105|216\.239\.37\.147|216\.239\.39\.104|216\.239\.53\.104|216\.239\.57\.98|216\.239\.57\.104|216\.239\.57\.105|216\.239\.57\.147|216\.239\.59\.104|216\.239\.59\.105|216\.239\.63\.104|66\.249\.81\.99)\//.test(href) ))
    {
        handler = runGoogleScript(tab);

        if(handler !== null)
        {
            handler.port.emit("MainToGS", "Message from the add-on");
            handler.port.emit("MainToGSDynamicDebug", SearchPrefs.current_main_debug_level);
            handler.port.on("GSToMain", function handleEvent(msg) {
                main_dblog(DEBUG_LEVEL.INFO, "port.on GSToMain:" + msg);
                var forward = -1;
                var e;
                try
                {
                    e = JSON.parse(msg);
                    if(e.type == "keydown" && e.keyCode)
                    {
                        main_dblog(DEBUG_LEVEL.DEBUG, "port.on GSToMain Key: " + e.keyCode);
                    }
                    else if(e.type == "change")
                    {
                        forward = 0;
                    }
                    else if(e.type == "debug")
                    {
                        forward = 0;
                    }
                    
                    if(forward >= 0)
                    {
                        SearchManager.updateSearchList(new Date().getTime(),  new Date().getTime() + SearchPrefs.searchInterval * 1000, SearchPrefs.numSearches, e.search);
                        //SearchManager.search(e.search);
                    }
                }
                catch (exc)
                {
                    main_dblog(DEBUG_LEVEL.ERROR, "port.on GSToMain Forward to Hidden Window failed: " + forward + " " + msg);
                    throw exc;
                }
            });
        }
    }
}

function runGoogleScript(tab)
{
    var ghandler = tab.attach({
        contentScriptFile: require("sdk/self").data.url("gs.js")
    });
    main_dblog(DEBUG_LEVEL.INFO, "runGoogleScript: Attached google js");
    return ghandler;
}


/* PageWorker Constructor */
function PageWorker(id)
{
    this.id = id;
    this.isActive = true;
    
    var dsScript =
        "DGS_DummySearch.id = " + this.id + ";\n" +
        "DGS_DummySearch.init();\n" +
        "self.port.on('searchMsg', function(e) {DGS_DummySearch.dblog('DummySearch port.on: Got searchMsg: ' + e); DGS_DummySearch.doSearch(e);});" +
        "self.port.on('DummySearchDynamicDebug', function(e) {DGS_DummySearch.dynamicDebug(e);})";
    //main_dblog(DEBUG_LEVEL.DEBUG, "script: [" + dsScript + "]");

    this.worker = require("page-worker").Page({
        contentScriptFile: require("sdk/self").data.url("dgs.js"),
        contentScript: dsScript,
        contentScriptWhen: "end",
        //contentURL: "https://www.google.com/"
        contentURL: "https://www.google.com/webhp?complete=0"
    });
    
    // closure to handle messages
    function getMsgHandler(pageWorker)
    {
        return function(msg)
        {
            var e = JSON.parse(msg);
            main_dblog(DEBUG_LEVEL.DEBUG, "pageWorker handleEvent: dgsMsg" + msg);
            if(e.cmd == "destroy")
            {
                // destroy via the store
                if(PageWorkerStore.removeItems([pageWorker.id], true) == 0)
                {
                    // if not in the store, destroy it
                    pageWorker.destroy();
                }
            }
        }
    };

    // register msg handler
    this.worker.port.on("DGSToMain", getMsgHandler(this));
    
    // destroy the internal worker
    this.destroy = function()
    {
        if(this.isActive)
        {
            this.isActive = false;
            this.worker.destroy()
            main_dblog(DEBUG_LEVEL.DEBUG, "pageWorker destroied:" + this.id);
        }
    };
}

/* Pageworker store. This is where pageworkers are kept and managed*/
var PageWorkerStore = {
    pageWorkerList: [],
    nextPageWorkerID: 0,
    activeIndex: 0,
    size: 3,
    
    init: function(size)
    {
        this.resize(size);
        this.createItems(this.size);
    },
    
    resize: function(size)
    {
        this.size = size * 2;
    },
    
    createItems: function(num)
    {
        for(var i = 0; i < num; i++)
        {
            // create n hidden pages      
            this.pageWorkerList.push(new PageWorker(this.nextPageWorkerID));
            this.nextPageWorkerID++;
        }
        main_dblog(DEBUG_LEVEL.INFO,"Number of new pageworkers created: "+ num + " Total:" + this.pageWorkerList.length);
    },

    removeItems: function(ids, destroy)
    {
        var removed = 0;
        for(var i = 0; i < ids.length; i++)
        {
            for(var j = 0; j < this.pageWorkerList.length; j++)
            {
                if(ids[i] == this.pageWorkerList[j].id)
                {
                    if(destroy)
                    {
                        this.pageWorkerList[j].destroy();
                    }
                    this.pageWorkerList.splice(j, 1);
                    main_dblog(DEBUG_LEVEL.DEBUG,"remove PageWorker from store: " + ids[i]);
                    removed++;
                }
            }
        }

        var missings = this.size - this.pageWorkerList.length;
        if(missings > 0)
        {
            this.createItems(missings);
        }
        return removed;
    },
    
    // spread the load
    getActiveItem: function()
    {
        if(this.pageWorkerList.length == 0)
        {
            this.createItems(1);
        }
        var activeWorker = this.pageWorkerList[this.activeIndex];
        this.activeIndex = (this.activeIndex + 1) % this.pageWorkerList.length;
        return activeWorker;
    },

    getAllItems: function()
    {
        return this.pageWorkerList;
    },

    clear: function()
    {
        var pw = null;
        while(this.pageWorkerList.length > 0)
        {
            pw = this.pageWorkerList.pop();
            pw.destroy();
        }
    }
}

/* Search Manager */
var SearchManager = {
    searchVector: [],
    searchTimer: {state: 0, id: 0},
    fastRequest: require("sdk/request").Request,
    querystring: require("sdk/querystring"),
    pendingSearches: {},
    searchHistory: {},

    init: function()
    {
        var ss = require("sdk/simple-storage");
        if(!ss.storage.searchHistory)
        {
            ss.storage.searchHistory = {numSearches: [0, 0, 0, 0], mostRecentSearches: []};
        }

        if(ss.storage.searchHistory.numSearches.length != 4)
        {
            this.clear();
            this.init();
        }
        else
        {
            this.searchHistory = ss.storage.searchHistory;
        }
    },

    clear: function()
    {
        var ss = require("sdk/simple-storage");
        if(ss.storage.searchHistory)
        {
            delete ss.storage.searchHistory;
            this.searchHistory = null;
        }
    },
    
    search: function(query)
    {
        this.addPendingSearch(query);
        if(Math.random() <= SearchPrefs.fastRequestRate)
        {
            var url = "https://www.google.com/search?" + this.querystring.stringify({complete: 0, q: query});
            main_dblog(DEBUG_LEVEL.INFO, "Search with fastRequest:" + url);

            // closure to handle fast request response
            function getResponseHandler(url)
            {
                return function(response)
                {
                    SearchManager.removePendingSearch(url);
                }
            };

            this.fastRequest({
                url: url,
                onComplete: getResponseHandler(url)
            }).get();
        }
        else
        {
            var body = {type: "search", search: query};
            this.sendMsgToActiveItem("searchMsg", body);
        }
    },

    // Given that the actual search starts at time t, 
    // we want to generate n searches of a uniform random
    // distribution in the window [ts, te]
    // such that ts < t < te 
    // (time is in milliseconds)
    updateSearchList: function(ts, te, n, query)
    {
        var keywordsList = KeywordsManager.getRandomKeywordsFromMultipleCategories(SearchPrefs.getSearchCategories(), n);
        main_dblog(DEBUG_LEVEL.INFO, "updateSearchList Schedule: " + ts + " " + te + " " + n + " " + query + " " + keywordsList.length);  

        if(keywordsList.length < n)
        {
            main_dblog(DEBUG_LEVEL.DEBUG, "updateSearchList not able to obtain keywords");
            return;
        }

        for(var i = 0; i < n; i++)
        {
            r =  Math.round(Math.random() * (te - ts) + ts);
            var slot = {time: r, query: keywordsList[i]};
            this.searchVector.push(slot)
        }
        
        // sort slots
        this.searchVector.sort(function(x, y){return x.time - y.time});

        // log
        if(SearchPrefs.logActualSearch || query == "background-ds")
        {
            var type = 0;
            if(query == "background-ds")
            {
                type = 2;
            }
            this.logPendingSearch(query, type, keywordsList);
        }

        // schedule
        this.scheduleNextSearch();
    },

    stop: function()
    {
        if(this.searchTimer.state == 1)
        {
            require("sdk/timers").clearTimeout(this.searchTimer.id);
            this.searchTimer.state = 0;
            this.searchTimer.id = 0;
        }
    },

    scheduleNextSearch: function()
    {
        // stop running searchTimer
        this.stop();
        main_dblog(DEBUG_LEVEL.DEBUG, "scheduleNextSearch: remaining items=" + this.searchVector.length);
        
        // schedule the next search event
        if(this.searchVector.length > 0)
        {
            // in milliseconds
            var ct = new Date().getTime();
            var offset = this.searchVector[0].time - ct;
            if(offset < 0)
            {
                offset = 0;
            }
            
            this.searchTimer.id = require("sdk/timers").setTimeout(function callback(e){
                var ct = new Date().getTime();
                SearchManager.searchTimer.state = 0;
                SearchManager.searchTimer.id = 0;
                var slot = SearchManager.searchVector.shift();
                main_dblog(DEBUG_LEVEL.DEBUG, "scheduleSearch Search event fired at: " + ct + " for slot: " + slot.time + " " + slot.query);
                SearchManager.search(slot.query);
                SearchManager.scheduleNextSearch();
            }, offset);

            SearchManager.searchTimer.state = 1;
        }
        else
        {
            main_dblog(DEBUG_LEVEL.DEBUG, "scheduleNextSearch: no more items to schedule");
        }
    },

    sendMsgToActiveItem: function(msgID, msg)
    {
        var page = PageWorkerStore.getActiveItem();
        main_dblog(DEBUG_LEVEL.DEBUG, "Prepare to send" + msgID + " to: " + page.id + ": " + JSON.stringify(msg));
        try
        {
            page.worker.port.emit(msgID,  JSON.stringify(msg));
        }
        catch(ex)
        {
            // the page worker is frozen before being destroied
            main_dblog(DEBUG_LEVEL.DEBUG, "Active pageworker " + page.id + " is frozen. Retrying...");
            // destroy will happen upon notification from the page worker
            var num = PageWorkerStore.removeItems([page.id], false);
            //assert(num == 1);
            this.sendMsgToActiveItem(msgID, msg);
        }
    },

    broadcastMsg: function(msgID, msg)
    {
        var page = null;
        var pwList = PageWorkerStore.getAllItems();
        main_dblog(DEBUG_LEVEL.DEBUG, "Prepare to broadcast" + msgID + " : " + JSON.stringify(msg));

        for(var i = 0; i < pwList.length; i++)
        {
            page = pwList[i];
            try
            {
                page.port.emit(msgID, JSON.stringify(msg));
            }
            catch(ex)
            {
                var num = PageWorkerStore.removeItems([page.id], false);
                //assert(num == 1);
            }
        }
    },

    logPendingSearch: function(query, type, data)
    {
        this.searchHistory.numSearches[type]++;
        if(this.searchHistory.mostRecentSearches.length > SearchPrefs.searchHistorySize)
        {
            this.searchHistory.mostRecentSearches.shift();
        }
        this.searchHistory.mostRecentSearches.push({time: new Date().getTime(), query: query, type: type, data: data});
        DSGUIManager.updateSearchHistory(this.searchHistory, false);
    },
    
    addPendingSearch: function(query)
    {
        this.logPendingSearch(query, 1, null);

        if(query in this.pendingSearches)
        {
            this.pendingSearches[query] = this.pendingSearches[query] + 1;
        }
        else
        {
            this.pendingSearches[query] = 1;
        }
    },

    hasPendingSearch: function (url)
    {
        return (url in this.pendingSearches);
    },
    
    removePendingSearch: function (url)
    {
        if(url in this.pendingSearches)
        {
            this.pendingSearches.url = this.pendingSearches.url - 1;
            if(this.pendingSearches.url  == 0)
            {
                delete this.pendingSearches.url;
            }
        }
    }
}
 
// keywords manager
var KeywordsManager = {
    categoryList: {},
    worker: null,
    initialized: false,
    firstRun: false, 
    scheduledDownloads: [],
    
    init: function()
    {
        if(!this.initialized)
        {
            var ss = require("sdk/simple-storage");
            //this.clear();
            
            if (!ss.storage.categoryList)
            {
                ss.storage.categoryList = {};
                this.firstRun = true;
            }
            
            if(!ss.storage.scheduledDownloads)
            {
                ss.storage.scheduledDownloads = [];
            }
            
            this.categoryList = ss.storage.categoryList;
            this.scheduledDownloads = ss.storage.scheduledDownloads;
            this.initialized = true;
        }
    },

    download: function()
    {
        if(this.scheduledDownloads.length > 0)
        {
            var d = this.scheduledDownloads.shift();
            this.createCategory(d.source, d.js);
        }
    },
    
    scheduleDownload: function()
    {
        if(this.scheduledDownloads.length > 0)
        {
            main_dblog(DEBUG_LEVEL.INFO, "KeywordsManager schedule download");            
            DSGUIManager.showNotification('Downloading Diluted Search Dictionary', this.scheduledDownloads[0].source);
            
            require("sdk/timers").setTimeout(function callback(e){
                KeywordsManager.download();
            }, 0);
            
            return true;
        }
        else
        {
            if(this.firstRun)
            {
                this.firstRun = false;
                SearchManager.updateSearchList(new Date().getTime(),  new Date().getTime() + SearchPrefs.searchInterval * 1000, SearchPrefs.numSearches, "background-ds");
            }
            return false;
        }
    },

    checkUpdate: function()
    {
        var numCategories = 0;
        for(var category in this.categoryList)
        {
            numCategories = numCategories + 1;
            for(var source in this.categoryList[category])
            {
                var updateTime = this.categoryList[category][source].time;
                var curTime = new Date().getTime();
                if((curTime - updateTime) > (7 + Math.random()) * 24 * 3600 * 1000)
                {
                    this.scheduledDownloads.push({source: source, js: this.categoryList[category][source].js});
                    //this.createCategory(source, this.categoryList[category][source].js);
                }
            }
        }

        if(numCategories == 0)
        {
            var urls = [
                'https://en.wikipedia.org/wiki/List_of_World_Health_Organization_Essential_Medicines',
                'https://en.wikipedia.org/wiki/List_of_bestselling_drugs',
                'https://en.wikipedia.org/wiki/User:West.andrew.g/Popular_pages',
                'https://en.wikipedia.org/wiki/Wikipedia:What_Google_liked',
                'https://en.wikipedia.org/wiki/Wikipedia:Top_10_Google_hits,_A-K',
                'https://en.wikipedia.org/wiki/Wikipedia:Top_10_Google_hits,_L-Z',
                'https://en.wikipedia.org/wiki/Wikipedia:WikiProject_Medicine/Popular_pages'               
            ];           

            for(var i = 0; i < urls.length; i++)
            {
                this.scheduledDownloads.push({source: urls[i], js: 'keywordsLoader.js'});
            }                       
        }

        // schedule updates, alternatively, we can do this at idle
        //for(var i = 0; i < this.scheduledDownloads.length; i++)
        {
            this.scheduleDownload();
        }

        // check update periodically
        require("sdk/timers").setInterval(function callback(e){
            KeywordsManager.checkUpdate();
        }, 24 * 3600 * 1000);
    },

    createCategory: function(url, js)
    {
        this.worker = require("page-worker").Page({
            contentScriptFile: require("sdk/self").data.url(js),
            contentScriptWhen: "end",
            contentURL: url
        });
     
        main_dblog(DEBUG_LEVEL.INFO, url + " " + js+ " " + this.worker);   
        // closure to handle keywordsLoader callback
        function getKLHandler(kwManager, worker, js)
        {
            return function(msg)
            {
                var e = JSON.parse(msg);
                //main_dblog(DEBUG_LEVEL.DEBUG, "KLHandler: KLMsg" + msg);
                for (var i = 0; i < e.length; i++)
                {                     
                    kwManager.updateCategory(e[i].name, e[i].source, e[i].data, js);
                }
                worker.destroy();
                // sequence the downloads to avoid slowing down
                kwManager.scheduleDownload();
                // Testing: Schedule some background searches
                // SearchManager.updateSearchList(new Date().getTime(),  new Date().getTime() + 20 * 1000, 10, "fruit bar");
            }
        };
        // register msg handler
        this.worker.port.on("KLToMain", getKLHandler(this, this.worker, js));
    },

    updateCategory: function(name, source, data, js)
    {
        main_dblog(DEBUG_LEVEL.INFO, "Added to Category " + name + " " + source + " " + js + " " + data.length);
        if (!(name in this.categoryList))
        {
            this.categoryList[name] = {};
        }  
        DSGUIManager.showNotification('Building Diluted Search Dictionary', name);
        this.categoryList[name][source] = {time: new Date().getTime(), js: js, data: data};
    },

    getNumberOfSourcesFromCategory: function(categoryName)
    {
        var num = 0;
        if (categoryName in this.categoryList)
        {
            for (var source in this.categoryList[categoryName])
            {
                num++;
            }
        }
        return num;
    },

    getRandomKeywordsFromCategory: function(categoryName, numKeyworks)
    {
        this.init();
        var randomKeywordsList = [];
        var numSources = this.getNumberOfSourcesFromCategory(categoryName);
        if(numSources > 0)
        {
            var numPerSource = Math.ceil(numKeyworks / numSources);            
            for (var source in this.categoryList[categoryName])
            {
                var keywordsList = this.categoryList[categoryName][source].data;
                for (var i = 0; i < numPerSource && randomKeywordsList.length < numKeyworks; i++)
                {
                    r = Math.round(Math.random() * keywordsList.length);
                    randomKeywordsList.push(keywordsList[r]);
                }
            }
        }
        else
        {
            main_dblog(DEBUG_LEVEL.WARNING, "Category:" + categoryName + " is not available");
        }
        return randomKeywordsList;
    },

    getRandomKeywordsFromMultipleCategories: function(categories, numKeywords)
    {
        var numCat = 0;
        var numPerCat = Math.ceil(numKeywords/numCat);
        var randomKeywordsList = [];
        var remain = numKeywords;
        var collect = 0;

        for(var i = 0; i < categories.length; i++)
        {
            if(this.getNumberOfSourcesFromCategory(categories[i]) > 0)
            {
                numCat++;
            }
        }

        for(var i = 0; i < numCat; i++)
        {
            if(remain > numPerCat)
            {
                collect = numPerCat;
            }
            else
            {
                collect = remain;
            }
       
            randomKeywordsList = randomKeywordsList.concat(this.getRandomKeywordsFromCategory(categories[i], collect));
            remain = remain - collect;
        }
        return randomKeywordsList;
    },

    clear: function()
    {
        var ss = require("sdk/simple-storage");
        delete ss.storage.categoryList;
        delete ss.storage.scheduledDownloads;
        main_dblog(DEBUG_LEVEL.INFO, "KeywordsManager cleared all existing categories");
    }
}

var ProactiveSearchManager = {
    repeatTimer: {id: null},
    searchTimer: {id: null},
    searchStates: {period: 0, limit:0, quota:0, quotaStartTime: 0},
    
    /* 
     * Schedule to perform 'numSearches' every 'period' time (in mili-seconds).
     * Just like in real search, each proactive search will trigger a number of diluted searches
     */
    start: function(period, numProactiveSearches)
    {
        this.stop();
        if(period > 0 && numProactiveSearches > 0)
        {
            this.searchStates.period = period;
            this.searchStates.limit = numProactiveSearches;
            this.searchStates.quota = 0;
            this.searchStates.quotaStartTime = 0;
            
            main_dblog(DEBUG_LEVEL.INFO, "ProactiveSearchManager is started: " + JSON.stringify(this.searchStates));            
            this.repeatTimer.id = require("sdk/timers").setInterval(function callback(e){
                ProactiveSearchManager.resetQuota();
            }, this.searchStates.period);
            this.resetQuota();
            SearchManager.updateSearchList(new Date().getTime(),  new Date().getTime() + SearchPrefs.searchInterval * 1000, SearchPrefs.numSearches, "background-ds");
        }
    },
    
    stop: function()
    {
        this.stopTimer(this.repeatTimer);
        this.stopTimer(this.searchTimer);
        main_dblog(DEBUG_LEVEL.DEBUG, "ProactiveSearchManager is stopped");
    },
    
    schedule: function()
    {
        this.searchTimer.id = null;        
        if(this.getQuota() > 0)
        {
            this.consumeQuota();
            var ts = new Date().getTime();
            var te = this.searchStates.quotaStartTime + this.searchStates.period;     
            // todo: what distribution to use?
            var offset = Math.round(Math.random() * (te - ts));
            
            if(offset < 0)
            {
                offset = 0;
            }
            
            main_dblog(DEBUG_LEVEL.DEBUG, 'ProactiveSearchManager scheduled in ' + offset);
            this.searchTimer.id = require("sdk/timers").setTimeout(function callback(e){
                main_dblog(DEBUG_LEVEL.DEBUG, "ProactiveSearchManager timer fired");
                SearchManager.updateSearchList(new Date().getTime(),  new Date().getTime() + SearchPrefs.searchInterval * 1000, SearchPrefs.numSearches, "background-ds");
                ProactiveSearchManager.schedule();
            }, offset);
        }
    },

    resetQuota: function()
    {
        this.searchStates.quota = this.searchStates.quota + this.searchStates.limit;
        this.searchStates.quotaStartTime = new Date().getTime();

        main_dblog(DEBUG_LEVEL.DEBUG, "ProactiveSearchManager reset quota: " + JSON.stringify(this.searchStates));
        if(this.searchTimer.id === null)
        {
            this.schedule();
        }
    },

    getQuota: function()
    {
        return this.searchStates.quota;
    },
    
    consumeQuota: function()
    {
        this.searchStates.quota--;
    },

    getNumScheduledSearches: function()
    {
        var quota = this.getQuota();
        if(this.searchTimer.id !== null)
        {
            quota = quota + 1;
        }
        var num =  quota * SearchPrefs.numSearches;
        return num;
    },

    stopTimer: function(timer)
    {
        if(timer.id !== null)
        {
            require("sdk/timers").clearTimeout(timer.id);
            timer.id = null;
        }
    }
}

// The details of the engine to add
var ENGINE_DETAILS = {
    name: "Diluted Search",
    iconURL: "data:image/png;base64,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",
    alias: "diluted-search",
    description: "Diluted Google Search",
    method: "GET", // The HTTP request method
    url: "",

    init: function()
    {
        this.url = SearchPrefs.searchURLPrefix + "{searchTerms}"
    }
};

var SearchPrefs = {
    current_main_debug_level: 2,
    numPageWorkers: 0,
    searchInterval: 0,
    numSearches: 0,
    fastRequestRate: 0.8,
    searchHistorySize: 1000,
    searchURLPrefix: '',
    numQueriesInSearchURL: 0,
    previousSearchbarURI: '',
    uuid: null,
    keywordsCategories: {},
    logActualSearch: false,

    init: function()
    {
        this.initUUID();
        this.searchURLPrefix = 'https://www.google.com/search?complete=' + this.uuid + '&q=';      

        // Dynamic debugging
        require("sdk/simple-prefs").on("debugLevel", SearchPrefs.onDebugLevelChange);
        this.onDebugLevelChange('debugLevel');
        main_dblog(DEBUG_LEVEL.INFO, "SearchPrefs.init: Initial debug level is " + this.current_main_debug_level);

        // If number of parallel functions is changed, run this function
        require("sdk/simple-prefs").on("pageWorkers", SearchPrefs.onPageWorkersChange);
        this.onPageWorkersChange('pageWorkers');
        main_dblog(DEBUG_LEVEL.INFO, "SearchPrefs.init: Initial Number of page workers is " + this.numPageWorkers);

        // Search interval control
        require("sdk/simple-prefs").on("searchInterval", SearchPrefs.onSearchIntervalChange);
        this.onSearchIntervalChange('searchInterval');
        main_dblog(DEBUG_LEVEL.INFO, "SearchPrefs.init: Initial search interval is " + this.searchInterval + " seconds");

        // search number control
        require("sdk/simple-prefs").on("numSearches", SearchPrefs.onNumSearchesChange);
        this.onNumSearchesChange('numSearches');
        main_dblog(DEBUG_LEVEL.INFO, "SearchPrefs.init: Initial Number of searches is " + this.numSearches);

        // search categories
        require("sdk/simple-prefs").on("PopularCategory",  SearchPrefs.onSearchCategoryChange);
        require("sdk/simple-prefs").on("MedicineCategory", SearchPrefs.onSearchCategoryChange);
        this.onSearchCategoryChange("PopularCategory");
        this.onSearchCategoryChange("MedicineCategory");
        main_dblog(DEBUG_LEVEL.INFO,"Search Categories: " + JSON.stringify(this.getSearchCategories()));

        // log actual search
        require("sdk/simple-prefs").on("logActualSearch", SearchPrefs.onLogActualSearchChange);
        this.onLogActualSearchChange('logActualSearch');
        main_dblog(DEBUG_LEVEL.INFO, "SearchPrefs.init Log actual search " + this.logActualSearch);

        // show history
        require("sdk/simple-prefs").on("ShowHistory",  SearchPrefs.onShowHistory);

        this.numQueriesInSearchURL = this.searchURLPrefix.match(/=/g).length;
    },

    initUUID: function()
    {
        var ss = require("sdk/simple-storage");
        if (!ss.storage.searchUUID)
        {
            var p1 = (require('sdk/util/uuid').uuid() + '').replace('{', '').replace('}', '');
            var p2 = (require('sdk/util/uuid').uuid() + '').replace('{', '').replace('}', '');

            // never delete this before the unregistration of DS searchbar entry
            ss.storage.searchUUID = p1 + '-' + p2;
        }
        
        this.uuid = ss.storage.searchUUID;
        return this.uuid;
    },

    clear: function()
    {
        var ss = require("sdk/simple-storage");
        if(ss.storage.searchUUID)
        {
            delete ss.storage.searchUUID;
            this.uuid = null;
        }
    },

    // Handler function for if number of parallel searches is changed in
    // Preferences
    onPageWorkersChange: function(prefName)
    {
        var newNumPageWorkers = require("sdk/simple-prefs").prefs["pageWorkers"];
        main_dblog(DEBUG_LEVEL.WARNING, "onPageWorkersChange " + prefName + " was changed to " + newNumPageWorkers);
        main_dblog(DEBUG_LEVEL.WARNING, "onPageWorkersChange old number of searches was " + SearchPrefs.numPageWorkers);
        
        if (newNumPageWorkers <= 0) {
            main_dblog(DEBUG_LEVEL.ERROR, "onPageWorkersChange Can't set number of pageworkers to <= 0, setting to 1 instead");
            newNumPageWorkers = 1;
        }
        
        SearchPrefs.numPageWorkers = newNumPageWorkers;
        PageWorkerStore.resize(SearchPrefs.numPageWorkers);
    },

    // Dynamic debugging
    onDebugLevelChange: function(prefName)
    {
        var newDebugLevel = require("sdk/simple-prefs").prefs["debugLevel"];
        console.log("(global) debugLevelChange " + prefName + " was changed to " + newDebugLevel);
        // Update main's debug level
        SearchPrefs.current_main_debug_level = newDebugLevel;
        SearchManager.broadcastMsg("DummySearchDynamicDebug", newDebugLevel);
    },

    // Search interval control
    onSearchIntervalChange: function(prefName)
    {
        var newSearchInterval = require("sdk/simple-prefs").prefs["searchInterval"];
        main_dblog(DEBUG_LEVEL.WARNING, "onSearchIntervalChange " + prefName + " was changed to " + newSearchInterval);
        main_dblog(DEBUG_LEVEL.WARNING, "onSearchIntervalChange old search interval was " + SearchPrefs.searchInterval);
        SearchPrefs.searchInterval = newSearchInterval;
    },

    onNumSearchesChange: function(prefName)
    {
        var newNumSearches = require("sdk/simple-prefs").prefs["numSearches"];
        main_dblog(DEBUG_LEVEL.WARNING, "onNumSearchesChange " + prefName + " was changed to " + newNumSearches);
        main_dblog(DEBUG_LEVEL.WARNING, "onNumSearchesChange old number of searches was " + SearchPrefs.numSearches);
        SearchPrefs.numSearches = newNumSearches;
    },

    onLogActualSearchChange: function(prefName)
    {
        var logActualSearch = require("sdk/simple-prefs").prefs["logActualSearch"];
        main_dblog(DEBUG_LEVEL.WARNING, "onLogActualSearchChange " + prefName + " was changed to " + logActualSearch);
        main_dblog(DEBUG_LEVEL.WARNING, "onLogActualSearchChange old value was " + SearchPrefs.logActualSearch);
        SearchPrefs.logActualSearch = logActualSearch;
    },

    onSearchCategoryChange: function(prefName)
    {
        var isSelected = require("sdk/simple-prefs").prefs[prefName];
        var category = prefName.replace('Category', '');
        if(isSelected)
        {
            SearchPrefs.keywordsCategories[category] = 1;
        }
        else
        {
            if (category in SearchPrefs.keywordsCategories)
            {
                delete SearchPrefs.keywordsCategories[category]
            }
        }
    },
    
    getSearchCategories: function()
    {
        var list = [];
        for(var category in this.keywordsCategories)
        {
            list.push(category);
        }
        return list;
    },

    onShowHistory: function(prefName)
    {
        DSGUIManager.showHistory();
    }
}

// observer
const {Cc,Ci} = require("chrome");

function makeURI(aURL, aOriginCharset, aBaseURI) {
    var ioService = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
    return ioService.newURI(aURL, aOriginCharset, aBaseURI);
}

function DSObserver()
{
    this.secondaryLevelInit = false;
    this.topics = ['user-interaction-inactive', 'http-on-modify-request'];
}

DSObserver.prototype = {

    observe: function(subject, topic, data) {
        if (topic == "http-on-modify-request")
        {
            var channel = subject.QueryInterface(Ci.nsIHttpChannel);          
            var url = subject.URI.spec;            
            if(channel && url)
            {
                //console.log("Observed URL:" + url + "->" + decodeURIComponent(url));
                if(url.indexOf(SearchPrefs.searchURLPrefix) == 0)
                {
                    var redirectURL = url.replace(SearchPrefs.uuid, '0');
                    main_dblog(DEBUG_LEVEL.DEBUG, "@@@@@@@@ toolbar search:" + url + ' redirect:' + redirectURL);
                    channel.redirectTo(makeURI(redirectURL, null, null));
                    require("sdk/timers").setTimeout(function callback(e){
                        SearchManager.updateSearchList(new Date().getTime(),  
                                                       new Date().getTime() + SearchPrefs.searchInterval * 1000, 
                                                       SearchPrefs.numSearches, 
                                                       (url.substring(url.lastIndexOf('&q=')+3)));
                    }, 0);
                }
            }
        }
        else if(topic == 'user-interaction-inactive')
        {
            main_dblog(DEBUG_LEVEL.DEBUG, "Observing: " + subject + " " + topic + " " + data);
            // secondaryLevel init
            if(!this.secondaryLevelInit)
            {
                this.secondaryLevelInit = true;
                // Initialize the store
                PageWorkerStore.init(SearchPrefs.numPageWorkers);
            }
        }
    },

    register: function() {
        var observerService = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);
        for(var i = 0; i < this.topics.length; i++)
        {
            observerService.addObserver(this, this.topics[i], false);
        }
    },

    unregister: function() {
        var observerService = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);
        for(var i = 0; i < this.topics.length; i++)
        {
            observerService.removeObserver(this, this.topics[i]);
        }
    }
}

var DSObserverManager = 
{
    observer: new DSObserver(),

    start: function()
    {
        this.observer.register();
    },

    stop: function()
    {
        this.observer.unregister();
    }
}


var DSGUIManager = 
{
    historyWindow: null,
    historyWindowWorker: null,
    historyWindowPending: false,
    historyWindowURL: '',
    notifications: null,

    init: function()
    {
        this.historyWindowURL = require("sdk/self").data.url("dsHistory.html");
    },

    updateSearchHistory: function(searchHistory, fullUpdate)
    {
        if(this.historyWindowWorker !== null)
        {
            var msg = {cmd: 'full', 
                       data: searchHistory, 
                       numScheduledSearches: SearchManager.searchVector.length + ProactiveSearchManager.getNumScheduledSearches()};
            this.historyWindowWorker.port.emit("MainToHistory", JSON.stringify(msg));
        }
    },

    showHistory: function()
    {
        this.stop();
        if(this.historyWindowWorker === null && !this.historyWindowPending)
        {
            this.historyWindowPending = true;
            var tabs = require("sdk/tabs");
            tabs.open({
                url: this.historyWindowURL,
                onClose: function closeScript(tab) { 
                    DSGUIManager.historyWindow = null;
                    DSGUIManager.stop();
                },
                onReady: function readyScript(tab) {
                    DSGUIManager.historyWindowWorker = tab.attach({
                        contentScriptFile: require("sdk/self").data.url("dsHistory.js")
                    });
                    DSGUIManager.historyWindow = tab;
                    DSGUIManager.historyWindowPending = false;
                    DSGUIManager.updateSearchHistory(SearchManager.searchHistory, true);
                }
            });

        }
        else if(this.historyWindow)
        {
            this.historyWindow.activate();
        }
    },

    showNotification: function(title, msg)
    {
        if(!title)
        {
            title = 'Diluted Search';
        }
        
        if(this.notifications === null)
        {
            this.notifications = require("sdk/notifications");
        }

        this.notifications.notify({
            title: title,
            text: msg,
            data: "click",
            onClick: function (data) {
                //console.log(data);
            }
        });
    },

    stop: function()
    {
        if(this.historyWindow)
        {
            this.historyWindow.close();
        }
        this.historyWindow = null;
        this.historyWindowWorker = null;
        this.historyWindowPending = false;
    }
}

/*******************************************/
/*                the main                 */
/*******************************************/
exports.main = function(options, callbacks)
{
    // Init perferences
    SearchPrefs.init();
    main_dblog(DEBUG_LEVEL.INFO, "Startup Function");

    // Init GUI
    DSGUIManager.init();

    // Init engine
    ENGINE_DETAILS.init();

    main_dblog(DEBUG_LEVEL.INFO, 'uuid=' + SearchPrefs.uuid);
    main_dblog(DEBUG_LEVEL.INFO, "loadReason = " + options.loadReason);

    // Decide whether to select the search engine.
    var selectSearch = (options.loadReason == "install") || (options.loadReason == "enable");

    // Only add the engine if it doesn't already exist.
    if (!Services.search.getEngineByName(ENGINE_DETAILS.name))
    {
        main_dblog(DEBUG_LEVEL.INFO, "Adding an entry to search bar...");
        main_dblog(DEBUG_LEVEL.DEBUG, "Search bar didn't have name DGS");
        Services.search.addEngineWithDetails.apply(Services.search,
            ["name", "iconURL", "alias", "description", "method", "url"].map(
                function (k) ENGINE_DETAILS[k]));
        selectSearch = true;
    }
     
    // select Diluted Search as the default
    let engine = Services.search.getEngineByName(ENGINE_DETAILS.name);

    if(selectSearch && engine)
    {
        engine.wrappedJSObject._queryCharset = 'UTF-8';
        main_dblog(DEBUG_LEVEL.DEBUG, "Engine charset is: " + engine.wrappedJSObject._queryCharset);
    }

    // If the engine is not hidden and this is the first run, move
    // it to the first position in the engine list and select it
    if (selectSearch && !engine.hidden)
    {
        main_dblog(DEBUG_LEVEL.INFO, "Set DS to default");
        //Services.search.moveEngine(engine, 0);
        Services.search.currentEngine = engine;
    }

    // Init the rest
    require("sdk/timers").setTimeout(function callback(e){  
        main_dblog(DEBUG_LEVEL.INFO, "DS Init");       
        
        // Initialize keywords manager
        KeywordsManager.init();
        
        // Initialize Search manager
        SearchManager.init();

        // Check update
        KeywordsManager.checkUpdate();

        // Perform some diluted search proactively
        ProactiveSearchManager.start(30 * 60 * 1000, 1);
        
        // System observer
        DSObserverManager.start();
        
        // Listen For Page Load
        require("sdk/tabs").on("ready", checkURL);
    }, 0);
}

exports.onUnload = function (reason) {
    main_dblog(DEBUG_LEVEL.INFO, "Unload function called. Reason:" + reason);
    // If the add-on was uninstalled or disabled by the user, uninstall the
    // search toolbar entry and cleanup the addon
    if (reason == "uninstall" || reason == "disable") {
        main_dblog(DEBUG_LEVEL.INFO, "reason for calling unload function was either UNINSTALL or DISABLE, try to remove toolbar entry");
        let engine = Services.search.getEngineByName(ENGINE_DETAILS.name);
        // Only remove the engine if it appears to be the same one we
        if(engine)
        {
            main_dblog(DEBUG_LEVEL.INFO, "Removing toolbar entry");
            Services.search.removeEngine(engine);
        }

        // stop
        DSGUIManager.stop();
        SearchManager.stop();
        ProactiveSearchManager.stop();
        DSObserverManager.stop();  
      
        // clear any stored data
        SearchManager.clear();
        KeywordsManager.clear();
        PageWorkerStore.clear();
        SearchPrefs.clear();
    }
}
