//  src/main.js

Components = {};

$(startUp);

async function startUp(){
    // await new Promise(r => setTimeout(r, 8000));        //  delay for debugging
    Vue.use(ELEMENT, {locale: ELEMENT.lang.en});
    try {
        chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
                if (MSG[request._type]){
                    try{
                        MSG[request._type](request, sender, sendResponse);
                    }catch(err){
                        console.error(err.stack);
                    }
                }else{
                    console.error('No such foreground message handler "' + request._type + '".');
                }
            }
        );
        chrome.runtime.sendMessage({_type: 'checkAuth'});               //  tell background to authenticate
    }catch(err){
        console.error(err.stack);
    }
}

//  Handle messages from background.js
var MSG = {};

//  open login window
MSG.openLogin = async function(data){
    // await new Promise(r => setTimeout(r, 8000));        //  delay for debugging
    jnx.vars.deviceId = data.deviceId;
    jnx.vars.email = data.email;
    Login();
};

//  login error
MSG.authError = function(data){
    Components['Login'].emailErrorMsg = data.emailErrorMsg;
    Components['Login'].passwordErrorMsg = data.passwordErrorMsg;
    Components['Login'].loading = false;
    Components['Login'].submitMessage = 'Login';
    Components['Login'].$refs['loginForm'].validate(function(){});
};

//  setup clipper popup
//  data.users  .channels
MSG.setupClipper = async function(data){
    try{
        // await new Promise(r => setTimeout(r, 8000));        //  delay for debugging
        jnx.vars.server = data.server;
        jnx.vars.url = data.url;
        jnx.vars.title = data.title;
        jnx.vars.user = data.user;
        jnx.vars.channels = data.channels;
        if (Components['Login']){
            Components['Login'].loading = false;
            Components['Login'].submitMessage = 'Authenticated';
            Components['Login'].submitType = 'success';
            Components['Login'].submitDisabled = false;
            Components['Login'].emailDisabled = true;
            Components['Login'].passwordDisabled = true;
            setTimeout(function(){
                window.close();
            }, 5*1000);
            return;
        }
        Clipper();
    }catch(err){
        console.error(err.stack);
    }
};

//  update channels and user data (update received after popup opens)
MSG.updateChannels = function(data){
    jnx.vars.user = data.user;
    jnx.vars.channels = data.channels;
    jnx.vars.kulooSite = data.kulooSite;
    if (Components['Clipper']){
        Components['Clipper'].onChannelChange(null, true);
    }
};

//  results from server of clipUrl message
MSG.clipUrl = function(data){

    // data.results = {
    //     status: 0,
    //     message: '',
    //     words: 100,
    //     images: 3
    // };
    jnx.vars.channel.urlImported = {};
    Components['Clipper'].commentShow = false;
    if (data.results.status == 0){                                      //  success
        var txt = 'Success - ' + data.results.words + ' words, ' + data.results.images + ' image'
            + (data.results.images > 1 ? 's' : '');
        Components['Clipper'].loading = false;
        Components['Clipper'].submitMessage = 'Submit';
        Components['Clipper'].submitColor = 'primary';
        Components['Clipper'].submitDisabled = true;
        Components['Clipper'].importedBy = txt;
        Components['Clipper'].importedByColor = '#67c23a';  // #00ced1
        jnx.vars.channel.urlImported = {
            feedId: data.feedId,
            categoryId: data.categoryId,
            _createdDateRS: 'Just now',
            _createdByUserId: jnx.vars.user._id,
            _createdByUserName: jnx.vars.user.firstName + ' ' + jnx.vars.user.lastName
        };
        jnx.vars.channel.urlImported.feedId = data.feedId;
        jnx.vars.channel.urlImported.categoryId = data.categoryId;
    }else{
        if (data.results.message){
            var txt = 'Failure - ' + data.results.message;
        }else{
            var txt = 'Unable to import this page';
        }
        Components['Clipper'].loading = false;
        Components['Clipper'].submitMessage = 'Submit';
        Components['Clipper'].submitColor = 'primary';
        Components['Clipper'].submitDisabled = true;
        Components['Clipper'].importedBy = txt;
        Components['Clipper'].importedByColor = '#ff0000';
    }
    jnx.vars.channel.urlImported.importedBy = txt;
    Components['Clipper'].onChannelChange(null, true);
};
