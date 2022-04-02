try {
    document.getElementById("signInButton").addEventListener('click', function () {
        signin(document.getElementById("signInButton"))
    }, false);
} catch (e) {
    console.log("error");
}
try {
    signupObject = document.getElementById("signUpButton");
    signupObject.addEventListener('click', function () {
        signup(signupObject)
    }, false);
} catch (e) {
    console.log("error");
}
signoutObject=document.getElementById("signOutButton");
signoutObject.addEventListener('click',function () {
    signout(signoutObject)
},false);
