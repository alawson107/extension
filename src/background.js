// background.js

// "externally_connectable": {
//     "matches": ["https://*.kuloo.com/*"]
// },

//  set environment
// jnx.serverUrl = 'https://mac.kuloo.com:4003';           //  server that will be used for all requests (auth, posts, etc)
jnx.token = null;
jnx.deviceId = null;
jnx.serverUrl = null;                                   //  server that will be used for all requests (auth, posts, etc)
jnx.user = {};                                          //
jnx.channels = [];                                      //  channels and folders to display in drop down
jnx.server = null;
jnx.tabs = null;

(async function(){
    try{
        localStorage.clear();
        await startup();
    }catch(err){
        console.error(err.stack);
    }
})();

// Called when the user clicks on the browser action.
chrome.browserAction.onClicked.addListener(function(tab) {
    // Send a message to the active tab
    // chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    //     var activeTab = tabs[0];
    //     chrome.tabs.sendMessage(activeTab.id, {"message": "clicked_browser_action"});
    // });
});

//  called on startup of extension to get cookies and make ws connection
async function startup(){
    try{
        var token, serverUrl;
        chrome.browserAction.setTitle({title: 'Add page to Kuloo channel'})
        // chrome.browserAction.disable();                                             //  set icon to disabled (grey)
        // jnx.token = await jnx.getCookieAsync('token');
        jnx.token = localStorage.getItem('token');
        jnx.deviceId = localStorage.getItem('deviceId');
        jnx.serverUrl = localStorage.getItem('serverUrl');
        jnx.email = localStorage.getItem('email');
        tryLogin();
    }catch(err){
        console.error(err.stack);
    }
}

//  try login to kuloo
//  - only called if session and websocket does not exist
async function tryLogin(){
    try{
        // jnx.server = 'mac';
        // jnx.serverUrl = 'https://dev.kuloo.com';                    //  server that will be used for all requests (auth, posts, etc)
        // jnx.serverUrl = 'https://mac.kuloo.com:4003';               //  server that will be used for all requests (auth, posts, etc)
        if (!jnx.serverUrl){
            jnx.serverUrl = 'https://app.kuloo.com';
        }
        await jnx.getSessionIdAsync();                                 //  get sessionId and other user info
        if (!jnx.sessionId){
            // chrome.tabs.create({"url": jnx.serverUrl || 'https://app.kuloo.com'});  //  open browser to log in
            chrome.browserAction.setTitle({title: 'Click to log in'})
            chrome.browserAction.setBadgeText({text: 'Login'});
            chrome.browserAction.setBadgeBackgroundColor({color: [208, 30, 37, 1]});
            return;
        }
        await jnx.webSocketOpenAsync();                             //  open websocket
        var data = {_type: 'inboxCount'};                           //  get initial inbox count
        jnx.socketSend(data);
        var data = {_type: 'extensionData'};                        //  get channels and folders that user can submit to
        jnx.socketSend(data);
    }catch(err){
        console.error(err.stack);
    }
}

//  message handling from popup
chrome.runtime.onMessage.addListener(function(data, sender, sendResponse) {
    if (MSG[data._type]){
        MSG[data._type](data, sender, sendResponse);
    }else{
        console.error('No such background message handler "' + data._type + '".');
    }
});

//  handle messages from content.js page
chrome.extension.onConnect.addListener(function(port) {
    port.onMessage.addListener(function(data) {
        if (MSG[data._type]){
            MSG[data._type](data);
        }else{
            console.error('No such background message handler "' + data._type + '".');
        }
    });
});

//  handle message from external pages
chrome.runtime.onMessageExternal.addListener(function(data, sender, sendResponse) {
    sendResponse({
        status: 0
    });
    if (MSG[data._type]){
        MSG[data._type](data, sender, sendResponse);
    }else{
        console.error('No such background message handler "' + data._type + '".');
    }
});

//  Handle messages from foreground popup and from content.js
var MSG = {};

//  receive token from content.js
MSG.token = function(data){
    if (!jnx.sessionId || jnx.token && data.token != jnx.token
        || jnx.serverUrl != data.serverUrl
        || jnx.webSocket && jnx.websocket.readyState != 1
    ){
        jnx.uid = null;
        jnx.sessionId = null;
        jnx.user = {};
        jnx.token = null;
        jnx.deviceId = null;
        jnx.serverUrl = null;
        if (jnx.websocket) jnx.websocket.close();
        delete jnx.websocket;

        localStorage.clear();
        jnx.token = data.token;
        jnx.deviceId = data.deviceId;
        jnx.serverUrl = data.serverUrl;
        jnx.email = data.email;
        localStorage.setItem('token', data.token);
        localStorage.setItem('deviceId', data.deviceId);
        localStorage.setItem('serverUrl', data.serverUrl);
        localStorage.setItem('email', data.email);
        tryLogin();

    }else if (!jnx.sessionId || jnx.websocket && jnx.websocket.readyState != 1){
        tryLogin();
    }
};

//  if authenticated create popup
//  - is called without params when popup first opens
//  - will send msg to popup open clipper OR login
//  - data only exists if called from popup {email: xxx, password: xxx}
MSG.checkAuth = async function(data){
    if (jnx.websocket && jnx.websocket.readyState == 1 && jnx.sessionId){               //  session already exists
        openClipper();
        return;
    }
    if (!data.email){                                                                   //  called from popup start
        chrome.runtime.sendMessage({
            _type: 'openLogin',
            deviceId: localStorage.getItem('deviceId'),
            email: localStorage.getItem('email')
        });
        return;
    }

    var msg = {                                         //  login popup has provided email and password
        email: data.email,
        password: data.password,
        mode: 'login',
        isExtension: true
    };
    var url = jnx.serverUrl + '/database/login';        //  ajax call to get sessionId from server
    var ajaxObj = {
        type: 'POST',
        url: url,
        data: JSON.stringify(msg),
        dataType: 'json',
        headers: {
            'jnx-deviceid': jnx.deviceId,
            'jnx-extension': true
        },
        success: async function(r, textStatus, jqXHR){
            if (r.loginStatus == 0){
                jnx.token = r.token;
                localStorage.setItem('token', r.token);
                localStorage.setItem('serverUrl', r.serverUrl);
                localStorage.setItem('deviceId', r.deviceId);
                localStorage.setItem('email', r.email);
                await tryLogin();
                openClipper();
                return;
            }
            var msg = {
                _type: 'authError'
            };
            if (r.loginStatus == 1){                            //  email not found
                msg.emailErrorMsg = 'Email not found';
            }else if(r.loginStatus == 2){                       //  invalid password
                msg.passwordErrorMsg = 'Invalid password';
            }else if(r.loginStatus == 3){                       //  Email is registered but password does not match
                msg.emailErrorMsg = 'Email is registered but password does not match';
            }else{
                msg.passwordErrorMsg = 'Authentication error';
            }
            chrome.runtime.sendMessage(msg);
        },
        error: function(jqXHR, status, err){
            chrome.runtime.sendMessage({
                _type: 'authError',
                message: 'Connection error'
            });
        }
    };
    $.ajax(ajaxObj);

    function openClipper(){
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs){        //  get current tab
            if (tabs && tabs.length > 0){                                               //  got tab ok
                jnx.tabs = tabs;
            }
            jnx.prevTabs = jnx.tabs;
            chrome.runtime.sendMessage({                                            //  session created OK
                _type: 'setupClipper',
                sessionId : jnx.sessionId,
                server: jnx.server,
                user: jnx.user,
                channels: jnx.channels,
                url: jnx.tabs && jnx.tabs.length > 0 ? jnx.tabs[0].url : null,
                title: jnx.tabs && jnx.tabs.length > 0 ? jnx.tabs[0].title : null
            });
            if (tabs && tabs.length > 0){
                var data = {                                                            //  get channels update
                    _type: 'extensionData',
                    url: jnx.tabs[0].url,
                    title: jnx.tabs[0].title
                };
                jnx.socketSend(data);
                MSG.checkAuth.last = {
                    url: jnx.tabs[0].url,
                    title: jnx.tabs[0].title
                };
            }
        });
    }
};

//  send 'clipUrl' request to server
MSG.clipUrl = function(data){
    jnx.socketSend(data);
};

//  logout message received from page
MSG.logout = function(data){
    jnx.uid = null;
    jnx.sessionId = null;
    jnx.server = null;
    jnx.serverUrl = null;
    jnx.user = {};
    jnx.token = null;
    jnx.channels = [];
    if (jnx.websocket) jnx.websocket.close();
    delete jnx.websocket;
    chrome.browserAction.setBadgeText({text: ''});
    chrome.browserAction.setBadgeBackgroundColor({color: [54, 106, 211, 1]});
};

