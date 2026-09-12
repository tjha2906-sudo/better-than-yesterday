(function(){

    const API =
        `${window.BTY_CONFIG.API_BASE}/api`;

    const loginTab =
        document.getElementById("tabLogin");

    const registerTab =
        document.getElementById("tabRegister");

    const indicator =
        document.getElementById("tabIndicator");

    const loginForm =
        document.getElementById("loginForm");

    const registerForm =
        document.getElementById("registerForm");

    const success =
        document.getElementById("authSuccess");

    const successMessage =
        document.getElementById("successMessage");


    function showPanel(panel){

        const login = panel === "login";

        loginTab.classList.toggle(
            "is-active",
            login
        );

        registerTab.classList.toggle(
            "is-active",
            !login
        );

        indicator.style.transform =
            login
                ? "translateX(0)"
                : "translateX(100%)";

        loginForm.hidden = !login;
        registerForm.hidden = login;

    }


    loginTab.addEventListener(
        "click",
        ()=>showPanel("login")
    );

    registerTab.addEventListener(
        "click",
        ()=>showPanel("register")
    );


    const params =
        new URLSearchParams(location.search);

    showPanel(
        params.get("mode") === "register"
            ? "register"
            : "login"
    );


    function setLoading(form,state){

        const button =
            form.querySelector(
                "button[type=submit]"
            );

        button.disabled=state;

        button.classList.toggle(
            "is-loading",
            state
        );
    }


    function showSuccess(message){

        loginForm.hidden=true;
        registerForm.hidden=true;

        document.querySelector(
            ".auth-tabs"
        ).hidden=true;

        successMessage.textContent=message;

        success.hidden=false;

        gsap.fromTo(
            success,
            {opacity:0,y:15},
            {opacity:1,y:0,duration:.5}
        );

    }


    /* REGISTER */

    registerForm.addEventListener(
        "submit",
        async e=>{

            e.preventDefault();

            const error =
                document.getElementById(
                    "registerError"
                );

            error.textContent="";

            const data =
                Object.fromEntries(
                    new FormData(registerForm)
                );


            if(data.username.length<3){

                error.textContent =
                    "Username must be at least 3 characters.";

                return;
            }


            if(data.password.length<6){

                error.textContent =
                    "Password must be at least 6 characters.";

                return;
            }


            if(data.password !== data.confirm){

                error.textContent =
                    "Passwords don't match.";

                return;
            }


            setLoading(registerForm,true);


            try{

                const response =
                    await fetch(
                        `${API}/register/`,
                        {
                            method:"POST",
                            headers:{
                                "Content-Type":
                                    "application/json"
                            },
                            body:JSON.stringify({
                                username:data.username,
                                email:data.email,
                                password:data.password
                            })
                        }
                    );


                const result =
                    await response.json();


                if(!response.ok){

                    error.textContent =
                        result.username?.[0] ||
                        result.email?.[0] ||
                        result.password?.[0] ||
                        result.detail ||
                        "Registration failed.";

                    return;
                }


                /*
                 * Registration endpoint only creates
                 * the user. Now login automatically.
                 */

                const loginResponse =
                    await fetch(
                        `${API}/token/`,
                        {
                            method:"POST",
                            headers:{
                                "Content-Type":
                                    "application/json"
                            },
                            body:JSON.stringify({
                                username:data.username,
                                password:data.password
                            })
                        }
                    );


                const tokens =
                    await loginResponse.json();


                if(!loginResponse.ok){

                    showSuccess(
                        "Account created. Please log in."
                    );

                    return;
                }


                localStorage.setItem(
                    "access_token",
                    tokens.access
                );

                localStorage.setItem(
                    "refresh_token",
                    tokens.refresh
                );

                localStorage.setItem(
                    "bty_username",
                    data.username
                );


                showSuccess(
                    `Welcome, ${data.username}. Let's get to work.`
                );


                setTimeout(
                    ()=>location.href="dashboard.html",
                    900
                );


            }catch(err){

                error.textContent =
                    "Cannot connect to the server.";

            }finally{

                setLoading(registerForm,false);

            }

        }
    );


    /* LOGIN */

    loginForm.addEventListener(
        "submit",
        async e=>{

            e.preventDefault();

            const error =
                document.getElementById(
                    "loginError"
                );

            error.textContent="";

            const data =
                Object.fromEntries(
                    new FormData(loginForm)
                );


            if(
                !data.username ||
                data.password.length<6
            ){

                error.textContent =
                    "Enter a valid username and password.";

                return;
            }


            setLoading(loginForm,true);


            try{

                const response =
                    await fetch(
                        `${API}/token/`,
                        {
                            method:"POST",
                            headers:{
                                "Content-Type":
                                    "application/json"
                            },
                            body:JSON.stringify({
                                username:data.username,
                                password:data.password
                            })
                        }
                    );


                const result =
                    await response.json();


                if(!response.ok){

                    error.textContent =
                        "Invalid username or password.";

                    return;
                }


                localStorage.setItem(
                    "access_token",
                    result.access
                );

                localStorage.setItem(
                    "refresh_token",
                    result.refresh
                );

                localStorage.setItem(
                    "bty_username",
                    data.username
                );


                showSuccess(
                    `Welcome back, ${data.username}.`
                );


                setTimeout(
                    ()=>location.href="dashboard.html",
                    700
                );


            }catch(err){

                error.textContent =
                    "Cannot connect to the server.";

            }finally{

                setLoading(loginForm,false);

            }

        }
    );

})();