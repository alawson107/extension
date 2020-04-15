/**
 * Created by alanlawson on 2020-02-09.
 * Chrome extension jnx functions
 */

jnx = {
    vars: {
        server: null,
        url: null,
        title: null,
        kulooSite: false,
        user: null,
        channels: null,
        channelId: null,
        channel: null,
        feedId: null,
        feed: null,
        categoryId: null,
        category: null,
        deviceId: null,
        email: null
    }
};

//  Get cookie
//  - returns token value or null
jnx.getCookie = function(name, callback){
    chrome.cookies.get({url: 'https://www.kuloo.com', name: name}, function(cookie){
        var val = cookie && typeof cookie.value != 'undefined' ? cookie.value : null;
        callback(null, val);
    });
};
// Bluebird = Promise.noConflict();  << CAUSED PROBLEMS
// jnx.getCookieAsync = Promise.promisify(jnx.getCookie);

//  save channel, folder, subfolder state to cookie
jnx.saveState = function(){
    localStorage.setItem('cfcState', JSON.stringify({
        channelId: jnx.vars.channelId,
        feedId: jnx.vars.feedId,
        categoryId: jnx.vars.categoryId
    }));
};

//  restore channel, folder, subfolder state from cookie
jnx.restoreState = function(){
    var d = localStorage.getItem('cfcState');
    if (d){
        try{
            d = JSON.parse(d);
        }catch(err){
            console.error('Invalid JSON in cfcState cookie: ' + d);
        }
        if (!d.channelId || !jnx.vars.channels[d.channelId]) {
            // console.log('Restore state: not found');
            return;
        }
        // console.log('Restore state: data found OK - ' + d);
        Components['Clipper'].onChannelChange(d.channelId, true);
        if (d.feedId){
            Components['Clipper'].onFeedChange(d.feedId, true);
            if (d.categoryId){
                Components['Clipper'].onCategoryChange(d.categoryId, true);
            }
        }
    }
};

