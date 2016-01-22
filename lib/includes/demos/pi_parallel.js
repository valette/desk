"use strict";
/*global THREE desk async _ operative qx numeric MHD performance Heap desk_RPC*/

var concurrency = 2;
var numberOfJobs = 6;

var workers = [];
var compute = function (payload, callback) {
    var worker = workers.pop();
    if (!worker) {
        console.log("creating one worker");
        worker = operative({
            getPi : function (n, callback) {
                var pi = 0;
                for (var i = 0; i != n ; i++){
                    var x = Math.random();
                    var y = Math.random();
                    if ((x * x + y * y) <= 1) {
                        pi++;
                    }
                }
                callback (4 * pi / n);
            }
        });
    }

    worker.getPi(1e8, function (result) {
        workers.push(worker);
        callback (result);
    });
};

var queue = async.queue(compute, concurrency);
queue.drain = function () {
    console.timeEnd("Computing done in ");
    alert('done');
};

var log = res => console.log(res);

console.time("Computing done in ");
for (var i = 0; i  < numberOfJobs; i++) {
    queue.push({}, log);
}
