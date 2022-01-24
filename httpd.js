var http = require('http');
var fs = require('fs');
const {url} = require('inspector');

var server = http.createServer((req, res) => {
    console.log(req.method + "___" + req.url + "___" + req.httpVersion + '___'+__dirname);
    //res.writeHead(200, { 'Content-Type': 'text/html' });
    //res.send('<b>Hello World</b>');
    //res.write("<b>Hello World</b>");
    //res.write("./Public/index.html")

    reqUrl = new URL(req.url, 'http://' + req.headers.host);
    console.log(reqUrl.pathname);


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
            if(reqUrl.pathname.slice(-1)!='/');
            {
                console.log("has not /");
                reqUrl.pathname+='/';
            }
            if (fs.existsSync(__dirname + reqUrl.pathname + '/index.html')) {
                reqUrl.pathname+='/index.html';
                fs.readFile(__dirname + reqUrl.pathname, function (err, data) {
                    console.log("calling readfile with index.html path");
                    if (err) {
                        res.writeHead(404);
                        res.end(JSON.stringify(err));
                        return;
                    }
                    res.writeHead(200);
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
                    res.writeHead(200);
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
        }
        else {
            //is not a directory it has to be a file or something similar
            fs.readFile(__dirname + reqUrl.pathname, function (err, data) {
                if (err) {
                    res.writeHead(404);
                    res.end(JSON.stringify(err));
                    return;
                }
                res.writeHead(200);
                res.end(data);
            });
        }

    }
    //here code to handle if path doesnt exist


});

server.listen(8000);
