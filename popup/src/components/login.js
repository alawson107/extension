//
//     login.js - Component for logging in
//     Alan Lawson copyright 2020
//
//

Login = function(){
    new Vue({
        data() {
            var checkEmail = (rule, value, callback) => {
                if (!value) {
                    return callback(new Error('Please enter email address'));
                } else if (this.emailErrorMsg) {
                    return callback(new Error(this.emailErrorMsg));
                } else {
                    callback();
                }
            };
            var checkPassword = (rule, value, callback) => {
                if (!value) {
                    return callback(new Error('Please enter password'));
                } else if (this.passwordErrorMsg) {
                    return callback(new Error(this.passwordErrorMsg));
                } else {
                    callback();
                }
            };
            return {
                loginForm: {
                    email: '',
                    password: ''
                },
                rules: {
                    email: [
                        {validator: checkEmail, trigger: 'blur'}
                    ],
                    password: [
                        {validator: checkPassword, trigger: 'blur'}
                    ]
                },
                emailErrorMsg: '',
                passwordErrorMsg: '',
                loading: false,
                logoUrl: 'images/kuloo.png',
                // showReload: false,
                submitType: 'primary',
                submitDisabled: false,
                submitMessage: 'Login',
                emailDisabled: false,
                passwordDisabled: false
            }
        },
        methods: {
            resetEmailError(event) {
                this.emailErrorMsg = '';
                this.$refs['loginForm'].clearValidate('email');
            },
            resetPasswordError(event) {
                this.passwordErrorMsg = '';
                this.$refs['loginForm'].clearValidate('password');
            },
            sendLogin(formName) {
                if (this.submitType == 'success') {
                    window.close();
                    return;
                }
                this.$refs[formName].validate((valid) => {
                    if (valid) {
                        this.loading = true;
                        this.submitMessage = 'Authenticating';
                        chrome.runtime.sendMessage({
                            _type: 'checkAuth',
                            email: this.loginForm.email,
                            password: this.loginForm.password
                        });
                    } else {
                        return false;
                    }
                });
            }
        },
        beforeMount() {
            Components['Login'] = this;
        },
        mounted() {
            // var result = Vue.compile(template);
            // var fnS = result.render.toString().replace(/(\{\n)(\S)/, "$1  $2");
            // console.log(fnS);
            $('button#reload').on('click', function(event){
                location.reload();
            });
        },
        updated() {
        },
        render(createElement) {
            var _this = this;

            var header = createElement('div', {style: {backgroundColor: '#545c64', padding: '12px', display: 'flex'}}, [
                createElement('img', {
                    attrs: {src: _this.logoUrl},
                    style: {width: '30px', height: '30px', borderRadius: '2px'},
                }),
                createElement('div', {style: {
                        margin: '6px 0 0 12px', color: 'white', fontSize: '16px', fontWeight: 700, display: 'inline-block'
                    }}, 'Kuloo login')
            ]);

            var email = createElement('el-form-item',{attrs:{"label":"Email address","prop":"email"}},[
                createElement('el-input',{
                    ref:"email",
                    attrs:{"autofocus":"","disabled": _this.emailDisabled},
                    on:{"focus": _this.resetEmailError},
                    model:{
                        value:(_this.loginForm.email),
                        callback:function ($$v) {
                            _this.$set(_this.loginForm,"email", $$v)
                        },
                        expression:"_this.loginForm.email"}
                })
            ]);

            var password = createElement('el-form-item',{
                attrs:{"label":"Password","prop":"password"}},[
                    createElement('el-input',{
                        ref:"password",
                        attrs:{"show-password":"","disabled": _this.passwordDisabled},
                        on:{"focus": _this.resetPasswordError},
                        model:{
                            value:(_this.loginForm.password),
                            callback:function ($$v) {
                                _this.$set(_this.loginForm, "password", $$v)
                            },
                            expression:"_this.loginForm.password"
                        }
                    })]);

            var submit = createElement('el-form-item',{
                staticStyle:{"margin-bottom":"0","text-align":"right"}
                },[
                    createElement('el-button',{
                        attrs:{
                            "type": _this.submitType,
                            "size":"small",
                            "loading":_this.loading,
                            "disabled": _this.submitDisabled
                        },
                        on:{
                            "click":function($event){return _this.sendLogin('loginForm')}
                        }
                    }, _this.submitMessage)
                ]
            );

            if (1==2) {                                                                 //  reload button
                var reload = createElement('button', {
                    attrs: {id: 'reload'},
                    style: {display: 'block', position: 'absolute', bottom: '12px'},
                }, 'Reload')
            }

            return createElement('div', {
                style: {
                    width: '324px'
                }
            }, [
                header,
                createElement('div', {
                        style: {minHeight: '100px', padding: '12px 12px 12px 12px', backgroundColor: '#f0f8ff'}
                    },
                    [
                        createElement('el-form',{
                            ref: 'loginForm',
                            attrs:{
                                model: _this.loginForm,
                                rules: _this.rules,
                                'hide-required-asterisk': '',
                                'label-position': 'left',
                                'label-width': '120px',
                                size: 'mini'
                            }},[
                                email,
                                password,
                                submit
                        ]),
                        reload
                    ])
            ])
        }
    }).$mount('#app');
};
