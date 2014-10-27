var worker = operative({
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

worker.getPi(3e8, function (result) {
    alert (result);
});