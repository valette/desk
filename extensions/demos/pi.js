var pi = 0;
var n = 3e8;

for (var i = 0; i != n ; i++){
    var x = Math.random();
    var y = Math.random();
    if ((x * x + y * y) <= 1) {
        pi++;
    }
}

alert(4 * pi / n);