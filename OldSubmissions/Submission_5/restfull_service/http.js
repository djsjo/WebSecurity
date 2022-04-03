var https = require('https');
var fs = require('fs');
var qs = require('querystring');
var cookie = require('cookie');
const path = require('path');
const url = require('url');
const express = require('express');
const app = express();
const router = express.Router();
var cookieParser = require('cookie-parser');
var mustacheExpress = require('mustache-express');
var Mustache = require('mustache');
const jwt = require('jsonwebtoken');
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


const mongoURL = "mongodb+srv://websecurity:fisksoppa@websecurity.yyrpv.mongodb.net/myFirstDatabase?retryWrites=true&w=majority";
const TOKEN_SECRET = "e6ab120090faede61707d804ae3ed5489d0cf4814b351260460ee037e11a7214f22d518aaea8fb253be64fec99d7655b021631efc86d59dfaab01faccd969496";

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

//similar to data controller path is absolute
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
    complete = encodeURIComponent(origData);
    complete = complete.replace(encodeURIComponent(" "), " ");
    return complete;

}

async function getUserCollections(user) {
    test = await userCollections.find({username: user}).toArray();
    return test;
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
                let nameregex = new RegExp(`^(?=.{4,30}$)(?![_.\{\}])(?!.*[_.]{2})[a-zA-ZäöüÄÖÜß0-9._" "]+(?<![_.\{\}])$`);
                result = nameregex.test(username);
                if ([`/register`].includes(req.path)) {
                    if (unallowedCharacters) {
                        res.json({success: false, reason: "username"});
                        return;
                    }
                    //if its not a valid name
                    if (result !== true) {
                        res.json({success: false, reason: "username"});
                        return;
                    }
                }
                try {
                    req.body.username = username.toString();
                    req.user = username;
                } catch (e) {
                    res.json({success: false, reason: "username"});
                    return;
                }
            }
        }
        next();
    } catch (e) {
        console.log("Exception: " + e);
    }


}
//similiar to the solution here: (https://www.digitalocean.com/community/tutorials/nodejs-jwt-expressjs)
async function generateAccessToken(username) {
    return jwt.sign(username, TOKEN_SECRET, {});
}

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null || token === undefined) return res.sendStatus(401);

    jwt.verify(token, TOKEN_SECRET, (err, user) => {
        console.log(err);
        if (err) return res.sendStatus(403);
        //if no err was found th user is added
        req.user = user
        next()
    })
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
//set the needed cookiename so every function can use it
app.use((req, res, next) => {
    req.cookieName = "squeak-session";
    res.setHeader("Access-Control-Allow-Origin","*");
    res.setHeader("Access-Control-Request-Method", "POST");
    res.setHeader("Access-Control-Request-Headers", "X-PINGOTHER, Content-Type, authorization");
    res.setHeader("Access-Control-Allow-Headers", "X-PINGOTHER, Content-Type, authorization");
    next();
});
// app.use(sessionMiddleware);
//log for every request
app.use(logStuff);

app.post('/register', express.json(), inputValidation, async (req, res) => {
    // req.cookieName = "squeak-session";
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
        //if user ist authenticated:set cookie, session and send json with true
        //else false
        let validUsername = username !== undefined && username.length >= 4;

        if (validUsername) {
            username = encodeData(username);
            if (checkUnallowedSigns(username)) {
                res.json({success: false, reason: "username"});
                return;
            }
        } else {
            res.json({success: false, reason: "username"});
            return;
        }
        //in this case everything is allright and pw and username are ok
        if (validUsername) {
            //set cookie
            let jwt_token = await generateAccessToken(username);

            req.user = username;
            res.json({success: true, 'token': jwt_token});
            // res.send(`Your registration was successfull. This is your token: ${jwt_token}`);
        }
    } else {
        res.status(406).send('Sorry, something went wrong!')
    }
});
//serve static files from Public
app.use(express.static('Public', {index: false}));
app.post('/store/:userId', authenticateToken, express.text(), async (req, res) => {
    let options = {weekday: 'short', hour: 'numeric', minute: 'numeric'};
    let time = new Date().toLocaleDateString('sv-SE', options);
    if (typeof (req.body) !== undefined && req.params['userId'] === req.user) {
        await userCollections.insertOne({username: req.user, time: time, input: req.body});
        res.status(200).send();
    } else {
        res.status(403).send();
        // res.send(req.params)
    }
})
app.get('/store/:userId', authenticateToken, async (req, res) => {
    //check if something exists wiht this username
    if (await userCollections.findOne({
        //username: encodeData(username),
        username: req.user
    }) !== null) {
        if (typeof (req.user) !== 'undefined') {

            Promise.all([getUserCollections(req.user)]).then(
                results => {
                    res.render('CORS_Show.template', {
                        collections: results[0].reverse()
                    });
                });

        }
    }
    else {
        res.status(403).send();
        // res.send(req.params)
    }
})

//every other request gets the register site
app.use('/', async (req, res, next) => {
    //if session valid serve the squeaks

    res.send(await getFileData(__dirname + "/templates" + "/CORS_Register.template", true));


});

// error handler
app.use((err, req, res, next) => {
    res.status(400).send(err.message)
    console.log(err);
})


MongoClient.connect(mongoURL)
    .then(async (cluster) => {
            mongoCluster = cluster;
            let db = cluster.db('Squeak!');
            userCollections = db.collection('userCollections');
            let server = https.createServer(options, app);
            server.listen(8001);
        }
    ).catch((error) => {
        console.log(error);

    }
);


