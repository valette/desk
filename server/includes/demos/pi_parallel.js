
function pi_n (n) {
    var pi = 0;
    for (var i = 0; i != n ; i++){
        var x = Math.random();
        var y = Math.random();
        if ((x * x + y * y) <= 1) {
            pi++;
        }
    }
    return 4 * pi / n;
}

var worker = Parallel.spawn(pi_n, 3e8);
worker.fetch (function (result) {
    alert (result);
});