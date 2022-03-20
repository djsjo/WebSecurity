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
const {
    getHashes
} = require('crypto');
const {
    pbkdf2Sync
} = require('crypto');
const {
    randomBytes,
} = require('crypto');

let rooms = ["livingroom",
    "bedroom",
    "kitchen"];

let roomData = {
    kitchen: {temperature: 24, lights: {stove: false, ceiling: false}},
    livingroom: {temperature: 22, lights: {sofa: true, ceiling: false}},
    bedroom: {temperature: 20, lights: {bed: true, ceiling: false}}
};
let validcookies = {
    'athome-session': {},
    'squeak-session': {123: 123}
};


function deleteOldCookies(keepAliveTime) {
    currentTime = Date.now();
    console.log(Date.now() + "hello Geek" + keepAliveTime);
    for (cookieTypes in validcookies) {
        for (eachCookie in validcookies[cookieTypes]) {
            if ((currentTime - validcookies[cookieTypes][eachCookie]) >= keepAliveTime) {
                delete validcookies[cookieTypes][eachCookie];
            }
        }
    }


}

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

//returns the data of the file in the path as a string
function dataController(pathNameInCurrentDirectory, sync, req, res) {
    let desiredPath = __dirname + pathNameInCurrentDirectory;
    let ressourceData = "";
    if (fs.existsSync(desiredPath)) {
        console.log(`before readfile in ${pathNameInCurrentDirectory}`);

        //is not a directory it has to be a file or something similar
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

function encodeData(origData) {
    return encodeURIComponent(origData);

}

//handler function which returns if the credentials are correct
//and the user ist authenticated
async function userAuthenticated(username, passwd, req, res) {
    passwdData = dataController("/passwd.json", true, req, res);
    paswdAsJson = JSON.parse(passwdData);
    pwFound = false;
    if (paswdAsJson[username]) {
        passwdHash = encryptPW(passwd, paswdAsJson[username].iterations, Buffer.from(paswdAsJson[username].salt, "hex"));

        if (passwdHash === paswdAsJson[username]["password"]) {
            pwFound = true;
        }
    }


    return pwFound;
}

function pwHandler({checkUsername = false, req = "", res = ""} = {}) {
    function checkUsernameFunction() {
        passwdData = dataController("/passwd.json", true, req, res);
        paswdAsJson = JSON.parse(passwdData);
        usernameFound = false;
        if (paswdAsJson[username]) {

            if (Object.entries(paswdAsJson[username]).length !== 0) {
                return true;
            } else {
                return false;
            }
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
        //todo hier läuft noch was nicht
        dbObject = {[username]: {"iterations": iterations, "salt": saltAsHex, "password": keyAsHex}};
        passwdData = dataController("/passwd.json", true, "", "");
        paswdAsJson = JSON.parse(passwdData);

        if (!paswdAsJson[username]) {
            paswdAsJson[username] = dbObject[username];
            jsonDbObject = JSON.stringify(paswdAsJson);
            //passwdHash = encryptPW(passwd, paswdAsJson[username].iterations, Buffer.from(paswdAsJson[username].salt, "hex"));
            if (fs.existsSync("passwd.json")) {
                fs.writeFileSync("passwd.json", jsonDbObject);
            }
        }
    }
    return keyAsHex;
}

//routing function which calls the appropriate handler
function route(req, res) {
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
        login(req, res);
    } else if (pathSplit[0] == "logout") {
        logout(req, res);
    }
    //show atHome application
    else if (pathSplit[0] == "" && path1 == "/") {
        atHomeHandler(req, res);
    }
    //determines if the first parameter is a known room in our smart home
    else if (rooms.includes(pathSplit[0])) {
        atHomeHandler(req, res);
    } else if (pathSplit[0] == 'information') {
        information(req, res);
    } else {
        staticServerHandler(req, res);
    }
}

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

//atHome handler
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
    if (pathSplit[0] == "" && path1 == "/") {
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
        try {
            res.writeHead(200, {'Content-Type': 'application/json'});
            stringifiedValue = JSON.stringify(getRoutingTable[path1.toString()]());
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
            postRoutingTable[path1]();
            res.writeHead(200, {'Content-Type': 'application/json'});
            stringifiedValue = JSON.stringify(getRoutingTable[path1.toString()]());
            res.end(stringifiedValue);
        } catch (e) {
            res.writeHead(404);
            res.end(JSON.stringify(e));
            return;
        }
    }
}

//checks for valid cookies and storres them in the session
function sessionMiddleware(req, res, next) {
    // var cookies = cookie.parse(req.headers.cookie || '');
    let cookies = req.cookies;
    cookieName = req.cookieName;
    /* try {
         await externallyValidateCookie(cookies.testCookie)
     } catch {
         throw new Error('Invalid cookies')
     }*/
    try {
        if (Object.entries(cookies).length !== 0) {
            cookieAsJson = JSON.parse(cookies[cookieName]);

            if (!cookieHandler(cookieName, false, false, true, cookieAsJson["sessionid"])) {
                res.setHeader('Set-Cookie', cookie.serialize(cookieName, "", {
                    maxAge: -1  // invalidate
                }));

                // res.writeHead(302, {"Location": "https://" + req.headers['host'] + "/login"})
                // res.end();

                //return false;
            } else {
                req.session = cookieAsJson;
            }
        }
    } catch (e) {
        throw new Error('Invalid cookies');
    }

    next();

}

//information handler
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

//login handler
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
                    maxAge: 60 * 30  // 30 minutes
                }));
                res.writeHead(302, {"Location": "https://" + req.headers['host']})
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


//options for https
const options = {
    key: fs.readFileSync('cert/server.key'),
    cert: fs.readFileSync('cert/server.crt')
};
var server = https.createServer(options, app);
// app.use('/login', (req, res,next) => {
//     req.url=req.originalUrl;
//     route(req, res);
//     next('route');
//
// });
app.use(cookieParser());
app.use(logStuff);
// app.use("(*.js*)|(*.html*)|(*.css*)",express.static('Public'));
app.post('/signin', express.json(), async (req, res) => {
    req.cookieName = "squeak-session";
    //if there is a nonenmpty body and username, password
    if (typeof (req.body) !== 'undefined' && Object.entries(req.body).length !== 0) {

        //if user ist authenticated:set cookie, session and send json with true
        //else false
        if (await userAuthenticated(req.body.username, req.body.password, req, res)) {
            //set cookie
            let cookieId = cookieHandler(req.cookieName, true, false, false);
            //set session
            req.session = {"sessionid": cookieId, "username": req.body.username};
            res.cookie(req.cookieName, JSON.stringify(req.session), {maxAge: (60 * 30 * 1000)});

            //res.writeHead(302, {"Location": "https://" + req.headers['host']})
            res.json(true);
        } else {
            res.json(false);
            // res.status(404).send('Sorry, we cannot find that!')
        }

    } else {
        res.status(404).send('Sorry, something went wrong!')
    }
});
app.post('/signup', express.json(), async (req, res) => {
    req.cookieName = "squeak-session";
    //if there is a nonenmpty body and username, password
    if (typeof (req.body) !== 'undefined' && Object.entries(req.body).length !== 0) {
        username = req.body.username;
        password = req.body.password;
        //if user ist authenticated:set cookie, session and send json with true
        //else false
        let validUsername = username !== undefined && username.length >= 4;
        let validPassword = password !== undefined && password.length >= 8;

        //todo maninupulate message so ich cant say both messages are wrong
        //todo save pw in pwhandler local and inmemory and save everything including cookies etc.
        if (validUsername) {
            //if names already taken
            usernameAlreadytaken = pwHandler({checkUsername: true});
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
            let cookieId = cookieHandler(req.cookieName, true, false, false);
            //set session
            req.session = {"sessionid": cookieId, "username": req.body.username};
            res.cookie(req.cookieName, JSON.stringify(req.session), {maxAge: (60 * 30 * 1000)});
            //save pw locally and in "db"
            pwHash = encryptPW(password, 100000, "", username, true);
            //locally
            passwdData = dataController("/passwd.json", true, "", "");
            paswdAsJson = JSON.parse(passwdData);
            req.session["db"]=paswdAsJson;
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
app.post('/signout',(req,res)=>{
    //invalidate the cookie
    let cookies = req.cookies;
    cookieName = "squeak-session";
    cookieAsJson = JSON.parse(cookies[cookieName]);
    logout(req,res);
    //if cookkie as json not empty
    res.send(true);

});
app.use(express.static('Public', {index: false}));
router.use((req, res, next) => {
    req.cookieName = "squeak-session";
    /*res.setHeader('Set-Cookie', cookie.serialize('squeak-session', JSON.stringify({
        sessionid: 123,
        username: "A. Church "
    }), {
        maxAge: 60 * 30  // 30 minutes
    }));*/
    // res.end();
    next();
}, sessionMiddleware, async (req, res, next) => {
    //if session valid serve static file
    if (typeof (req.session) !== 'undefined') {
        res.send(await getFileData(__dirname + "/templates" + "/squeakHomepage.template", true));
    } else {
        res.send(await getFileData(__dirname + "/templates" + "/squeakSignup.template", true));

    }
    //res.writeHead(200, {'Content-Type': 'text/html'});
    //
    //next();
});

//encryptPW("fisksoppa",100000,"","daniel",true);
/*router.use('/user/:id', (req, res, next) => {
    console.log('Request URL:', req.originalUrl)
    var cookies = cookie.parse(req.headers.cookie || '');
    next()
}, (req, res, next) => {
    console.log('Request Type:', req.method)
    next()
})*/
// app.use(express.static("Public"));
app.use('/', router);
// error handler
app.use((err, req, res, next) => {
    res.status(400).send(err.message)
    console.log(err);
})
//app.use(express.static('Public'));

/*app.use('/', (req, res) => {
    req.url = req.originalUrl;
    route(req, res);
})*/


// app.listen = function () {
//     const server = https.createServer(options, this);
//     return server.listen.apply(server, arguments)
// }
// server.listen(port, () => {
//     console.log(`Example app listening on port ${port}`);
// });
const deleteIntervall = 1000 * 60 * 30;
setInterval(deleteOldCookies, deleteIntervall, deleteIntervall);//cookies should be deleted on the server after 30 minutes
server.listen(8000);

