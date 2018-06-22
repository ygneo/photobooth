
var http = require('http');

var gphoto2 = require('gphoto2');
var GPhoto = new gphoto2.GPhoto2();

var express = require('express');
var app = express();

let requests = {};
let preview_listeners = [];

let camera = undefined;

GPhoto.setLogLevel(1);
GPhoto.on('log', function (level, domain, message) {
    console.log(domain, message);
});

GPhoto.list(function (list) {
    if (list.length === 0) return;
    camera = list[0];
    console.log('Found', camera.model);
});


const logRequests = function(){
    const d=Date.parse(new Date())/1000;
    if (requests[d] > 0) {
        return requests[d]++;
    } else {
        const fps = requests[d-1];
        requests = {};
        requests[d]=1;
        if (fps) { return console.log(`${fps} fps`); }
    }
};


app.get('/preview*', function(req, res){
    if (!camera) {
        return res.send(404, 'Camera not connected');
    } else {
        preview_listeners.push(res);
        if (preview_listeners.length === 1) {
            return camera.takePicture({preview:true}, function(er, data){
                logRequests();
                const tmp = preview_listeners;
                preview_listeners = new Array();
                const d = Date.parse(new Date());

                return (() => {
                    const result = [];
                    for (let listener of Array.from(tmp)) {
                        if (!er) {
                            listener.writeHead(200, {'Content-Type': 'image/jpeg', 'Content-Length':data.length});
                            listener.write(data);
                        } else {
                            listener.writeHead(500);
                        }
                        result.push(listener.end());
                    }
                    return result;
                })();
            });
            }
    }
});

app.listen(8080);
