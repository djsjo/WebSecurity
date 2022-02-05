var http = require('http');
var fs = require('fs');
var qs = require('querystring');
const {url} = require('inspector');
const path = require('path');

var server = http.createServer(async (req, res) => {
    console.log("method: " + req.method + "" +
        "url:" + req.url + " " +
        "content-type: " + req.headers["content-type"] + " " +
        "httpVersion: " + req.httpVersion + " " +
        "dirName: " + __dirname + ' ');
    //res.writeHead(200, { 'Content-Type': 'text/html' });
    //res.send('<b>Hello World</b>');
    //res.write("<b>Hello World</b>");
    //res.write("./Public/index.html")
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

        //console.log(JSON.parse(data).todo); // 'Buy the milk'
        dataAsJson = qs.parse(data);
        console.log("Bodydata: ");
        for (dates in dataAsJson) {
            console.log(dates + ":" + dataAsJson[dates]);
        }
    }
    //res.end();
    reqUrl = new URL(req.url, 'http://' + req.headers.host);
    console.log(reqUrl.pathname);
    console.log(reqUrl.searchParams);
    console.log(path.extname(reqUrl.pathname));
    //change file endeing when path doesnt end with a file
    if ([".js", ".html", ".css"].includes(path.extname(reqUrl.pathname))) {
        console.log("is one of the allowed files")
        let tmp = path.extname(reqUrl.pathname);

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


//+ '/Public/index.html'

    // fs.readdir(__dirname + reqUrl.pathname, function (err, data) {
    //     if (err) {
    //         res.writeHead(404);
    //         res.end(JSON.stringify(err));
    //         return;
    //     }
    //     console.log(data.toString());
    //
    // });


    //check if if path exists
    if (fs.existsSync(__dirname + reqUrl.pathname)) {
        //check if it is a directory and has an
        if (fs.statSync(__dirname + reqUrl.pathname).isDirectory()) {
            //check if index.html exists
            test = reqUrl.pathname.slice(-1);
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

    }
    //here code to handle if path doesnt exist


});

server.listen(8000);
