"use strict";
/*global THREE desk async _ operative qx numeric MHD performance Heap desk_RPC*/
console.clear();
const concurrency = 2;
const numberOfJobs = 10;
const nIterationsPerJob = 1e7;

const workers = [];
const results = [];

async function compute( payload ) {

    let worker = workers.pop();

    if ( !worker ) {

        console.log("creating one worker");

        worker = operative( function ( n ) {

                let pi = 0;

                for (var i = 0; i != n ; i++){

                    const x = Math.random();
                    const y = Math.random();
                    if ((x * x + y * y) <= 1) pi++;

                }

                return 4 * pi / n;
            }

        );

    }

    const result = await worker( nIterationsPerJob );
    results.push( result );
    workers.push( worker );
    return result;

};

const queue = async.queue(compute, concurrency);

queue.drain( function () {

    const pi = _.mean( results );
    console.timeEnd("Computing done in ");
    alert('done, pi=' + pi);

} );

var log = res => console.log("finished one job");
console.time("Computing done in ");
for (var i = 0; i  < numberOfJobs; i++) queue.push({}, log);
