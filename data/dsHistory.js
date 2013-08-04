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

function updateStatistics(numActualSearches, numDilutedSearches, numScheduledSearches)
{
    document.getElementById("numDilutedSearches").textContent = numDilutedSearches;
    document.getElementById("numActualSearches").textContent = numActualSearches;
    document.getElementById("numScheduledSearches").textContent = numScheduledSearches;
}

function updateHistory(data)
{
    var table = document.getElementById('RecentSearches');
    // first row is the table header
    var numRows = table.rows.length - 1;
    for(var i = 0; i < numRows; i++)
    {
        table.deleteRow(1);
    }

    for(var i = 0; i < data.length; i++)
    {
        var row=table.insertRow(i+1);
        var date = new Date(data[i].time);
        row.insertCell(0).innerHTML = date.toString();
        row.insertCell(1).textContent = data[i].query;
        row.insertCell(2).textContent = data[i].type;
    }
}

function handleCmd(msg)
{
    //console.log("*********** MainToHistory **********");
    var d = JSON.parse(msg);
    var searchHistory = d.data;

    updateStatistics(searchHistory.numSearches[0], searchHistory.numSearches[1], d.numScheduledSearches);    
    updateHistory(searchHistory.mostRecentSearches);
}

self.port.on('MainToHistory', handleCmd);
