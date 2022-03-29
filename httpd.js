var https = require('https');
var fs = require('fs');
var qs = require('querystring');
var cookie = require('cookie');
//const {url} = require('inspector');
const path = require('path');
const url = require('url');
const express = require('express');
const app = express();
const port = 8000;
const router = express.Router();
var cookieParser = require('cookie-parser');
var mustacheExpress = require('mustache-express');
var Mustache = require('mustache');
const {
    getHashes
} = require('crypto');
const {
    pbkdf2Sync
} = require('crypto');
const {
    randomBytes,
} = require('crypto');
const {
    createHmac
} = require('crypto');
const {MongoClient} = require("mongodb");

let rooms = ["livingroom",
    "bedroom",
    "kitchen"];

let roomData = {
    kitchen: {temperature: 24, lights: {stove: false, ceiling: false}},
    livingroom: {temperature: 22, lights: {sofa: true, ceiling: false}},
    bedroom: {temperature: 20, lights: {bed: true, ceiling: false}}
};
/*let validcookies = {
    'athome-session': {},
    'squeak-session': {123: 123}
};*/
let csrfTokens = {}
const mongoURL = "mongodb+srv://websecurity:fisksoppa@websecurity.yyrpv.mongodb.net/myFirstDatabase?retryWrites=true&w=majority";

//function get called regularly to delete unvalid cookies
async function deleteOldCookies(keepAliveTime) {
    currentTime = Date.now();
    console.log(Date.now() + "keepAliveTime" + keepAliveTime);
    validcookies = await sessions.find({}).toArray();
    for (cookie in validcookies) {
        cookie = validcookies[cookie];
        if ((currentTime - cookie["date"]) >= keepAliveTime) {
            invalidateSession(cookie['id']);
            delete csrfTokens[cookie['id']];
        }
    }


}

//handler to verify, destroy and generate cookies
function cookieHandler(cookieName = "", newCookie = true, destroy = false, verify = false, cookieId = "") {

    if (newCookie && cookieName !== "") {

        cookieId = randomBytes(16).toString('hex');
        //checks if cookieId already exists
        if (cookieId in validcookies[cookieName]) {
            cookieId = randomBytes(16).toString('hex');
        }

        validcookies[cookieName][cookieId] = Date.now();
        //validcookies[cookieName].push(cookieObject);
        return cookieId;

    } else if (destroy && cookieId !== "") {
        if (cookieId in validcookies[cookieName]) {
            delete validcookies[cookieName][cookieId];
        }
    } else if (verify && cookieId !== "" && cookieName !== "") {
        if (cookieId in validcookies[cookieName]) {
            return true;
        }
        return false;
    }
}

//returns the data of the file in the path as a string, path relative to directory
function dataController(pathNameInCurrentDirectory, sync, req, res) {
    let desiredPath = __dirname + pathNameInCurrentDirectory;
    let ressourceData = "";
    if (fs.existsSync(desiredPath)) {
        console.log(`before readfile in ${pathNameInCurrentDirectory}`);

        //possible to choose an syncn and non sync reading
        if (!sync) {
            fs.readFile(desiredPath, {encoding: "utf-8"}, function (err, data) {
                console.log("im doing something");
                if (err) {
                    res.writeHead(404);
                    res.end(JSON.stringify(err));
                    return;
                }

                ressourceData = data;
            });

            console.log("after readfile in {{pathNameInCurrentDirectory}}")
        } else {
            ressourceData = fs.readFileSync(desiredPath, {encoding: "utf-8"});
        }
    }
    return ressourceData;
}

//simila to data controller path is absolute
function getFileData(filepath, sync = true) {
    let desiredPath = filepath;
    if (fs.existsSync(desiredPath)) {
        console.log("before readfile in getFileData");

        //is not a directory it has to be a file or something similar
        if (sync) {
            console.log("im doing something in getFileData");
            return fs.readFileSync(desiredPath, {encoding: "utf-8"});

        } else {
            fs.readFile(desiredPath, {encoding: "utf-8"}, function (err, data) {
                console.log("im doing something in getFileData");
                if (err) {
                    // res.writeHead(404);
                    // res.end(JSON.stringify(err));
                    return;
                }
                return data;
            });
        }

        console.log("after readfile in getFileData")

    }
}

//small function for encoding data
function encodeData(origData) {
    complete= encodeURIComponent(origData);
    complete=complete.replace(encodeURIComponent(" ")," ");
    return complete;

}

//handler function which returns if the credentials are correct
//and the user ist authenticated
//old legacy function
async function userAuthenticated(username, passwd, req, res) {
    passwdData = dataController("/passwd.json", true, req, res);
    paswdAsJson = JSON.parse(passwdData);
    pwFound = false;
    //checks if the username and password are correct
    if (paswdAsJson[username]) {
        passwdHash = encryptPW(passwd, paswdAsJson[username].iterations, Buffer.from(paswdAsJson[username].salt, "hex"));

        if (passwdHash === paswdAsJson[username]["password"]) {
            pwFound = true;
        }
    }


    return pwFound;
}

//new from submission 4 authenticate
async function authenticate(username, password) {
    let user = await credentials.findOne({
        //username: encodeData(username),
        username: encodeData(username),
        password: password
    });
    return user !== null;
}

async function addUser(username, password) {
    userExists = await credentials.findOne({'username': username});/*.toArray(/!*function(err, docs) {
        assert.equal(err, null);
        console.log("Found the following records");
        console.log(docs);
        callback(docs);
    }*!/);*/
    if (userExists === null) {
        await credentials.insertOne({username: username, password: password});
        return true;
    } else {
        return false;
    }
}

//responsible for finding the session
async function findSession(sessionid) {
    test = await sessions.findOne({id: sessionid});
    return test;
}

async function newSession() {
    let sessionid = randomBytes(64).toString('hex');
    test = await sessions.insertOne({id: sessionid, 'date': Date.now()});
    return sessionid;
}

async function invalidateSession(sessionid) {
    test = await sessions.findOneAndDelete({id: sessionid});
    return test;
}

async function addSqueak(username, recipient, squeak) {
    let options = {weekday: 'short', hour: 'numeric', minute: 'numeric'};
    let time = new Date().toLocaleDateString('sv-SE', options);
    await squeaks.insertOne({
        name: username,
        time: time,
        recipient: recipient,
        squeak: squeak
    });
}

async function getSqueaks(recipient) {
    recipient = encodeData(recipient);
    testSqueak = await squeaks.find({recipient: recipient}).toArray();
    return testSqueak;
}

async function getUsers() {
    // Data.find({}).project({ _id : 1, serialno : 1 }).toArray()
    testUser = await credentials.find().project({"username": 1, _id: 0}).toArray();
    return testUser;
}

//currently only there to check if username already exists
function pwHandler({checkUsername = false, req = "", res = ""} = {}) {
    async function checkUsernameFunction() {
        // passwdData = dataController("/passwd.json", true, req, res);
        // paswdAsJson = JSON.parse(passwdData);
        usernameFound = false;
        /*if (paswdAsJson[username]) {

            if (Object.entries(paswdAsJson[username]).length !== 0) {
                return true;
            } else {
                return false;
            }
        }*/
        userExists = await credentials.findOne({'username': username});
        if (userExists !== null) {
            return true;
        } else {
            return false;
        }
    }

    if (checkUsername === true) {
        return checkUsernameFunction();
    } else {
        return false;
    }
}

//encrypts and saves pw's
function encryptPW(password, iterations = 100000, salt = "", username = "", save = false) {
    if (password.length >= 128) {
        return false;
    }
    if (salt == "") {
        salt = randomBytes(16);
    }
    console.log(getHashes());
    const key = pbkdf2Sync(password.normalize("NFC"), salt, iterations, 64, 'sha256');
    keyAsHex = key.toString('hex');
    saltAsHex = salt.toString('hex');
    console.log(keyAsHex);  // // 745e48...08d59ae'
    user = username.toString();
    if (save == true) {
        dbObject = {[username]: {"iterations": iterations, "salt": saltAsHex, "password": keyAsHex}};
        passwdData = dataController("/passwd.json", true, "", "");
        paswdAsJson = JSON.parse(passwdData);

        //if the username doesnt yet exists
        if (!paswdAsJson[username]) {
            paswdAsJson[username] = dbObject[username];
            jsonDbObject = JSON.stringify(paswdAsJson);
            if (fs.existsSync("passwd.json")) {
                fs.writeFileSync("passwd.json", jsonDbObject);
            }
        }
    }
    return keyAsHex;
}

//encrypts pw
function hmacValue(value = "", secret = "16516080asdfjklb") {
    if (value !== "") {
        let hmac = createHmac('sha256', secret);
        hmac.update(value);
        console.log(`hmac:generated`);
        //console.log(hmac.digest('hex'));
        val = hmac.digest('hex');

        return val;
    }
}

/**
 * @param sessionid
 */
function csrfHandler({
                         compare = false,
                         generate = false,
                         csrf = "",
                         encodedCookie = "",
                         secret = "16516080asdfjklb",
                         save = false,
                         sessionid = ""
                     } = {}) {
    //for the normal synchronize token pattern
    if (save === true && csrf !== "" && sessionid !== "") {
        csrfTokens[sessionid] = csrf;
        console.log(`saved token ${csrf}to cookie ${sessionid}`);
        return true;
    }

//if the double submit cookie solution is used we compare the csrf token with the encrypted one from the cookie
    else if (compare === true && csrf !== "" && encodedCookie !== "" && secret !== "") {
        ec = encodedCookie;
        compareValue = hmacValue(csrf, secret);
        return (ec === compareValue);
    }
//the case for the non double submit cookie solution
    else if (compare === true && csrf !== "" && encodedCookie === "" && secret !== "") {
        ec = encodedCookie;
        compareValue = hmacValue(csrf, secret);
        return (ec === compareValue);
    } else if (generate === true && secret !== "") {
        let randomToken = randomBytes(16);
        let randomTokenHex = randomToken.toString('hex');
        return randomTokenHex;
    } else {
        return false;
    }

}

//old routing function which calls the appropriate handler
async function route(req, res) {
    var url_parts = url.parse(req.url, true);
    path1 = decodeURIComponent(url_parts.pathname);
    pathSplit = path1.split('/');
    if (pathSplit.includes("")) {
        const index = pathSplit.indexOf("");
        if (index > -1) {
            pathSplit.splice(index, 1); // 2nd parameter means remove one item only
        }
    }
    //show atHome application
    if (pathSplit[0] == "login") {
        await login(req, res);
        return true;
    } else if (pathSplit[0] == "logout") {
        logout(req, res);
        return true;
    }
    //show atHome application
    else if (path1 == "/submission2") {
        atHomeHandler(req, res);
        return true;
    }
    //determines if the first parameter is a known room in our smart home
    else if (rooms.includes(pathSplit[0])) {
        atHomeHandler(req, res);
        return true;
    } else if (pathSplit[0] == 'information') {
        information(req, res);
        return true;
    } else {
        return false;
        //staticServerHandler(req, res);
    }
}

//old function used to only allow specific files. needed for older submissions
function checkAllowedType(req, res) {
    allowedTypes = [".js", ".html", ".css"];
    reqUrl = new URL(req.url, 'https://' + req.headers.host);
    if (allowedTypes.includes(path.extname(req.url))) {
        return true;
    } else {
        return false;
    }
}

//returns type of requested ressource
function typehandling(req, res) {
    reqUrl = new URL(req.url, 'https://' + req.headers.host);
    //change file ending when path doesn't end with a file
    if ([".js", ".html", ".css"].includes(path.extname(reqUrl.pathname))) {
        console.log("is one of the allowed files")
        let tmp = path.extname(reqUrl.pathname);
        switch (tmp) {
            case ".js":
                res.writeHead(200, {'Content-Type': 'text/javascript'});
                return "js";
            case ".html":
                res.writeHead(200, {'Content-Type': 'text/html'});
                return "html";
            case ".css":
                res.writeHead(200, {'Content-Type': 'text/css'});
                return "css";
            default:
                // if none of the cases match
                return "";
        }
    }
}

//sometimes needed for older submissions. most of the time the express.static takes over now
function staticServerHandler(req, res) {
    try {
        normalizedUrl = path.normalize(req.url);
        reqUrl = new URL(req.url, 'https://' + req.headers.host);
    } catch (e) {
        res.writeHead(404);
        res.end("404 Eror");
        return;
    }
    //change file endeing when path doesnt end with a file
    if ([".js", ".html", ".css"].includes(path.extname(reqUrl.pathname))) {
        console.log("is one of the allowed files")
        let tmp = path.extname(reqUrl.pathname);
        switch (tmp) {
            //css and js need Public in the path
            case ".js":
            case ".html":
            case ".css":
                if (!reqUrl.pathname.includes("/Public")) {
                    reqUrl.pathname = '/Public' + reqUrl.pathname;
                }
                break;

        }

        switch (tmp) {
            case ".js":
                res.writeHead(200, {'Content-Type': 'text/javascript'});
                break;
            case ".html":
                res.writeHead(200, {'Content-Type': 'text/html'});
                break;
            case ".css":
                res.writeHead(200, {'Content-Type': 'text/css'});
                break;
            default:
                break;
        }

    }
    // else if (reqUrl.pathname.slice(-1) !== '/') {
    //     console.log("has not the ending / inside allowed files")
    //
    //     console.log("has not /");
    //     reqUrl.pathname += '/';
    //     req.url += "/";
    // }


    //check if if path exists
    if (fs.existsSync(__dirname + reqUrl.pathname)) {
        //check if it is a directory and has an
        if (fs.statSync(__dirname + reqUrl.pathname).isDirectory()) {
            //check if index.html exists
            if (reqUrl.pathname.slice(-1) !== '/') {
                console.log("has not /");
                reqUrl.pathname += '/';
            }
            if (fs.existsSync(__dirname + reqUrl.pathname + 'index.html')) {
                reqUrl.pathname += '/index.html';
                fs.readFile(__dirname + reqUrl.pathname, function (err, data) {
                    console.log("calling readfile with index.html path");
                    if (err) {
                        res.writeHead(404);
                        res.end(JSON.stringify(err));
                        return;
                    }
                    res.writeHead(200, {'Content-Type': 'text/html'});
                    res.end(data);
                });

            }
            //else show directory
            else {
                fs.readdir(__dirname + reqUrl.pathname, function (err, data) {
                    if (err) {
                        res.writeHead(404);
                        res.end(JSON.stringify(err));
                        return;
                    }
                    console.log(data.toString());
                    res.writeHead(200, {'Content-Type': 'text/html'});
                    res.write("<table>");
                    for (i = 0; i < data.length; i++) {
                        res.write('<tr><td>' + data[i]
                            + '</td></tr>')
                        console.log(data[i]);
                    }
                    res.write("</table>");

                    res.end();

                });
            }
        } //show what's in the file
        else {
            //is not a directory it has to be a file or something similar
            //need to safe it separately because of some kind of scope problem
            fullPathname = reqUrl.pathname;
            if (checkAllowedType(req, res)) {
                fs.readFile(__dirname + fullPathname, function (err, data) {
                    if (err) {
                        res.writeHead(404);
                        res.end(JSON.stringify(err));
                        return;
                    }
                    res.end(data);
                });
            } else {
                res.writeHead(404);
                res.end("404");
            }
        }
    } else {
        console.log("path doesnt exist: " + __dirname + reqUrl.pathname);
        res.writeHead(404);
        res.end("404 Eror");
    }
}

//logfunction to write important informations in the console
function logStuff(req, res, next) {
    console.log("method: " + req.method + "" +
        "url:" + req.url + " " +
        "content-type: " + req.headers["content-type"] + " " +
        "httpVersion: " + req.httpVersion + " " +
        "dirName: " + __dirname + ' ');

    try {
        reqUrl = new URL(req.url, 'https://' + req.headers.host);
        console.log("pathname: " + reqUrl.pathname);
        console.log("param: " + reqUrl.searchParams);
        console.log("fileending: " + path.extname(reqUrl.pathname));
    } catch (e) {
        console.log("Problem: " + e);
        console.log("not a valid url");
        console.log("pathname: " + "unvalid");
        console.log("param: " + "unvalid");
        console.log("fileending: " + "unvalid");
        res.writeHead(404);
        res.end("404 Eror");
    } finally {
        next();
    }
}

async function inputValidation(req, res, next) {
    //helpfull to detect regular expressions
    function checkUnallowedSigns(text) {
        unallowedSigns = ["[", "]", "+", "*", "^", "(", ")"];
        for (sign in text) {
            signChar = text[sign];
            if (unallowedSigns.includes(signChar)) {
                return true;
            }
        }
        return false;
    }

    console.log(`input validation`);
    try {
        if (req.body !== 'undefined') {
            if (req.body.username !== 'undefined') {
                username = req.body.username;
                unallowedCharacters = checkUnallowedSigns(username);

                //allowed username are only whats in the db as usernames
                //check against regex
                //^(?=.{8,20}$)(?![_.])(?!.*[_.]{2})[a-zA-Z0-9._]+(?<![_.])$
                //adapted from https://stackoverflow.com/questions/12018245/regular-expression-to-validate-username
                let nameregex = new RegExp(`^(?=.{4,20}$)(?![_.\{\}])(?!.*[_.]{2})[a-zA-ZäöüÄÖÜß0-9._" "]+(?<![_.\{\}])$`);
                result = nameregex.test(username);
                if ([`/signin`].includes(req.path)) {
                    if (unallowedCharacters) {
                       // res.json({success: false, reason: "username"});
                        res.json(false);
                        return;
                    }
                    //if its not a valid name
                    if (result !== true) {
                        // validPassword = false;
                        // res.json({success: false, reason: "username"});
                        res.json(false);
                        return;
                    }
                    allUsers = await getUsers();
                    allUserArr = [];
                    for (user in allUsers) {
                        allUserArr[user] = allUsers[user]['username'];
                    }

                    //if the username is not inside the db usernames
                    if (!(allUserArr.includes(username))) {
                        res.json(false);
                        return;
                    }
                }
                if ([`/signup`].includes(req.path)) {
                    if (unallowedCharacters) {
                        res.json({success: false, reason: "username"});
                        return;
                    }
                    //if its not a valid name
                    if (result !== true) {
                        // validPassword = false;
                        res.json({success: false, reason: "username"});
                        return;
                    }
                    allUsers = await getUsers();
                    allUserArr = [];
                    for (user in allUsers) {
                        allUserArr[user] = allUsers[user]['username'];
                    }

                    //if the username is not inside the db usernames
                    if ((allUserArr.includes(username))) {
                        res.json({success: false, reason: "username"});
                        return;
                    }
                }
                try {
                    req.body.username = username.toString();
                } catch (e) {
                    res.json({success: false, reason: "username"});
                    return;
                }
            }
            if (req.body.password !== 'undefined') {
                password = req.body.password;
                unallowedCharacters = checkUnallowedSigns(password);
                let nameregex = new RegExp(`^(?=.{1,20}$)(?![{}])[a-zA-Z0-9._]+(?<![\{\}])$`);
                result = nameregex.test(password);
                if ([`/signin`].includes(req.path)) {
                    if (unallowedCharacters) {
                        res.json(false);
                        return;
                    }
                    //if its not a valid name
                    if (result !== true) {
                        res.json(false);
                        return;
                    }
                }
                if ([`/signup`].includes(req.path)) {
                    if (unallowedCharacters) {
                        res.json({success: false, reason: "password"});
                        return;
                    }
                    //if its not a valid name
                    if (result !== true) {
                        res.json({success: false, reason: "password"});
                        return;
                    }
                }
                try {
                    req.body.password = password.toString();
                } catch (e) {
                    res.json({success: false, reason: "password"});
                    return;
                }
            }
        }
        next();
    } catch (e) {
        console.log("Exception: "+e);
    }


}

//replace some variables with provided ones.
function renderFile({filePath = "", replaceVariables = {}, req, res} = {}) {
    //read filedata
    let file = dataController(filePath, true, req, res);
    for (variable in replaceVariables) {
        file = file.replace("{{" + variable.toString() + "}}", replaceVariables[variable]);
    }

    return file;
}

//atHome handler. submission2
function atHomeHandler(req, res) {
    if ((typehandling(req, res) == "css") || (typehandling(req, res) == "js")) {
        req.url = req.url.replace("/information", "/Public");
        staticServerHandler(req, res);
        return;
    }
    var cookies = cookie.parse(req.headers.cookie || '');
    if (!cookieHandler("athome-session", false, false, true, cookies["athome-session"])) {
        res.setHeader('Set-Cookie', cookie.serialize('athome-session', "", {
            maxAge: -1  // invalidate
        }));

        res.writeHead(302, {"Location": "https://" + req.headers['host'] + "/login"})
        res.end();
        return;
    }
    reqUrl = new URL(req.url, 'https://' + req.headers.host);
    var url_parts = url.parse(req.url, true);

    method = req.method;
    path1 = decodeURIComponent(url_parts.pathname);
    query = url_parts.search;
    allKeysUnencoded = Object.keys(url_parts.query);
    allValuesUnencoded = Object.values(url_parts.query);
    allKeys = [];
    allValues = [];
    for (i = 0; i < allKeysUnencoded.length; i++) {
        allKeys[i] = encodeData(allKeysUnencoded[i]);
        allValues[i] = encodeData(allValuesUnencoded[i]);
    }

    /* replace {{method}} with the request method
     replace {{path}} with the request path
     replace {{query}} with the query string
     replace {{queries}} with a sequence of two column table rows, one for each query parameter.

     */
    //the case if the css etc is asked for
    getRoutingTable = {
        '/livingroom/temperature': function () {
            return roomData.livingroom.temperature;
        },
        '/kitchen/temperature': function () {
            return roomData.kitchen.temperature;
        },
        '/bedroom/temperature': function () {
            return roomData.bedroom.temperature;
        },
        '/kitchen/lights/stove': function () {
            return roomData.kitchen.lights.stove;
        },
        '/kitchen/lights/ceiling': function () {
            return roomData.kitchen.lights.ceiling;
        },
        '/livingroom/lights/sofa': function () {
            return roomData.livingroom.lights.sofa;
        },
        '/livingroom/lights/ceiling': function () {
            return roomData.livingroom.lights.ceiling;
        },
        '/bedroom/lights/bed': function () {
            return roomData.bedroom.lights.bed;
        },
        '/bedroom/lights/ceiling': function () {
            return roomData.bedroom.lights.ceiling;
        }
    };
    if (path1 == "/submission2") {
        let desiredPath = __dirname + "/templates" + "/atHome.template";
        if (fs.existsSync(desiredPath)) {
            console.log("before readfile in atHome");

            //is not a directory it has to be a file or something similar
            fs.readFile(desiredPath, {encoding: "utf-8"}, function (err, data) {
                console.log("im doing something");
                if (err) {
                    res.writeHead(404);
                    res.end(JSON.stringify(err));
                    return;
                }
                res.writeHead(200, {'Content-Type': 'text/html'});
                res.end(data);
            });

            console.log("after readfile in atHome")

        }
    } else if (method == "GET") {
        path1Replace = path1.replace("submission2", "");
        try {
            res.writeHead(200, {'Content-Type': 'application/json'});
            stringifiedValue = JSON.stringify(getRoutingTable[path1Replace.toString()]());
            res.end(stringifiedValue);
        } catch (e) {
            res.writeHead(404);
            res.end(JSON.stringify(e));
            return;
        }

    } else if (method == "POST") {
        postRoutingTable = {
            '/kitchen/lights/stove': function () {
                roomData.kitchen.lights.stove = !(roomData.kitchen.lights.stove);
            },
            '/kitchen/lights/ceiling': function () {
                roomData.kitchen.lights.ceiling = !(roomData.kitchen.lights.ceiling);
            },
            '/livingroom/lights/sofa': function () {
                roomData.livingroom.lights.sofa = !(roomData.livingroom.lights.sofa);
            },
            '/livingroom/lights/ceiling': function () {
                roomData.livingroom.lights.ceiling = !(roomData.livingroom.lights.ceiling);
            },
            '/bedroom/lights/bed': function () {
                roomData.bedroom.lights.bed = !(roomData.bedroom.lights.bed);
            },
            '/bedroom/lights/ceiling': function () {
                roomData.bedroom.lights.ceiling = !(roomData.bedroom.lights.ceiling);
            }
        };
        //flip the value
        try {
            path1Replace = path1.replace("submission2", "");

            postRoutingTable[path1Replace]();
            res.writeHead(200, {'Content-Type': 'application/json'});
            stringifiedValue = JSON.stringify(getRoutingTable[path1Replace.toString()]());
            res.end(stringifiedValue);
        } catch (e) {
            res.writeHead(404);
            res.end(JSON.stringify(e));
            return;
        }
    }
}

//information handler.older submission
function information(req, res) {
    //the case if the css etc is asked for
    if ((typehandling(req, res) == "css") || (typehandling(req, res) == "js")) {
        req.url = req.url.replace("/information", "/Public");
        //reqNew.url="/Public"+reqNew.url;
        staticServerHandler(req, res);
        return;
    }
    reqUrl = new URL(req.url, 'https://' + req.headers.host);
    var url_parts = url.parse(req.url, true);

    method = req.method;
    path1 = decodeURIComponent(url_parts.pathname);
    query = url_parts.search;
    allKeysUnencoded = Object.keys(url_parts.query);
    allValuesUnencoded = Object.values(url_parts.query);
    allKeys = [];
    allValues = [];
    for (i = 0; i < allKeysUnencoded.length; i++) {
        allKeys[i] = encodeData(allKeysUnencoded[i]);
        allValues[i] = encodeData(allValuesUnencoded[i]);
    }

    let desiredPath = __dirname + "/templates" + "/information.template";
    if (fs.existsSync(desiredPath)) {
        console.log("before readfile in information");

        //is not a directory it has to be a file or something similar
        fs.readFile(desiredPath, {encoding: "utf-8"}, function (err, data) {
            console.log("im doing something");
            if (err) {
                res.writeHead(404);
                res.end(JSON.stringify(err));
                return;
            }
            data = data.replace("{{method}}", method.toString());
            data = data.replace("{{path}}", path1.toString());

            if (query !== null) {
                data = data.replace("{{query}}", query.toString());
                queryTable = "";
                queryTable += "<table>" +
                    "<tr>" +
                    "<th>Variable</th>" +
                    "<th>Value</th>" +
                    "</tr>";
                for (i = 0; i < allKeys.length; i++) {
                    queryTable += '<tr><td>' + allKeys[i]
                        + '</td>' +
                        `<td>${allValues[i]}</td>` + '</tr>'
                    //res.write(data[i]+"<br>");
                }
                queryTable += "</table>";

                data = data.replace("{{queries}}", queryTable.toString())
            }
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.end(data);
        });

        console.log("after readfile in information")
    }
}

//checks for valid cookies and storres them in the session
async function sessionMiddleware(req, res, next) {
    // var cookies = cookie.parse(req.headers.cookie || '');
    let cookies = req.cookies;
    cookieName = req.cookieName;
    try {
        if (Object.entries(cookies).length !== 0) {
            if (cookies[cookieName]) {
                cookieAsJson = JSON.parse(cookies[cookieName]/*, (key, value) => {
                    try {
                        if (typeof value === 'string') {
                            JSON.parse(value);
                        } else {
                            return value;
                        }
                    } catch (e) {
                        console.log(e);
                    }
                }*/);
            }
        } else {
            cookieAsJson = {};
        }

        // if (!cookieHandler(cookieName, false, false, true, cookieAsJson["sessionid"])) {
        if (!await findSession(cookieAsJson["sessionid"])) {
            res.setHeader('Set-Cookie', cookie.serialize(cookieName, "", {
                maxAge: -1  // invalidate
            }));

            // res.writeHead(302, {"Location": "https://" + req.headers['host'] + "/login"})
            // res.end();

            //return false;
        } else {
            req.session = cookieAsJson;
        }
    } catch (e) {
        //had to disable it because otherwise the old routing doesnt work
        //throw new Error('Invalid cookies');
        console.log(e);
        //next();
    }

    next();

}

//has currently no function anymore
function csrfMiddleware(req, res, next) {
    //generate new csrf token
    /*let csrfToken = csrfHandler({generate: true});
    req.csrf = csrfToken;*/
    //encryptedCSRF = hmacValue(csrfToken);
    console.log("csrf: " + csrfToken);//+ " encrypted: " + encryptedCSRF);

    //res.cookie("csrfToken", encryptedCSRF, {maxAge: (60 * 30 * 1000), httpOnly: true, secure: true, sameSite: true});
    next();
}

//login handler.older submissions
async function login(req, res) {
    if ((typehandling(req, res) == "css") || (typehandling(req, res) == "js")) {
        req.url = req.url.replace("/information", "/Public");
        //reqNew.url="/Public"+reqNew.url;
        staticServerHandler(req, res);
        return;
    }
    reqUrl = new URL(req.url, 'https://' + req.headers.host);
    var url_parts = url.parse(req.url, true);

    method = req.method;
    path1 = decodeURIComponent(url_parts.pathname);
    query = url_parts.search;
    allKeysUnencoded = Object.keys(url_parts.query);
    allValuesUnencoded = Object.values(url_parts.query);
    allKeys = [];
    allValues = [];
    for (i = 0; i < allKeysUnencoded.length; i++) {
        allKeys[i] = encodeData(allKeysUnencoded[i]);
        allValues[i] = encodeData(allValuesUnencoded[i]);
    }

    if (method == "GET") {
        try {
            let desiredPath = __dirname + "/templates" + "/login.template";
            if (fs.existsSync(desiredPath)) {
                console.log("before readfile in login");

                //is not a directory it has to be a file or something similar
                fs.readFile(desiredPath, {encoding: "utf-8"}, function (err, data) {
                    console.log("im doing something");
                    if (err) {
                        res.writeHead(404);
                        res.end(JSON.stringify(err));
                        return;
                    }
                    res.writeHead(200, {'Content-Type': 'text/html'});
                    res.end(data);
                });

                console.log("after readfile in login")
            }
        } catch (e) {
            res.writeHead(404);
            res.end(JSON.stringify(e));
            return;
        }

    } else if (method == "POST") {
        try {
            let dataAsJson;
            const buffers = [];
            for await (const chunk of req) {
                buffers.push(chunk);
            }

            if (buffers.length !== 0) {
                const data = Buffer.concat(buffers).toString();


                dataAsJson = qs.parse(data);
                console.log("Bodydata: ");
                for (dates in dataAsJson) {

                    if (dates == "password") {
                        console.log(dates + dataAsJson[dates]);
                    } else {
                        console.log(dates + ":" + dataAsJson[dates]);
                    }
                }
            }
            if (await userAuthenticated(dataAsJson.username, dataAsJson.password, req, res)) {
                res.setHeader('Set-Cookie', cookie.serialize('athome-session', cookieHandler('athome-session', true, false, false), {
                    maxAge: 60 * 30, httpOnly: true, secure: true  // 30 minutes
                }));
                res.writeHead(302, {"Location": "https://" + req.headers['host'] + "/submission2"})
                res.end("authenticated");
            } else {
                let desiredPath = __dirname + "/templates" + "/login.template";
                if (fs.existsSync(desiredPath)) {
                    console.log("before readfile in login Post");

                    //is not a directory it has to be a file or something similar
                    fs.readFile(desiredPath, {encoding: "utf-8"}, function (err, data) {
                        console.log("im doing something");
                        if (err) {
                            res.writeHead(404);
                            res.end(JSON.stringify(err));
                            return;
                        }
                        res.writeHead(200, {'Content-Type': 'text/html'});
                        data = data.replace("none", "block");

                        res.end(data);
                    });

                    console.log("after readfile in login")
                }
            }
        } catch (e) {
            res.writeHead(404);
            res.end(JSON.stringify(e));
            return;
        }
    }
}

//logout handler. older submissions
async function logout(req, res) {
    try {
        if (req.method == "GET") {
            res.writeHead(404);
            res.end("not allowed");
            return;
        }
        let dataAsJson;
        const buffers = [];
        for await (const chunk of req) {
            buffers.push(chunk);
        }

        if (buffers.length !== 0) {
            const data = Buffer.concat(buffers).toString();


            dataAsJson = qs.parse(data);
            console.log("Bodydata: ");
            for (dates in dataAsJson) {

                if (dates == "password") {
                    console.log(dates + dataAsJson[dates]);
                } else {
                    console.log(dates + ":" + dataAsJson[dates]);
                }
            }
        }
        var cookies = cookie.parse(req.headers.cookie || '');
        //stringifiedValue = JSON.stringify(getRoutingTable[path1.toString()]());
        //cookie doesnt exist
        if (!await cookieHandler("athome-session", false, false, true, cookies["athome-session"])) {
            //invalidate the client cookie
            res.setHeader('Set-Cookie', cookie.serialize('athome-session', "", {
                maxAge: -1  // invalidate
            }));
            res.writeHead(404);

            res.end();
            return;
        } else {


            cookieHandler("athome-session", false, true, false, cookies["athome-session"]);
            //res.writeHead(302, {"Location": "https://" + req.headers['host'] + "/login"})
            res.setHeader('Set-Cookie', cookie.serialize('athome-session', "", {
                maxAge: -1  // invalidate
            }));
            res.writeHead(302, {"Location": "/login"})

            res.end();
            return;
        }
    } catch (e) {
        res.writeHead(404);
        res.end(JSON.stringify(e));
        return;
    }

}

//squeak handler responsibler for saving and loading squeaks
function squeakHandler(save = false, squeakObject = {}, load = false) {
    if (save === true) {
        squeakData = dataController("/squeaks.json", true, "", "");
        squeakDatadAsJson = JSON.parse(squeakData);
        id = randomBytes(16).toString('hex');
        squeakDatadAsJson[id] = squeakObject;
        squeakStringified = JSON.stringify(squeakDatadAsJson);
        //passwdHash = encryptPW(passwd, paswdAsJson[username].iterations, Buffer.from(paswdAsJson[username].salt, "hex"));
        if (fs.existsSync("squeaks.json")) {
            fs.writeFileSync("squeaks.json", squeakStringified);

        } else {
            return false;
        }
        return true;
    } else if (load === true) {
        squeakData = dataController("/squeaks.json", true, "", "");
        return JSON.parse(squeakData);
    }
}

//options for https
const options = {
    key: fs.readFileSync('cert/server.key'),
    cert: fs.readFileSync('cert/server.crt')
};
/*var server = https.createServer(options, app);*/
// Register '.mustache' extension with The Mustache Express
app.engine('mustache', mustacheExpress());
app.engine('template', mustacheExpress());

app.set('view engine', 'mustache');
app.set('views', __dirname + '/templates');
//call cookieParser every time
app.use(cookieParser());
//set the needed cookiename so every function can use it
app.use((req, res, next) => {
    req.cookieName = "squeak-session";
    next();
});
app.use(sessionMiddleware);
//log for every request
app.use(logStuff);
//different paths for submission 3
app.post('/signin', express.json(), inputValidation, async (req, res) => {
    req.cookieName = "squeak-session";
    //if there is a nonenmpty body and username, password
    if (typeof (req.body) !== 'undefined' && Object.entries(req.body).length !== 0) {

        //if user ist authenticated:set cookie, session and send json with true
        //else false
        // if (await userAuthenticated(req.body.username, req.body.password, req, res)) {
        if (await authenticate(req.body.username, req.body.password)) {
            //set cookie
            let cookieId = await newSession();
            //save the cookie

            //cookieHandler(req.cookieName, true, false, false);
            //set session
            req.session = {"sessionid": cookieId, "username": req.body.username};

            if (req.session["sessionid"]) {
                //generate csrf token
                let csrfToken = csrfHandler({generate: true});
                req.csrf = csrfToken;
                csrfHandler({csrf: csrfToken, save: true, sessionid: req.session["sessionid"]});
            } else {
                res.json(false);
                return;
            }
            res.cookie(req.cookieName, JSON.stringify(req.session), {
                maxAge: (60 * 30 * 1000),
                httpOnly: true,
                secure: true,
                sameSite: true
            });

            res.json(true);
        } else {
            res.json(false);
            // res.status(404).send('Sorry, we cannot find that!')
        }

    } else {
        res.status(404).send('Sorry, something went wrong!')
    }
});
app.post('/signup', express.json(),inputValidation, async (req, res) => {
    req.cookieName = "squeak-session";
    //if there is a nonenmpty body and username, password
    if (typeof (req.body) !== 'undefined' && Object.entries(req.body).length !== 0) {
        function checkUnallowedSigns(text) {
            unallowedSigns = ["[", "]", "+", "*", "^", "(", ")"];
            for (sign in text) {
                signChar = text[sign];
                if (unallowedSigns.includes(signChar)) {
                    return true;
                }
            }
            return false;
        }

        username = req.body.username;
        password = req.body.password;
        //if user ist authenticated:set cookie, session and send json with true
        //else false
        let validUsername = username !== undefined && username.length >= 4;
        let validPassword = password !== undefined && password.length >= 8;

        if (validUsername) {
            username = encodeData(username);
            if (checkUnallowedSigns(username)) {
                res.json({success: false, reason: "username"});
                return;
            }
            //if names already taken
            usernameAlreadytaken = await pwHandler({checkUsername: true, req: req, res: res});
            if (usernameAlreadytaken) {
                validUsername = false;
                res.json({success: false, reason: "username"});
                return;
            }
        } else {
            res.json({success: false, reason: "username"});
            return;
        }
        if (validPassword) {
            let nameregex = new RegExp(username);
            result = validPassword &= !nameregex.test(password);
            if (result === 0) {
                validPassword = false;
                res.json({success: false, reason: "password"});
            }
        } else {
            res.json({success: false, reason: "password"});
        }
        //in this case everything is allright and pw and username are ok
        if (validPassword && validUsername) {
            //set cookie
            let cookieId = await newSession();
            //cookieHandler(req.cookieName, true, false, false);
            //set session
            req.session = {"sessionid": cookieId, "username": req.body.username};
            if (req.session["sessionid"]) { //session id was set
                //generate csrf token
                let csrfToken = csrfHandler({generate: true});
                req.csrf = csrfToken;
                csrfHandler({csrf: csrfToken, save: true, sessionid: req.session["sessionid"]});
            } else { //now session id was set
                res.json(false);
                return;
            }
            res.cookie(req.cookieName, JSON.stringify(req.session), {
                maxAge: (60 * 30 * 1000),
                httpOnly: true,
                secure: true,
                sameSite: true
            });
            //save pw locally and in "db"
            //pwHash = encryptPW(password, 100000, "", username, true);
            //locally
            //passwdData = dataController("/passwd.json", true, "", "");
            //paswdAsJson = JSON.parse(passwdData);
            //put in the passord and username if dont exist already
            if (!await addUser(username, password)) {
                res.json({success: false});
                return
            }

            req.session["credentials"] = {"username": username, "password": password};
            res.json({success: true});
        }
    } else {
        res.status(404).send('Sorry, something went wrong!')
    }
    /* if (await userAuthenticated(req.body.username, req.body.password, req, res)) {


         //res.writeHead(302, {"Location": "https://" + req.headers['host']})
         res.json(true);
     } else {
         res.json(false);
         // res.status(404).send('Sorry, we cannot find that!')
     }

    }*/
});
app.post('/signout', async (req, res) => {
    try { //invalidate the cookie
        let cookies = req.cookies;
        cookieName = "squeak-session";
        if (cookies[cookieName]) {
            cookieAsJson = JSON.parse(cookies[cookieName]);
        }

        //if cookkie as json not empty
        if (typeof (req.session) !== 'undefined') {
            //if its not an allowed cookie invalidate it. but should be done already by the sessionmiddleware
            // if (!await cookieHandler(cookieName, false, false, true, req.session.sessionid)) {
            if (!await findSession(req.session.sessionid)) {
                //invalidate the client cookie
                res.clearCookie(cookieName);
                res.writeHead(404);
                res.send(false);
                return;
            } else {


                //cookieHandler(cookieName, false, true, false, req.session.sessionid);
                //destroy the cookie
                await invalidateSession(req.session.sessionid);
                //res.writeHead(302, {"Location": "https://" + req.headers['host'] + "/login"})
                /*res.setHeader('Set-Cookie', cookie.serialize('athome-session', "", {
                maxAge: -1  // invalidate
            }));*/
                res.clearCookie(cookieName);
                // res.writeHead(302, {"Location": "/login"})

                res.send(true);
                return;
            }
        }
        res.send(true);
    } catch (e) {
        throw new Error('Invalid cookies');
    }

});
app.post('/squeak', express.urlencoded(), (req, res) => {
    if (typeof (req.session) !== 'undefined') {
        if (req.body.squeak) {
            squeak = req.body.squeak;
            let token = "";
            if (req.body.CSRFToken !== undefined) {
                token = req.body.CSRFToken;
            }
            //old way with double submit cookie
            /*if (req.cookies["csrfToken"] && !csrfHandler({
                compare: true,
                csrf: token,
                encodedCookie: req.cookies["csrfToken"]
            })) {
                res.status(404).send('Invalid CSRF!');
                return;
            }*/
            //way with synchronize token pattern
            if (!(req.session.sessionid && csrfTokens[req.session.sessionid] && (csrfTokens[req.session.sessionid] === token))) {
                if (req.session.sessionid) {
                    invalidateSession(req.session.sessionid);
                }
                res.clearCookie(cookieName);
                res.status(404).send('Invalid CSRF!');
                return;
            }
            // console.log(Date.now().toLocaleString().toString());
            const date = new Date();
            const dateString = date.toDateString();
            const time = date.toLocaleTimeString();
            // console.log(dateString+" "+time);
            //old way
            /* squeakObject = {username: req.session["username"], cardText: squeak, time: (dateString + " " + time)}
             squeakHandler(true, squeakObject);*/
            //db way
            addSqueak(req.session["username"], req.body.recipient, req.body.squeak);
        }

        // res.send(file);
        /* res.render('/templates/squeakHomepage.template', function (err, html) {
             res.send(html)
         })*/
        res.redirect(302, '/')
        //res.send("hallo");
    } else {
        res.send();
    }
})
//serve static files from Public
app.use(express.static('Public', {index: false}));
//handler to keep functionality for old routes from other submissions
app.use('/', async (req, res, next) => {
    //req.url = req.originalUrl;
    if (!await route(req, res)) {
        next();
    } else {
        console.log("no further handling, old route took other")
    }
})


//routerfunction to handler with "/" requests
router.use(sessionMiddleware, async (req, res, next) => {
    //if session valid serve the squeaks
    if (typeof (req.session) !== 'undefined') {

        /* if (csrfTokens[req.session.sessionid]) {
             options["csrf_token"] = csrfTokens[req.session.sessionid];
         }*/
        // res.render('squeakHomepage', options)
        Promise.all([getUsers(), getSqueaks('all'), getSqueaks(req.session.username),]).then(
            results => {
                res.render('squeakHomepage', {
                    username: req.session.username,
                    users: results[0],
                    squeaks: results[1].reverse(),
                    squeals: results[2].reverse(),
                    csrf_token: csrfTokens[req.session.sessionid]
                });
            });
        //old way
        /*file = renderFile({
            filePath: "/templates/squeakHomepage.template",
            replaceVariables: {username: req.session["username"], squeaks: endSqueaks},
            req: req,
            res: res
        });*/
        // res.send(await getFileData(__dirname + "/templates" + "/squeakHomepage.template", true));
        //res.send(file);
    } else {//if not valid serve
        res.send(await getFileData(__dirname + "/templates" + "/squeakSignup.template", true));

    }
});

app.use('/', router);

// error handler
app.use((err, req, res, next) => {
    res.status(400).send(err.message)
    console.log(err);
})


const deleteIntervall = 1000 * 60 * 30; //in ms =30 minutes
//make server connection
MongoClient.connect(mongoURL)
    .then(async (cluster) => {
            mongoCluster = cluster;

            let db = cluster.db('Squeak!');
            squeaks = db.collection('squeaks');
            credentials = db.collection('credentials');
            sessions = db.collection('sessions');
            //tet = await addUser("testUssser","testPw");
            let attack = `$gt": "`;
            let test1 = encodeData(`{$gt:''}`);
            let test2 = {$regex: 'daniel', $options: "si"};
            let test = await credentials.findOne({username: test2, password: {"$gt": ""}});//{"$gt": ""}


            let server = https.createServer(options, app);
            server.listen(8000);
            setInterval(deleteOldCookies, deleteIntervall, deleteIntervall);//cookies should be deleted on the server after 30 minutes
            // cluster.close();
        }
    ).catch((error) => {
        console.log(error);

    }
);
//server.listen(8000);

