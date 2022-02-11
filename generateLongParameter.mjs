import clipboard from 'clipboardy';
//const clip=require('clipboardy');


let text;
text = "http://localhost:8000/information";
let maxCount;
maxCount = 1000;
maxCount = process.argv.slice(2);
var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
var length=characters.length;
function giveMeCharacterX(x){
    let tmp;
    tmp="";
    for(let i=0;i<x;i++){
        tmp+=characters.charAt(Math.floor(Math.random() *
            length));
    }
    return tmp;
}

function generateParameter() {
    let i;
    for (i = 0; i < maxCount; i++) {
        text += "&" + giveMeCharacterX(3) + "=" + giveMeCharacterX(1);
    }
}
function generateLongPath() {
    let i;
    for (i = 0; i < maxCount; i++) {
        text += "/" + giveMeCharacterX(5) ;
    }
}

generateLongPath();
text+="?a=b"

clipboard.writeSync(text);
//console.log(text);
