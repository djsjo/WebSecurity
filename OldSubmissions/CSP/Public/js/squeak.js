function signup(button) {

    button.blur();

    let username = $('#signupusername').val();
    let password = $('#signuppassword').val();
    let credentials = {username: username, password: password};

    $.post(
        {
            url: 'signup',
            data: JSON.stringify(credentials),
            contentType: 'application/json',
            success: res => {

                if (!res.success) {

                    switch (res.reason) {
                        case 'username' :
                            $('#signupusername').addClass('is-invalid');
                            $('#signuppassword').removeClass('is-invalid');
                            break;

                        case 'password' :
                            $('#signupusername').removeClass('is-invalid');
                            $('#signuppassword').addClass('is-invalid');
                            break;
                    }

                } else {
                    console.log("success pw and username ok");
                    location.reload();
                }

            }
        }
    );

}


function signin(button) {

    button.blur();
    console.dir(`button: ${button}`);

    let username = $('#username').val();
    let password = $('#password').val();
    let credentials = {username: username, password: password};

    $.post(
        {
            url: 'signin',
            data: JSON.stringify(credentials),
            contentType: 'application/json',
            success: res => {
                console.log(res);
                if (res) {
                    location.reload();
                } else {
                    $('#username').addClass('is-invalid');
                    $('#password').addClass('is-invalid');
                }
            }
        }
    );

}

function signout(button) {

    button.blur();
    console.log("signout");

    $.post('/signout', res => {
            console.log(res);
            if (res) {
                location.reload();
            }
        }
    );

}