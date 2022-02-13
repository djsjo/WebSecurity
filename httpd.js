var http = require('http');
var fs = require('fs');
var qs = require('querystring');
//const {url} = require('inspector');
const path = require('path');
const url = require('url');


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
    if (pathSplit[0] == 'information') {
        information(req, res);
    } else {
        staticServerHandler(req, res);
    }
}

//returns type of
function typehandling(req, res) {
    reqUrl = new URL(req.url, 'http://' + req.headers.host);
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
        reqUrl = new URL(req.url, 'http://' + req.headers.host);
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

    } else if (reqUrl.pathname.slice(-1) !== '/') {
        console.log("has not the ending / inside allowed files")

        console.log("has not /");
        reqUrl.pathname += '/';
        req.url += "/";
    }


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
        console.log("path doesnt exist");
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
        reqUrl = new URL(req.url, 'http://' + req.headers.host);
        console.log("pathname: " + reqUrl.pathname);
        console.log("param: " + reqUrl.searchParams);
        console.log("fileending: " + path.extname(reqUrl.pathname));
    } catch (e) {
        console.log("Problem: "+e);
        console.log("not a valid url");
        console.log("pathname: " + "unvalid");
        console.log("param: " + "unvalid");
        console.log("fileending: " + "unvalid");
        res.writeHead(404);
        res.end("404 Eror");
    }
}

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
    reqUrl = new URL(req.url, 'http://' + req.headers.host);
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
    allKeys = Object.keys(url_parts.query);
    allValues = Object.values(url_parts.query);

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

            if (query!==null) {
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

var server = http.createServer(async (req, res) => {
    logStuff(req, res);

    const buffers = [];

    // let data = '';
    let dataAsJson;
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
    for await (const chunk of req) {
        buffers.push(chunk);
    }

    if (buffers.length !== 0) {
        const data = Buffer.concat(buffers).toString();


        dataAsJson = qs.parse(data);
        console.log("Bodydata: ");
        for (dates in dataAsJson) {

            if(dates=="password"){
                console.log("lenght:"+dataAsJson[dates].length);
            }else{
                console.log(dates + ":" + dataAsJson[dates]);
            }
        }
    }

    route(req, res);


});

server.listen(8000);
