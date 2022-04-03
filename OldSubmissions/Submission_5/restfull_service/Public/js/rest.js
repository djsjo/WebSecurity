function registerUsername(button) {

    button.blur();

    let username = $('#register').val();
    // let password = $('#signuppassword').val();
    let credentials = {username: username};

    $.post(
        {
            url: 'register',
            data: JSON.stringify(credentials),
            contentType: 'application/json',
            success: res => {

                if (!res.success) {

                    switch (res.reason) {

                        case 'username' :
                            $('#register').addClass('is-invalid');
                            $('#register').removeClass('is-invalid');
                            break;

                    }

                } else {
                    $('#inside').html("Your token is: "+res.token.toString());
                    console.log("success pw and username ok");
                    // location.reload();
                    // document.getElementsByClassName("container").innerHTML=res.token;

                }

            }
        }
    );

}