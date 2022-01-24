var http = require('http');
var fs = require('fs');

var server = http.createServer((req, res) => {
  console.log(req.method + " " + req.url + " " + req.httpVersion + __dirname);
  res.writeHead(200, { 'Content-Type': 'text/html' });
  //res.send('<b>Hello World</b>');
  res.write("<b>Hello World</b>");
  res.write("./Public/index.html")
  res.end();


});

server.listen(8000);
