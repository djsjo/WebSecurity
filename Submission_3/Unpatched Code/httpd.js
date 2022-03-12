var https = require('https');
var fs = require('fs');
var qs = require('querystring');
var cookie = require('cookie');
//const {url} = require('inspector');
const path = require('path');
const url = require('url');

let rooms = ["livingroom",
    "bedroom",
    "kitchen"];

let roomData = {
    kitchen: {temperature: 24, lights: {stove: false, ceiling: false}},
    livingroom: {temperature: 22, lights: {sofa: true, ceiling: false}},
    bedroom: {temperature: 20, lights: {bed: true, ceiling: false}}
};
let validcookies = {
    'athome-session': []
};
let currentCookieCount = 1;

function cookieHandler(cookieName = "", newCookie = true, destroy = false, verify = false, cookieId = "") {
    if (newCookie && cookieName !== "") {
        cookieId = currentCookieCount;
        currentCookieCount += 1;
        validcookies[cookieName].push(cookieId.toString());
        return cookieId;

    } else if (destroy && cookieId !== "") {
        for (i = 0; i < validcookies[cookieName].length; i++) {
            if (validcookies[cookieName][i] === cookieId) {
                validcookies[cookieName].splice(0, 1);
            }
        }
    } else if (verify && cookieId !== "" && cookieName !== "") {
        for (i = 0; i < validcookies[cookieName].length; i++) {
            if (validcookies[cookieName][i] == cookieId) {
                return true;
            }
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
//and the user ist autehenticated
async function userAuthenticated(username, passwd, req, res) {
    passwdData = dataController("/passwd.json", true, req, res);
    paswdAsJson = JSON.parse(passwdData);
    console.log("test");
    pwFound = false;
    for (pwData in paswdAsJson) {
        if (username === pwData && passwd === paswdAsJson[pwData]) {
            pwFound = true;
            break;
        }
    }

    return pwFound;
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
    //determines if the first parameteter is a known room in our smart home
    else if (rooms.includes(pathSplit[0])) {
        atHomeHandler(req, res);
    } else if (pathSplit[0] == 'information') {
        information(req, res);
    } else {
        staticServerHandler(req, res);
    }
}

//returns type of requested ressource
function typehandling(req, res) {
    reqUrl = new URL(req.url, 'https://' + req.headers.host);
    // console.log(reqUrl.pathname);
    // console.log(reqUrl.searchParams);
    // console.log(path.extname(reqUrl.pathname));
    //change file endeing when path doesnt end with a file
    if ([".js", ".html", ".css"].includes(path.extname(reqUrl.pathname))) {
        console.log("is one of the allowed files")
        let tmp = path.extname(reqUrl.pathname);
        switch (tmp) {
            case ".js":
                // Anweisungen werden ausgeführt,
                res.writeHead(200, {'Content-Type': 'text/javascript'});
                return "js";
            case ".html":
                // Anweisungen werden ausgeführt,
                res.writeHead(200, {'Content-Type': 'text/html'});
                return "html";
            case ".css":
                // Anweisungen werden ausgeführt,
                res.writeHead(200, {'Content-Type': 'text/css'});
                return "css";
            default:
                // Anweisungen werden ausgeführt,
                // falls keine der case-Klauseln mit expression übereinstimmt
                return "";
        }
    }
}

function staticServerHandler(req, res) {
    //res.end();
    try {
        reqUrl = new URL(req.url, 'https://' + req.headers.host);
    } catch (e) {
        res.writeHead(404);
        res.end("404 Eror");
        return;
    }
    // console.log(reqUrl.pathname);
    // console.log(reqUrl.searchParams);
    // console.log(path.extname(reqUrl.pathname));
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
                // Anweisungen werden ausgeführt,
                res.writeHead(200, {'Content-Type': 'text/javascript'});
                break;
            case ".html":
                // Anweisungen werden ausgeführt,
                res.writeHead(200, {'Content-Type': 'text/html'});
                break;
            case ".css":
                // Anweisungen werden ausgeführt,
                res.writeHead(200, {'Content-Type': 'text/css'});
                break;
            default:
                // Anweisungen werden ausgeführt,
                // falls keine der case-Klauseln mit expression übereinstimmt
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
                        //res.write(data[i]+"<br>");
                        console.log(data[i]);
                    }
                    res.write("</table>");

                    res.end();

                });
            }
        } else {
            //is not a directory it has to be a file or something similar
            fs.readFile(__dirname + reqUrl.pathname, function (err, data) {
                if (err) {
                    res.writeHead(404);
                    res.end(JSON.stringify(err));
                    return;
                }
                //res.writeHead(200);
                //res.writeHead(200, {'Content-Type': 'text/html'});
                res.end(data);
            });
        }

    } else {
        console.log("path doesnt exist: " + __dirname + reqUrl.pathname);
        res.writeHead(404);
        res.end("404 Eror");
    }
}

function logStuff(req, res) {
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
    }
}

//atHome handler
function atHomeHandler(req, res) {
    if ((typehandling(req, res) == "css") || (typehandling(req, res) == "js")) {
        //reqNew={};
        //console.log(typeof(req));
        //resNew={};
        // Object.assign(reqNew,req);
        // Object.assign(resNew,res);
        req.url = req.url.replace("/information", "/Public");
        //reqNew.url="/Public"+reqNew.url;
        staticServerHandler(req, res);
        return;
    }
    var cookies = cookie.parse(req.headers.cookie || '');
    if (!cookieHandler("athome-session", false, false, true, cookies["athome-session"])) {
        res.writeHead(302, {"Location": "https://" + req.headers['host'] + "/login"})
        res.end();
        return;
    }
    reqUrl = new URL(req.url, 'https://' + req.headers.host);
    // console.log(reqUrl.pathname);
    // console.log(reqUrl.searchParams);
    // console.log(path.extname(reqUrl.pathname));
    var url_parts = url.parse(req.url, true);

    method = req.method;
    path1 = decodeURIComponent(url_parts.pathname);
    query = url_parts.search;
    // "url:" + req.url + " " +
    // "content-type: " + req.headers["content-type"] + " " +
    // "httpVersion: " + req.httpVersion + " " +
    // "dirName: " + __dirname + ' ');
    allKeysUnencoded = Object.keys(url_parts.query);
    allValuesUnencoded = Object.values(url_parts.query);
    // allKeys=allKeysUnencoded;
    // allValues=allValuesUnencoded;
    allKeys = [];
    allValues = [];
    for (i = 0; i < allKeysUnencoded.length; i++) {
        allKeys[i] = encodeData(allKeysUnencoded[i]);
        allValues[i] = encodeData(allValuesUnencoded[i]);

        //res.write(data[i]+"<br>");
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
                // data = data.replace("{{method}}", method.toString());
                // data = data.replace("{{path}}", path1.toString());
                //
                // if (query !== null) {
                //     data = data.replace("{{query}}", query.toString());
                //     queryTable = "";
                //     queryTable += "<table>" +
                //         "<tr>" +
                //         "<th>Variable</th>" +
                //         "<th>Value</th>" +
                //         "</tr>";
                //     for (i = 0; i < allKeys.length; i++) {
                //         queryTable += '<tr><td>' + allKeys[i]
                //             + '</td>' +
                //             `<td>${allValues[i]}</td>` + '</tr>'
                //         //res.write(data[i]+"<br>");
                //     }
                //     queryTable += "</table>";
                //
                //     data = data.replace("{{queries}}", queryTable.toString())
                // }
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

// read as string

//

}

//information handler
function information(req, res) {

    /* replace {{method}} with the request method
     replace {{path}} with the request path
     replace {{query}} with the query string
     replace {{queries}} with a sequence of two column table rows, one for each query parameter.

     */
    //the case if the css etc is asked for
    if ((typehandling(req, res) == "css") || (typehandling(req, res) == "js")) {
        //reqNew={};
        //console.log(typeof(req));
        //resNew={};
        // Object.assign(reqNew,req);
        // Object.assign(resNew,res);
        req.url = req.url.replace("/information", "/Public");
        //reqNew.url="/Public"+reqNew.url;
        staticServerHandler(req, res);
        return;
    }
    reqUrl = new URL(req.url, 'https://' + req.headers.host);
    // console.log(reqUrl.pathname);
    // console.log(reqUrl.searchParams);
    // console.log(path.extname(reqUrl.pathname));
    var url_parts = url.parse(req.url, true);

    method = req.method;
    path1 = decodeURIComponent(url_parts.pathname);
    query = url_parts.search;
    // "url:" + req.url + " " +
    // "content-type: " + req.headers["content-type"] + " " +
    // "httpVersion: " + req.httpVersion + " " +
    // "dirName: " + __dirname + ' ');
    allKeysUnencoded = Object.keys(url_parts.query);
    allValuesUnencoded = Object.values(url_parts.query);
    // allKeys=allKeysUnencoded;
    // allValues=allValuesUnencoded;
    allKeys = [];
    allValues = [];
    for (i = 0; i < allKeysUnencoded.length; i++) {
        allKeys[i] = encodeData(allKeysUnencoded[i]);
        allValues[i] = encodeData(allValuesUnencoded[i]);

        //res.write(data[i]+"<br>");
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

    // read as string

    //

}

//login handler
async function login(req, res) {
    if ((typehandling(req, res) == "css") || (typehandling(req, res) == "js")) {
        //reqNew={};
        //console.log(typeof(req));
        //resNew={};
        // Object.assign(reqNew,req);
        // Object.assign(resNew,res);
        req.url = req.url.replace("/information", "/Public");
        //reqNew.url="/Public"+reqNew.url;
        staticServerHandler(req, res);
        return;
    }
    reqUrl = new URL(req.url, 'https://' + req.headers.host);
    // console.log(reqUrl.pathname);
    // console.log(reqUrl.searchParams);
    // console.log(path.extname(reqUrl.pathname));
    var url_parts = url.parse(req.url, true);

    method = req.method;
    path1 = decodeURIComponent(url_parts.pathname);
    query = url_parts.search;
    // "url:" + req.url + " " +
    // "content-type: " + req.headers["content-type"] + " " +
    // "httpVersion: " + req.httpVersion + " " +
    // "dirName: " + __dirname + ' ');
    allKeysUnencoded = Object.keys(url_parts.query);
    allValuesUnencoded = Object.values(url_parts.query);
    // allKeys=allKeysUnencoded;
    // allValues=allValuesUnencoded;
    allKeys = [];
    allValues = [];
    for (i = 0; i < allKeysUnencoded.length; i++) {
        allKeys[i] = encodeData(allKeysUnencoded[i]);
        allValues[i] = encodeData(allValuesUnencoded[i]);

        //res.write(data[i]+"<br>");
    }

    if (method == "GET") {
        try {
            //stringifiedValue = JSON.stringify(getRoutingTable[path1.toString()]());
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
            //stringifiedValue = JSON.stringify(getRoutingTable[path1.toString()]());
            if (await userAuthenticated(dataAsJson.username, dataAsJson.password, req, res)) {
                res.setHeader('Set-Cookie', cookie.serialize('athome-session', cookieHandler('athome-session', true, false, false), {}));
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
        if (!await cookieHandler("athome-session", false, false, true, cookies["athome-session"])) {
            res.writeHead(404);
            res.end();
            return;
        } else {


            cookieHandler("athome-session", false, true, false, cookies["athome-session"]);
            //res.writeHead(302, {"Location": "https://" + req.headers['host'] + "/login"})
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

var server = https.createServer(options, async (req, res) => {
    logStuff(req, res);


    // let data = '';

    // req.on('data', chunk => {
    //     console.log(`Data chunk available: ${chunk}`)
    //     data += chunk;
    // })
    // req.on('end', () => {
    //     if (data != '') {
    //         dataAsJson = qs.parse(data);
    //         console.log("Bodydata: ");
    //         for (dates in dataAsJson) {
    //             console.log(dates+":"+dataAsJson[dates]);
    //         }
    //     }
    // })


    route(req, res);


});

server.listen(8000);