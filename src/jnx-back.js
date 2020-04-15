/**
 * Created by alanlawson on 2020-02-09.
 * Chrome extension jnx functions
 */

jnx = {};

//  Get cookie
//  - returns token value or null
jnx.getCookie = function(name, callback){
    chrome.cookies.get({url: 'https://www.kuloo.com', name: name}, function(cookie){
        var val = cookie && typeof cookie.value != 'undefined' ? cookie.value : null;
        callback(null, val);
    });
};
jnx.getCookieAsync = Promise.promisify(jnx.getCookie);

//  Get sessionId
//  - on error returns message and clears jnx.token
//  - sets jnx.sessionId and other vars
//  - does not return anything
//  - throws error with message if problem
jnx.getSessionId = function(callback){
    doGet();
    async function doGet(){
        try{
            if (!jnx.token){
                callback(null);
                return;
            }
            var url = jnx.serverUrl + '/database/checkToken';       //  ajax call to get sessionId from server
            var data = {
                token: jnx.token,
            };
            var ajaxObj = {
                type: 'POST',
                url: url,
                data: JSON.stringify(data),
                dataType: 'json',
                headers: {
                    'jnx-deviceid': jnx.deviceId,
                    'jnx-extension': true
                },
                success: function(rData, textStatus, jqXHR){
                    if (rData.status){                              //  may be 1 or 'cancel' etc..
                        if (rData.errorMessage){
                            var m = rData.errorMessage;
                        }else if (rData.message){
                            var m = rData.message;
                        }else{
                            var m = 'Unknown error returned from ' + url;
                        }
                        callback(m);
                        return;
                    }
                    if (rData.uid){
                        jnx.uid = rData.uid;
                        jnx.sessionId = rData.sessionId;
                        jnx.user._id = rData.uid;
                        jnx.user.email = rData.email;
                        jnx.user.firstName = rData.firstName;
                        jnx.user.lastName = rData.lastName;
                        jnx.user.activatedDate = new Date(rData.activatedDate);
                        jnx.user.adminFlags = rData.adminFlags;
                    }else{
                        jnx.uid = null;
                        jnx.sessionId = null;
                        jnx.user = {};
                        jnx.token = null;
                        // jnx.serverUrl = null;
                    }
                    callback(null);
                    return;
                },
                error: function(jqXHR, status, err){
                    var rData = {};
                    if (jqXHR.responseText && jqXHR.responseText.match(/logout/)){        //  'force logout' page received
                        callback('Force logout message received');
                        return;
                    }
                    callback('Error on server - url:' + url + ', Status: ' + status);
                }
            };
            $.ajax(ajaxObj);
        }catch(err){
            console.error(err.stack);
            callback(err.message);
        }   
    }
};
jnx.getSessionIdAsync = Promise.promisify(jnx.getSessionId);

//  Websocket connection managment
jnx.webSocketOpen = function(callback){
    var trace = false;
    if (!jnx.sessionId) return;

    doOpen();

    function doOpen(o){
        var o = o || {};
        o.count = o.count || 0;

        var url = jnx.serverUrl + '/database/noop';
        var d = {
            sessionId: jnx.sessionId,
            email: jnx.user.email
        };
        var ajaxObj = {
            type: 'POST',
            url: url,
            headers: {
                'jnx-sessionid': jnx.sessionId
            },
            data: JSON.stringify(d),
            dataType: 'json',
            success: function(r, textStatus, jqXHR){
                if (trace) console.log('noop xhr returned success ' + new Date());
                if (!r.server){                                                         //  invalid response
                    if (trace) console.log('invalid /noop response ' + JSON.stringify(r) + ' ' + new Date());
                    setTimeout(function(){
                        doOpen({count: ++o.count})
                    }, 500);
                    return;
                }
                if (jnx.websocket){                                                     //  just a reconnection
                    // chrome.browserAction.enable();
                }
                jnx.server = r.server;                                                  //  update current server
                var delay = 100;
                setTimeout(function(){
                    if (trace) console.log('opening ws for ' + jnx.sessionId.slice(0,6));
                    var url = 'wss://' + jnx.serverUrl.replace(/^https:\/\//, '');
                    url += '?sessionId=' + jnx.sessionId;
                    jnx.webSocketOpen.connectAttemptAt = new Date();
                    jnx.websocket = new WebSocket(url);
                    afterCreated();
                }, delay);
            },
            error: function(jqXHR, status, err){                //  keep trying on error
                if (trace) console.log('ws noop ajax error ' + new Date());
                // chrome.browserAction.disable();
                setTimeout(function(){
                    doOpen({count: ++o.count})
                }, 500);
                return;
            }
        };
        $.ajax(ajaxObj);
    }

    function afterCreated(){
        if (trace) console.log('ws afterCreated ' + new Date());
        // chrome.browserAction.enable();

        jnx.websocket.onopen = function(event){             //  socket opened (does not get called on reconnects)
            if (trace) console.log('websocket.onopen called ' + new Date());
        };

        jnx.websocket.onclose = function(event){                                //  socket closed
            if (trace) console.log('websocket.onclose called ' + new Date());
            if (jnx.websocket && jnx.websocket.readyState == 1) {                                //  is already open again
                return;
            }
            // chrome.browserAction.disable();
            jnx.webSocketOpen();
        };

        jnx.websocket.onerror = function(event){                                //  socket error
            if (trace) console.log('websocket.onerror called ' + new Date());
            // chrome.browserAction.disable();
        };

        jnx.websocket.onmessage = function(event) {          //  message received
            if (trace) console.log('websocket.onmessage called ' + JSON.stringify(event.data) + ' ' + new Date());
            if (!event.data) return;
            var data = JSON.parse(event.data);
            if (WSM[data._type]){
                WSM[data._type](data);
            }else{
                console.error('No such websocket message handler "' + data._type + '".');
            }
        };

        if (callback) callback(null);
    }
};
jnx.webSocketOpenAsync = Promise.promisify(jnx.webSocketOpen);

//  web socket message handlers
var WSM = {};

//  update counts
//  - goes through redis
WSM.inboxCount = function(data){
    if (data.submitted < 0) data.submitted = 0;
    if (data.count < 0) data.count = 0;
    if (data.submitted){
        chrome.browserAction.setBadgeText({text: data.submitted > 9999 ? '9999' : data.submitted.toString()});
        chrome.browserAction.setBadgeBackgroundColor({color: [208, 30, 37, 1]});
    }else if (data.count){
        chrome.browserAction.setBadgeText({text: data.count > 9999 ? '9999' : data.count.toString()});
        chrome.browserAction.setBadgeBackgroundColor({color: [54, 106, 211, 1]});
    }else{
        chrome.browserAction.setBadgeText({text: ''});
        chrome.browserAction.setBadgeBackgroundColor({color: [54, 106, 211, 1]});
    }
};

//  extension data received (ie. roles, channels, etc.)
//  - does not go through redis
WSM.extensionData = function(data){
    // console.log('extension data received ' + new Date());
    // console.log(data);
    jnx.user.roles = data.roles;
    jnx.channels = data.channels;
    jnx.kulooSite = data.kulooSite;
    chrome.runtime.sendMessage({                                    
        _type: 'updateChannels',
        user: jnx.user,
        channels: jnx.channels,
        kulooSite: jnx.kulooSite
    });
};

//  results back from server of clipUrl message
//  - does not go through redis
WSM.clipUrl = function(data){
    if (jnx.channels[data.channelId]) {                      //  update
        jnx.channels[data.channelId].urlImported = {
            feedId: data.feedId,
            categoryId: data.categoryId,
            _createdDateRS: 'Just now',
            _createdByUserId: jnx.user._id,
            _createdByUserName: jnx.user.firstName + ' ' + jnx.user.lastName
        };
    }
    chrome.runtime.sendMessage(data);
};

//  msg from server to refresh channels and count for extension (ie. a channel has been added or deleted)
WSM.refreshExtension = function(){
    var data = {_type: 'inboxCount'};
    jnx.socketSend(data);
    var data = {_type: 'extensionData'};
    jnx.socketSend(data);
};

jnx.socketSend = function(data){
    if (!jnx.websocket || jnx.websocket.readyState != 1){
        _.delay(jnx.socketSend, 1000, data);
        return;
    }
    data.sessionId = jnx.sessionId;
    jnx.websocket.send(JSON.stringify(data));
};
