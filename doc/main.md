What is DilutedSearch?

DilutedSearch is a plugin that automatically submits searches to a search
engine ("diluted searches") whenever a real search is performed.  By
performing many "dummy" searches for every real search, DilutedSearch makes
it more difficult to identify which searches are real and which searches are
automatically generated.


How does DilutedSearch work?

The extension works by waiting for the user to search for something on a
major search engine.  When a search occurs, the extension schedules a number
of diluted searches (the exact number can be controlled by the user) at random
points over a certain amount of time (also configurable by the user).  The
search categories (from which the diluted searches are chosen) are also
configurable by the user.

The extension also disables click tracking, to prevent the search engine from
knowing which searches were real by simply determining which links were clicked
on.

How do I use DilutedSearch?

DilutedSearch adds an item to Firefox's search toolbar called "Diluted Search".
Searching from this toolbar will also cause the plugin to perform a set number
of diluted searches behind the scenes (see the section on configuration options
for more detail).  The plugin will also work if you go to a search engine
website* directly, and perform the search there.  However, there is a small
issue that you should be aware of: certain search engines have an "instant
search" feature that sends keystrokes to the server as you type.  THIS MUST
BE DISABLED TO PROTECT YOUR PRIVACY, otherwise the search engine could simply
look at which searches were preceded by sending individual keystrokes and pick
out the real ones.  To do this on Google, for example, you must use the
complete=0 option in the URL (the Diluted Search toolbar item does this
automatically).  This means that in order to disable it on Google, you must
go to www.google.com/search?complete=0  We HIGHLY RECOMMEND bookmarking this
URL if you like to search off the main page instead of in the toolbar so that
you don't need to type in every time.

*Currently, Google is the only supported search engine


What search categories are available?

Currently, there are two categories: Popular and Medicine.  The Popular
category includes searches from mainstream, popular culture.  The Medicine
category will perform dummy searches on medical topics.  This is particularly
useful if, for example, one is searching for information on a specific
medical condition (presumably one that affects oneself or one's family).
By "diluting" the search results by injecting searches for other medical
conditions, it makes it more difficult to determine which condition(s) the
real user wants information about.


What configuration options are available?

The Preferences section can be reached by going to Tools->Add-ons->Extensions->
Diluted Search->Preferences.  The configuration options are:

Page Workers: The Firefox plugin creates a number of "page workers", which are
permanent, invisible pages.  These pages are used to perform the diluted
searches, and they are used in a round-robin fashion to perform each successive
search.  Unless you have a real reason to change this, it should be left at
its default setting.

Logging Level: Dynamic debugging level (for use by developers).  Levels
available are 0 (NONE) through 4 (DEBUG).

Search Time Interval: When a real search is performed, the plugin schedules a
certain number of diluted searches, randomly distruted over a specified time
interval.  This is that time interval.

Number of Searches: This is the number of searches performed in the Search
Time Interval, for each real search submitted.

Categories: Check the box to perform diluted searches in the desired category.
If more than one box is checked, then the searches will be performed from
all relevant categories.

Show History: Brings up a page showing search history, which includes number
of searches, search terms (both for real and diluted searches), and searches
scheduled in the future.

Disable/Enable button: This can be used to disable or enable the plugin.  Also,
disabling and re-enabling the plugin will reset the search counter.
